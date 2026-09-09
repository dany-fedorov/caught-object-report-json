import {
  CORJ_MAKER_DEFAULT_OPTIONS,
  CaughtObjectReportJsonChild,
  CorjMakerOptions,
} from '../src';
import { limitReportSize } from '../src/report-size';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

describe('report size defaults and minimal fallback', () => {
  test('applies the default UTF-8 budget when size options are omitted', () => {
    const source = {
      instanceof_error: false,
      typeof: 'string' as const,
      as_string: '😀'.repeat(20_000),
      as_json: null,
      as_json_format: null,
      children_sources: [],
    };
    const options: CorjMakerOptions = { ...CORJ_MAKER_DEFAULT_OPTIONS };
    delete options.maxReportSize;
    delete options.reportSizeUnit;

    // This report fits in 100,000 code units but exceeds 100,000 UTF-8 bytes
    // once both string representations are included.
    const report = { ...source, as_json: source.as_string };
    const result = limitReportSize(report, options);

    expect(JSON.stringify(report).length).toBeLessThan(100_000);
    expect(Buffer.byteLength(JSON.stringify(report), 'utf8')).toBeGreaterThan(
      100_000,
    );
    expect(
      Buffer.byteLength(JSON.stringify(result), 'utf8'),
    ).toBeLessThanOrEqual(100_000);
    expect(result).toHaveProperty('truncated', true);
    expect(getReportObjectReportValidator()(result)).toBe(true);
    expect(report.as_string).toBe('😀'.repeat(20_000));
    expect(report.as_json).toBe('😀'.repeat(20_000));
  });

  test.each([
    { array: false, withChildren: false },
    { array: true, withChildren: false },
    { array: false, withChildren: true },
    { array: true, withChildren: true },
  ])(
    'bounds an oversized custom root ID (array=$array, children=$withChildren)',
    ({ array, withChildren }) => {
      const root: CaughtObjectReportJsonChild = {
        id: 'custom-id'.repeat(1_000),
        path: '$',
        level: 0,
        instanceof_error: false,
        typeof: 'object',
        as_string: '[object Object]',
        as_json: {},
        as_json_format: null,
        children_sources: [],
      };
      const children = withChildren
        ? [{ ...root, id: 'child', path: '$.cause', level: 1 }]
        : [];
      // The helper accepts an already assembled report, including root
      // extensions that cannot be shortened as ordinary content fields.
      const report = array ? [root, ...children] : { ...root, children };
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);

      const result = limitReportSize(report, {
        ...CORJ_MAKER_DEFAULT_OPTIONS,
        maxReportSize: 256,
      });

      expect(validate(result)).toBe(true);
      expect(
        Buffer.byteLength(JSON.stringify(result), 'utf8'),
      ).toBeLessThanOrEqual(256);
      const expected = {
        instanceof_error: false,
        typeof: 'object',
        as_string: '[caught-object-report-json: Truncated]',
        as_json: null,
        truncated: true,
        ...(withChildren
          ? { children_omitted_reason: 'Reached max report size' }
          : {}),
      };
      expect(result).toEqual(
        array ? [{ id: 'root', path: '$', level: 0, ...expected }] : expected,
      );
      expect(root.id).toBe('custom-id'.repeat(1_000));
      expect(root.as_json).toEqual({});
      expect(children).toHaveLength(withChildren ? 1 : 0);
    },
  );
});
