import {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
  CorjMaker,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import {
  markFullVersion,
  omitExpectedValues,
  parseStackHeader,
  stackDerivedFields,
} from '../src/expected-values';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const marker = '[truncated]';
const quiet = { onError: () => undefined };

describe('parseStackHeader', () => {
  test.each([
    ['Error: boom', 'Error', 'boom'],
    ['Error', 'Error', ''],
    ['', '', ''],
    ['Error: ', 'Error', ''],
    ['Error:  ', 'Error', ' '],
    ['Error: a: b', 'Error', 'a: b'],
    ['Error: a:b', 'Error', 'a:b'],
    ['Error:boom', 'Error:boom', ''],
    [': boom', '', 'boom'],
    [':: boom', ':', 'boom'],
    ['Error: : boom', 'Error', ': boom'],
    ['My Error: boom', 'My Error', 'boom'],
    ['Ошибка: 😀', 'Ошибка', '😀'],
    ['Error: boom\r', 'Error', 'boom\r'],
    [' : ', ' ', ''],
  ])('parses %j', (line, name, message) => {
    expect(parseStackHeader(line)).toEqual({ name, message });
  });

  test('round-trips what Error.prototype.toString produces', () => {
    for (const [name, message] of [
      ['Error', 'boom'],
      ['TypeError', ''],
      ['X', 'a: b: c'],
      ['Error', ' '],
    ]) {
      const error = new Error(message);
      error.name = name!;
      expect(parseStackHeader(String(error))).toEqual({ name, message });
    }
    // An empty name is indistinguishable from an empty message.
    const nameless = new Error('boom');
    nameless.name = '';
    expect(String(nameless)).toBe('boom');
    expect(parseStackHeader(String(nameless))).toEqual({
      name: 'boom',
      message: '',
    });
  });
});

describe('deriving constructor_name and message from the stack', () => {
  test('a plain Error keeps only stack and v', () => {
    const caught = new Error('boom');
    const report = makeCorj(caught);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report).toEqual({
      stack: caught.stack!.split('\n'),
      v: CORJ_VERSION,
    });
  });

  test.each([
    ['Error', () => new Error('boom')],
    ['TypeError', () => new TypeError('boom')],
    ['empty message', () => new Error('')],
    ['no message argument', () => new Error()],
    ['message with ": "', () => new Error('a: b: c')],
    ['message with a colon but no space', () => new Error('a:b')],
    ['message with trailing spaces', () => new Error('boom   ')],
    ['message with leading spaces', () => new Error('   boom')],
    ['message with "\\r"', () => new Error('boom\r')],
    ['unicode message', () => new Error('Ошибка 😀 界')],
    [
      'subclass with matching name',
      () => {
        class MyError extends Error {
          override name = 'MyError';
        }
        return new MyError('boom');
      },
    ],
    [
      'name set on the instance before the stack is captured',
      () => {
        function Custom(this: Error, message: string) {
          this.name = 'Custom';
          this.message = message;
          Error.captureStackTrace(this, Custom);
        }
        Custom.prototype = Object.create(Error.prototype);
        Custom.prototype.constructor = Custom;
        return new (Custom as any)('boom');
      },
    ],
  ])('%s: both fields are omitted and restored exactly', (_name, make) => {
    const caught = make();
    const full = makeCorj(caught, {
      omitExpectedValues: false,
    });
    const report = makeCorj(caught);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(getReportObjectReportValidator('full')(full)).toBe(true);
    // Under a source-map-aware test runner the header of an empty-message
    // error is "Error: " while String(error) is "Error"; then nothing is
    // derivable and everything must stay. Real V8 headers make it derivable.
    const derivable = String(caught) === caught.stack.split('\n')[0];
    for (const key of ['as_string', 'constructor_name', 'message']) {
      if (derivable) {
        expect(report).not.toHaveProperty(key);
      } else {
        expect(report).toHaveProperty(key);
      }
    }
    expect(typeof full.constructor_name).toBe('string');
    expect(typeof full.message).toBe('string');
    expect(full.as_string_format).toBe('String');
    expect(full.as_json_format).toBe('safe-stable-stringify-with-length-limit');
    expect(full.children_sources).toEqual(['cause', 'errors']);
    expect(restoreExpectedValues(report)).toEqual(full);
  });

  test.each([
    [
      'subclass whose name stays "Error"',
      () => {
        class MyError extends Error {}
        return new MyError('boom');
      },
      { constructor_name: 'MyError', message: 'boom' },
    ],
    [
      'name changed after the stack was captured',
      () => {
        const error = new Error('boom');
        error.name = 'Renamed';
        return error;
      },
      { constructor_name: 'Error', message: 'boom' },
    ],
    [
      'message changed after the stack was formatted',
      () => {
        const error = new Error('boom');
        void error.stack; // V8 formats the header lazily on first access
        error.message = 'changed';
        return error;
      },
      { constructor_name: 'Error', message: 'changed' },
    ],
    [
      'multi-line message',
      () => new Error('line one\nline two'),
      { constructor_name: 'Error', message: 'line one\nline two' },
    ],
    [
      'message ending with a newline',
      () => new Error('boom\n'),
      { constructor_name: 'Error', message: 'boom\n' },
    ],
    [
      'empty name with a message',
      () => {
        class Nameless extends Error {
          override name = '';
        }
        return new Nameless('boom');
      },
      { constructor_name: 'Nameless', message: 'boom' },
    ],
    [
      'constructor name containing ": "',
      () => {
        const Weird = class extends Error {};
        Object.defineProperty(Weird, 'name', { value: 'A: B' });
        const error = new Weird('boom');
        error.name = 'A: B';
        (error as any).stack = 'A: B: boom\n    at x';
        return error;
      },
      { constructor_name: 'A: B', message: 'boom' },
    ],
  ])(
    '%s: the fields stay because the line does not reproduce them',
    (_name, make, expected) => {
      const caught = make();
      const report = makeCorj(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report).toMatchObject(expected);
      const restored = restoreExpectedValues(report);
      expect(restored).toMatchObject(expected);
      expect(restored.as_string).toBe(String(caught));
    },
  );

  test('message changed before the stack is formatted is derivable', () => {
    // V8 builds the header on first access, so the new message is in it.
    const error = new Error('boom');
    error.message = 'changed';
    const report = makeCorj(error);
    expect((report.stack as string[])[0]).toBe('Error: changed');
    expect(report).not.toHaveProperty('message');
    expect(restoreExpectedValues(report).message).toBe('changed');
  });

  test('an empty message is derivable from a bare "Name" header', () => {
    const caught = {
      stack: 'Error\n    at x',
      message: '',
      constructor: { name: 'Error' },
      toString: () => 'Error',
    };
    const report = makeCorj(caught);
    expect(report.stack).toEqual(['Error', '    at x']);
    expect(report).not.toHaveProperty('as_string');
    expect(report).not.toHaveProperty('constructor_name');
    expect(report).not.toHaveProperty('message');
    expect(restoreExpectedValues(report)).toMatchObject({
      as_string: 'Error',
      constructor_name: 'Error',
      message: '',
    });
  });

  test('an empty message with a "Name: " header keeps every field', () => {
    // source-map-support formats headers this way; String(error) differs.
    const caught = {
      stack: 'Error: \n    at x',
      message: '',
      constructor: { name: 'Error' },
      toString: () => 'Error',
    };
    const report = makeCorj(caught);
    expect(report).toMatchObject({
      as_string: 'Error',
      constructor_name: 'Error',
      message: '',
    });
    expect(restoreExpectedValues(report)).toMatchObject({
      as_string: 'Error',
      constructor_name: 'Error',
      message: '',
    });
  });

  test('a name containing ": " parses at the first separator', () => {
    // "A: B: boom" parses to name "A" and message "B: boom", so an error named
    // "A: B" is not derivable and keeps its fields.
    expect(parseStackHeader('A: B: boom')).toEqual({
      name: 'A',
      message: 'B: boom',
    });
  });

  test('a custom toString keeps as_string and therefore the pair', () => {
    class Custom extends Error {
      override toString() {
        return 'custom';
      }
    }
    const report = makeCorj(new Custom('boom'));
    expect(report).toMatchObject({
      as_string: 'custom',
      constructor_name: 'Custom',
      message: 'boom',
    });
    expect(restoreExpectedValues(report)).toMatchObject({
      as_string: 'custom',
      constructor_name: 'Custom',
      message: 'boom',
    });
  });

  test('a non-string message keeps constructor_name', () => {
    const error = new Error('boom');
    void error.stack; // freeze the header before changing the message
    (error as any).message = 42;
    const report = makeCorj(error);
    expect(report).not.toHaveProperty('message');
    expect(report.constructor_name).toBe('Error');
    expect((report.stack as string[])[0]).toBe('Error: boom');
    // String(error) uses the current message, so as_string differs and stays.
    expect(report.as_string).toBe('Error: 42');
    const restored = restoreExpectedValues(report);
    expect(restored).not.toHaveProperty('message');
    expect(restored.constructor_name).toBe('Error');
  });

  test('a non-string message with a matching toString omits as_string only', () => {
    const caught = {
      stack: 'Error: boom\n    at x',
      message: 42,
      constructor: { name: 'Error' },
      toString: () => 'Error: boom',
    };
    const report = makeCorj(caught);
    expect(report).not.toHaveProperty('message');
    expect(report).not.toHaveProperty('as_string');
    expect(report.constructor_name).toBe('Error');
    const restored = restoreExpectedValues(report);
    expect(restored).not.toHaveProperty('message');
    expect(restored.as_string).toBe('Error: boom');
    expect(restored.constructor_name).toBe('Error');
  });

  test('a message getter that throws keeps null', () => {
    const caught = {
      stack: 'Error: boom\n    at x',
      constructor: { name: 'Error' },
      get message(): string {
        throw new Error('no message');
      },
      toString: () => 'Error: boom',
    };
    const report = makeCorj(caught, quiet);
    expect(report.message).toBeNull();
    expect(report.constructor_name).toBe('Error');
    expect(report).not.toHaveProperty('as_string');
    expect(restoreExpectedValues(report)).toMatchObject({
      message: null,
      constructor_name: 'Error',
      as_string: 'Error: boom',
    });
  });

  test('a constructor getter that throws keeps null', () => {
    const caught = {
      stack: 'Error: boom\n    at x',
      message: 'boom',
      get constructor(): unknown {
        throw new Error('no constructor');
      },
      toString: () => 'Error: boom',
    };
    const report = makeCorj(caught, quiet);
    expect(report.constructor_name).toBeNull();
    expect(report.message).toBe('boom');
    expect(report).not.toHaveProperty('as_string');
    expect(restoreExpectedValues(report)).toMatchObject({
      constructor_name: null,
      message: 'boom',
      as_string: 'Error: boom',
    });
  });

  test('an object without the fields keeps as_string as the signal', () => {
    const caught = Object.create(null);
    caught.stack = 'Error: boom\n    at x';
    caught.toString = () => 'Error: boom';
    const report = makeCorj(caught);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report).toEqual({
      as_string: 'Error: boom',
      as_json: { stack: 'Error: boom\n    at x' },
      instanceof_error: false,
      stack: ['Error: boom', '    at x'],
      v: CORJ_VERSION,
    });
    const restored = restoreExpectedValues(report);
    expect(restored).not.toHaveProperty('constructor_name');
    expect(restored).not.toHaveProperty('message');
    expect(restored.as_string).toBe('Error: boom');
  });

  test('a plain object with a copied stack keeps constructor_name and gets no message', () => {
    const copy = { stack: new Error('boom').stack };
    const report = makeCorj(copy);
    expect(report.constructor_name).toBe('Object');
    expect(report).not.toHaveProperty('message');
    expect(report.as_string).toBe('[object Object]');
    const restored = restoreExpectedValues(report);
    expect(restored.as_string).toBe('[object Object]');
    expect(restored).not.toHaveProperty('message');
  });

  test('only message present: the pair is not derived on restore', () => {
    const caught = Object.create(null);
    caught.stack = 'Error: boom\n    at x';
    caught.message = 'boom';
    caught.toString = () => 'Error: boom';
    const report = makeCorj(caught);
    expect(report).toMatchObject({ message: 'boom' });
    expect(report).not.toHaveProperty('as_string');
    expect(report).not.toHaveProperty('constructor_name');
    const restored = restoreExpectedValues(report);
    expect(restored).not.toHaveProperty('constructor_name');
    expect(restored.message).toBe('boom');
    expect(restored.as_string).toBe('Error: boom');
  });

  test('works the same with a string stack', () => {
    const caught = new Error('raw');
    const report = makeCorj(caught, {
      stackFormat: 'string',
    });
    expect(report).toEqual({ stack: caught.stack, v: CORJ_VERSION });
    expect(restoreExpectedValues(report)).toMatchObject({
      as_string: 'Error: raw',
      constructor_name: 'Error',
      message: 'raw',
      stack: caught.stack,
    });
  });

  test('applies to every node of object and array reports', () => {
    const inner = new TypeError('inner');
    const outer = new Error('outer');
    (outer as any).cause = inner;
    const object = makeCorj(outer);
    expect(object).toEqual({
      stack: outer.stack!.split('\n'),
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          stack: inner.stack!.split('\n'),
        },
      ],
      v: CORJ_VERSION,
    });
    const array = makeCorjArray(outer);
    expect(array).toEqual([
      {
        id: 'root',
        path: '$',
        level: 0,
        stack: outer.stack!.split('\n'),
        child_ids: ['0'],
        v: CORJ_VERSION,
      },
      {
        id: '0',
        path: '$.cause',
        level: 1,
        stack: inner.stack!.split('\n'),
      },
    ]);
    const restoredArray = restoreExpectedValues(array);
    expect(restoredArray[1]).toMatchObject({
      constructor_name: 'TypeError',
      message: 'inner',
      as_string: 'TypeError: inner',
    });
    expect(restoredArray[1]).not.toHaveProperty('v');
    expect(restoredArray[0]).toHaveProperty('v', CORJ_VERSION_FULL);
    expect(getReportArrayReportValidator('full')(restoredArray)).toBe(true);
    expect(
      getReportObjectReportValidator('full')(restoreExpectedValues(object)),
    ).toBe(true);
  });

  test('stackDerivedFields covers every presence combination', () => {
    const stack = ['E: m', 'at'];
    expect(stackDerivedFields({})).toEqual({});
    expect(stackDerivedFields({ stack: 42 as any })).toEqual({});
    expect(stackDerivedFields({ stack: [] })).toEqual({});
    expect(stackDerivedFields({ stack: null })).toEqual({});
    expect(stackDerivedFields({ stack })).toEqual({
      as_string: 'E: m',
      constructor_name: 'E',
      message: 'm',
    });
    expect(stackDerivedFields({ stack, as_string: 'x' })).toEqual({});
    expect(stackDerivedFields({ stack, as_string: null })).toEqual({});
    expect(stackDerivedFields({ stack, message: 'm' })).toEqual({
      as_string: 'E: m',
    });
    expect(stackDerivedFields({ stack, message: null })).toEqual({
      as_string: 'E: m',
    });
    expect(stackDerivedFields({ stack, constructor_name: 'E' })).toEqual({
      as_string: 'E: m',
    });
    expect(
      stackDerivedFields({ stack, constructor_name: 'E', message: 'm' }),
    ).toEqual({ as_string: 'E: m' });
  });

  test('omitExpectedValues never deletes a field that does not round-trip', () => {
    const line = ['E: m'];
    const cases: Record<string, unknown>[] = [
      { stack: line, as_string: 'E: m', constructor_name: 'E', message: 'm' },
      { stack: line, as_string: 'E: m', constructor_name: 'E' },
      { stack: line, as_string: 'E: m', message: 'm' },
      { stack: line, as_string: 'E: m' },
      { stack: line, as_string: 'E: m', constructor_name: 'X', message: 'm' },
      { stack: line, as_string: 'E: m', constructor_name: 'E', message: 'x' },
      { stack: line, as_string: 'E: m', constructor_name: null, message: 'm' },
      { stack: line, as_string: 'E: m', constructor_name: 'E', message: null },
      { stack: line, as_string: 'other', constructor_name: 'E', message: 'm' },
      { stack: line, as_string: null, constructor_name: 'E', message: 'm' },
      { stack: ['E'], as_string: 'E', constructor_name: 'E', message: '' },
      { stack: ['E'], as_string: 'E', constructor_name: '', message: 'E' },
      { stack: [''], as_string: '', constructor_name: '', message: '' },
      { as_string: 'E: m', constructor_name: 'E', message: 'm' },
      { stack: null, as_string: 'E: m', constructor_name: 'E', message: 'm' },
      {
        stack: 'E: m\nat',
        as_string: 'E: m',
        constructor_name: 'E',
        message: 'm',
      },
    ];
    let omittedPairs = 0;
    for (const node of cases) {
      const compact = omitExpectedValues(node as any) as Record<
        string,
        unknown
      >;
      if (!('constructor_name' in compact) && 'constructor_name' in node) {
        omittedPairs++;
      }
      const restored = restoreExpectedValues(compact) as Record<
        string,
        unknown
      >;
      for (const key of ['as_string', 'constructor_name', 'message'] as const) {
        if (key in node) {
          expect(restored[key]).toEqual(node[key]);
        } else {
          expect(restored).not.toHaveProperty(key);
        }
      }
    }
    expect(omittedPairs).toBe(4);
  });

  describe('with the report size limit', () => {
    test.each(['lines', 'string'] as const)(
      'restored header fields are exact or marked truncations (stackFormat=%s)',
      (stackFormat) => {
        const caught = new Error('m'.repeat(150) + ': ' + 'n'.repeat(150));
        const complete = {
          as_string: String(caught),
          constructor_name: 'Error',
          message: caught.message,
        };
        let derivedSomewhere = 0;
        for (
          let maxReportSize = 256;
          maxReportSize <= 1_200;
          maxReportSize += 5
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
          if (!('constructor_name' in report)) derivedSomewhere++;
          const restored = restoreExpectedValues(report);
          for (const key of Object.keys(
            complete,
          ) as (keyof typeof complete)[]) {
            const value = restored[key] as string;
            expect(typeof value).toBe('string');
            if (value === complete[key]) continue;
            expect(value.endsWith(marker)).toBe(true);
            const prefix = value.slice(0, -marker.length);
            expect(prefix.length).toBeLessThan(complete[key].length);
            expect(complete[key].startsWith(prefix)).toBe(true);
          }
        }
        expect(derivedSomewhere).toBeGreaterThan(0);
      },
    );

    test('a big budget keeps the compact form, a tight one keeps the fields', () => {
      const caught = new Error('boom');
      const compact = makeCorj(caught, {
        maxReportSize: 4_096,
        metadata: false,
      });
      expect(compact).toEqual({ stack: caught.stack!.split('\n') });
      const tight = makeCorj(caught, {
        maxReportSize: 256,
        metadata: false,
      });
      expect(tight.truncated).toBe(true);
      expect((tight.stack as string[])[0]).toBe('Error: boom');
      // The first line survived intact, so the header fields are derivable.
      expect(tight).not.toHaveProperty('constructor_name');
      expect(tight).not.toHaveProperty('message');
      expect(tight).not.toHaveProperty('as_string');
      expect(restoreExpectedValues(tight)).toMatchObject({
        constructor_name: 'Error',
        message: 'boom',
        as_string: 'Error: boom',
      });
    });
  });
});

describe('report versions', () => {
  test('constants', () => {
    expect(CORJ_VERSION).toBe('corj/v0.12');
    expect(CORJ_VERSION_FULL).toBe('corj/v0.12-full');
    expect(CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK).toContain(
      '/corj/v0.12/report-object.json',
    );
    expect(CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK).toContain(
      '/corj/v0.12/report-array.json',
    );
    expect(CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK).toContain(
      '/corj/v0.12-full/report-object.json',
    );
    expect(CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK).toContain(
      '/corj/v0.12-full/report-array.json',
    );
  });

  test.each([false, true])(
    'v and $schema follow omitExpectedValues (array=%s)',
    (array) => {
      const caught = new Error('v');
      (caught as any).cause = new Error('child');
      const maker = new CorjMaker({ metadata: true });
      const fullMaker = maker.with({ omitExpectedValues: false });
      const compact = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const full = array
        ? fullMaker.makeReportArray(caught)
        : fullMaker.makeReportObject(caught);
      const nodes = (report: unknown) =>
        (Array.isArray(report)
          ? report
          : [
              report,
              ...(report as { children: unknown[] }).children,
            ]) as Record<string, unknown>[];
      expect(nodes(compact)).toHaveLength(2);
      expect(nodes(full)).toHaveLength(2);
      // Only the root carries the version and schema link.
      const kind = array ? 'array' : 'object';
      expect(nodes(compact)[0]!['v']).toBe(CORJ_VERSION);
      expect(nodes(compact)[0]!['$schema']).toBe(
        `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12/report-${kind}.json`,
      );
      expect(nodes(full)[0]!['v']).toBe(CORJ_VERSION_FULL);
      expect(nodes(full)[0]!['$schema']).toBe(
        `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12-full/report-${kind}.json`,
      );
      for (const report of [compact, full]) {
        expect(nodes(report)[1]).not.toHaveProperty('v');
        expect(nodes(report)[1]).not.toHaveProperty('$schema');
        expect(nodes(report)[1]).not.toHaveProperty('children_sources');
      }
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      const validateFull = array
        ? getReportArrayReportValidator('full')
        : getReportObjectReportValidator('full');
      expect(validate(compact)).toBe(true);
      expect(validateFull(full)).toBe(true);
      // Each version rejects the other's label.
      expect(validate(full)).toBe(false);
      expect(validateFull(compact)).toBe(false);
      // Restoring relabels to the full version and reproduces the full report.
      const restored = restoreExpectedValues(compact);
      expect(validateFull(restored)).toBe(true);
      expect(restored).toEqual(full);
    },
  );

  test('restore does not touch other version labels or missing metadata', () => {
    expect(restoreExpectedValues({ v: 'corj/v0.10' as any })).toMatchObject({
      v: 'corj/v0.10',
    });
    expect(restoreExpectedValues({ $schema: 'x' as any })).toMatchObject({
      $schema: 'x',
    });
    expect(restoreExpectedValues({})).not.toHaveProperty('v');
    expect(restoreExpectedValues({})).not.toHaveProperty('$schema');
    expect(restoreExpectedValues({ v: CORJ_VERSION_FULL })).toMatchObject({
      v: CORJ_VERSION_FULL,
    });
  });

  test('markFullVersion relabels arrays, roots and children', () => {
    const report = markFullVersion({
      v: CORJ_VERSION,
      $schema: CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          v: CORJ_VERSION,
          $schema: CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
        },
      ],
    });
    expect(report).toEqual({
      v: CORJ_VERSION_FULL,
      $schema: CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
      children: [
        {
          id: '0',
          path: '$.cause',
          level: 1,
          v: CORJ_VERSION_FULL,
          $schema: CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
        },
      ],
    });
    expect(
      markFullVersion([
        { id: 'root', path: '$', level: 0, v: CORJ_VERSION },
        { id: '0', path: '$.cause', level: 1 },
      ]),
    ).toEqual([
      { id: 'root', path: '$', level: 0, v: CORJ_VERSION_FULL },
      { id: '0', path: '$.cause', level: 1 },
    ]);
  });

  test('the full schema requires the base fields and the compact one does not', () => {
    const minimal = { stack: ['Error: x'] };
    expect(getReportObjectReportValidator()(minimal)).toBe(true);
    expect(getReportObjectReportValidator('full')(minimal)).toBe(false);
    const complete = {
      instanceof_error: true,
      typeof: 'object',
      as_string: 'Error: x',
      as_json: {},
    };
    expect(getReportObjectReportValidator()(complete)).toBe(true);
    expect(getReportObjectReportValidator('full')(complete)).toBe(true);
  });
});
