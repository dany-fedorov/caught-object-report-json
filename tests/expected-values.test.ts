import {
  CORJ_EXPECTED_VALUES,
  CorjErrorContext,
  CorjMaker,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import * as expectedValues from '../src/expected-values';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const quiet = { onError: () => undefined };

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
    const report = makeCorj(new Error('boom'));
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Object.keys(report).sort()).toEqual(['stack', 'v']);
    expect((report.stack as string[])[0]).toBe('Error: boom');
    expect(report.v).toBe('corj/v0.12');
  });

  test.each([false, true])(
    'restoreExpectedValues reproduces the complete report (array=%s)',
    (array) => {
      const caught = makeNested();
      const complete = new CorjMaker({ omitExpectedValues: false });
      const compact = complete.with({ omitExpectedValues: true });
      const full = array
        ? complete.makeReportArray(caught)
        : complete.makeReportObject(caught);
      const report = array
        ? compact.makeReportArray(caught)
        : compact.makeReportObject(caught);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      const validateFull = array
        ? getReportArrayReportValidator('full')
        : getReportObjectReportValidator('full');
      expect(validate(report)).toBe(true);
      expect(validateFull(full)).toBe(true);
      expect(validate(full)).toBe(false);
      expect(validateFull(report)).toBe(false);

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
      expect(nodes[0]).not.toHaveProperty('constructor_name');
      expect(nodes[0]).not.toHaveProperty('message');
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

      // Round trip: the full report is reproduced exactly, formats included.
      const fullNodes = array
        ? (full as unknown[])
        : [full, ...(full as { children: unknown[] }).children];
      expect(fullNodes[0]).toMatchObject({
        as_string_format: 'String',
        as_json_format: 'safe-stable-stringify-with-length-limit',
        children_sources: ['cause', 'errors'],
      });
      expect(fullNodes[1]).not.toHaveProperty('children_sources');
      const restored = restoreExpectedValues(report);
      expect(restored).toEqual(full);
      expect(validateFull(restored)).toBe(true);
      // The input is not modified.
      expect(nodes[0]).not.toHaveProperty('instanceof_error');
    },
  );

  test('omitExpectedValues: false keeps every field', () => {
    const report = makeCorj(new Error('boom'), {
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
    const report = makeCorj(new Error('boom'), {
      stackFormat: 'lines',
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
    const report = makeCorj(new Custom('boom'));
    expect(report.as_string).toBe('custom text');
    expect((report.stack as string[])[0]).toBe('Error: boom');

    const noStack = makeCorj({ message: 'no stack' });
    expect(noStack.as_string).toBe('[object Object]');
    expect(noStack.as_json).toEqual({ message: 'no stack' });
    expect(noStack.instanceof_error).toBe(false);
    expect(noStack).not.toHaveProperty('typeof');

    const nullStack = makeCorj({ message: 'x', stack: null }, quiet);
    expect(nullStack.stack).toBeUndefined();
    expect(nullStack.as_string).toBe('[object Object]');
  });

  test('a stack without a newline equals as_string as a whole', () => {
    const report = makeCorj({
      stack: '[object Object]',
    });
    expect(report).not.toHaveProperty('as_string');
    expect(restoreExpectedValues(report).as_string).toBe('[object Object]');
  });

  test('non-expected values and failures are kept', () => {
    const report = makeCorj([], {
      childrenSources: ['cause'],
      metadata: true,
    });
    expect(report.as_json).toEqual([]);
    expect(report.children_sources).toEqual(['cause']);
    expect(report.instanceof_error).toBe(false);

    const custom = makeCorj({
      toCorjAsJson: () => ({}),
      toCorjAsString: () => '[object Object]',
    });
    expect(custom).not.toHaveProperty('as_json');
    expect(custom.as_json_format).toBe('.toCorjAsJson');
    expect(custom.as_string_format).toBe('.toCorjAsString');

    const reordered = makeCorj(1, {
      childrenSources: ['errors', 'cause'],
    });
    expect(reordered.children_sources).toEqual(['errors', 'cause']);
    expect(reordered.typeof).toBe('number');

    const failed = makeCorj(undefined, quiet);
    expect(failed.as_json).toBeNull();
    expect(failed.typeof).toBe('undefined');
  });

  test('applies to the children of an object report', () => {
    const report = {
      instanceof_error: true,
      typeof: 'object' as const,
      as_string: '[object Object]',
      as_json: {},
      as_string_format: 'String' as const,
      as_json_format: 'safe-stable-stringify-with-length-limit' as const,
      children_sources: ['cause', 'errors'],
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          instanceof_error: true,
          typeof: 'object' as const,
          as_string: 'Error: child',
          as_json: {},
          as_string_format: 'String' as const,
          as_json_format: 'safe-stable-stringify-with-length-limit' as const,
          stack: 'Error: child\n    at x',
        },
      ],
    };
    const compact = expectedValues.omitExpectedValues(report);
    // The child has neither constructor_name nor message, so as_string stays
    // as the signal that nothing is to be parsed from the stack line.
    expect(compact).toEqual({
      as_string: '[object Object]',
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          as_string: 'Error: child',
          stack: 'Error: child\n    at x',
        },
      ],
    });
    expect(restoreExpectedValues(compact)).toEqual(report);
    expect(getReportObjectReportValidator()(compact)).toBe(true);
  });

  test('restoreExpectedValues only fills in what can be derived', () => {
    const formats = {
      as_string_format: 'String',
      as_json_format: 'safe-stable-stringify-with-length-limit',
    };
    const rootFormats = { ...formats, children_sources: ['cause', 'errors'] };
    expect(restoreExpectedValues({})).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      ...rootFormats,
    });
    expect(restoreExpectedValues({ stack: [] })).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      stack: [],
      ...rootFormats,
    });
    expect(
      restoreExpectedValues({
        as_string: null,
        as_json: null,
        typeof: 'string',
        as_string_format: '.toCorjAsString',
        children_sources: ['cause'],
      }),
    ).toEqual({
      instanceof_error: true,
      typeof: 'string',
      as_string: null,
      as_json: null,
      as_string_format: '.toCorjAsString',
      as_json_format: 'safe-stable-stringify-with-length-limit',
      children_sources: ['cause'],
    });
    const rows = restoreExpectedValues([
      { id: 'root', path: '$', level: 0, stack: 'E: a\nb', child_ids: ['0'] },
      { id: '0', path: '$.cause', level: 1 },
    ]);
    expect(rows).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        stack: 'E: a\nb',
        child_ids: ['0'],
        as_string: 'E: a',
        constructor_name: 'E',
        message: 'a',
        instanceof_error: true,
        typeof: 'object',
        as_json: {},
        ...rootFormats,
      },
      {
        id: '0',
        path: '$.cause',
        level: 1,
        instanceof_error: true,
        typeof: 'object',
        as_json: {},
        ...formats,
      },
    ]);
    // An empty array has no root to fill in.
    expect(restoreExpectedValues([])).toEqual([]);
  });

  describe('with the report size limit', () => {
    test('an exactly fitting compact report is preserved', () => {
      const caught = makeNested();
      const unlimited = makeCorj(caught, {
        maxReportSize: null,
      });
      const size = Buffer.byteLength(JSON.stringify(unlimited), 'utf8');
      const exact = makeCorj(caught, {
        maxReportSize: size,
      });
      expect(exact).toEqual(unlimited);
      expect(exact).not.toHaveProperty('truncated');
    });

    test.each(['lines', 'string'] as const)(
      'a missing as_string always derives what the field would hold (stackFormat=%s)',
      (stackFormat) => {
        const marker = '[truncated]';
        const caught = new Error('m'.repeat(200));
        const complete = String(caught);
        let restoredFromTruncatedStack = 0;
        let kept = 0;
        for (
          let maxReportSize = 256;
          maxReportSize <= 700;
          maxReportSize += 3
        ) {
          const report = makeCorj(caught, {
            maxReportSize,
            metadata: false,
            stackFormat,
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
        // A truncated stack array cuts its first element more tightly than the
        // separately truncated as_string, so as_string is kept in that case.
        expect(restoredFromTruncatedStack > 0).toBe(stackFormat === 'string');
        expect(kept).toBeGreaterThan(0);
      },
    );

    test('keeps as_string omitted when the first stack line survives', () => {
      const caught = new Error('short');
      const report = makeCorj(caught, {
        maxReportSize: 512,
        metadata: false,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.truncated).toBe(true);
      expect((report.stack as string[])[0]).toBe('Error: short');
      expect(report).not.toHaveProperty('as_string');
      expect(restoreExpectedValues(report).as_string).toBe('Error: short');
    });

    test('the minimal fallback omits expected values as well', () => {
      const report = makeCorjArray(new Error('boom'), {
        maxReportSize: 256,
        makeReportId: () => 'x'.repeat(1_000),
      });
      expect(getReportArrayReportValidator()(report)).toBe(true);
      expect(report).toEqual([
        {
          id: 'root',
          path: '$',
          level: 0,
          truncated: true,
          as_string: '[truncated]',
          as_json: null,
        },
      ]);
      expect(restoreExpectedValues(report)[0]).toMatchObject({
        instanceof_error: true,
        typeof: 'object',
      });

      const kept = makeCorjArray(new Error('boom'), {
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
    const errors: [unknown, CorjErrorContext][] = [];
    const failure = new Error('cannot omit');
    jest.spyOn(expectedValues, 'omitExpectedValues').mockImplementation(() => {
      throw failure;
    });
    const report = makeCorj(new Error('boom'), {
      metadata: { $schema: true },
      onError: (error, context) => errors.push([error, context]),
    });
    expect(getReportObjectReportValidator('full')(report)).toBe(true);
    expect(report).toMatchObject({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      as_string: 'Error: boom',
      v: 'corj/v0.12-full',
      $schema: expect.stringContaining('/corj/v0.12-full/report-object.json'),
    });
    // Omission would run before and after the size limiter, but a failure
    // is reported once and the second pass is skipped so the report stays
    // consistently complete.
    expect(errors).toEqual([[failure, { stage: 'other', path: '$' }]]);
  });
});
