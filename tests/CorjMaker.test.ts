import {
  CORJ_DEFAULT_OPTIONS,
  CorjErrorContext,
  CorjMaker,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

// The test tsconfig targets a lib without ES2022 error features.
const AggregateErrorCtor: new (
  errors: unknown[],
  message?: string,
  options?: { cause?: unknown },
) => Error & { errors: unknown[] } = (globalThis as never)['AggregateError'];
function errorWithCause(message: string, cause: unknown): Error {
  return new (Error as unknown as new (
    m: string,
    o: { cause: unknown },
  ) => Error)(message, { cause });
}

type Caught = { caught: unknown; context: CorjErrorContext };

function collecting(): { errors: Caught[]; maker: CorjMaker } {
  const errors: Caught[] = [];
  const maker = new CorjMaker({
    onError: (caught, context) => {
      errors.push({ caught, context });
    },
  });
  return { errors, maker };
}

describe('CorjMaker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Default options', function () {
    test('Error object', () => {
      const { errors, maker } = collecting();
      const caught = new Error('I am an error!');
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(Array.isArray(report.stack)).toBe(true);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('String', () => {
      const { errors, maker } = collecting();
      const caught = 'I am a string, but I was thrown nevertheless!';
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": "I am a string, but I was thrown nevertheless!",
          "as_string": "I am a string, but I was thrown nevertheless!",
          "constructor_name": "String",
          "instanceof_error": false,
          "typeof": "string",
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('undefined has no JSON form and that is not an error', () => {
      const { errors, maker } = collecting();
      const report = maker.makeReportObject(undefined);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "undefined",
          "instanceof_error": false,
          "typeof": "undefined",
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('functions and symbols have no JSON form and that is not an error', () => {
      const { errors, maker } = collecting();
      const fn = maker.makeReportObject(function named() {
        return 1;
      });
      expect(getReportObjectReportValidator()(fn)).toBe(true);
      expect(fn).toMatchObject({
        typeof: 'function',
        as_json: null,
        constructor_name: 'Function',
        instanceof_error: false,
      });
      const sym = maker.makeReportObject(Symbol('s'));
      expect(getReportObjectReportValidator()(sym)).toBe(true);
      expect(sym).toMatchObject({
        typeof: 'symbol',
        as_json: null,
        as_string: 'Symbol(s)',
        constructor_name: 'Symbol',
      });
      expect(errors).toEqual([]);
    });

    test('null', () => {
      const { errors, maker } = collecting();
      const report = maker.makeReportObject(null);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "null",
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('BigInt', () => {
      const { errors, maker } = collecting();
      const report = maker.makeReportObject(BigInt(123));
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": 123,
          "as_string": "123",
          "constructor_name": "BigInt",
          "instanceof_error": false,
          "typeof": "bigint",
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('array', () => {
      const { errors, maker } = collecting();
      const caught = [1234, 'string', BigInt(1234), { a: 'b' }];
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Array [
            1234,
            "string",
            1234,
            Object {
              "a": "b",
            },
          ],
          "as_string": "1234,string,1234,[object Object]",
          "constructor_name": "Array",
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(errors).toEqual([]);
    });

    test('a plain Error with omitExpectedValues: false lists every field in order', () => {
      const report = makeCorj(new Error('full'), {
        omitExpectedValues: false,
        metadata: true,
      });
      expect(getReportObjectReportValidator('full')(report)).toBe(true);
      expect(Object.keys(report)).toEqual([
        'instanceof_error',
        'typeof',
        'constructor_name',
        'message',
        'as_string',
        'as_json',
        'stack',
        'children_sources',
        'as_string_format',
        'as_json_format',
        'v',
        '$schema',
      ]);
      expect(report).toMatchObject({
        instanceof_error: true,
        typeof: 'object',
        constructor_name: 'Error',
        message: 'full',
        as_string: 'Error: full',
        as_json: {},
        children_sources: ['cause', 'errors'],
        as_string_format: 'String',
        as_json_format: 'safe-stable-stringify-with-length-limit',
        v: 'corj/v0.12-full',
        $schema:
          'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12-full/report-object.json',
      });
    });
  });

  describe('Options', function () {
    test('metadata: { $schema: true } keeps v on', () => {
      const report = makeCorj(new Error('I am an error!'), {
        metadata: { $schema: true },
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12/report-object.json",
          "v": "corj/v0.12",
        }
      `);
    });

    test('metadata: true and false', () => {
      const both = makeCorj(new Error('x'), { metadata: true });
      expect(both.v).toBe('corj/v0.12');
      expect(both.$schema).toContain('corj/v0.12/report-object.json');
      const none = makeCorj(new Error('x'), { metadata: false });
      delete none.stack;
      expect(none).toEqual({});
    });

    test('metadata: { v: false } leaves nothing on a plain Error', () => {
      const report = makeCorj(new Error('x'), { metadata: { v: false } });
      delete report.stack;
      expect(report).toEqual({});
    });

    test('default options object is frozen and exposed', () => {
      expect(Object.isFrozen(CORJ_DEFAULT_OPTIONS)).toBe(true);
      expect(Object.isFrozen(CORJ_DEFAULT_OPTIONS.metadata)).toBe(true);
      const maker = new CorjMaker();
      expect(maker.options).toBe(CORJ_DEFAULT_OPTIONS);
      expect(Object.isFrozen(maker.options)).toBe(true);
      expect(() => {
        (maker.options as { maxDepth: number }).maxDepth = 1;
      }).toThrow(TypeError);
    });

    test('partial options are merged over the defaults and frozen', () => {
      const maker = new CorjMaker({ maxDepth: 2, childrenSources: ['cause'] });
      expect(maker.options.maxDepth).toBe(2);
      expect(maker.options.maxChildren).toBe(100);
      expect(maker.options.childrenSources).toEqual(['cause']);
      expect(Object.isFrozen(maker.options)).toBe(true);
      expect(Object.isFrozen(maker.options.childrenSources)).toBe(true);
      expect(maker.options.onError).toBe(CORJ_DEFAULT_OPTIONS.onError);
    });

    test('childrenSources is copied so later mutation of the input does not leak in', () => {
      const sources = ['cause'];
      const maker = new CorjMaker({ childrenSources: sources });
      sources.push('errors');
      expect(maker.options.childrenSources).toEqual(['cause']);
    });

    test('an explicitly undefined option means the default', () => {
      const maker = new CorjMaker({
        maxDepth: undefined,
        metadata: undefined,
      } as never);
      expect(maker.options.maxDepth).toBe(5);
      expect(maker.options.metadata).toEqual({ v: true, $schema: false });
    });

    test('with() layers options over the maker and leaves the original alone', () => {
      const base = new CorjMaker({ maxDepth: 1, metadata: false });
      const derived = base.with({
        maxChildren: 3,
        metadata: { $schema: true },
      });
      expect(base.options.maxDepth).toBe(1);
      expect(base.options.maxChildren).toBe(100);
      expect(base.options.metadata).toEqual({ v: false, $schema: false });
      expect(derived.options.maxDepth).toBe(1);
      expect(derived.options.maxChildren).toBe(3);
      expect(derived.options.metadata).toEqual({ v: false, $schema: true });
      expect(derived).not.toBe(base);
      expect(derived.with({}).options).toEqual(derived.options);
    });

    test('unknown option names are rejected', () => {
      expect(() => new CorjMaker({ maxChildrenLevel: 2 } as never)).toThrow(
        /Unknown option "maxChildrenLevel"\. Known options: maxReportSize, reportSizeUnit, omitExpectedValues, stackFormat, metadata, maxDepth, maxChildren, childrenSources, makeReportId, onError/,
      );
      expect(() =>
        makeCorj(1, { onCaughtMaking: () => undefined } as never),
      ).toThrow(TypeError);
    });

    test.each([
      [{ maxReportSize: 255 }, RangeError],
      [{ maxReportSize: 1.5 }, RangeError],
      [{ reportSizeUnit: 'bytes' }, TypeError],
      [{ omitExpectedValues: 'yes' }, TypeError],
      [{ stackFormat: 'array' }, TypeError],
      [{ metadata: 'all' }, TypeError],
      [{ metadata: null }, TypeError],
      [{ metadata: { v: 'yes' } }, TypeError],
      [{ maxDepth: -1 }, RangeError],
      [{ maxDepth: 1.5 }, RangeError],
      [{ maxChildren: -1 }, RangeError],
      [{ maxChildren: '5' }, RangeError],
      [{ childrenSources: 'cause' }, TypeError],
      [{ childrenSources: ['cause', 1] }, TypeError],
      [{ makeReportId: 'root' }, TypeError],
      [{ onError: null }, TypeError],
      [{ onError: 123 }, TypeError],
    ])('invalid option %j throws', (options, error) => {
      expect(() => new CorjMaker(options as never)).toThrow(error);
      expect(() => makeCorj(1, options as never)).toThrow(error);
      expect(() => new CorjMaker().with(options as never)).toThrow(error);
    });

    test('non-object options are rejected', () => {
      expect(() => new CorjMaker(null as never)).toThrow(
        'options must be an object',
      );
      expect(() => new CorjMaker('opts' as never)).toThrow(TypeError);
    });

    test('maxDepth: 0 reports no children and says why', () => {
      const report = makeCorj({ cause: 'child' }, { maxDepth: 0 });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toBeUndefined();
      expect(report.children_omitted).toBe('max_depth');
    });

    test('maxChildren: 0 reports no children and says why', () => {
      const report = makeCorj({ cause: 'child' }, { maxChildren: 0 });
      expect(report.children).toBeUndefined();
      expect(report.children_omitted).toBe('max_children');
    });

    test('stackFormat: string keeps the raw stack', () => {
      const caught = new Error('raw');
      const report = makeCorj(caught, { stackFormat: 'string' });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.stack).toBe(caught.stack);
    });
  });

  describe('Default onError', function () {
    function warnings(): string[] {
      const calls: string[] = [];
      jest.spyOn(console, 'warn').mockImplementation((message: string) => {
        calls.push(message);
      });
      return calls;
    }

    test('.toString throws', () => {
      const calls = warnings();
      const caught = {
        toString: () => {
          throw new Error('I am a nasty error!');
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_string": null,
          "constructor_name": "Object",
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=as_string path=$ field=as_string: Error: I am a nasty error!',
      ]);
    });

    test('.toString returns not string and it causes applying String() to throw', () => {
      const calls = warnings();
      const caught = {
        toString: () => {
          return { returningObjectAndNotAStringOnPurpose: true };
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_string": null,
          "constructor_name": "Object",
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=as_string path=$ field=as_string: TypeError: Cannot convert object to primitive value',
      ]);
    });

    test('.constructor throws', () => {
      const calls = warnings();
      const caught = {
        get constructor() {
          throw new Error('(in .constructor) thrown on purpose');
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": null,
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=prop-access path=$ field=constructor_name prop=constructor: Error: (in .constructor) thrown on purpose',
        '[caught-object-report-json] stage=as_json path=$ field=as_json: Error: (in .constructor) thrown on purpose',
      ]);
    });

    test('.constructor.name throws', () => {
      const calls = warnings();
      const caught = {
        constructor: {
          get name() {
            throw new Error('(in .constructor.name) thrown on purpose');
          },
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": null,
          "instanceof_error": false,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=prop-access path=$ field=constructor_name prop=name: Error: (in .constructor.name) thrown on purpose',
        '[caught-object-report-json] stage=as_json path=$ field=as_json: Error: (in .constructor.name) thrown on purpose',
      ]);
    });

    test('.message throws', () => {
      const calls = warnings();
      const caught = {
        get message() {
          throw new Error('(in .message) thrown on purpose');
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": "Object",
          "instanceof_error": false,
          "message": null,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=prop-access path=$ field=message prop=message: Error: (in .message) thrown on purpose',
        '[caught-object-report-json] stage=as_json path=$ field=as_json: Error: (in .message) thrown on purpose',
      ]);
    });

    test('.stack throws', () => {
      const calls = warnings();
      const caught = {
        get stack() {
          throw new Error('(in .stack) thrown on purpose');
        },
      };
      const report = new CorjMaker().makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.stack).toBe(null);
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": "Object",
          "instanceof_error": false,
          "stack": null,
          "v": "corj/v0.12",
        }
      `);
      expect(calls).toEqual([
        '[caught-object-report-json] stage=prop-access path=$ field=stack prop=stack: Error: (in .stack) thrown on purpose',
        '[caught-object-report-json] stage=as_json path=$ field=as_json: Error: (in .stack) thrown on purpose',
      ]);
    });

    test('a caught value that cannot be printed is still reported', () => {
      const calls = warnings();
      const unprintable = {
        toString() {
          throw new Error('nope');
        },
      };
      const caught = {
        get message() {
          throw unprintable;
        },
      };
      new CorjMaker().makeReportObject(caught);
      expect(calls[0]).toBe(
        '[caught-object-report-json] stage=prop-access path=$ field=message prop=message: [unprintable value]',
      );
    });

    test('nested failures name the child path', () => {
      const calls = warnings();
      const caught = {
        cause: {
          get message() {
            throw new Error('child message');
          },
        },
      };
      new CorjMaker().makeReportObject(caught);
      expect(calls[0]).toBe(
        '[caught-object-report-json] stage=prop-access path=$.cause field=message prop=message: Error: child message',
      );
    });
  });

  describe('onError contract', () => {
    test('onError throwing is contained and warned about once per failure', () => {
      const calls: string[] = [];
      jest.spyOn(console, 'warn').mockImplementation((message: string) => {
        calls.push(message);
      });
      const maker = new CorjMaker({
        onError() {
          throw new Error('I was supposed to handle errors not throw them');
        },
      });
      const report = maker.makeReportObject({
        get message() {
          throw new Error('boom');
        },
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.message).toBe(null);
      expect(calls).toEqual([
        '[caught-object-report-json] onError threw: Error: I was supposed to handle errors not throw them',
        '[caught-object-report-json] onError threw: Error: I was supposed to handle errors not throw them',
      ]);
    });

    test('prop-access context carries the field and property', () => {
      const { errors, maker } = collecting();
      const failure = new Error('stack getter');
      maker.makeReportObject({
        get stack() {
          throw failure;
        },
        toJSON() {
          return 'fine';
        },
      });
      expect(errors).toEqual([
        {
          caught: failure,
          context: {
            stage: 'prop-access',
            path: '$',
            key: 'stack',
            prop: 'stack',
          },
        },
      ]);
    });

    test('a throwing instanceof check is reported as other', () => {
      const { errors, maker } = collecting();
      const failure = new Error('prototype unavailable');
      const caught = new Proxy(
        {},
        {
          getPrototypeOf() {
            throw failure;
          },
        },
      );
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.instanceof_error).toBe(false);
      expect(errors[0]).toEqual({
        caught: failure,
        context: { stage: 'other', path: '$', key: 'instanceof_error' },
      });
    });
  });

  describe('Nested', function () {
    test('Single object', () => {
      const caught = errorWithCause('lvl 0', new Error('lvl 1'));
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(Array.isArray(report.stack)).toBe(true);
      delete report.stack;
      for (const childReport of report.children!) {
        expect(Array.isArray(childReport.stack)).toBe(true);
        delete childReport.stack;
      }
      expect(report).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "id": "0",
              "level": 1,
              "path": "$.cause",
            },
          ],
          "v": "corj/v0.12",
        }
      `);
    });

    test('Array object', () => {
      const caught = errorWithCause('lvl 0', [
        new Error('lvl 1; obj 0'),
        new Error('lvl 1; obj 1'),
      ]);
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      delete report.stack;
      for (const childReport of report.children!) {
        expect(Array.isArray(childReport.stack)).toBe(true);
        delete childReport.stack;
      }
      expect(report).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "id": "0",
              "level": 1,
              "path": "$.cause[0]",
            },
            Object {
              "id": "1",
              "level": 1,
              "path": "$.cause[1]",
            },
          ],
          "v": "corj/v0.12",
        }
      `);
    });

    test('children are discovered breadth-first, with maxDepth cutting the tree', () => {
      const caught = errorWithCause('lvl 0', [
        errorWithCause('lvl 1; obj 0', [
          errorWithCause('lvl 2; obj 0.0', [
            new Error('lvl 3; obj 0.0.0'),
            new Error('lvl 3; obj 0.0.1'),
          ]),
          errorWithCause('lvl 2; obj 0.1', [
            new Error('lvl 3; obj 0.1.0'),
            new Error('lvl 3; obj 0.1.1'),
          ]),
        ]),
        errorWithCause('lvl 1; obj 1', [
          new Error('lvl 2; obj 1.0'),
          new Error('lvl 2; obj 1.1'),
        ]),
      ]);
      const reportCheck = makeCorj(caught);
      expect(getReportObjectReportValidator()(reportCheck)).toBe(true);
      delete reportCheck.stack;
      for (const childReport of reportCheck.children!) {
        expect(Array.isArray(childReport.stack)).toBe(true);
        delete childReport.stack;
      }
      expect(reportCheck).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "child_ids": Array [
                "2",
                "3",
              ],
              "id": "0",
              "level": 1,
              "path": "$.cause[0]",
            },
            Object {
              "child_ids": Array [
                "4",
                "5",
              ],
              "id": "1",
              "level": 1,
              "path": "$.cause[1]",
            },
            Object {
              "child_ids": Array [
                "6",
                "7",
              ],
              "id": "2",
              "level": 2,
              "path": "$.cause[0].cause[0]",
            },
            Object {
              "child_ids": Array [
                "8",
                "9",
              ],
              "id": "3",
              "level": 2,
              "path": "$.cause[0].cause[1]",
            },
            Object {
              "id": "4",
              "level": 2,
              "path": "$.cause[1].cause[0]",
            },
            Object {
              "id": "5",
              "level": 2,
              "path": "$.cause[1].cause[1]",
            },
            Object {
              "id": "6",
              "level": 3,
              "path": "$.cause[0].cause[0].cause[0]",
            },
            Object {
              "id": "7",
              "level": 3,
              "path": "$.cause[0].cause[0].cause[1]",
            },
            Object {
              "id": "8",
              "level": 3,
              "path": "$.cause[0].cause[1].cause[0]",
            },
            Object {
              "id": "9",
              "level": 3,
              "path": "$.cause[0].cause[1].cause[1]",
            },
          ],
          "v": "corj/v0.12",
        }
      `);

      const reportCapped = makeCorj(caught, { maxDepth: 1 });
      expect(getReportObjectReportValidator()(reportCapped)).toBe(true);
      delete reportCapped.stack;
      for (const childReport of reportCapped.children!) {
        delete childReport.stack;
      }
      expect(reportCapped).toMatchInlineSnapshot(`
        Object {
          "children": Array [
            Object {
              "children_omitted": "max_depth",
              "id": "0",
              "level": 1,
              "path": "$.cause[0]",
            },
            Object {
              "children_omitted": "max_depth",
              "id": "1",
              "level": 1,
              "path": "$.cause[1]",
            },
          ],
          "v": "corj/v0.12",
        }
      `);
    });

    test('children never carry v or $schema; the root does', () => {
      const caught = errorWithCause('lvl 0', new Error('lvl 1'));
      const report = makeCorj(caught, { metadata: true });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.v).toBe('corj/v0.12');
      expect(report.$schema).toContain('/report-object.json');
      expect(report.children![0]).not.toHaveProperty('v');
      expect(report.children![0]).not.toHaveProperty('$schema');
      expect(report.children![0]).not.toHaveProperty('children_sources');
    });

    test('children_sources appears on the root only when it is custom', () => {
      const caught = { cause: { rootCause: 'deep' } };
      const report = makeCorj(caught, {
        childrenSources: ['cause', 'rootCause'],
      });
      expect(report.children_sources).toEqual(['cause', 'rootCause']);
      expect(report.children).toHaveLength(2);
      expect(report.children![1]!.path).toBe('$.cause.rootCause');
      expect(report.children![0]).not.toHaveProperty('children_sources');
      // Both nodes serialize to {} once their child sources are excluded.
      expect(report.as_json).toBeUndefined();
      expect(report.children![0]!.as_json).toBeUndefined();
    });

    test('custom childrenSources work when cause and errors are absent', () => {
      const caught = new Error('outer');
      (caught as { rootCause?: unknown }).rootCause = new Error('inner');
      const report = makeCorj(caught, { childrenSources: ['rootCause'] });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.path).toBe('$.rootCause');
      expect(restoreExpectedValues(report).children![0]!.message).toBe('inner');
    });

    test('a repeated object is reported once and referenced by id afterwards', () => {
      const shared = new Error('shared');
      const caught = new AggregateErrorCtor([shared, shared], 'twice', {
        cause: shared,
      });
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toHaveLength(1);
      expect(report.children![0]).toMatchObject({
        id: '0',
        path: '$.cause',
        level: 1,
      });
    });

    test('a cycle back to the root references the root id', () => {
      const caught = new Error('self');
      (caught as { cause?: unknown }).cause = caught;
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toBeUndefined();
      expect(report.children_omitted).toBeUndefined();
      const array = makeCorjArray(caught);
      expect(getReportArrayReportValidator()(array)).toBe(true);
      expect(array).toHaveLength(1);
      expect(array[0]!.child_ids).toEqual(['root']);
    });

    test('a cycle deeper in the tree references the earlier node', () => {
      const child = new Error('child');
      const caught = errorWithCause('root', child);
      (child as { cause?: unknown }).cause = child;
      const report = makeCorj(caught);
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.child_ids).toEqual(['0']);
      const array = makeCorjArray(caught, {
        makeReportId: ({ index }) => (index === -1 ? 'R' : `c${index}`),
      });
      expect(array[0]!.child_ids).toEqual(['c0']);
      expect(array[1]!.child_ids).toEqual(['c0']);
    });

    test('a self-referencing AggregateError does not blow up', () => {
      const caught = new AggregateErrorCtor([], 'agg');
      caught.errors = Array(16).fill(caught);
      const started = Date.now();
      const report = makeCorj(caught);
      expect(Date.now() - started).toBeLessThan(500);
      expect(report.children).toBeUndefined();
      expect(report.truncated).toBeUndefined();
    });

    test('maxChildren caps the total and marks the node where the cap hit', () => {
      const caught = new AggregateErrorCtor(
        Array.from({ length: 5 }, (_, i) => new Error(`e${i}`)),
        'wide',
      );
      const report = makeCorj(caught, { maxChildren: 3 });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toHaveLength(3);
      expect(report.children_omitted).toBe('max_children');
      expect(report.children!.map((c) => c.path)).toEqual([
        '$.errors[0]',
        '$.errors[1]',
        '$.errors[2]',
      ]);
    });

    test('maxChildren prefers shallow nodes and marks every parent that lost a child', () => {
      const deep = new Error('deep');
      const caught = new AggregateErrorCtor(
        [errorWithCause('a', deep), errorWithCause('b', new Error('b.cause'))],
        'agg',
      );
      const report = makeCorj(caught, { maxChildren: 3 });
      expect(report.children!.map((c) => c.path)).toEqual([
        '$.errors[0]',
        '$.errors[1]',
        '$.errors[0].cause',
      ]);
      expect(report.children_omitted).toBeUndefined();
      expect(report.children![0]!.children_omitted).toBeUndefined();
      expect(report.children![1]!.children_omitted).toBe('max_children');
    });

    test('references do not count against maxChildren', () => {
      const shared = new Error('shared');
      const caught = new AggregateErrorCtor([shared, shared], 'agg');
      const report = makeCorj(caught, { maxChildren: 1 });
      expect(report.children).toHaveLength(1);
      expect(report.children_omitted).toBeUndefined();
      const array = makeCorjArray(caught, { maxChildren: 1 });
      expect(array[0]!.child_ids).toEqual(['0', '0']);
    });

    test('undefined children and array holes are skipped', () => {
      const caught = new AggregateErrorCtor(
        [undefined, , new Error('kept')],
        'x',
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      caught.cause = undefined;
      expect('cause' in caught).toBe(true);
      const report = makeCorj(caught);
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.path).toBe('$.errors[2]');
    });

    test('null children are reported', () => {
      const report = makeCorj(new AggregateErrorCtor([null], 'x'));
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toEqual([
        {
          id: '0',
          path: '$.errors[0]',
          level: 1,
          instanceof_error: false,
          as_string: 'null',
          as_json: null,
        },
      ]);
    });

    test('a throwing has trap on the caught object is contained', () => {
      const { errors, maker } = collecting();
      const failure = new Error('has trap');
      const caught = new Proxy(
        {},
        {
          has() {
            throw failure;
          },
          get() {
            throw failure;
          },
        },
      );
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toEqual({
        instanceof_error: false,
        constructor_name: null,
        message: null,
        as_string: null,
        as_json: null,
        stack: null,
        v: 'corj/v0.12',
      });
      expect(report.children).toBeUndefined();
      expect(errors.map((e) => e.context)).toContainEqual({
        stage: 'children',
        path: '$',
        key: 'children',
        prop: 'cause',
      });
      expect(errors.map((e) => e.context)).toContainEqual({
        stage: 'children',
        path: '$',
        key: 'children',
        prop: 'errors',
      });
      expect(errors.every((e) => e.caught === failure)).toBe(true);
    });

    test('a throwing has trap on a child reports child_ids as the field', () => {
      const { errors, maker } = collecting();
      const caught = {
        cause: new Proxy(
          {},
          {
            has() {
              throw new Error('has trap');
            },
          },
        ),
      };
      const array = maker.makeReportArray(caught);
      expect(getReportArrayReportValidator()(array)).toBe(true);
      expect(array).toHaveLength(2);
      expect(errors.map((e) => e.context)).toContainEqual({
        stage: 'children',
        path: '$.cause',
        key: 'child_ids',
        prop: 'cause',
      });
    });

    test('a throwing length getter on an errors array does not matter, own keys are used', () => {
      const { errors, maker } = collecting();
      const errorsArray = new Proxy([new Error('visible')], {
        get(target, prop, receiver) {
          if (prop === 'length') throw new Error('length trap');
          return Reflect.get(target, prop, receiver);
        },
      });
      const report = maker.makeReportObject({ errors: errorsArray });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children?.map((c) => c.path)).toEqual(['$.errors[0]']);
      expect(errors).toEqual([]);
    });

    test('a throwing ownKeys trap on an errors array is contained', () => {
      const { errors, maker } = collecting();
      const failure = new Error('keys trap');
      const errorsArray = new Proxy([new Error('hidden')], {
        ownKeys() {
          throw failure;
        },
      });
      const report = maker.makeReportObject({ errors: errorsArray });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.children).toBeUndefined();
      expect(errors).toContainEqual({
        caught: failure,
        context: {
          stage: 'children',
          path: '$',
          key: 'children',
          prop: 'errors',
        },
      });
    });

    test('a throwing element getter on an errors array skips that element', () => {
      const { errors, maker } = collecting();
      const failure = new Error('element trap');
      const errorsArray = new Proxy([new Error('a'), new Error('b')], {
        get(target, prop, receiver) {
          if (prop === '0') throw failure;
          return Reflect.get(target, prop, receiver);
        },
      });
      const report = maker.makeReportObject({ errors: errorsArray });
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.path).toBe('$.errors[1]');
      expect(errors).toContainEqual({
        caught: failure,
        context: {
          stage: 'children',
          path: '$',
          key: 'children',
          prop: '0',
        },
      });
    });

    test('a sparse errors array reports only its present elements', () => {
      const errorsArray: unknown[] = [];
      errorsArray.length = 10_000;
      errorsArray[0] = new Error('first');
      errorsArray[9_999] = new Error('last');
      const report = makeCorj({ errors: errorsArray }, { maxChildren: 2 });
      expect(report.children!.map((c) => c.path)).toEqual([
        '$.errors[0]',
        '$.errors[9999]',
      ]);
      expect(report.children_omitted).toBeUndefined();
    });

    test('a primitive child has no children', () => {
      const report = makeCorj({ cause: 'a string with a cause word' });
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.child_ids).toBeUndefined();
    });
  });

  describe('makeReportId', () => {
    test('is called once per node with index, level, path and the object', () => {
      const calls: unknown[] = [];
      const cause = new Error('cause');
      const caught = errorWithCause('root', cause);
      const array = makeCorjArray(caught, {
        makeReportId: (context) => {
          calls.push(context);
          return `id-${context.index}`;
        },
      });
      expect(calls).toEqual([
        { index: -1, level: 0, path: '$', caught },
        { index: 0, level: 1, path: '$.cause', caught: cause },
      ]);
      expect(array[0]!.id).toBe('id--1');
      expect(array[0]!.child_ids).toEqual(['id-0']);
      expect(array[1]!.id).toBe('id-0');
    });

    test('is also called for the root of an object report, but the id is not emitted', () => {
      const calls: number[] = [];
      const report = makeCorj(new Error('root'), {
        makeReportId: ({ index }) => {
          calls.push(index);
          return 'x';
        },
      });
      expect(calls).toEqual([-1]);
      expect(report).not.toHaveProperty('id');
    });

    test('a throwing makeReportId falls back to the default id and is reported', () => {
      const { errors, maker } = collecting();
      const failure = new Error('no ids today');
      const array = maker
        .with({
          makeReportId: () => {
            throw failure;
          },
        })
        .makeReportArray(errorWithCause('root', new Error('cause')));
      expect(array.map((row) => row.id)).toEqual(['root', '0']);
      expect(errors).toEqual([
        {
          caught: failure,
          context: { stage: 'other', path: '$', key: 'id' },
        },
        {
          caught: failure,
          context: { stage: 'other', path: '$.cause', key: 'id' },
        },
      ]);
    });

    test('a non-string id falls back to the default id and is reported', () => {
      const { errors, maker } = collecting();
      const array = maker
        .with({
          makeReportId: (({ index }: { index: number }) => index) as never,
        })
        .makeReportArray(errorWithCause('root', new Error('cause')));
      expect(array.map((row) => row.id)).toEqual(['root', '0']);
      expect(errors).toHaveLength(2);
      expect(String(errors[0]!.caught)).toBe(
        'TypeError: makeReportId must return a string, got -1',
      );
    });
  });

  describe('Using toCorjAsString method', () => {
    test('Uses toCorjAsString method and records the format', () => {
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          return 'Used toCorjAsString';
        },
      };
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe('Used toCorjAsString');
      expect(report.as_string_format).toBe('.toCorjAsString');
    });

    test('receives the path and options, with the caught object as this', () => {
      const seen: unknown[] = [];
      const caught = {
        cause: {
          toCorjAsString(this: unknown, context: unknown) {
            seen.push({ self: this, context });
            return 'child';
          },
        },
      };
      const maker = new CorjMaker({ maxDepth: 3 });
      maker.makeReportObject(caught);
      expect(seen).toEqual([
        {
          self: caught.cause,
          context: { path: '$.cause', options: maker.options },
        },
      ]);
    });

    test('After toCorjAsString throws, falls back to string coercion and reports it', () => {
      const { errors, maker } = collecting();
      const failure = new Error('Hey!');
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          throw failure;
        },
      };
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe('Used toString');
      expect(report.as_string_format).toBeUndefined();
      expect(errors).toEqual([
        {
          caught: failure,
          context: {
            stage: 'as_string',
            path: '$',
            key: 'as_string',
            prop: 'toCorjAsString',
          },
        },
      ]);
    });

    test('If toCorjAsString returns not a string, falls back silently', () => {
      const { errors, maker } = collecting();
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          return 123;
        },
      };
      const report = maker.makeReportObject(caught);
      expect(report.as_string).toBe('Used toString');
      expect(errors).toEqual([]);
    });

    test('toCorjAsString that is not a function is ignored', () => {
      for (const value of [null, 123, 'str']) {
        const report = makeCorj({ toCorjAsString: value });
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(report.as_string).toBe('[object Object]');
      }
    });
  });

  describe('Using toCorjAsJson method', () => {
    test('Uses toCorjAsJson method and records the format', () => {
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          return { msg: 'Used toCorjAsJson' };
        },
      };
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toEqual({ msg: 'Used toCorjAsJson' });
      expect(report.as_json_format).toBe('.toCorjAsJson');
    });

    test('After toCorjAsJson throws, falls back to the serializer and reports it', () => {
      const { errors, maker } = collecting();
      const failure = new Error('hey');
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          throw failure;
        },
      };
      const report = maker.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toEqual({ msg: 'Used toJSON' });
      expect(report.as_json_format).toBeUndefined();
      expect(errors).toEqual([
        {
          caught: failure,
          context: {
            stage: 'as_json',
            path: '$',
            key: 'as_json',
            prop: 'toCorjAsJson',
          },
        },
      ]);
    });

    test('If toCorjAsJson returns something without a JSON form, falls back silently', () => {
      const { errors, maker } = collecting();
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          return function fn() {
            return 1;
          };
        },
      };
      const report = maker.makeReportObject(caught);
      expect(report.as_json).toEqual({ msg: 'Used toJSON' });
      expect(errors).toEqual([]);
    });

    test('toCorjAsJson that is not a function is ignored', () => {
      for (const value of [null, 123]) {
        const report = makeCorj({ toCorjAsJson: value });
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(report.as_json).toEqual({ toCorjAsJson: value });
      }
    });

    test('an oversized toCorjAsJson value is truncated and flagged', () => {
      const report = makeCorj(
        {
          toCorjAsJson() {
            return { big: 'x'.repeat(10_000) };
          },
        },
        { maxReportSize: 512 },
      );
      expect(report.truncated).toBe(true);
      expect(report.as_json_format).toBe('.toCorjAsJson');
      expect(JSON.stringify(report.as_json)).toContain('[truncated]');
    });
  });

  describe('Misc', () => {
    test('If circular reference is marked as child key, do not try to stringify it', () => {
      const caught = new Error(`I'm an error`);
      (caught as { errors?: unknown }).errors = caught;
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      // `as_json: {}` is an expected value and is omitted by default.
      expect(report.as_json).toBeUndefined();
      expect(restoreExpectedValues(report).as_json).toEqual({});
    });

    test('circular references inside as_json use the circular marker', () => {
      const caught: { self?: unknown; name: string } = { name: 'loop' };
      caught.self = caught;
      const report = makeCorj(caught);
      expect(report.as_json).toEqual({ name: 'loop', self: '[circular]' });
    });

    test('constructor.name is not string', () => {
      const report = makeCorj({ constructor: { name: 123 } });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.constructor_name).toBeUndefined();
    });

    test('an object without a constructor', () => {
      const report = makeCorj(Object.create(null));
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.constructor_name).toBeUndefined();
      expect(report.as_string).toBe(null);
    });

    test('a primitive with a property from its prototype', () => {
      const report = makeCorj('text');
      expect(report.message).toBeUndefined();
      expect(report.constructor_name).toBe('String');
    });
  });

  test('makeCorjArray', () => {
    const report = makeCorjArray(new Error(`I'm an error`));
    expect(getReportArrayReportValidator()(report)).toBe(true);
    expect(Array.isArray(report[0]!.stack)).toBe(true);
    delete report[0]!.stack;
    expect(report).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "root",
          "level": 0,
          "path": "$",
          "v": "corj/v0.12",
        },
      ]
    `);
  });

  test('makeReportArray row order and metadata placement', () => {
    const caught = errorWithCause('root', new Error('cause'));
    const array = makeCorjArray(caught, {
      metadata: true,
      childrenSources: ['cause'],
    });
    expect(getReportArrayReportValidator()(array)).toBe(true);
    expect(array).toHaveLength(2);
    expect(Object.keys(array[0]!)).toEqual([
      'id',
      'path',
      'level',
      'stack',
      'child_ids',
      'children_sources',
      'v',
      '$schema',
    ]);
    expect(array[0]!.$schema).toContain('corj/v0.12/report-array.json');
    expect(Object.keys(array[1]!)).toEqual(['id', 'path', 'level', 'stack']);
  });

  test('deprecated type aliases still resolve', () => {
    // Type-level check: assignment compiles.
    const report: import('../src').CaughtObjectReportJson = makeCorj(1);
    const child: import('../src').CaughtObjectReportJsonChild =
      makeCorjArray(1)[0]!;
    const options: import('../src').CorjMakerOptions = CORJ_DEFAULT_OPTIONS;
    expect([report, child, options]).toBeTruthy();
  });
});
