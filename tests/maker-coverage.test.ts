import { CorjMaker, CorjMakerOnCaughtMakingContext } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

describe('maker option and failure boundaries', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('a null clone override preserves individual parent and child metadata flags', () => {
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((message: string) => {
      errors.push(message);
    });
    const maker = CorjMaker.withDefaults({
      metadataFields: { as_string_format: false },
      childrenMetadataFields: { as_json_format: true },
    });

    // JavaScript callers can supply null even though TypeScript excludes it.
    // @ts-expect-error Exercise the runtime null-override fallback.
    const report = maker.cloneWith(null).makeReportObject({ cause: 'child' });

    expect(report.as_string).toBe('[object Object]');
    expect(report.as_json).toEqual({});
    expect(report).not.toHaveProperty('as_string_format');
    expect(report.as_json_format).toBe(
      'safe-stable-stringify-with-length-limit',
    );
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        as_string: 'child',
        as_json: 'child',
        instanceof_error: false,
        typeof: 'string',
        constructor_name: 'String',
        as_json_format: 'safe-stable-stringify-with-length-limit',
      },
    ]);
    expect(errors).toEqual([]);
  });

  test('a null clone override preserves disabled metadata for both generations', () => {
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((message: string) => {
      errors.push(message);
    });
    const maker = CorjMaker.withDefaults({
      metadataFields: false,
      childrenMetadataFields: false,
    });

    // @ts-expect-error Exercise the runtime null-override fallback.
    const report = maker.cloneWith(null).makeReportObject({ cause: 'child' });

    expect(report).toEqual({
      as_string: '[object Object]',
      as_json: {},
      instanceof_error: false,
      typeof: 'object',
      constructor_name: 'Object',
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          as_string: 'child',
          as_json: 'child',
          instanceof_error: false,
          typeof: 'string',
          constructor_name: 'String',
        },
      ],
    });
    expect(errors).toEqual([]);
  });

  test('individual flags can replace disabled metadata without changing the original maker', () => {
    const maker = CorjMaker.withDefaults({
      metadataFields: false,
      childrenMetadataFields: false,
    });
    const clone = maker.cloneWith({
      metadataFields: { as_string_format: false },
      childrenMetadataFields: { as_json_format: true },
    });

    const report = clone.makeReportObject({ cause: 'child' });

    expect(report).not.toHaveProperty('as_string_format');
    expect(report.as_json_format).toBe(
      'safe-stable-stringify-with-length-limit',
    );
    expect(report.children_sources).toEqual(['cause', 'errors']);
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        as_string: 'child',
        as_json: 'child',
        instanceof_error: false,
        typeof: 'string',
        constructor_name: 'String',
        as_json_format: 'safe-stable-stringify-with-length-limit',
      },
    ]);
    const originalReport = maker.makeReportObject({ cause: 'child' });
    expect(originalReport).not.toHaveProperty('as_json_format');
    expect(originalReport.children![0]).not.toHaveProperty('as_json_format');
  });

  test('cloning without arguments reapplies the default child traversal options', () => {
    const maker = CorjMaker.withDefaults({ maxChildrenLevel: 0 });

    const report = maker.cloneWith().makeReportObject({ cause: 'child' });

    expect(report).not.toHaveProperty('children_omitted_reason');
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        as_string: 'child',
        as_json: 'child',
        instanceof_error: false,
        typeof: 'string',
        constructor_name: 'String',
      },
    ]);
    expect(maker.makeReportObject({ cause: 'child' })).toMatchObject({
      children_omitted_reason: 'Reached max depth - 0',
    });
  });

  test('a failing metadata accessor omits that field while preserving report content', () => {
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((message: string) => {
      errors.push(message);
    });
    const maker = CorjMaker.withDefaults({});
    maker.options.metadataFields = {
      $schema: false,
      as_string_format: true,
      as_json_format: true,
      children_sources: true,
      get v(): boolean {
        throw new Error('metadata unavailable');
      },
    };

    const report = maker.makeReportObject('preserved');

    expect(report).toEqual({
      as_string: 'preserved',
      as_json: 'preserved',
      instanceof_error: false,
      typeof: 'string',
      constructor_name: 'String',
      children_sources: ['cause', 'errors'],
      as_string_format: 'String',
      as_json_format: 'safe-stable-stringify-with-length-limit',
    });
    expect(errors).toEqual([
      expect.stringContaining('Could not make metadata value - v'),
    ]);
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

    const report = CorjMaker.withDefaults().makeReportObject({
      message: 'outer',
      cause: child,
    });

    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.message).toBe('outer');
    expect(report.as_json).toEqual({ message: 'outer' });
    expect(report.children).toEqual([
      {
        id: '0',
        path: '$.cause',
        level: 1,
        as_string: null,
        as_json: null,
        instanceof_error: false,
        typeof: 'object',
      },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('prototype unavailable');
    expect(warnings[0]).toContain('nested caught object');
    expect(warnings[0]).toContain('"path":"$.cause"');
    expect(warnings[0]).not.toContain('Caught when processing Report Key');
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
      const caughtDuring: {
        caught: unknown;
        context: CorjMakerOnCaughtMakingContext;
      }[] = [];
      const problematic = new Proxy(
        {},
        {
          getPrototypeOf() {
            throw failure;
          },
        },
      );
      const maker = CorjMaker.withDefaults({
        maxReportSize: 512,
        metadataFields: false,
        onCaughtMaking: (caught, context) => {
          caughtDuring.push({ caught, context });
        },
      });
      const caught = nested
        ? { message: 'outer', cause: problematic }
        : problematic;
      const fallback = {
        as_string: null,
        as_json: null,
        instanceof_error: false,
        typeof: 'object',
      };

      if (format === 'object') {
        const report = maker.makeReportObject(caught);
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
          expect(report).toEqual(fallback);
        }
      } else {
        const report = maker.makeReportArray(caught);
        expect(getReportArrayReportValidator()(report)).toBe(true);
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeLessThanOrEqual(512);
        if (nested) {
          expect(report).toHaveLength(2);
          expect(report[0]).toMatchObject({
            id: 'root',
            message: 'outer',
            as_json: { message: 'outer' },
            children: ['0'],
          });
          expect(report[1]).toEqual({
            id: '0',
            path: '$.cause',
            level: 1,
            ...fallback,
          });
        } else {
          expect(report).toEqual([
            { id: 'root', path: '$', level: 0, ...fallback, children: [] },
          ]);
        }
      }

      expect(caughtDuring).toHaveLength(1);
      expect(caughtDuring[0]!.caught).toBe(failure);
      expect(caughtDuring[0]!.context).toEqual({
        reason: 'unknown',
        caughtWhenProcessingReportKey: null,
        caughtObjectNestingInfo: nested
          ? { path: '$.cause', index: 0, level: 1 }
          : null,
      });
    },
  );
});
