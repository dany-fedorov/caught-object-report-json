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

const marker = '[truncated]';
const quiet = { onError: () => undefined };

/** A caught object with a controlled stack and no derivable header fields. */
function withStack(stack: unknown) {
  return { stack, toString: () => 'custom' };
}

describe('stack as an array of lines', () => {
  test('is on by default', () => {
    expect(CORJ_DEFAULT_OPTIONS.stackFormat).toBe('lines');
    expect(new CorjMaker().options.stackFormat).toBe('lines');
    expect(new CorjMaker({}).options.stackFormat).toBe('lines');
  });

  test('splits an Error stack exactly like stack.split("\\n")', () => {
    const caught = new Error('boom');
    const report = makeCorj(caught);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.stack).toEqual(caught.stack!.split('\n'));
    const lines = report.stack as string[];
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe('Error: boom');
    for (const line of lines.slice(1)) {
      expect(line).toMatch(/^ {4}at /);
      expect(line).not.toContain('\n');
    }
    expect(lines.join('\n')).toBe(caught.stack);
  });

  test("stackFormat: 'string' keeps the raw string", () => {
    const caught = new Error('boom');
    const report = makeCorj(caught, {
      stackFormat: 'string',
    });
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report.stack).toBe(caught.stack);
    expect(typeof report.stack).toBe('string');
  });

  test.each([
    ['empty string', '', ['']],
    ['single line', 'just one line', ['just one line']],
    ['two lines', 'a\nb', ['a', 'b']],
    ['trailing newline', 'a\nb\n', ['a', 'b', '']],
    ['leading newline', '\na', ['', 'a']],
    ['only a newline', '\n', ['', '']],
    ['only newlines', '\n\n', ['', '', '']],
    ['blank line in the middle', 'a\n\nb', ['a', '', 'b']],
    ['CRLF keeps the carriage return', 'a\r\nb', ['a\r', 'b']],
    ['lone carriage return is not a separator', 'a\rb', ['a\rb']],
    ['whitespace is not trimmed', '  a  \n\tb\t', ['  a  ', '\tb\t']],
    ['unicode', 'Ошибка: 😀\n    at 界', ['Ошибка: 😀', '    at 界']],
    ['escaped backslash-n is literal text', 'a\\nb', ['a\\nb']],
    [
      'line and paragraph separators are not separators',
      'a\u2028b\u2029c',
      ['a\u2028b\u2029c'],
    ],
    [
      'next-line and form-feed are not separators',
      'a\u0085b\fc',
      ['a\u0085b\fc'],
    ],
    ['null character survives', 'a\u0000\nb', ['a\u0000', 'b']],
    ['a lone surrogate survives', 'a\ud800\nb', ['a\ud800', 'b']],
  ])('splits %s', (_name, stack, expected) => {
    expect(stack.split('\n')).toEqual(expected);
    const report = makeCorj(withStack(stack));
    expect(report.stack).toEqual(expected);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    const raw = makeCorj(withStack(stack), {
      stackFormat: 'string',
    });
    expect(raw.stack).toBe(stack);
  });

  test('a very long stack keeps every line', () => {
    const stack = Array.from({ length: 5_000 }, (_, i) => `line ${i}`).join(
      '\n',
    );
    const report = makeCorj(withStack(stack), {
      maxReportSize: null,
    });
    expect(report.stack).toHaveLength(5_000);
    expect((report.stack as string[])[4_999]).toBe('line 4999');
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['a boolean', true],
    ['a bigint', BigInt(10)],
    ['a symbol', Symbol('stack')],
    ['an object', { first: 'line' }],
    ['a function', () => 'line'],
    ['an already split array', ['Error: x', '    at y']],
  ])('a stack that is %s is not reported', (_name, stack) => {
    const report = makeCorj(withStack(stack), quiet);
    expect(report).not.toHaveProperty('stack');
    expect(getReportObjectReportValidator()(report)).toBe(true);
    // and the same without parsing
    const raw = makeCorj(withStack(stack), {
      ...quiet,
      stackFormat: 'string',
    });
    expect(raw).not.toHaveProperty('stack');
  });

  test('a String object stack is not a string primitive and is not reported', () => {
    const report = makeCorj(withStack(new String('Error: x\n    at y')));
    expect(report).not.toHaveProperty('stack');
  });

  test('a stack getter that throws yields null', () => {
    const contexts: CorjErrorContext[] = [];
    const caught = {
      get stack(): string {
        throw new Error('no stack for you');
      },
    };
    const report = makeCorj(caught, {
      onError: (_error, context) => {
        contexts.push(context);
      },
    });
    expect(report.stack).toBeNull();
    expect(getReportObjectReportValidator()(report)).toBe(true);
    // The JSON serializer trips over the getter as well; the stack read itself
    // is reported exactly once.
    expect(contexts.filter((c) => c.stage === 'prop-access')).toEqual([
      { stage: 'prop-access', path: '$', key: 'stack', prop: 'stack' },
    ]);
    expect(contexts.map((c) => c.key)).toEqual(['stack', 'as_json']);
    expect(contexts[1]).toEqual({
      stage: 'as_json',
      path: '$',
      key: 'as_json',
    });
  });

  test('a stack inherited from the prototype is split too', () => {
    const proto = { stack: 'Proto: x\n    at y' };
    const caught = Object.create(proto);
    const report = makeCorj(caught);
    expect(report.stack).toEqual(['Proto: x', '    at y']);
  });

  test('a stack getter is read exactly once', () => {
    let reads = 0;
    const caught = {
      get stack() {
        reads++;
        return 'a\nb';
      },
      // Keep the JSON serializer away from the getter.
      toCorjAsJson: () => ({}),
    };
    const report = makeCorj(caught);
    expect(reads).toBe(1);
    expect(report.stack).toEqual(['a', 'b']);
  });

  test.each([
    ['a string', 'text'],
    ['a number', 42],
    ['a bigint', BigInt(10)],
    ['a boolean', false],
    ['a symbol', Symbol('s')],
    ['undefined', undefined],
    ['null', null],
  ])('%s has no stack to split', (_name, caught) => {
    const report = makeCorj(caught, quiet);
    expect(report).not.toHaveProperty('stack');
  });

  test('a function with a string stack property is split', () => {
    const fn = () => undefined;
    (fn as any).stack = 'Fn: x\n    at y';
    const report = makeCorj(fn, quiet);
    expect(report.typeof).toBe('function');
    expect(report.stack).toEqual(['Fn: x', '    at y']);
  });

  test('a stack containing the truncation marker is not flagged as truncated', () => {
    const report = makeCorj(withStack(`a\n${marker}\nb`));
    expect(report.stack).toEqual(['a', marker, 'b']);
    expect(report).not.toHaveProperty('truncated');
  });

  test('nested error stacks are split in object and array reports', () => {
    const inner = new TypeError('inner');
    const middle = new RangeError('middle');
    (middle as any).cause = inner;
    const outer = new Error('outer');
    (outer as any).errors = [middle, 'no stack here'];

    const object = makeCorj(outer);
    expect(getReportObjectReportValidator()(object)).toBe(true);
    expect(object.stack).toEqual(outer.stack!.split('\n'));
    expect(object.children).toHaveLength(3);
    expect(object.children![0]!.stack).toEqual(middle.stack!.split('\n'));
    expect(object.children![1]).not.toHaveProperty('stack');
    expect(object.children![2]!.stack).toEqual(inner.stack!.split('\n'));

    const array = makeCorjArray(outer);
    expect(getReportArrayReportValidator()(array)).toBe(true);
    expect(array.map((row) => row.stack)).toEqual([
      outer.stack!.split('\n'),
      middle.stack!.split('\n'),
      undefined,
      inner.stack!.split('\n'),
    ]);

    const raw = makeCorjArray(outer, {
      stackFormat: 'string',
    });
    expect(raw.map((row) => row.stack)).toEqual([
      outer.stack,
      middle.stack,
      undefined,
      inner.stack,
    ]);
  });

  test('the option is inherited by clones and can be flipped either way', () => {
    const caught = new Error('clone');
    const raw = new CorjMaker({ stackFormat: 'string' });
    expect(raw.with({}).makeReportObject(caught).stack).toBe(caught.stack);
    expect(
      raw.with({ stackFormat: 'lines' }).makeReportObject(caught).stack,
    ).toEqual(caught.stack!.split('\n'));
    const split = new CorjMaker();
    expect(
      split.with({ stackFormat: 'string' }).makeReportObject(caught).stack,
    ).toBe(caught.stack);
    // Full option objects are accepted as given.
    expect(
      new CorjMaker({
        ...CORJ_DEFAULT_OPTIONS,
        stackFormat: 'string',
      }).makeReportObject(caught).stack,
    ).toBe(caught.stack);
    // The options of a maker cannot be changed after construction.
    const maker = new CorjMaker({});
    expect(() => {
      (maker.options as { stackFormat: string }).stackFormat = 'string';
    }).toThrow(TypeError);
    expect(maker.makeReportObject(caught).stack).toEqual(
      caught.stack!.split('\n'),
    );
  });

  test('an explicitly undefined option means the default', () => {
    const caught = new Error('undefined');
    expect(
      new CorjMaker({ stackFormat: undefined as any }).options.stackFormat,
    ).toBe('lines');
    expect(
      makeCorj(caught, {
        stackFormat: undefined as any,
      }).stack,
    ).toEqual(caught.stack!.split('\n'));
    // A clone inherits the parent's explicit choice when the override is undefined.
    expect(
      new CorjMaker({ stackFormat: 'string' }).with({
        stackFormat: undefined as any,
      }).options.stackFormat,
    ).toBe('string');
  });

  test.each([true, false, 1, 0, 'yes', '', 'LINES', null])(
    'rejects a stack format that is not "lines" or "string" (%j)',
    (stackFormat) => {
      expect(() => new CorjMaker({ stackFormat: stackFormat as any })).toThrow(
        TypeError,
      );
    },
  );

  test('as_string is derived from the first element and restored from it', () => {
    const caught = new Error('first');
    const report = makeCorj(caught);
    expect(report).not.toHaveProperty('as_string');
    const restored = restoreExpectedValues(report);
    expect(restored.as_string).toBe('Error: first');
    expect(restored.stack).toEqual(caught.stack!.split('\n'));
  });

  test('an empty stack line keeps an empty as_string derivable', () => {
    const caught = {
      stack: '',
      message: '',
      constructor: { name: '' },
      toString: () => '',
    };
    const report = makeCorj(caught);
    expect(report.stack).toEqual(['']);
    expect(report).not.toHaveProperty('as_string');
    expect(report).not.toHaveProperty('constructor_name');
    expect(report).not.toHaveProperty('message');
    expect(restoreExpectedValues(report)).toMatchObject({
      as_string: '',
      constructor_name: '',
      message: '',
      stack: [''],
    });
  });

  describe('with the report size limit', () => {
    test('a stack that does not fit is truncated to strings only', () => {
      const lines = Array.from({ length: 200 }, (_, i) => `    at frame ${i}`);
      const caught = withStack(['Error: long', ...lines].join('\n'));
      for (const reportSizeUnit of [
        'utf8-bytes',
        'utf16-code-units',
      ] as const) {
        const report = makeCorj(caught, {
          maxReportSize: 1_000,
          reportSizeUnit,
        });
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(report.truncated).toBe(true);
        const stack = report.stack as string[];
        expect(Array.isArray(stack)).toBe(true);
        expect(stack.length).toBeGreaterThan(1);
        expect(stack.length).toBeLessThan(201);
        expect(stack.every((line) => typeof line === 'string')).toBe(true);
        expect(stack[stack.length - 1]!.endsWith(marker)).toBe(true);
        expect(stack[0]).toBe('Error: long');
        const size =
          reportSizeUnit === 'utf8-bytes'
            ? Buffer.byteLength(JSON.stringify(report), 'utf8')
            : JSON.stringify(report).length;
        expect(size).toBeLessThanOrEqual(1_000);
      }
    });

    test('an exactly fitting report with a stack array is preserved', () => {
      const caught = new Error('exact');
      const unlimited = makeCorj(caught, {
        maxReportSize: null,
      });
      const size = Buffer.byteLength(JSON.stringify(unlimited), 'utf8');
      expect(makeCorj(caught, { maxReportSize: size })).toEqual(unlimited);
      expect(makeCorj(caught, { maxReportSize: size - 1 })).toHaveProperty(
        'truncated',
        true,
      );
    });

    test('a truncated stack never yields a wrong derived as_string', () => {
      const caught = new Error('x'.repeat(120));
      const complete = String(caught);
      for (let maxReportSize = 256; maxReportSize <= 900; maxReportSize += 7) {
        const report = makeCorj(caught, {
          maxReportSize,
          metadata: false,
        });
        expect(getReportObjectReportValidator()(report)).toBe(true);
        const restored = restoreExpectedValues(report);
        const asString = restored.as_string as string;
        if (asString !== complete) {
          expect(asString.endsWith(marker)).toBe(true);
          expect(complete.startsWith(asString.slice(0, -marker.length))).toBe(
            true,
          );
        }
        if (Array.isArray(report.stack)) {
          expect(report.stack.every((line) => typeof line === 'string')).toBe(
            true,
          );
        }
      }
    });
  });
});
