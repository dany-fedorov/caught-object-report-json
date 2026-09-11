import {
  CorjMaker,
  CorjOptions,
  CorjErrorContext,
  CorjReportSizeUnit,
  restoreExpectedValues,
} from '../src';
import * as reportSize from '../src/report-size';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

describe('review regressions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each(['utf8-bytes', 'utf16-code-units'])(
    'marks children omitted for size with the max_size code (%s)',
    (unit) => {
      const reportSizeUnit = unit as CorjReportSizeUnit;
      const report = new CorjMaker({
        maxReportSize: 512,
        reportSizeUnit,
      }).makeReportObject({
        errors: Array.from({ length: 20 }, () => ({ message: 'child' })),
      });
      expect(report.children_omitted).toBe('max_size');
      expect(report.truncated).toBe(true);
    },
  );

  test('the minimal fallback uses the max_size code and the root id', () => {
    const report = new CorjMaker({
      maxReportSize: 256,
      makeReportId: () => 'id'.repeat(1_000),
    }).makeReportArray({ cause: 'child' });
    expect(report).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        truncated: true,
        instanceof_error: false,
        as_string: '[truncated]',
        as_json: null,
        children_omitted: 'max_size',
      },
    ]);
  });

  test.each([false, true])(
    'contains failures thrown by the size limiter (array=%s)',
    (array) => {
      const failure = new Error('limiter failed');
      jest.spyOn(reportSize, 'limitReportSize').mockImplementation(() => {
        throw failure;
      });
      const errors: [unknown, CorjErrorContext][] = [];
      const maker = new CorjMaker({
        maxReportSize: 256,
        onError: (error, context) => errors.push([error, context]),
      });
      const caught = { cause: { message: 'child' } };
      const report = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);
      expect(
        Buffer.byteLength(JSON.stringify(report), 'utf8'),
      ).toBeLessThanOrEqual(256);
      const root = Array.isArray(report) ? report[0]! : report;
      expect(root).toEqual({
        ...(array ? { id: 'root', path: '$', level: 0 } : {}),
        truncated: true,
        instanceof_error: false,
        as_string: '[truncated]',
        as_json: null,
        children_omitted: 'max_size',
      });
      expect(Array.isArray(report) ? report.length : 1).toBe(1);
      expect(errors).toEqual([[failure, { stage: 'limit', path: '$' }]]);
    },
  );

  test('the limiter failure fallback keeps the full version label when omission is off', () => {
    jest.spyOn(reportSize, 'limitReportSize').mockImplementation(() => {
      throw new Error('limiter failed');
    });
    const report = new CorjMaker({
      omitExpectedValues: false,
      onError: () => undefined,
    }).makeReportObject(new Error('caught'));
    expect(getReportObjectReportValidator('full')(report)).toBe(true);
    expect(report).toEqual({
      truncated: true,
      instanceof_error: true,
      typeof: 'object',
      as_string: '[truncated]',
      as_json: null,
    });
  });

  test.each([false, true])(
    'maker options are frozen, so a limit cannot become invalid later (array=%s)',
    (array) => {
      const maker = new CorjMaker();
      expect(Object.isFrozen(maker.options)).toBe(true);
      expect(() => {
        (maker.options as { maxReportSize: number | null }).maxReportSize = 10;
      }).toThrow(TypeError);
      expect(maker.options.maxReportSize).toBe(100_000);
      const caught = new Error('caught');
      const report = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const root = Array.isArray(report) ? report[0]! : report;
      expect(root).not.toHaveProperty('truncated');
      expect(root).not.toHaveProperty('instanceof_error');
      const restored = restoreExpectedValues(report);
      expect(Array.isArray(restored) ? restored[0] : restored).toHaveProperty(
        'instanceof_error',
        true,
      );
    },
  );

  test.each([null, 512])(
    'undefined clone options preserve the inherited size configuration (%s)',
    (maxReportSize) => {
      const maker = new CorjMaker({
        maxReportSize,
        reportSizeUnit: 'utf16-code-units',
      });
      const clone = maker.with({
        maxReportSize: undefined,
        reportSizeUnit: undefined,
      } as unknown as Partial<CorjOptions>);
      const report = clone.makeReportObject('😀'.repeat(30_000));
      expect(clone.options.maxReportSize).toBe(maxReportSize);
      expect(clone.options.reportSizeUnit).toBe('utf16-code-units');
      if (maxReportSize === null) {
        expect(report.as_json).toBe('😀'.repeat(30_000));
        expect(report.truncated).toBeUndefined();
      } else {
        expect(JSON.stringify(report).length).toBeLessThanOrEqual(512);
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeGreaterThan(512);
      }
    },
  );

  test('an empty clone keeps the default budget', () => {
    const maker = new CorjMaker().with({});
    expect(maker.options).toEqual(new CorjMaker().options);
    const report = maker.makeReportObject('😀'.repeat(30_000));
    expect(
      Buffer.byteLength(JSON.stringify(report), 'utf8'),
    ).toBeLessThanOrEqual(100_000);
    expect(report.truncated).toBe(true);
  });

  test.each([350, 400])(
    'preserves diagnostic content before optional metadata at %i bytes',
    (maxReportSize) => {
      const report = new CorjMaker({
        maxReportSize,
        metadata: true,
      }).makeReportObject({
        message: 'critical failure: ' + 'x'.repeat(10_000),
      });
      expect(report.message).toMatch(/^critical failure: /);
      expect(report.as_json).toHaveProperty('message');
      expect(report).not.toHaveProperty('$schema');
      expect(
        Buffer.byteLength(JSON.stringify(report), 'utf8'),
      ).toBeLessThanOrEqual(maxReportSize);
      expect(getReportObjectReportValidator()(report)).toBe(true);
    },
  );

  test.each([false, true])(
    'contains very deep ordinary JSON data (array=%s)',
    (array) => {
      let payload: unknown = 'leaf';
      for (let i = 0; i < 20_000; i++) payload = { nested: payload };
      const maker = new CorjMaker({
        maxReportSize: 512,
        onError: () => undefined,
      });
      const report = array
        ? maker.makeReportArray(payload)
        : maker.makeReportObject(payload);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);
      expect(
        Buffer.byteLength(JSON.stringify(report), 'utf8'),
      ).toBeLessThanOrEqual(512);
      expect(JSON.parse(JSON.stringify(report))).toEqual(report);
    },
  );

  test.each([
    { array: false, maxReportSize: null },
    { array: true, maxReportSize: null },
    { array: false, maxReportSize: 2_048 },
    { array: true, maxReportSize: 2_048 },
  ])(
    'generates each report ID once and reuses it for links (array=$array, limit=$maxReportSize)',
    ({ array, maxReportSize }) => {
      const grandchild = { message: 'grandchild' };
      const child = { message: 'child', cause: grandchild };
      const caught = {
        message: 'root',
        payload: 'x'.repeat(5_000),
        cause: child,
      };
      const calls: Parameters<CorjOptions['makeReportId']>[0][] = [];
      const maker = new CorjMaker({
        maxReportSize,
        metadata: false,
        makeReportId: (context) => {
          calls.push(context);
          return `id-${calls.length}`;
        },
      });

      const report = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);
      // The root gets an ID in both forms so that cycles can refer to it.
      expect(calls).toEqual([
        { caught, index: -1, level: 0, path: '$' },
        { caught: child, index: 0, level: 1, path: '$.cause' },
        { caught: grandchild, index: 1, level: 2, path: '$.cause.cause' },
      ]);
      const rows = Array.isArray(report) ? report : report.children!;
      expect(rows.map((row) => row.id)).toEqual(
        array ? ['id-1', 'id-2', 'id-3'] : ['id-2', 'id-3'],
      );
      if (Array.isArray(report)) {
        expect(report[0]!.child_ids).toEqual(['id-2']);
        expect(report[1]!.child_ids).toEqual(['id-3']);
        expect(report[2]).not.toHaveProperty('child_ids');
      } else {
        expect(report).not.toHaveProperty('child_ids');
        expect(report.children![0]!.child_ids).toEqual(['id-3']);
        expect(report.children![1]).not.toHaveProperty('child_ids');
      }
      if (maxReportSize !== null) {
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeLessThanOrEqual(maxReportSize);
        expect(Array.isArray(report) ? report[0] : report).toHaveProperty(
          'truncated',
          true,
        );
      }
    },
  );
});
