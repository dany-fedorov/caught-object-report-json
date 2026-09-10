import {
  CORJ_MAKER_DEFAULT_OPTIONS,
  CORJ_NESTED_OMITTED_REASONS,
  CorjMaker,
  CorjMakerOptions,
  CorjReportSizeUnit,
} from '../src';
import { limitReportSize } from '../src/report-size';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

describe('review regressions', () => {
  test.each([
    ['utf8-bytes', 'Reached max report size - 512 utf8-bytes'],
    ['utf16-code-units', 'Reached max report size - 512 utf16-code-units'],
  ])(
    'exports the size omission reason used by reports (%s)',
    (unit, expected) => {
      const reportSizeUnit = unit as CorjReportSizeUnit;
      const report = CorjMaker.withDefaults({
        maxReportSize: 512,
        reportSizeUnit,
      }).makeReportObject({
        errors: Array.from({ length: 20 }, () => ({ message: 'child' })),
      });
      expect(report.children_omitted_reason).toBe(expected);
      expect(
        CORJ_NESTED_OMITTED_REASONS.REACHED_MAX_REPORT_SIZE(
          512,
          reportSizeUnit,
        ),
      ).toBe(expected);
    },
  );

  test('exports default-unit and minimal-fallback omission reasons', () => {
    const reason = CORJ_NESTED_OMITTED_REASONS.REACHED_MAX_REPORT_SIZE;
    expect(reason(512)).toBe('Reached max report size - 512 utf8-bytes');
    const report = CorjMaker.withDefaults({
      maxReportSize: 256,
      makeReportId: () => 'id'.repeat(1_000),
    }).makeReportArray({ cause: 'child' });
    expect(report[0]!.children_omitted_reason).toBe('Reached max report size');
    expect(reason()).toBe(report[0]!.children_omitted_reason);
  });

  test.each([false, true])(
    'contains failures introduced by final report serialization (array=%s)',
    (array) => {
      const failure = new Error('metadata serialization failed');
      const errors: unknown[] = [];
      const childrenSources = Object.assign(['cause'], {
        toJSON() {
          throw failure;
        },
      });
      const maker = CorjMaker.withDefaults({
        maxReportSize: 256,
        childrenSources,
        onCaughtMaking: (error) => errors.push(error),
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
      expect(root).toMatchObject({
        as_json: null,
        truncated: true,
        children_omitted_reason: 'Could not limit report size',
      });
      expect(errors).toEqual([failure]);
    },
  );

  test.each([false, true])(
    'returns a valid fallback if the configured limit becomes invalid (array=%s)',
    (array) => {
      const errors: unknown[] = [];
      const maker = CorjMaker.withDefaults({
        onCaughtMaking: (error) => errors.push(error),
      });
      maker.options.maxReportSize = 10;
      const caught = new Error('caught');
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
      expect(Array.isArray(report) ? report[0] : report).toHaveProperty(
        'truncated',
        true,
      );
      expect(Array.isArray(report) ? report[0] : report).toHaveProperty(
        'instanceof_error',
        true,
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((error) => error instanceof RangeError)).toBe(true);
    },
  );

  test.each([null, 512])(
    'undefined clone options preserve the inherited size configuration (%s)',
    (maxReportSize) => {
      const maker = CorjMaker.withDefaults({
        maxReportSize,
        reportSizeUnit: 'utf16-code-units',
      });
      const clone = maker.cloneWith({
        maxReportSize: undefined,
        reportSizeUnit: undefined,
      } as unknown as Partial<CorjMakerOptions>);
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

  test('clones a maker whose size options were omitted using the default budget', () => {
    const options: CorjMakerOptions = { ...CORJ_MAKER_DEFAULT_OPTIONS };
    delete options.maxReportSize;
    delete options.reportSizeUnit;
    const maker = new CorjMaker(options).cloneWith({});
    const report = maker.makeReportObject('😀'.repeat(30_000));
    expect(
      Buffer.byteLength(JSON.stringify(report), 'utf8'),
    ).toBeLessThanOrEqual(100_000);
    expect(report.truncated).toBe(true);
  });

  test.each([400, 450])(
    'preserves diagnostic content before optional metadata at %i bytes',
    (maxReportSize) => {
      const report = CorjMaker.withDefaults({
        maxReportSize,
        metadataFields: true,
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

  test('preserves schema-valid null child entries when trimming an assembled report', () => {
    const fields = {
      instanceof_error: false,
      typeof: 'object' as const,
      as_string: '[object Object]',
      as_json: {},
      as_json_format: null,
      children_sources: [],
    };
    const child = { ...fields, id: 'child', path: '$.cause', level: 1 };
    const source = {
      ...fields,
      message: 'x'.repeat(5_000),
      children: [null, child, null],
    };
    expect(getReportObjectReportValidator()(source)).toBe(true);
    const report = limitReportSize(source, {
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      maxReportSize: 512,
    });
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.children).toEqual([null, child, null]);
    expect(
      Buffer.byteLength(JSON.stringify(report), 'utf8'),
    ).toBeLessThanOrEqual(512);
    expect(source.children).toEqual([null, child, null]);
    expect(source.message).toHaveLength(5_000);
  });

  test.each([false, true])(
    'contains very deep ordinary JSON data (array=%s)',
    (array) => {
      let payload: unknown = 'leaf';
      for (let i = 0; i < 20_000; i++) payload = { nested: payload };
      const maker = CorjMaker.withDefaults({
        maxReportSize: 512,
        onCaughtMaking: () => undefined,
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
      const calls: Parameters<CorjMakerOptions['makeReportId']>[0][] = [];
      const maker = CorjMaker.withDefaults({
        maxReportSize,
        metadataFields: false,
        childrenMetadataFields: false,
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
      expect(calls).toEqual([
        ...(array ? [{ caught, index: -1, level: 0, path: '$' }] : []),
        { caught: child, index: 0, level: 1, path: '$.cause' },
        { caught: grandchild, index: 1, level: 2, path: '$.cause.cause' },
      ]);
      const rows = Array.isArray(report) ? report : report.children!;
      expect(rows.map((row) => row!.id)).toEqual(
        array ? ['id-1', 'id-2', 'id-3'] : ['id-1', 'id-2'],
      );
      if (Array.isArray(report)) {
        expect(report[0]!.children).toEqual(['id-2']);
        expect(report[1]!.children).toEqual(['id-3']);
      } else {
        expect(report.children![0]!.children).toEqual(['id-2']);
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
