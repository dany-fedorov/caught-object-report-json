import { CorjMaker, makeCorj, makeCorjArray } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const byteSize = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), 'utf8');

describe('whole report size limit', () => {
  test('defaults to a shared 100,000-byte budget for every report field and child', () => {
    const caught = new Error('помилка'.repeat(30_000));
    (caught as Error & { cause?: Error }).cause = new Error(
      '😀'.repeat(50_000),
    );
    const report = makeCorj(caught);
    expect(byteSize(report)).toBeLessThanOrEqual(100_000);
    expect(report).toHaveProperty('truncated', true);
    expect(report.message).toContain('[truncated]');
    expect(getReportObjectReportValidator()(report)).toBe(true);
  });

  test('configures a small budget and retains schema-valid partial output', () => {
    const report = makeCorj(
      { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
      { maxReportSize: 512 },
    );
    expect(byteSize(report)).toBeLessThanOrEqual(512);
    expect(report).toHaveProperty('truncated', true);
    expect(JSON.stringify(report)).toContain('[truncated]');
    expect(getReportObjectReportValidator()(report)).toBe(true);
  });

  test('supports UTF-16 code units as an alternative to UTF-8 bytes', () => {
    const caught = '😀'.repeat(500);
    const utf8 = makeCorj(caught, {
      maxReportSize: 512,
      reportSizeUnit: 'utf8-bytes',
    });
    const utf16 = makeCorj(caught, {
      maxReportSize: 512,
      reportSizeUnit: 'utf16-code-units',
    });
    expect(byteSize(utf8)).toBeLessThanOrEqual(512);
    expect(JSON.stringify(utf16).length).toBeLessThanOrEqual(512);
    expect(byteSize(utf16)).toBeGreaterThan(512);
    expect(String(utf16.as_string).length).toBeGreaterThan(
      String(utf8.as_string).length,
    );
  });

  test('preserves fitting reports exactly and can disable the size limit', () => {
    const caught = { message: 'unchanged', payload: 'a'.repeat(500) };
    const unlimited = makeCorj(caught, {
      maxReportSize: null,
    });
    const exact = makeCorj(caught, {
      maxReportSize: byteSize(unlimited),
    });
    expect(exact).toEqual(unlimited);
    expect(exact).not.toHaveProperty('truncated');
    const huge = 'x'.repeat(120_000);
    const report = makeCorj(huge, {
      maxReportSize: null,
    });
    expect(report.as_json).toBe(huge);
    expect(report.as_string).toBe(huge);
    expect(report).not.toHaveProperty('truncated');
  });

  test('bounds the whole array and removes references to omitted children', () => {
    const caught = {
      errors: Array.from({ length: 20 }, (_, i) => ({
        message: 'child ' + i,
        cause: { message: 'nested ' + i },
      })),
    };
    const report = makeCorjArray(caught, {
      maxReportSize: 1_024,
    });
    expect(byteSize(report)).toBeLessThanOrEqual(1_024);
    expect(report.length).toBeGreaterThan(1);
    expect(report.length).toBeLessThan(41);
    expect(report[0]).toHaveProperty('truncated', true);
    expect(getReportArrayReportValidator()(report)).toBe(true);
    const ids = new Set(report.map((item) => item.id));
    for (const item of report) {
      for (const childId of item.child_ids ?? [])
        expect(ids.has(childId)).toBe(true);
    }
    expect(report[0]!.children_omitted).toBe('max_size');
    expect(
      report.every(
        (item) =>
          item.children_omitted === undefined ||
          item.children_omitted === 'max_size',
      ),
    ).toBe(true);
  });

  test('keeps object children valid and their references consistent after trimming', () => {
    const caught = {
      errors: Array.from({ length: 20 }, (_, i) => ({
        message: 'child ' + i,
        cause: { message: 'nested ' + i },
      })),
    };
    const report = makeCorj(caught, {
      maxReportSize: 1_024,
    });
    expect(byteSize(report)).toBeLessThanOrEqual(1_024);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.children!.length).toBeLessThan(40);
    expect(report.children!.length).toBeGreaterThan(0);
    expect(report.children_omitted).toBe('max_size');
    const ids = new Set(report.children!.map((item) => item.id));
    for (const item of report.children!) {
      for (const childId of item.child_ids ?? [])
        expect(ids.has(childId)).toBe(true);
    }
  });

  test('applies the limit to cloned makers without changing the source', () => {
    const maker = new CorjMaker({ maxReportSize: 512 });
    const caught = {
      message: 'x'.repeat(5_000),
      stack: 'y'.repeat(5_000),
      cause: { message: 'child' },
    };
    const object = maker.makeReportObject(caught);
    const array = maker.makeReportArray(caught);
    expect(byteSize(object)).toBeLessThanOrEqual(512);
    expect(byteSize(array)).toBeLessThanOrEqual(512);
    expect(
      byteSize(maker.with({ maxReportSize: 2_048 }).makeReportObject(caught)),
    ).toBeGreaterThan(512);
    expect(byteSize(maker.makeReportObject(caught))).toBeLessThanOrEqual(512);
    expect(caught.message).toHaveLength(5_000);
    expect(caught.stack).toHaveLength(5_000);
  });

  test('handles the smallest budget with large metadata and custom identifiers', () => {
    const maker = new CorjMaker({
      maxReportSize: 256,
      metadata: true,
      makeReportId: () => 'id'.repeat(1_000),
      childrenSources: ['cause', 'x'.repeat(1_000)],
    });
    const caught = { message: 'x'.repeat(1_000), cause: { message: 'child' } };
    const object = maker.makeReportObject(caught);
    const array = maker.makeReportArray(caught);
    expect(byteSize(object)).toBeLessThanOrEqual(256);
    expect(byteSize(array)).toBeLessThanOrEqual(256);
    expect(getReportObjectReportValidator()(object)).toBe(true);
    expect(getReportArrayReportValidator()(array)).toBe(true);
  });

  test.each([0, 255, -1, NaN, Infinity, 512.5])(
    'rejects invalid maximum report sizes (%s)',
    (maxReportSize) => {
      expect(() => new CorjMaker({ maxReportSize })).toThrow(RangeError);
    },
  );

  test('rejects unknown size units', () => {
    expect(() => new CorjMaker({ reportSizeUnit: 'bytes' as any })).toThrow(
      TypeError,
    );
  });

  test('preserves schema validity when an existing depth omission cannot fit', () => {
    const huge = 'x'.repeat(1_000);
    const report = makeCorj(
      {
        constructor: { name: huge },
        message: huge,
        stack: huge,
        toCorjAsString: () => huge,
        cause: { a: 1 },
      },
      {
        maxReportSize: 256,
        maxDepth: 0,
        metadata: true,
      },
    );
    expect(byteSize(report)).toBeLessThanOrEqual(256);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.truncated).toBe(true);
    expect(report.children_omitted).toBe('max_depth');
  });
});
