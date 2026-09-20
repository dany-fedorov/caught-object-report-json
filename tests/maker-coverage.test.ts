import { CorjContext, CorjMaker } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';
import { LEGACY } from './legacy-options';

describe('maker option and failure boundaries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('options are read once at construction, so a throwing accessor throws there', () => {
    const input = {
      get maxDepth(): number {
        throw new Error('options unavailable');
      },
    };
    expect(() => new CorjMaker(input)).toThrow('options unavailable');
  });

  test('options read at construction are not re-read later', () => {
    let reads = 0;
    const input = {
      get maxDepth(): number {
        reads++;
        return 1;
      },
    };
    const maker = new CorjMaker(input);
    const readsAtConstruction = reads;
    expect(readsAtConstruction).toBeGreaterThan(0);
    maker.makeReport({ cause: { cause: 'deep' } });
    maker.makeReportArray({ cause: { cause: 'deep' } });
    expect(reads).toBe(readsAtConstruction);
    expect(maker.options.maxDepth).toBe(1);
  });

  test('withOptions() without changes keeps every option', () => {
    const maker = new CorjMaker({ ...LEGACY, maxDepth: 0, metadata: false });
    const report = maker.withOptions({}).makeReport({ cause: 'child' });
    expect(report).toEqual({
      instanceof_error: false,
      constructor_name: 'Object',
      as_string: '[object Object]',
      children_omitted: 'max_depth',
    });
  });

  test('withOptions() can lift a limit again', () => {
    const maker = new CorjMaker({ ...LEGACY, maxDepth: 0 });
    const report = maker.withOptions({ maxDepth: 5 }).makeReport({
      cause: 'child',
    });
    expect(report).not.toHaveProperty('children_omitted');
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        instanceof_error: false,
        typeof: 'string',
        constructor_name: 'String',
        as_string: 'child',
        as_json: 'child',
      },
    ]);
    expect(maker.makeReport({ cause: 'child' })).toMatchObject({
      children_omitted: 'max_depth',
    });
  });

  test('a child with a throwing prototype lookup still produces a valid report and identifies the failed child', () => {
    const warnings: string[] = [];
    jest.spyOn(console, 'warn').mockImplementation((message: string) => {
      warnings.push(message);
    });
    const child = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error('prototype unavailable');
        },
      },
    );

    const report = new CorjMaker(LEGACY).makeReport({
      message: 'outer',
      cause: child,
    });

    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.message).toBe('outer');
    expect(report.as_json).toEqual({ message: 'outer' });
    // Only instanceof walks the prototype through the proxy trap; String()
    // and the serializer read own properties, and the constructor lookup is
    // an ordinary [[Get]] on the target.
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        instanceof_error: false,
        constructor_name: 'Object',
        as_string: '[object Object]',
      },
    ]);
    expect(warnings).toEqual([
      '[caught-object-report-json] stage=other path=$.cause field=instanceof_error: Error: prototype unavailable',
    ]);
  });

  test.each([
    { format: 'object', nested: false },
    { format: 'object', nested: true },
    { format: 'array', nested: false },
    { format: 'array', nested: true },
  ])(
    '$format reports contain prototype failures (nested: $nested)',
    ({ format, nested }) => {
      const failure = new Error('prototype unavailable');
      const caughtDuring: { caught: unknown; context: CorjContext }[] = [];
      const problematic = new Proxy(
        {},
        {
          getPrototypeOf() {
            throw failure;
          },
        },
      );
      const maker = new CorjMaker({
        ...LEGACY,
        maxReportSize: 512,
        metadata: false,
        onReportingError: (caught, context) => {
          caughtDuring.push({ caught, context });
        },
      });
      const caught = nested
        ? { message: 'outer', cause: problematic }
        : problematic;
      // `typeof: "object"` is an expected value and is omitted by default.
      const fallback = {
        instanceof_error: false,
        constructor_name: 'Object',
        as_string: '[object Object]',
      };
      const path = nested ? '$.cause' : '$';
      const reportingErrors = [
        {
          stage: 'other',
          path,
          reportKey: 'instanceof_error',
          error: 'Error: prototype unavailable',
        },
      ];

      if (format === 'object') {
        const report = maker.makeReport(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeLessThanOrEqual(512);
        if (nested) {
          expect(report.message).toBe('outer');
          expect(report.as_json).toEqual({ message: 'outer' });
          expect(report.children).toEqual([
            { id: '0', path: '$.cause', level: 1, ...fallback },
          ]);
        } else {
          expect(report).toEqual({
            ...fallback,
            reporting_errors: reportingErrors,
          });
        }
      } else {
        const report = maker.makeReportArray(caught);
        expect(getReportArrayReportValidator()(report)).toBe(true);
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeLessThanOrEqual(512);
        if (nested) {
          expect(report).toHaveLength(2);
          expect(report[0]).toEqual({
            id: 'root',
            path: '$',
            level: 0,
            instanceof_error: false,
            constructor_name: 'Object',
            message: 'outer',
            as_string: '[object Object]',
            as_json: { message: 'outer' },
            child_ids: ['0'],
            reporting_errors: reportingErrors,
          });
          expect(report[1]).toEqual({
            id: '0',
            path: '$.cause',
            level: 1,
            ...fallback,
          });
        } else {
          expect(report).toEqual([
            {
              id: 'root',
              path: '$',
              level: 0,
              ...fallback,
              reporting_errors: reportingErrors,
            },
          ]);
        }
      }

      // Only the instanceof check walks the prototype through the trap.
      expect(caughtDuring).toEqual([
        {
          caught: failure,
          context: {
            stage: 'other',
            path,
            reportKey: 'instanceof_error',
            error: 'Error: prototype unavailable',
          },
        },
      ]);
    },
  );
});
