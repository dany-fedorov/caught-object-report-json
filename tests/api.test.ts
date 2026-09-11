import {
  CORJ_CIRCULAR_MARKER,
  CORJ_DEFAULT_OPTIONS,
  CORJ_EXPECTED_VALUES,
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_TRUNCATED_MARKER,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
  CaughtObjectReportJson,
  CaughtObjectReportJsonChild,
  CorjErrorContext,
  CorjMaker,
  CorjMakerOptions,
  CorjOptionsInput,
  CorjReport,
  CorjReportChild,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import { TRUNCATED_MARKER } from '../src/safe-stable-stringify';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

// The compile target predates `cause` and AggregateError; the runtime has both.
const ErrorWithCause = Error as unknown as new (
  message?: string,
  options?: { cause?: unknown },
) => Error;
const AggregateErrorCtor = (
  globalThis as unknown as {
    AggregateError: new (
      errors: Iterable<unknown>,
      message?: string,
      options?: { cause?: unknown },
    ) => Error & { errors: unknown[] };
  }
).AggregateError;

type ErrorCall = { caught: unknown; context: CorjErrorContext };

function collector() {
  const calls: ErrorCall[] = [];
  return {
    calls,
    onError: (caught: unknown, context: CorjErrorContext) => {
      calls.push({ caught, context });
    },
  };
}

const quiet: CorjOptionsInput = { onError: () => undefined };

function expectValidObject(
  report: CorjReport,
  kind: 'compact' | 'full' = 'compact',
) {
  const validate = getReportObjectReportValidator(kind);
  expect(validate(report)).toBe(true);
  expect(validate.errors).toBeNull();
}

function expectValidArray(
  report: CorjReportChild[],
  kind: 'compact' | 'full' = 'compact',
) {
  const validate = getReportArrayReportValidator(kind);
  expect(validate(report)).toBe(true);
  expect(validate.errors).toBeNull();
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('constants', () => {
  test('versions, links and markers', () => {
    expect(CORJ_VERSION).toBe('corj/v0.12');
    expect(CORJ_VERSION_FULL).toBe('corj/v0.12-full');
    expect(CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK).toMatch(
      /corj\/v0\.12\/report-object\.json$/,
    );
    expect(CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK).toMatch(
      /corj\/v0\.12\/report-array\.json$/,
    );
    expect(CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK).toMatch(
      /corj\/v0\.12-full\/report-object\.json$/,
    );
    expect(CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK).toMatch(
      /corj\/v0\.12-full\/report-array\.json$/,
    );
    expect(CORJ_TRUNCATED_MARKER).toBe('[truncated]');
    expect(CORJ_TRUNCATED_MARKER).toBe(TRUNCATED_MARKER);
    expect(CORJ_CIRCULAR_MARKER).toBe('[circular]');
  });

  test('expected values', () => {
    expect(CORJ_EXPECTED_VALUES).toEqual({
      instanceof_error: true,
      typeof: 'object',
      as_json: {},
      as_string_format: 'String',
      as_json_format: 'safe-stable-stringify-with-length-limit',
      children_sources: ['cause', 'errors'],
    });
    expect(Object.isFrozen(CORJ_EXPECTED_VALUES)).toBe(true);
    expect(Object.isFrozen(CORJ_EXPECTED_VALUES.children_sources)).toBe(true);
  });

  test('default options', () => {
    expect(CORJ_DEFAULT_OPTIONS).toMatchInlineSnapshot(`
      Object {
        "childrenSources": Array [
          "cause",
          "errors",
        ],
        "makeReportId": [Function],
        "maxChildren": 100,
        "maxDepth": 5,
        "maxReportSize": 100000,
        "metadata": Object {
          "$schema": false,
          "v": true,
        },
        "omitExpectedValues": true,
        "onError": [Function],
        "reportSizeUnit": "utf8-bytes",
        "stackFormat": "lines",
      }
    `);
    expect(Object.isFrozen(CORJ_DEFAULT_OPTIONS)).toBe(true);
    expect(
      CORJ_DEFAULT_OPTIONS.makeReportId({
        index: -1,
        level: 0,
        path: '$',
        caught: 1,
      }),
    ).toBe('root');
    expect(
      CORJ_DEFAULT_OPTIONS.makeReportId({
        index: 7,
        level: 1,
        path: '$.cause',
        caught: 1,
      }),
    ).toBe('7');
  });

  test('deprecated type aliases still name the new types', () => {
    const report: CaughtObjectReportJson = makeCorj(new ErrorWithCause('x'));
    const rows: CaughtObjectReportJsonChild[] = makeCorjArray(
      new ErrorWithCause('x'),
    );
    const options: CorjMakerOptions = new CorjMaker().options;
    expect(report.v).toBe(CORJ_VERSION);
    expect(rows[0]!.id).toBe('root');
    expect(options.maxDepth).toBe(5);
  });
});

describe('options', () => {
  test('no options means the defaults', () => {
    const { options } = new CorjMaker();
    expect(options).toBe(CORJ_DEFAULT_OPTIONS);
    expect(new CorjMaker(undefined).options).toBe(CORJ_DEFAULT_OPTIONS);
  });

  test('an explicitly undefined option means the default', () => {
    const { options } = new CorjMaker({
      maxDepth: undefined,
      metadata: undefined,
      maxReportSize: undefined,
      onError: undefined,
    } as unknown as CorjOptionsInput);
    expect(options).toEqual(CORJ_DEFAULT_OPTIONS);
  });

  test('unknown option names are rejected, including the v8 names', () => {
    for (const name of [
      'maxChildrenLevel',
      'metadataFields',
      'childrenMetadataFields',
      'parseStackToArray',
      'onCaughtMaking',
      'printWarningsOnUnhandledErrors',
      'asJsonFormatsToApply',
      'asStringFormatsToApply',
      'typo',
    ]) {
      expect(() => new CorjMaker({ [name]: 1 } as CorjOptionsInput)).toThrow(
        new TypeError(
          `Unknown option "${name}". Known options: maxReportSize, reportSizeUnit, omitExpectedValues, stackFormat, metadata, maxDepth, maxChildren, childrenSources, makeReportId, onError`,
        ),
      );
    }
  });

  test('options must be an object', () => {
    expect(() => new CorjMaker(null as unknown as CorjOptionsInput)).toThrow(
      TypeError,
    );
    expect(() => new CorjMaker(5 as unknown as CorjOptionsInput)).toThrow(
      TypeError,
    );
    expect(() => makeCorj(1, 'x' as unknown as CorjOptionsInput)).toThrow(
      TypeError,
    );
  });

  test.each<[CorjOptionsInput, ErrorConstructor, string]>([
    [{ maxReportSize: 255 }, RangeError, 'maxReportSize'],
    [{ maxReportSize: 1.5 }, RangeError, 'maxReportSize'],
    [{ reportSizeUnit: 'bytes' as never }, TypeError, 'reportSizeUnit'],
    [{ omitExpectedValues: 'yes' as never }, TypeError, 'omitExpectedValues'],
    [{ stackFormat: 'array' as never }, TypeError, 'stackFormat'],
    [{ maxDepth: -1 }, RangeError, 'maxDepth'],
    [{ maxDepth: 1.5 }, RangeError, 'maxDepth'],
    [{ maxDepth: '5' as never }, RangeError, 'maxDepth'],
    [{ maxChildren: -1 }, RangeError, 'maxChildren'],
    [{ maxChildren: Infinity }, RangeError, 'maxChildren'],
    [{ childrenSources: 'cause' as never }, TypeError, 'childrenSources'],
    [{ childrenSources: ['cause', 1] as never }, TypeError, 'childrenSources'],
    [{ makeReportId: 'id' as never }, TypeError, 'makeReportId'],
    [{ onError: null as never }, TypeError, 'onError'],
    [{ metadata: 'all' as never }, TypeError, 'metadata'],
    [{ metadata: null as never }, TypeError, 'metadata'],
    [{ metadata: { v: 'yes' as never } }, TypeError, 'metadata'],
    [{ metadata: { $schema: 1 as never } }, TypeError, 'metadata'],
  ])('invalid option %j throws', (input, errorType, name) => {
    expect(() => new CorjMaker(input)).toThrow(errorType);
    expect(() => new CorjMaker(input)).toThrow(name);
    expect(() => makeCorj(1, input)).toThrow(errorType);
    expect(() => makeCorjArray(1, input)).toThrow(errorType);
  });

  test('resolved options are frozen', () => {
    const maker = new CorjMaker({
      childrenSources: ['cause'],
      metadata: { $schema: true },
    });
    expect(Object.isFrozen(maker.options)).toBe(true);
    expect(Object.isFrozen(maker.options.metadata)).toBe(true);
    expect(Object.isFrozen(maker.options.childrenSources)).toBe(true);
    expect(() => {
      (maker.options as { maxDepth: number }).maxDepth = 1;
    }).toThrow(TypeError);
    expect(() => {
      (maker.options.childrenSources as string[]).push('errors');
    }).toThrow(TypeError);
  });

  test('childrenSources is copied, so later mutation of the input has no effect', () => {
    const sources = ['rootCause'];
    const maker = new CorjMaker({ ...quiet, childrenSources: sources });
    sources.push('cause');
    const caught: Record<string, unknown> = {
      rootCause: new ErrorWithCause('a'),
      cause: new ErrorWithCause('b'),
    };
    expect(maker.makeReportObject(caught).children?.map((c) => c.path)).toEqual(
      ['$.rootCause'],
    );
  });

  test('metadata forms', () => {
    const caught = new ErrorWithCause('m');
    expect(makeCorj(caught)).toMatchObject({ v: CORJ_VERSION });
    expect(makeCorj(caught)).not.toHaveProperty('$schema');
    const both = makeCorj(caught, { metadata: true });
    expect(both.v).toBe(CORJ_VERSION);
    expect(both.$schema).toBe(CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK);
    const none = makeCorj(caught, { metadata: false });
    expect(none).not.toHaveProperty('v');
    expect(none).not.toHaveProperty('$schema');
    const schemaOnly = makeCorj(caught, {
      metadata: { v: false, $schema: true },
    });
    expect(schemaOnly).not.toHaveProperty('v');
    expect(schemaOnly.$schema).toBe(CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK);
    const partial = makeCorj(caught, { metadata: { $schema: true } });
    expect(partial.v).toBe(CORJ_VERSION);
    expect(partial.$schema).toBe(CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK);
    expect(new CorjMaker({ metadata: {} }).options.metadata).toEqual({
      v: true,
      $schema: false,
    });
  });

  test('full reports link to the full schemas', () => {
    const caught = new ErrorWithCause('m');
    const object = makeCorj(caught, {
      metadata: true,
      omitExpectedValues: false,
    });
    expect(object.v).toBe(CORJ_VERSION_FULL);
    expect(object.$schema).toBe(CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK);
    expectValidObject(object, 'full');
    const array = makeCorjArray(caught, {
      metadata: true,
      omitExpectedValues: false,
    });
    expect(array[0]!.v).toBe(CORJ_VERSION_FULL);
    expect(array[0]!.$schema).toBe(CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK);
    expectValidArray(array, 'full');
    const compactArray = makeCorjArray(caught, { metadata: true });
    expect(compactArray[0]!.$schema).toBe(CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK);
    expectValidArray(compactArray);
  });

  test('with() layers options over the maker without changing it', () => {
    const base = new CorjMaker({
      maxDepth: 2,
      metadata: { $schema: true },
      childrenSources: ['cause'],
    });
    const derived = base.with({ maxDepth: 3, metadata: { v: false } });
    expect(base.options.maxDepth).toBe(2);
    expect(derived.options.maxDepth).toBe(3);
    expect(derived.options.metadata).toEqual({ v: false, $schema: true });
    expect(derived.options.childrenSources).toEqual(['cause']);
    expect(derived.options.onError).toBe(base.options.onError);
    expect(base.with({}).options).toEqual(base.options);
    expect(base.with({ metadata: true }).options.metadata).toEqual({
      v: true,
      $schema: true,
    });
    expect(base.with({ metadata: false }).options.metadata).toEqual({
      v: false,
      $schema: false,
    });
    expect(() => base.with({ maxDepth: -1 })).toThrow(RangeError);
    expect(() => base.with({ nope: 1 } as CorjOptionsInput)).toThrow(TypeError);
  });

  test('makeCorj without options and with options agree with a maker', () => {
    const caught = new ErrorWithCause('same');
    expect(makeCorj(caught)).toEqual(new CorjMaker().makeReportObject(caught));
    expect(makeCorj(caught, { metadata: false })).toEqual(
      new CorjMaker({ metadata: false }).makeReportObject(caught),
    );
    expect(makeCorjArray(caught)).toEqual(
      new CorjMaker().makeReportArray(caught),
    );
    expect(makeCorjArray(caught, { metadata: false })).toEqual(
      new CorjMaker({ metadata: false }).makeReportArray(caught),
    );
  });
});

describe('child discovery', () => {
  test('custom childrenSources work without cause or errors present', () => {
    const caught = Object.assign(new ErrorWithCause('outer'), {
      rootCause: new ErrorWithCause('inner'),
    });
    const report = makeCorj(caught, {
      ...quiet,
      childrenSources: ['rootCause'],
    });
    expect(report.children?.map((c) => c.path)).toEqual(['$.rootCause']);
    expect(report.children_sources).toEqual(['rootCause']);
    expect(report.as_json).toBeUndefined();
    expectValidObject(report);
  });

  test('a non-default childrenSources is reported on the root only', () => {
    const caught = { a: { a: { a: 1 } } };
    const report = makeCorj(caught, { ...quiet, childrenSources: ['a'] });
    expect(report.children_sources).toEqual(['a']);
    expect(report.children).toHaveLength(3);
    for (const child of report.children!) {
      expect(child).not.toHaveProperty('children_sources');
      expect(child).not.toHaveProperty('v');
    }
    const rows = makeCorjArray(caught, { ...quiet, childrenSources: ['a'] });
    expect(rows[0]!.children_sources).toEqual(['a']);
    expect(rows.slice(1).every((row) => !('children_sources' in row))).toBe(
      true,
    );
  });

  test('undefined children and array holes are skipped, null and primitives are not', () => {
    const errors: unknown[] = [undefined, null, 0, ''];
    errors[6] = 'six';
    const caught = { cause: undefined, errors };
    const report = makeCorj(caught, quiet);
    expect(
      report.children?.map((c) => [c.path, c.typeof ?? 'object', c.as_string]),
    ).toEqual([
      ['$.errors[1]', 'object', 'null'],
      ['$.errors[2]', 'number', '0'],
      ['$.errors[3]', 'string', ''],
      ['$.errors[6]', 'string', 'six'],
    ]);
    expectValidObject(report);
  });

  test('a non-array source gives one child, an array source one child per element', () => {
    const caught = new AggregateErrorCtor(
      [new ErrorWithCause('a'), new ErrorWithCause('b')],
      'agg',
      {
        cause: new ErrorWithCause('c'),
      },
    );
    const report = makeCorj(caught);
    expect(report.children?.map((c) => [c.id, c.path, c.level])).toEqual([
      ['0', '$.cause', 1],
      ['1', '$.errors[0]', 1],
      ['2', '$.errors[1]', 1],
    ]);
  });

  test('children are discovered breadth-first, so ids grow with the level', () => {
    const caught = new ErrorWithCause('0', {
      cause: new AggregateErrorCtor(
        [
          new ErrorWithCause('1a', { cause: new ErrorWithCause('2a') }),
          new ErrorWithCause('1b'),
        ],
        'x',
      ),
    });
    const report = makeCorj(caught);
    expect(
      report.children?.map((c) => [c.id, c.level, c.path, c.child_ids]),
    ).toEqual([
      ['0', 1, '$.cause', ['1', '2']],
      ['1', 2, '$.cause.errors[0]', ['3']],
      ['2', 2, '$.cause.errors[1]', undefined],
      ['3', 3, '$.cause.errors[0].cause', undefined],
    ]);
  });

  test('maxDepth limits the levels and marks the node whose children were cut', () => {
    const caught = new ErrorWithCause('0', {
      cause: new ErrorWithCause('1', { cause: new ErrorWithCause('2') }),
    });
    const depth0 = makeCorj(caught, { maxDepth: 0 });
    expect(depth0.children).toBeUndefined();
    expect(depth0.children_omitted).toBe('max_depth');
    const depth1 = makeCorj(caught, { maxDepth: 1 });
    expect(depth1.children_omitted).toBeUndefined();
    expect(depth1.children).toHaveLength(1);
    expect(depth1.children![0]!.children_omitted).toBe('max_depth');
    expect(depth1.children![0]!.child_ids).toBeUndefined();
    const depth2 = makeCorj(caught, { maxDepth: 2 });
    expect(depth2.children).toHaveLength(2);
    expect(depth2.children!.some((c) => c.children_omitted)).toBe(false);
    expectValidObject(depth0);
    expectValidObject(depth1);
    const rows = makeCorjArray(caught, { maxDepth: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.children_omitted).toBe('max_depth');
    expectValidArray(rows);
  });

  test('a node without child sources at the depth limit is not marked', () => {
    const caught = new ErrorWithCause('0', { cause: new ErrorWithCause('1') });
    const report = makeCorj(caught, { maxDepth: 1 });
    expect(report.children![0]!.children_omitted).toBeUndefined();
  });

  test('maxChildren caps the number of child reports', () => {
    const wide = new AggregateErrorCtor(
      Array.from({ length: 300 }, (_, i) => new ErrorWithCause(`e${i}`)),
      'wide',
    );
    const report = makeCorj(wide, quiet);
    expect(report.children).toHaveLength(100);
    expect(report.children_omitted).toBe('max_children');
    const none = makeCorj(wide, { ...quiet, maxChildren: 0 });
    expect(none.children).toBeUndefined();
    expect(none.children_omitted).toBe('max_children');
    const three = makeCorj(wide, { ...quiet, maxChildren: 3 });
    expect(three.children?.map((c) => c.path)).toEqual([
      '$.errors[0]',
      '$.errors[1]',
      '$.errors[2]',
    ]);
    expect(three.children_omitted).toBe('max_children');
    expectValidObject(three);
    const chain = new ErrorWithCause('0', {
      cause: new ErrorWithCause('1', {
        cause: new ErrorWithCause('2', { cause: new ErrorWithCause('3') }),
      }),
    });
    const two = makeCorj(chain, { ...quiet, maxChildren: 2 });
    expect(two.children?.map((c) => [c.path, c.children_omitted])).toEqual([
      ['$.cause', undefined],
      ['$.cause.cause', 'max_children'],
    ]);
    expect(two.children_omitted).toBeUndefined();
  });

  test('a sparse array is not walked hole by hole', () => {
    const errors: unknown[] = [];
    errors[999_999_999] = new ErrorWithCause('last');
    errors[5] = 'five';
    const start = Date.now();
    const report = makeCorj({ errors }, quiet);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(report.children?.map((c) => c.path)).toEqual([
      '$.errors[5]',
      '$.errors[999999999]',
    ]);
    const lengthOnly = {
      errors: new Proxy([], {
        get: (target, prop) =>
          prop === 'length' ? 1e9 : Reflect.get(target, prop),
      }),
    };
    expect(makeCorj(lengthOnly, quiet).children).toBeUndefined();
  });

  test('non-index properties of an array source are ignored', () => {
    const errors: unknown[] = ['a'];
    Object.assign(errors, { extra: 'b', '01': 'c', '-1': 'd' });
    const report = makeCorj({ errors }, quiet);
    expect(report.children?.map((c) => c.path)).toEqual(['$.errors[0]']);
  });

  test('an object that appears twice is reported once and referenced by id', () => {
    const shared = new ErrorWithCause('shared');
    const caught = new AggregateErrorCtor(
      [
        new ErrorWithCause('a', { cause: shared }),
        new ErrorWithCause('b', { cause: shared }),
      ],
      'agg',
    );
    const report = makeCorj(caught);
    expect(report.children?.map((c) => [c.id, c.path, c.child_ids])).toEqual([
      ['0', '$.errors[0]', ['2']],
      ['1', '$.errors[1]', ['2']],
      ['2', '$.errors[0].cause', undefined],
    ]);
    expectValidObject(report);
    const rows = makeCorjArray(caught);
    expect(rows.map((r) => [r.id, r.child_ids])).toEqual([
      ['root', ['0', '1']],
      ['0', ['2']],
      ['1', ['2']],
      ['2', undefined],
    ]);
    expectValidArray(rows);
  });

  test('a cycle back to the root references the root id', () => {
    const caught = new ErrorWithCause('root');
    const child = new ErrorWithCause('child', { cause: caught });
    (caught as { cause?: unknown }).cause = child;
    const report = makeCorj(caught);
    expect(report.children?.map((c) => [c.id, c.child_ids])).toEqual([
      ['0', ['root']],
    ]);
    const rows = makeCorjArray(caught, {
      makeReportId: ({ index }) => `#${index}`,
    });
    expect(rows.map((r) => [r.id, r.child_ids])).toEqual([
      ['#-1', ['#0']],
      ['#0', ['#-1']],
    ]);
    expectValidArray(rows);
  });

  test('a self-referencing wide aggregate finishes instantly', () => {
    const caught = new AggregateErrorCtor([], 'agg');
    caught.errors = Array(16).fill(caught);
    const start = Date.now();
    const report = makeCorj(caught, quiet);
    expect(Date.now() - start).toBeLessThan(200);
    expect(report.children).toBeUndefined();
    expect(report.children_omitted).toBeUndefined();
    const rows = makeCorjArray(caught, quiet);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.child_ids).toEqual(Array(16).fill('root'));
  });

  test('references do not count towards maxChildren', () => {
    const shared = new ErrorWithCause('shared');
    const caught = {
      errors: [shared, shared, shared, new ErrorWithCause('other')],
    };
    const report = makeCorj(caught, { ...quiet, maxChildren: 2 });
    expect(report.children?.map((c) => c.path)).toEqual([
      '$.errors[0]',
      '$.errors[3]',
    ]);
    expect(report.children_omitted).toBeUndefined();
  });

  test('primitives repeated in the tree are reported each time', () => {
    const report = makeCorj({ errors: ['x', 'x'] }, quiet);
    expect(report.children?.map((c) => c.path)).toEqual([
      '$.errors[0]',
      '$.errors[1]',
    ]);
  });

  test('makeReportId receives the discovery context once per node', () => {
    const contexts: unknown[] = [];
    const caught = new ErrorWithCause('0', { cause: new ErrorWithCause('1') });
    const rows = makeCorjArray(caught, {
      makeReportId: (context) => {
        contexts.push({ ...context });
        return `${context.level}:${context.path}`;
      },
    });
    expect(contexts).toEqual([
      { index: -1, level: 0, path: '$', caught },
      {
        index: 0,
        level: 1,
        path: '$.cause',
        caught: (caught as { cause?: unknown }).cause,
      },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['0:$', '1:$.cause']);
    expect(rows[0]!.child_ids).toEqual(['1:$.cause']);
  });

  test('a makeReportId that throws or returns a non-string falls back to the default id', () => {
    const errors = collector();
    const caught = new ErrorWithCause('0', { cause: new ErrorWithCause('1') });
    const rows = makeCorjArray(caught, {
      onError: errors.onError,
      makeReportId: ({ index }) => {
        if (index === -1) throw new ErrorWithCause('no id for root');
        return 42 as unknown as string;
      },
    });
    expect(rows.map((r) => r.id)).toEqual(['root', '0']);
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'other', path: '$', key: 'id' },
      { stage: 'other', path: '$.cause', key: 'id' },
    ]);
    expect(String(errors.calls[0]!.caught)).toBe('Error: no id for root');
    expect(String(errors.calls[1]!.caught)).toBe(
      'TypeError: makeReportId must return a string, got 42',
    );
    expectValidArray(rows);
  });
});

describe('hostile caught objects', () => {
  test('a proxy whose has and get traps throw still yields a report', () => {
    const errors = collector();
    const caught = new Proxy(
      {},
      {
        has() {
          throw new ErrorWithCause('has trap');
        },
        get() {
          throw new ErrorWithCause('get trap');
        },
      },
    );
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report).toEqual({
      instanceof_error: false,
      constructor_name: null,
      message: null,
      as_string: null,
      stack: null,
      as_json: null,
      v: CORJ_VERSION,
    });
    expectValidObject(report);
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'children', path: '$', key: 'children', prop: 'cause' },
      { stage: 'children', path: '$', key: 'children', prop: 'errors' },
      {
        stage: 'prop-access',
        path: '$',
        key: 'constructor_name',
        prop: 'constructor',
      },
      { stage: 'prop-access', path: '$', key: 'message', prop: 'message' },
      { stage: 'prop-access', path: '$', key: 'stack', prop: 'stack' },
      {
        stage: 'prop-access',
        path: '$',
        key: 'as_string',
        prop: 'toCorjAsString',
      },
      { stage: 'as_string', path: '$', key: 'as_string' },
      { stage: 'prop-access', path: '$', key: 'as_json', prop: 'toCorjAsJson' },
      { stage: 'as_json', path: '$', key: 'as_json' },
    ]);
    expect(makeCorjArray(caught, quiet)).toHaveLength(1);
  });

  test('a proxy whose getPrototypeOf trap throws breaks instanceof only', () => {
    const errors = collector();
    const caught = new Proxy(new ErrorWithCause('proxied'), {
      getPrototypeOf() {
        throw new ErrorWithCause('proto trap');
      },
    });
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report.instanceof_error).toBe(false);
    expect(report.constructor_name).toBe('Error');
    expect(report.message).toBe('proxied');
    expect(report.as_string).toBe('Error: proxied');
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'other', path: '$', key: 'instanceof_error' },
    ]);
  });

  test('a throwing array keys or element getter is reported and skipped', () => {
    const errors = collector();
    const keysThrow = {
      errors: new Proxy([1], {
        ownKeys() {
          throw new ErrorWithCause('keys trap');
        },
      }),
    };
    expect(
      makeCorj(keysThrow, { onError: errors.onError }).children,
    ).toBeUndefined();
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'children', path: '$', key: 'children', prop: 'errors' },
    ]);
    errors.calls.length = 0;
    const elementThrows = {
      errors: new Proxy(['a', 'b', 'c'], {
        get(target, prop) {
          if (prop === '1') throw new ErrorWithCause('element trap');
          return Reflect.get(target, prop);
        },
      }),
    };
    const report = makeCorj(elementThrows, { onError: errors.onError });
    expect(report.children?.map((c) => c.path)).toEqual([
      '$.errors[0]',
      '$.errors[2]',
    ]);
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'children', path: '$', key: 'children', prop: '1' },
    ]);
  });

  test('a child whose child source getter throws is marked in the error path', () => {
    const errors = collector();
    const child = Object.defineProperty(new ErrorWithCause('child'), 'cause', {
      get() {
        throw new ErrorWithCause('cause trap');
      },
    });
    const report = makeCorj(new ErrorWithCause('root', { cause: child }), {
      onError: errors.onError,
    });
    expect(report.children).toHaveLength(1);
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'children', path: '$.cause', key: 'child_ids', prop: 'cause' },
    ]);
  });

  test('constructor edge cases', () => {
    expect(makeCorj(Object.create(null), quiet)).not.toHaveProperty(
      'constructor_name',
    );
    expect(makeCorj({ constructor: null }, quiet)).not.toHaveProperty(
      'constructor_name',
    );
    expect(makeCorj({ constructor: { name: 5 } }, quiet)).not.toHaveProperty(
      'constructor_name',
    );
    expect(
      makeCorj({ constructor: { name: 'Custom' } }, quiet).constructor_name,
    ).toBe('Custom');
    const nameThrows = {
      constructor: Object.defineProperty({}, 'name', {
        get() {
          throw new ErrorWithCause('name trap');
        },
      }),
    };
    const errors = collector();
    expect(
      makeCorj(nameThrows, { onError: errors.onError }).constructor_name,
    ).toBeNull();
    expect(errors.calls[0]!.context).toEqual({
      stage: 'prop-access',
      path: '$',
      key: 'constructor_name',
      prop: 'name',
    });
    expect(makeCorj('str', quiet).constructor_name).toBe('String');
    expect(makeCorj(BigInt(1), quiet).constructor_name).toBe('BigInt');
    expect(makeCorj(Symbol('s'), quiet).constructor_name).toBe('Symbol');
  });

  test('String() failing gives as_string null', () => {
    const errors = collector();
    const caught = {
      [Symbol.toPrimitive]() {
        throw new ErrorWithCause('no primitive');
      },
    };
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report.as_string).toBeNull();
    expect(report.as_string_format).toBeUndefined();
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'as_string', path: '$', key: 'as_string' },
    ]);
    expect(restoreExpectedValues(report).as_string_format).toBe('String');
  });

  test('values without a JSON form give as_json null without an error', () => {
    const errors = collector();
    for (const caught of [undefined, () => 1, Symbol('s')]) {
      const report = makeCorj(caught, { onError: errors.onError });
      expect(report.as_json).toBeNull();
      expect(report.instanceof_error).toBe(false);
      expectValidObject(report);
    }
    expect(errors.calls).toEqual([]);
    expect(makeCorj(undefined, quiet)).toEqual({
      instanceof_error: false,
      typeof: 'undefined',
      as_string: 'undefined',
      as_json: null,
      v: CORJ_VERSION,
    });
  });

  test('a serializer failure inside as_json is reported', () => {
    const errors = collector();
    const caught = {
      toJSON() {
        throw new ErrorWithCause('toJSON trap');
      },
    };
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report.as_json).toBeNull();
    expect(errors.calls.map((c) => c.context)).toEqual([
      { stage: 'as_json', path: '$', key: 'as_json' },
    ]);
  });

  test('circular values inside as_json use the circular marker', () => {
    const caught: Record<string, unknown> = { name: 'loop' };
    caught['self'] = caught;
    expect(makeCorj(caught, quiet).as_json).toEqual({
      name: 'loop',
      self: CORJ_CIRCULAR_MARKER,
    });
  });

  test('child sources are excluded from as_json at the top level only', () => {
    const caught = { cause: { cause: 'deep' }, nested: { cause: 'kept' } };
    const report = makeCorj(caught, quiet);
    expect(report.as_json).toEqual({ nested: { cause: 'kept' } });
    expect(report.children![0]!.as_json).toBeUndefined();
    expect(report.children![1]!.as_json).toBe('deep');
    expect(report.children!.map((c) => c.path)).toEqual([
      '$.cause',
      '$.cause.cause',
    ]);
  });

  test('a bigint is serialized as a number', () => {
    expect(makeCorj(BigInt(10), quiet).as_json).toBe(10);
    expect(makeCorj({ big: BigInt(10) }, quiet).as_json).toEqual({ big: 10 });
  });
});

describe('custom formats', () => {
  test('toCorjAsString and toCorjAsJson are used when they return usable values', () => {
    const calls: unknown[] = [];
    const caught = {
      toCorjAsString(this: unknown, context: unknown) {
        calls.push(['string', this, context]);
        return 'custom string';
      },
      toCorjAsJson(this: unknown, context: unknown) {
        calls.push(['json', this, context]);
        return { custom: true };
      },
    };
    const maker = new CorjMaker(quiet);
    const report = maker.makeReportObject(caught);
    expect(report.as_string).toBe('custom string');
    expect(report.as_string_format).toBe('.toCorjAsString');
    expect(report.as_json).toEqual({ custom: true });
    expect(report.as_json_format).toBe('.toCorjAsJson');
    expect(calls).toEqual([
      ['string', caught, { path: '$', options: maker.options }],
      ['json', caught, { path: '$', options: maker.options }],
    ]);
    expectValidObject(report);
    const full = maker
      .with({ omitExpectedValues: false })
      .makeReportObject(caught);
    expect(full.as_string_format).toBe('.toCorjAsString');
    expectValidObject(full, 'full');
  });

  test('custom formats on a child are reported on that child', () => {
    const caught = new ErrorWithCause('root', {
      cause: {
        toCorjAsJson: () => 'child json',
        toCorjAsString: () => 'child string',
      },
    });
    const report = makeCorj(caught, quiet);
    expect(report.as_json_format).toBeUndefined();
    expect(report.children![0]).toMatchObject({
      path: '$.cause',
      as_string: 'child string',
      as_json: 'child json',
      as_string_format: '.toCorjAsString',
      as_json_format: '.toCorjAsJson',
    });
    expectValidObject(report);
  });

  test('methods that throw are reported and the default format is used', () => {
    const errors = collector();
    const caught = {
      toCorjAsString() {
        throw new ErrorWithCause('string boom');
      },
      toCorjAsJson() {
        throw new ErrorWithCause('json boom');
      },
      value: 1,
    };
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report.as_string).toBe('[object Object]');
    expect(report.as_json).toEqual({ value: 1 });
    expect(report.as_string_format).toBeUndefined();
    expect(report.as_json_format).toBeUndefined();
    expect(errors.calls.map((c) => [String(c.caught), c.context])).toEqual([
      [
        'Error: string boom',
        {
          stage: 'as_string',
          path: '$',
          key: 'as_string',
          prop: 'toCorjAsString',
        },
      ],
      [
        'Error: json boom',
        { stage: 'as_json', path: '$', key: 'as_json', prop: 'toCorjAsJson' },
      ],
    ]);
  });

  test('methods that return unusable values fall back silently', () => {
    const errors = collector();
    const caught = {
      toCorjAsString: () => 42,
      toCorjAsJson: () => undefined,
      value: 1,
    };
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report.as_string).toBe('[object Object]');
    expect(report.as_json).toEqual({ value: 1 });
    expect(errors.calls).toEqual([]);
    const notFunctions = makeCorj(
      { toCorjAsString: 'x', toCorjAsJson: 1 },
      { onError: errors.onError },
    );
    expect(notFunctions.as_string).toBe('[object Object]');
    expect(notFunctions.as_json).toEqual({
      toCorjAsString: 'x',
      toCorjAsJson: 1,
    });
    expect(errors.calls).toEqual([]);
  });

  test('a toCorjAsJson result that does not fit is truncated and flagged', () => {
    const caught = { toCorjAsJson: () => ({ big: 'x'.repeat(5000) }) };
    const report = makeCorj(caught, { ...quiet, maxReportSize: 512 });
    expect(report.truncated).toBe(true);
    expect(report.as_json_format).toBe('.toCorjAsJson');
    expect(
      (report.as_json as { big: string }).big.endsWith(CORJ_TRUNCATED_MARKER),
    ).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(report))).toBeLessThanOrEqual(512);
    expectValidObject(report);
  });
});

describe('error handling', () => {
  test('the default handler warns once per failure with the context', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const caught = Object.defineProperty(new ErrorWithCause('x'), 'message', {
      get() {
        throw new ErrorWithCause('message trap');
      },
    });
    makeCorj(caught);
    // V8 formats `stack` lazily through `message`, and String() reads it too.
    expect(warn.mock.calls.map((call) => call[0])).toEqual([
      '[caught-object-report-json] stage=prop-access path=$ field=message prop=message: Error: message trap',
      '[caught-object-report-json] stage=prop-access path=$ field=stack prop=stack: Error: message trap',
      '[caught-object-report-json] stage=as_string path=$ field=as_string: Error: message trap',
    ]);
    warn.mockClear();
    const unprintable = {
      [Symbol.toPrimitive]() {
        throw new ErrorWithCause('no primitive');
      },
    };
    makeCorj({
      toCorjAsJson: () => {
        throw unprintable;
      },
    });
    expect(warn.mock.calls[0]![0]).toBe(
      '[caught-object-report-json] stage=as_json path=$ field=as_json prop=toCorjAsJson: [unprintable value]',
    );
    warn.mockClear();
    makeCorj(1, {
      makeReportId: () => {
        throw new ErrorWithCause('id');
      },
    });
    expect(warn.mock.calls[0]![0]).toBe(
      '[caught-object-report-json] stage=other path=$ field=id: Error: id',
    );
    warn.mockClear();
    const reportSize = jest.requireActual(
      '../src/report-size',
    ) as typeof import('../src/report-size');
    jest.spyOn(reportSize, 'limitReportSize').mockImplementationOnce(() => {
      throw new Error('limit broke');
    });
    makeCorj(1);
    expect(warn.mock.calls[0]![0]).toBe(
      '[caught-object-report-json] stage=limit path=$: Error: limit broke',
    );
  });

  test('a throwing onError is contained', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const caught = Object.defineProperty({}, 'stack', {
      get() {
        throw new ErrorWithCause('stack trap');
      },
    });
    const report = makeCorj(caught, {
      onError: () => {
        throw new ErrorWithCause('handler broke');
      },
    });
    expect(report.stack).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[caught-object-report-json] onError threw: Error: handler broke',
    );
  });

  test('errors in nested nodes carry the node path', () => {
    const errors = collector();
    const child = Object.defineProperty({}, 'message', {
      get() {
        throw new ErrorWithCause('child message trap');
      },
    });
    makeCorj({ errors: [1, child] }, { onError: errors.onError });
    expect(errors.calls.map((c) => c.context)).toEqual([
      {
        stage: 'prop-access',
        path: '$.errors[1]',
        key: 'message',
        prop: 'message',
      },
    ]);
  });

  test('a failure while omitting expected values keeps the complete report', () => {
    const errors = collector();
    const expectedValues = jest.requireActual(
      '../src/expected-values',
    ) as typeof import('../src/expected-values');
    const spy = jest
      .spyOn(expectedValues, 'omitExpectedValues')
      .mockImplementationOnce(() => {
        throw new ErrorWithCause('omit broke');
      });
    const report = makeCorj(new ErrorWithCause('x'), {
      onError: errors.onError,
      metadata: true,
    });
    expect(spy).toHaveBeenCalled();
    expect(report.v).toBe(CORJ_VERSION_FULL);
    expect(report.$schema).toBe(CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK);
    expect(report.instanceof_error).toBe(true);
    expect(errors.calls.map((c) => [String(c.caught), c.context])).toEqual([
      ['Error: omit broke', { stage: 'other', path: '$' }],
    ]);
  });

  test('a failure while limiting the size gives a minimal report', () => {
    const errors = collector();
    const reportSize = jest.requireActual(
      '../src/report-size',
    ) as typeof import('../src/report-size');
    jest.spyOn(reportSize, 'limitReportSize').mockImplementation(() => {
      throw new ErrorWithCause('limit broke');
    });
    const caught = new ErrorWithCause('x', { cause: new ErrorWithCause('y') });
    const report = makeCorj(caught, { onError: errors.onError });
    expect(report).toEqual({
      truncated: true,
      as_string: CORJ_TRUNCATED_MARKER,
      as_json: null,
      children_omitted: 'max_size',
    });
    expectValidObject(report);
    const rows = makeCorjArray(caught, { onError: errors.onError });
    expect(rows).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        truncated: true,
        as_string: CORJ_TRUNCATED_MARKER,
        as_json: null,
        children_omitted: 'max_size',
      },
    ]);
    expectValidArray(rows);
    const leaf = makeCorj('str', { onError: errors.onError });
    expect(leaf).toEqual({
      truncated: true,
      instanceof_error: false,
      typeof: 'string',
      as_string: CORJ_TRUNCATED_MARKER,
      as_json: null,
    });
    expect(makeCorjArray('str', { onError: errors.onError })).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        truncated: true,
        instanceof_error: false,
        typeof: 'string',
        as_string: CORJ_TRUNCATED_MARKER,
        as_json: null,
      },
    ]);
    expect(
      errors.calls.every(
        (c) => c.context.stage === 'limit' && c.context.path === '$',
      ),
    ).toBe(true);
    expect(errors.calls).toHaveLength(4);
  });
});

describe('report shape', () => {
  test('field order of a complete report', () => {
    const cause = new ErrorWithCause('inner');
    const caught = Object.assign(new ErrorWithCause('outer', { cause }), {
      code: 'E',
    });
    const report = makeCorj(caught, {
      omitExpectedValues: false,
      metadata: true,
    });
    expect(Object.keys(report)).toEqual([
      'instanceof_error',
      'typeof',
      'constructor_name',
      'message',
      'as_string',
      'as_json',
      'stack',
      'children',
      'children_sources',
      'as_string_format',
      'as_json_format',
      'v',
      '$schema',
    ]);
    expect(Object.keys(report.children![0]!)).toEqual([
      'id',
      'path',
      'level',
      'instanceof_error',
      'typeof',
      'constructor_name',
      'message',
      'as_string',
      'as_json',
      'stack',
      'as_string_format',
      'as_json_format',
    ]);
    const rows = makeCorjArray(caught, {
      omitExpectedValues: false,
      metadata: true,
    });
    expect(Object.keys(rows[0]!)).toEqual([
      'id',
      'path',
      'level',
      'instanceof_error',
      'typeof',
      'constructor_name',
      'message',
      'as_string',
      'as_json',
      'stack',
      'child_ids',
      'children_sources',
      'as_string_format',
      'as_json_format',
      'v',
      '$schema',
    ]);
    expect(Object.keys(rows[1]!)).toEqual(Object.keys(report.children![0]!));
    expectValidObject(report, 'full');
    expectValidArray(rows, 'full');
  });

  test('truncated and children_omitted come first after the identity fields', () => {
    const caught = new ErrorWithCause('0', {
      cause: Object.assign(new ErrorWithCause('1'), {
        payload: 'x'.repeat(2000),
      }),
    });
    const report = makeCorj(caught, { maxReportSize: 1024, maxDepth: 1 });
    expect(Object.keys(report).slice(0, 2)).toEqual(['truncated', 'stack']);
    const rows = makeCorjArray(caught, { maxReportSize: 1024, maxDepth: 1 });
    expect(Object.keys(rows[0]!).slice(0, 4)).toEqual([
      'id',
      'path',
      'level',
      'truncated',
    ]);
  });

  test('a plain Error is just its stack and version', () => {
    const report = makeCorj(new ErrorWithCause('plain'));
    expect(Object.keys(report)).toEqual(['stack', 'v']);
    expect(report.stack![0]).toBe('Error: plain');
    expect(Object.keys(makeCorjArray(new ErrorWithCause('plain'))[0]!)).toEqual(
      ['id', 'path', 'level', 'stack', 'v'],
    );
  });

  test('stackFormat: string keeps the raw stack', () => {
    const caught = new ErrorWithCause('raw');
    const report = makeCorj(caught, { stackFormat: 'string' });
    expect(report.stack).toBe(caught.stack);
    expect(Object.keys(report)).toEqual(['stack', 'v']);
    expect(makeCorj(caught, { stackFormat: 'lines' }).stack).toEqual(
      caught.stack!.split('\n'),
    );
  });

  test('a child truncation marks the root', () => {
    const caught = new ErrorWithCause('0', {
      cause: { payload: 'x'.repeat(200_000) },
    });
    const report = makeCorj(caught, quiet);
    expect(report.truncated).toBe(true);
    expect(report.children![0]!.truncated).toBe(true);
    const rows = makeCorjArray(caught, quiet);
    expect(rows[0]!.truncated).toBe(true);
    expect(rows[1]!.truncated).toBe(true);
  });

  test('restoreExpectedValues turns a compact report into the full one', () => {
    const shared = new ErrorWithCause('shared');
    const inputs: unknown[] = [
      new ErrorWithCause('plain'),
      new AggregateErrorCtor(
        [
          new ErrorWithCause('a', { cause: shared }),
          shared,
          'str',
          null,
          { toCorjAsJson: () => [1] },
        ],
        'agg',
      ),
      Object.assign(new TypeError('typed'), { code: 'E_CODE' }),
      { message: 'not an error', stack: 'Fake: not an error\n    at nowhere' },
      undefined,
      42,
    ];
    for (const caught of inputs) {
      for (const metadata of [true, false]) {
        const compact = makeCorj(caught, { ...quiet, metadata });
        const full = makeCorj(caught, {
          ...quiet,
          metadata,
          omitExpectedValues: false,
        });
        expect(restoreExpectedValues(compact)).toEqual(full);
        expectValidObject(compact);
        expectValidObject(full, 'full');
        const compactRows = makeCorjArray(caught, { ...quiet, metadata });
        const fullRows = makeCorjArray(caught, {
          ...quiet,
          metadata,
          omitExpectedValues: false,
        });
        expect(restoreExpectedValues(compactRows)).toEqual(fullRows);
        expectValidArray(compactRows);
        expectValidArray(fullRows, 'full');
      }
    }
  });

  test('restoreExpectedValues copies and leaves a full report unchanged', () => {
    const full = makeCorj(
      new ErrorWithCause('x', { cause: new ErrorWithCause('y') }),
      { omitExpectedValues: false },
    );
    const restored = restoreExpectedValues(full);
    expect(restored).toEqual(full);
    expect(restored).not.toBe(full);
    expect(restored.children).not.toBe(full.children);
    expect(restoreExpectedValues([])).toEqual([]);
  });
});
