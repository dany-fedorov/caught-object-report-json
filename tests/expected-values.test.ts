import {
  CORJ_EXPECTED_VALUES,
  CorjMaker,
  makeCaughtObjectReportJson,
  makeCaughtObjectReportJsonArray,
  restoreExpectedValues,
} from '../src';
import * as expectedValues from '../src/expected-values';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const omittedKeys = [
  'instanceof_error',
  'typeof',
  'as_json',
  'as_string',
  'as_string_format',
  'as_json_format',
  'children_sources',
] as const;

function makeNested() {
  const outer = new Error('outer');
  const agg = new Error('agg');
  (agg as any).errors = [new TypeError('first'), 'second', null];
  (outer as any).cause = agg;
  return outer;
}

describe('omitting expected values', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('exports the expected values', () => {
    expect(CORJ_EXPECTED_VALUES).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      as_string_format: 'String',
      as_json_format: 'safe-stable-stringify-with-length-limit',
      children_sources: ['cause', 'errors'],
    });
    expect(Object.isFrozen(CORJ_EXPECTED_VALUES)).toBe(true);
  });

  test('a plain Error report keeps only distinctive fields by default', () => {
    const report = makeCaughtObjectReportJson(new Error('boom'));
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Object.keys(report).sort()).toEqual([
      'constructor_name',
      'message',
      'stack',
      'v',
    ]);
    expect(report.stack).toMatch(/^Error: boom\n/);
  });

  test.each([false, true])(
    'restoreExpectedValues reproduces the complete report (array=%s)',
    (array) => {
      const caught = makeNested();
      const complete = CorjMaker.withDefaults({
        omitExpectedValues: false,
        childrenMetadataFields: true,
      });
      const compact = complete.cloneWith({ omitExpectedValues: true });
      const full = array
        ? complete.makeReportArray(caught)
        : complete.makeReportObject(caught);
      const report = array
        ? compact.makeReportArray(caught)
        : compact.makeReportObject(caught);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);
      expect(validate(full)).toBe(true);

      const nodes = array
        ? (report as unknown[])
        : [report, ...(report as { children: unknown[] }).children];
      expect(nodes).toHaveLength(5);
      for (const node of nodes as Record<string, unknown>[]) {
        // Each node dropped something, and only the documented fields.
        const dropped = omittedKeys.filter((key) => !(key in node));
        expect(dropped.length).toBeGreaterThan(0);
        expect(node).not.toHaveProperty('as_string_format');
        expect(node).not.toHaveProperty('as_json_format');
        expect(node).not.toHaveProperty('children_sources');
      }
      // Error nodes keep only distinctive fields; the string child keeps its
      // non-expected typeof and instanceof_error.
      expect(nodes[0]).not.toHaveProperty('instanceof_error');
      expect(nodes[0]).not.toHaveProperty('as_string');
      expect(nodes[3]).toMatchObject({
        instanceof_error: false,
        typeof: 'string',
        as_string: 'second',
        as_json: 'second',
      });
      expect(nodes[4]).toMatchObject({
        instanceof_error: false,
        as_string: 'null',
        as_json: null,
      });
      expect(nodes[4]).not.toHaveProperty('typeof');

      // Round trip: only metadata fields are not restored.
      const strip = (node: unknown) => {
        const { as_string_format, as_json_format, children_sources, ...rest } =
          node as Record<string, unknown>;
        expect(as_string_format).toBe('String');
        expect(as_json_format).toBe('safe-stable-stringify-with-length-limit');
        expect(children_sources).toEqual(['cause', 'errors']);
        return rest;
      };
      const restored = restoreExpectedValues(report);
      expect(restored).toEqual(
        Array.isArray(full)
          ? full.map(strip)
          : { ...strip(full), children: full.children!.map(strip) },
      );
      expect(validate(restored)).toBe(true);
      // The input is not modified.
      expect(nodes[0]).not.toHaveProperty('instanceof_error');
    },
  );

  test('omitExpectedValues: false keeps every field', () => {
    const report = makeCaughtObjectReportJson(new Error('boom'), {
      omitExpectedValues: false,
    });
    expect(report).toMatchObject({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      as_string: 'Error: boom',
      as_string_format: 'String',
      as_json_format: 'safe-stable-stringify-with-length-limit',
      children_sources: ['cause', 'errors'],
    });
  });

  test('as_string is derived from a stack array too', () => {
    const report = makeCaughtObjectReportJson(new Error('boom'), {
      parseStackToArray: true,
    });
    expect(report).not.toHaveProperty('as_string');
    expect(Array.isArray(report.stack)).toBe(true);
    expect(restoreExpectedValues(report).as_string).toBe('Error: boom');
  });

  test('as_string stays when it is not the first stack line', () => {
    class Custom extends Error {
      override toString() {
        return 'custom text';
      }
    }
    const report = makeCaughtObjectReportJson(new Custom('boom'));
    expect(report.as_string).toBe('custom text');
    expect(report.stack).toMatch(/^Error: boom/);

    const noStack = makeCaughtObjectReportJson({ message: 'no stack' });
    expect(noStack.as_string).toBe('[object Object]');
    expect(noStack.as_json).toEqual({ message: 'no stack' });
    expect(noStack.instanceof_error).toBe(false);
    expect(noStack).not.toHaveProperty('typeof');

    const nullStack = makeCaughtObjectReportJson(
      { message: 'x', stack: null },
      { onCaughtMaking: null, printWarningsOnUnhandledErrors: false },
    );
    expect(nullStack.stack).toBeUndefined();
    expect(nullStack.as_string).toBe('[object Object]');
  });

  test('a stack without a newline equals as_string as a whole', () => {
    const report = makeCaughtObjectReportJson({
      stack: '[object Object]',
    });
    expect(report).not.toHaveProperty('as_string');
    expect(restoreExpectedValues(report).as_string).toBe('[object Object]');
  });

  test('non-expected values and failures are kept', () => {
    const report = makeCaughtObjectReportJson([], {
      childrenSources: ['cause'],
      metadataFields: true,
    });
    expect(report.as_json).toEqual([]);
    expect(report.children_sources).toEqual(['cause']);
    expect(report.instanceof_error).toBe(false);

    const custom = makeCaughtObjectReportJson({
      toCorjAsJson: () => ({}),
      toCorjAsString: () => '[object Object]',
    });
    expect(custom).not.toHaveProperty('as_json');
    expect(custom.as_json_format).toBe('.toCorjAsJson');
    expect(custom.as_string_format).toBe('.toCorjAsString');

    const reordered = makeCaughtObjectReportJson(1, {
      childrenSources: ['errors', 'cause'],
    });
    expect(reordered.children_sources).toEqual(['errors', 'cause']);
    expect(reordered.typeof).toBe('number');

    const failed = makeCaughtObjectReportJson(undefined, {
      onCaughtMaking: null,
      printWarningsOnUnhandledErrors: false,
    });
    expect(failed.as_json).toBeNull();
    expect(failed.typeof).toBe('undefined');
  });

  test('handles null children in object reports', () => {
    const report = {
      instanceof_error: true,
      typeof: 'object' as const,
      as_string: '[object Object]',
      as_json: {},
      children: [
        null,
        {
          id: '0',
          path: '$.cause',
          level: 1,
          instanceof_error: true,
          typeof: 'object' as const,
          as_string: 'Error: child',
          as_json: {},
          stack: 'Error: child\n    at x',
        },
      ],
    };
    const compact = expectedValues.omitExpectedValues(report);
    expect(compact).toEqual({
      as_string: '[object Object]',
      children: [
        null,
        { id: '0', path: '$.cause', level: 1, stack: 'Error: child\n    at x' },
      ],
    });
    expect(restoreExpectedValues(compact)).toEqual(report);
    expect(getReportObjectReportValidator()(compact)).toBe(true);
  });

  test('restoreExpectedValues only fills in what can be derived', () => {
    expect(restoreExpectedValues({})).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
    });
    expect(restoreExpectedValues({ stack: [] })).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      stack: [],
    });
    expect(
      restoreExpectedValues({
        as_string: null,
        as_json: null,
        typeof: 'string',
      }),
    ).toEqual({
      instanceof_error: true,
      typeof: 'string',
      as_string: null,
      as_json: null,
    });
    const rows = restoreExpectedValues([
      { id: 'root', path: '$', level: 0, stack: 'E: a\nb' },
    ]);
    expect(rows).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        stack: 'E: a\nb',
        as_string: 'E: a',
        instanceof_error: true,
        typeof: 'object',
        as_json: {},
      },
    ]);
  });

  describe('with the report size limit', () => {
    test('an exactly fitting compact report is preserved', () => {
      const caught = makeNested();
      const unlimited = makeCaughtObjectReportJson(caught, {
        maxReportSize: null,
      });
      const size = Buffer.byteLength(JSON.stringify(unlimited), 'utf8');
      const exact = makeCaughtObjectReportJson(caught, {
        maxReportSize: size,
      });
      expect(exact).toEqual(unlimited);
      expect(exact).not.toHaveProperty('truncated');
    });

    test('a missing as_string always derives what the field would hold', () => {
      const marker = '[caught-object-report-json: Truncated]';
      const caught = new Error('m'.repeat(200));
      const complete = String(caught);
      let restoredFromTruncatedStack = 0;
      let kept = 0;
      for (let maxReportSize = 256; maxReportSize <= 700; maxReportSize += 3) {
        const report = makeCaughtObjectReportJson(caught, {
          maxReportSize,
          metadataFields: false,
        });
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(
          Buffer.byteLength(JSON.stringify(report), 'utf8'),
        ).toBeLessThanOrEqual(maxReportSize);
        if ('as_string' in report) {
          kept++;
          continue;
        }
        const derived = restoreExpectedValues(report).as_string as string;
        if (derived === complete) continue;
        // A truncated first line must be exactly what a truncated as_string
        // would have been: a proper prefix of the complete value plus marker.
        expect(derived.endsWith(marker)).toBe(true);
        const prefix = derived.slice(0, -marker.length);
        expect(prefix.length).toBeLessThan(complete.length);
        expect(complete.startsWith(prefix)).toBe(true);
        restoredFromTruncatedStack++;
      }
      expect(restoredFromTruncatedStack).toBeGreaterThan(0);
      expect(kept).toBeGreaterThan(0);
    });

    test('keeps as_string omitted when the first stack line survives', () => {
      const caught = new Error('short');
      const report = makeCaughtObjectReportJson(caught, {
        maxReportSize: 512,
        metadataFields: false,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.truncated).toBe(true);
      expect(String(report.stack)).toMatch(/^Error: short\n/);
      expect(report).not.toHaveProperty('as_string');
      expect(restoreExpectedValues(report).as_string).toBe('Error: short');
    });

    test('the minimal fallback omits expected values as well', () => {
      const report = makeCaughtObjectReportJsonArray(new Error('boom'), {
        maxReportSize: 256,
        makeReportId: () => 'x'.repeat(1_000),
      });
      expect(getReportArrayReportValidator()(report)).toBe(true);
      expect(report).toEqual([
        {
          id: 'root',
          path: '$',
          level: 0,
          as_string: '[caught-object-report-json: Truncated]',
          as_json: null,
          truncated: true,
        },
      ]);
      expect(restoreExpectedValues(report)[0]).toMatchObject({
        instanceof_error: true,
        typeof: 'object',
      });

      const kept = makeCaughtObjectReportJsonArray(new Error('boom'), {
        maxReportSize: 256,
        omitExpectedValues: false,
        makeReportId: () => 'x'.repeat(1_000),
      });
      expect(kept[0]).toMatchObject({
        instanceof_error: true,
        typeof: 'object',
      });
    });
  });

  test('a failure while omitting keeps the complete report', () => {
    const errors: string[] = [];
    jest.spyOn(console, 'error').mockImplementation((message: string) => {
      errors.push(message);
    });
    jest.spyOn(expectedValues, 'omitExpectedValues').mockImplementation(() => {
      throw new Error('cannot omit');
    });
    const report = makeCaughtObjectReportJson(new Error('boom'));
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report).toMatchObject({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      as_string: 'Error: boom',
    });
    expect(errors).toEqual([
      '[caught-object-report-json][Unhandled] Could not omit expected values',
      '[caught-object-report-json][Unhandled] Could not omit expected values',
    ]);
  });
});
