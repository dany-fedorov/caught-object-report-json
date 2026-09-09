import {
  CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT,
  CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
  CorjMaker,
  CORJ_MAKER_DEFAULT_OPTIONS,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const marker = '[caught-object-report-json: Truncated]';

describe('report JSON length limit', () => {
  test('preserves a value at the 100,000-character boundary and truncates the next character', () => {
    const maker = new CorjMaker({
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      onCaughtMaking: null,
    });
    const fitting = 'x'.repeat(99_998);
    expect(maker.makeReportObject(fitting).as_json).toBe(fitting);

    const report = maker.makeReportObject(fitting + 'x');
    expect(JSON.stringify(report.as_json).length).toBeLessThanOrEqual(100_000);
    expect(String(report.as_json).endsWith(marker)).toBe(true);
    expect(report.as_string).toBe(fitting + 'x');
    expect(report.as_json_format).toBe(
      CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT,
    );
    expect(getReportObjectReportValidator()(report)).toBe(true);
  });

  test('bounds custom JSON output without reporting truncation as a conversion failure', () => {
    const errors: unknown[] = [];
    const maker = new CorjMaker({
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      onCaughtMaking: (error) => errors.push(error),
    });
    const report = maker.makeReportObject({
      toCorjAsJson: () => ({ message: 'kept', payload: '\n'.repeat(100_000) }),
    });
    expect(JSON.stringify(report.as_json).length).toBeLessThanOrEqual(100_000);
    expect(report.as_json).toMatchObject({ message: 'kept' });
    expect(JSON.stringify(report.as_json)).toContain(marker);
    expect(report.as_json_format).toBe(
      CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
    );
    expect(errors).toEqual([]);
    expect(getReportObjectReportValidator()(report)).toBe(true);
  });

  test('gives each nested report its own budget and excludes child sources from parent JSON', () => {
    const maker = new CorjMaker({
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      onCaughtMaking: null,
    });
    const caught = {
      message: 'parent',
      cause: { message: 'child', payload: 'y'.repeat(100_000) },
      payload: 'x'.repeat(100_000),
    };
    const report = maker.makeReportObject(caught);
    expect(report.as_json).toMatchObject({ message: 'parent' });
    expect(report.as_json).not.toHaveProperty('cause');
    expect(report.children).toHaveLength(1);
    expect(report.children![0]!.as_json).toMatchObject({ message: 'child' });
    for (const item of [report, ...report.children!]) {
      expect(JSON.stringify(item!.as_json).length).toBeLessThanOrEqual(100_000);
      expect(JSON.stringify(item!.as_json)).toContain(marker);
    }
    expect(getReportObjectReportValidator()(report)).toBe(true);

    const array = maker.makeReportArray(caught);
    expect(array).toHaveLength(2);
    expect(getReportArrayReportValidator()(array)).toBe(true);
    for (const item of array) {
      expect(JSON.stringify(item.as_json).length).toBeLessThanOrEqual(100_000);
    }
  });

  test('retains safe conversions and circular references in fitting reports', () => {
    const maker = new CorjMaker({
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      onCaughtMaking: null,
    });
    const caught: Record<string, unknown> = {
      bigint: BigInt(123),
      nonfinite: Infinity,
      date: new Date('2020-01-02T00:00:00.000Z'),
      bytes: new Uint8Array([1, 2]),
      unsupported: undefined,
      array: [undefined, Symbol('omitted'), () => undefined],
    };
    caught['self'] = caught;
    expect(maker.makeReportObject(caught).as_json).toEqual({
      bigint: 123,
      nonfinite: null,
      date: '2020-01-02T00:00:00.000Z',
      bytes: { 0: 1, 1: 2 },
      array: [null, null, null],
      self: '[caught-object-report-json: Circular]',
    });
  });

  test('counts the numeric representation of bigints after JSON parsing', () => {
    const maker = new CorjMaker({
      ...CORJ_MAKER_DEFAULT_OPTIONS,
      onCaughtMaking: null,
    });
    const values = Array(5_882).fill(BigInt('9999999999999999'));
    for (const caught of [values, { toCorjAsJson: () => values }]) {
      const report = maker.makeReportObject(caught);
      expect(JSON.stringify(report.as_json).length).toBeLessThanOrEqual(
        100_000,
      );
      expect((report.as_json as unknown[])[0]).toBe(10_000_000_000_000_000);
      expect(JSON.stringify(report.as_json)).toContain(marker);
      expect(getReportObjectReportValidator()(report)).toBe(true);
    }
    expect(
      maker.makeReportObject(BigInt('1' + '0'.repeat(400))).as_json,
    ).toBeNull();
  });
});
