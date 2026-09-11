import { CorjMaker, CORJ_TRUNCATED_MARKER } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const marker = CORJ_TRUNCATED_MARKER;
const quiet = { onError: () => undefined };

describe('report JSON length limit', () => {
  test('shares the default budget between string and JSON representations', () => {
    const maker = new CorjMaker({ ...quiet, omitExpectedValues: false });
    const report = maker.makeReportObject('x'.repeat(100_000));
    expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(
      100_000,
    );
    expect(String(report.as_json).endsWith(marker)).toBe(true);
    expect(String(report.as_string).endsWith(marker)).toBe(true);
    expect(report.truncated).toBe(true);
    expect(report.as_json_format).toBe(
      'safe-stable-stringify-with-length-limit',
    );
    expect(report.v).toBe('corj/v0.12-full');
    expect(getReportObjectReportValidator('full')(report)).toBe(true);
  });

  test('bounds custom JSON output without reporting truncation as a conversion failure', () => {
    const errors: unknown[] = [];
    const maker = new CorjMaker({ onError: (error) => errors.push(error) });
    const report = maker.makeReportObject({
      toCorjAsJson: () => ({ message: 'kept', payload: '\n'.repeat(100_000) }),
    });
    expect(JSON.stringify(report.as_json).length).toBeLessThanOrEqual(100_000);
    expect(report.as_json).toMatchObject({ message: 'kept' });
    expect(JSON.stringify(report.as_json)).toContain(marker);
    expect(report.as_json_format).toBe('.toCorjAsJson');
    expect(errors).toEqual([]);
    expect(getReportObjectReportValidator()(report)).toBe(true);
  });

  test('shares the budget with nested reports and excludes child sources from parent JSON', () => {
    const maker = new CorjMaker(quiet);
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
    expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(
      100_000,
    );
    for (const item of [report, ...report.children!]) {
      expect(JSON.stringify(item!.as_json).length).toBeLessThanOrEqual(100_000);
      expect(JSON.stringify(item!.as_json)).toContain(marker);
    }
    expect(getReportObjectReportValidator()(report)).toBe(true);

    const array = maker.makeReportArray(caught);
    expect(Buffer.byteLength(JSON.stringify(array))).toBeLessThanOrEqual(
      100_000,
    );
    expect(array).toHaveLength(2);
    expect(getReportArrayReportValidator()(array)).toBe(true);
    for (const item of array) {
      expect(JSON.stringify(item.as_json).length).toBeLessThanOrEqual(100_000);
    }
  });

  test('retains safe conversions and circular references in fitting reports', () => {
    const maker = new CorjMaker(quiet);
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
      self: '[circular]',
    });
  });

  test('counts the numeric representation of bigints after JSON parsing', () => {
    const maker = new CorjMaker(quiet);
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
