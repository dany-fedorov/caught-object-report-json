import type { CorjContext, CorjRedactPolicyInput } from '../src';
import {
  Corj,
  CORJ_OMITTED_MARKER,
  CORJ_REDACTED_MARKER,
  CorjMaker,
} from '../src';
import * as reportSize from '../src/report-size';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const { makeReport, resolveRedactPolicy, restoreExpectedValues } = Corj;

/** The one string that must never survive a policy that excludes it. */
const SECRET = 'sk-live-MARKER-0123456789';

/**
 * A caught object carrying the marker everywhere the issue's fixtures place it:
 * an own property, the message, the stack (through the message), custom
 * formatting output, a nested cause, and a getter that throws while being read.
 */
function makeMarkedFixture() {
  const cause = new Error(`nested cause holds ${SECRET}`);
  const caught = new Error(`top level holds ${SECRET}`);
  Object.assign(caught, {
    token: SECRET,
    nested: { deep: { apiKey: SECRET } },
    cause,
    toCorjAsString: () => `custom string holds ${SECRET}`,
    toCorjAsJson: () => ({ custom: SECRET }),
  });
  Object.defineProperty(caught, 'exploding', {
    enumerable: true,
    configurable: true,
    get(): never {
      throw new Error(`inspection failure holds ${SECRET}`);
    },
  });
  return caught;
}

/** `new Error(message, { cause })` without relying on the lib target's typing. */
function withCause(error: Error, cause: unknown): Error {
  return Object.assign(error, { cause });
}

/** Every string anywhere in a value, so a leak cannot hide in a nested field. */
function allText(value: unknown): string {
  return JSON.stringify(value) ?? '';
}

describe('redact', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the marker never survives a policy that excludes it', () => {
    const maker = new CorjMaker({
      redact: { patterns: [new RegExp(SECRET, 'g')] },
      onReportingError: () => undefined,
    });

    test('not in any field of an object report', () => {
      expect(allText(maker.makeReport(makeMarkedFixture()))).not.toContain(
        SECRET,
      );
    });

    test('not in any node of an array report', () => {
      expect(allText(maker.makeReportArray(makeMarkedFixture()))).not.toContain(
        SECRET,
      );
    });

    test('not in the default warning output about an inspection failure', () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const caught = {};
      Object.defineProperty(caught, 'exploding', {
        enumerable: true,
        configurable: true,
        get(): never {
          throw new Error(`inspection failure holds ${SECRET}`);
        },
      });
      new CorjMaker({
        redact: { patterns: [new RegExp(SECRET, 'g')] },
      }).makeReport(caught);
      expect(warn).toHaveBeenCalled();
      for (const call of warn.mock.calls) {
        expect(allText(call)).not.toContain(SECRET);
      }
    });

    test('that same failure does print it with no policy configured', () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const caught = {};
      Object.defineProperty(caught, 'exploding', {
        enumerable: true,
        configurable: true,
        get(): never {
          throw new Error(`inspection failure holds ${SECRET}`);
        },
      });
      new CorjMaker().makeReport(caught);
      expect(allText(warn.mock.calls)).toContain(SECRET);
    });

    test('the same fixture does leak it with no policy configured', () => {
      const leaky = new CorjMaker({ onReportingError: () => undefined });
      expect(allText(leaky.makeReport(makeMarkedFixture()))).toContain(SECRET);
    });
  });

  describe('keys and paths exclude a property before it is read', () => {
    test('an excluded key is replaced without its getter running', () => {
      let read = 0;
      const caught = {
        get token() {
          read++;
          return SECRET;
        },
        kept: 'visible',
      };
      const report = new CorjMaker({
        redact: { keys: ['token'] },
      }).makeReport(caught);
      expect(read).toBe(0);
      expect(report.as_json).toEqual({
        token: CORJ_REDACTED_MARKER,
        kept: 'visible',
      });
    });

    test('an excluded path is replaced without its getter running', () => {
      let read = 0;
      const caught = {
        config: {
          get authorization() {
            read++;
            return SECRET;
          },
          url: '/orders',
        },
      };
      const report = new CorjMaker({
        redact: { paths: ['$.config.authorization'] },
      }).makeReport(caught);
      expect(read).toBe(0);
      expect(report.as_json).toEqual({
        config: { authorization: CORJ_REDACTED_MARKER, url: '/orders' },
      });
    });

    test('a RegExp key matches case-insensitively when it is written to', () => {
      const report = new CorjMaker({
        redact: { keys: [/^authorization$/i] },
      }).makeReport({ Authorization: SECRET, url: '/x' });
      expect(report.as_json).toEqual({
        Authorization: CORJ_REDACTED_MARKER,
        url: '/x',
      });
    });

    test('a global RegExp matcher answers the same way every time', () => {
      const report = new CorjMaker({
        redact: { keys: [/secret/g] },
      }).makeReport({ secret1: 'a', secret2: 'b', secret3: 'c' });
      expect(report.as_json).toEqual({
        secret1: CORJ_REDACTED_MARKER,
        secret2: CORJ_REDACTED_MARKER,
        secret3: CORJ_REDACTED_MARKER,
      });
    });

    /** An error whose `message` counts every read of itself. */
    function makeCountingError() {
      const counter = { read: 0 };
      class LazyError extends Error {
        override get message(): string {
          counter.read++;
          return SECRET;
        }
      }
      return { counter, caught: new LazyError() };
    }

    test('an excluded report field is replaced without CORJ reading it', () => {
      const { counter, caught } = makeCountingError();
      const report = new CorjMaker({
        redact: { keys: ['message'] },
        inspection: 'no-invoke',
      }).makeReport(caught);
      expect(counter.read).toBe(0);
      expect(report.message).toBe(CORJ_REDACTED_MARKER);
    });

    /**
     * The limit the README states: under the default inspection the caught
     * object's own `toString` and V8's stack formatting read `message`
     * themselves, and no policy can stop code CORJ did not call. `keys` governs
     * CORJ's reads; content in the text belongs to `patterns`.
     */
    test('the default inspection cannot stop the object reading its own property', () => {
      const { counter, caught } = makeCountingError();
      const report = new CorjMaker({
        redact: { keys: ['message'] },
      }).makeReport(caught);
      expect(counter.read).toBeGreaterThan(0);
      expect(report.message).toBe(CORJ_REDACTED_MARKER);
      // ...and the value it read is still in the text, which is why `patterns`
      // exists. This is the documented split, pinned so it cannot drift.
      expect(String(report.stack)).toContain(SECRET);
    });

    test('patterns do cover what keys cannot, in either inspection mode', () => {
      for (const inspection of ['default', 'no-invoke'] as const) {
        const { caught } = makeCountingError();
        const report = new CorjMaker({
          inspection,
          redact: { keys: ['message'], patterns: [new RegExp(SECRET, 'g')] },
        }).makeReport(caught);
        expect(allText(report)).not.toContain(SECRET);
      }
    });

    test('an excluded children source marks the node instead of reporting it', () => {
      let read = 0;
      const caught = {
        message: 'outer',
        get cause() {
          read++;
          return new Error('inner');
        },
      };
      const report = new CorjMaker({
        redact: { keys: ['cause'] },
      }).makeReport(caught);
      expect(read).toBe(0);
      expect(report.children_omitted).toBe('redacted');
      expect(report).not.toHaveProperty('children');
    });

    test('an excluded element of an errors array marks the node', () => {
      const report = new CorjMaker({
        redact: { paths: ['$.errors[0]'] },
      }).makeReport({ errors: [new Error('hidden'), new Error('kept')] });
      expect(report.children_omitted).toBe('redacted');
      expect(report.children).toHaveLength(1);
      expect(String(report.children![0]!.stack)).toContain('kept');
    });
  });

  describe('patterns scrub every emitted representation', () => {
    const maker = new CorjMaker({
      redact: { patterns: [/password=\S+/g], replacement: '[gone]' },
      onReportingError: () => undefined,
    });

    test('message and stack', () => {
      const report = maker.makeReport(
        new Error('login failed for password=hunter2'),
      );
      expect(String(report.stack)).toContain('login failed for [gone]');
      expect(String(report.stack)).not.toContain('hunter2');
    });

    test('a value nested inside as_json', () => {
      const report = maker.makeReport({
        a: { b: ['password=hunter2'] },
      });
      expect(report.as_json).toEqual({ a: { b: ['[gone]'] } });
    });

    test('a custom toCorjAsString and toCorjAsJson', () => {
      const report = restoreExpectedValues(
        maker.makeReport({
          toCorjAsString: () => 'said password=hunter2',
          toCorjAsJson: () => ({ said: 'password=hunter2' }),
        }),
      );
      expect(report.as_string).toBe('said [gone]');
      expect(report.as_json).toEqual({ said: '[gone]' });
    });

    test('a child report, not only the root', () => {
      const caught = new Error('outer');
      (caught as { cause?: unknown }).cause = new Error('password=hunter2');
      const report = maker.makeReport(caught);
      expect(String(report.children![0]!.stack)).toContain('[gone]');
      expect(allText(report)).not.toContain('hunter2');
    });

    test('a constructor name', () => {
      class Passwordhunter2Error extends Error {}
      const report = new CorjMaker({
        redact: { patterns: [/hunter2/g] },
      }).makeReport({ constructor: Passwordhunter2Error });
      expect(report.constructor_name).toBe('Password[redacted]Error');
    });
  });

  describe('transform is the last word', () => {
    test('it sees the context of each value', () => {
      const seen: CorjContext[] = [];
      new CorjMaker({
        redact: {
          transform: (value, context) => {
            seen.push(context);
            return value;
          },
        },
      }).makeReport({ message: 'm', nested: { a: 1 } });
      expect(seen.map((c) => c.stage)).toContain('prop-access');
      expect(seen.map((c) => c.stage)).toContain('as_json');
      expect(seen.map((c) => c.path)).toContain('$.nested.a');
    });

    test('it runs after patterns, so it sees scrubbed text', () => {
      const seen: unknown[] = [];
      new CorjMaker({
        redact: {
          patterns: [/secret/g],
          transform: (value) => {
            seen.push(value);
            return value;
          },
        },
      }).makeReport({ note: 'a secret value' });
      expect(seen).toContain('a [redacted] value');
    });

    test('returning undefined leaves the field out entirely', () => {
      const report = new CorjMaker({
        redact: {
          transform: (value, context) =>
            context.sourceProperty === 'message' ? undefined : value,
        },
      }).makeReport({ message: 'dropped', kept: 1 });
      expect(report).not.toHaveProperty('message');
      expect(report.as_json).toEqual({ kept: 1 });
    });

    test('returning undefined drops a property from as_json', () => {
      const report = new CorjMaker({
        redact: {
          transform: (value, context) =>
            context.sourceProperty === 'drop' ? undefined : value,
        },
      }).makeReport({ drop: 'gone', kept: 'here' });
      expect(report.as_json).toEqual({ kept: 'here' });
    });

    test('a replacement that is not a string still yields a string field', () => {
      const report = new CorjMaker({
        redact: { transform: () => 42 },
      }).makeReport({ message: 'original' });
      expect(report.message).toBe(CORJ_REDACTED_MARKER);
    });
  });

  describe('a throwing policy is reported once and fails closed', () => {
    test('a throwing transform yields the replacement, not the value', () => {
      const onReportingError = jest.fn();
      const report = new CorjMaker({
        redact: {
          transform: () => {
            throw new Error('policy exploded');
          },
        },
        onReportingError,
      }).makeReport({ message: SECRET, other: SECRET });
      expect(allText(report)).not.toContain(SECRET);
      expect(report.message).toBe(CORJ_REDACTED_MARKER);
      expect(onReportingError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ stage: 'redact' }),
      );
    });

    test('a throwing matcher excludes the property rather than letting it through', () => {
      const onReportingError = jest.fn();
      const exploding = {
        test(): boolean {
          throw new Error('matcher exploded');
        },
      } as unknown as RegExp;
      Object.setPrototypeOf(exploding, RegExp.prototype);
      const report = new CorjMaker({
        redact: { keys: [exploding] },
        onReportingError,
      }).makeReport({ message: SECRET });
      expect(allText(report)).not.toContain(SECRET);
      expect(onReportingError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ stage: 'redact' }),
      );
    });

    test('a transform that throws while a failure is reported does not recurse', () => {
      let depth = 0;
      let maxDepth = 0;
      const onReportingError = jest.fn(() => {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
        depth--;
      });
      new CorjMaker({
        redact: {
          transform: () => {
            throw new Error('always');
          },
        },
        onReportingError,
      }).makeReport({ message: 'x', a: 1, b: 2 });
      expect(maxDepth).toBe(1);
    });

    test('a transform that throws is not re-entered by the default handler', () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      new CorjMaker({
        redact: {
          transform: () => {
            throw new Error('always');
          },
        },
      }).makeReport({ message: 'x' });
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0])).toContain('stage=redact');
    });
  });

  describe('the policy composes with the rest of the contract', () => {
    test('reports still validate against the published schemas', () => {
      const maker = new CorjMaker({
        redact: { keys: ['cause', 'token'], patterns: [/x/g] },
        onReportingError: () => undefined,
      });
      const caught = makeMarkedFixture();
      expect(getReportObjectReportValidator()(maker.makeReport(caught))).toBe(
        true,
      );
      expect(
        getReportArrayReportValidator()(maker.makeReportArray(caught)),
      ).toBe(true);
    });

    test('the report size limit is still honored', () => {
      const report = new CorjMaker({
        redact: { patterns: [/nothing/g] },
        maxReportSize: 1_024,
      }).makeReport({ big: 'x'.repeat(50_000) });
      expect(
        Buffer.byteLength(JSON.stringify(report), 'utf8'),
      ).toBeLessThanOrEqual(1_024);
      expect(report.truncated).toBe(true);
    });

    test('cycles are still handled', () => {
      const caught: Record<string, unknown> = { name: 'cyclic' };
      caught['self'] = caught;
      const report = new CorjMaker({
        redact: { keys: ['nothing'] },
      }).makeReport(caught);
      expect(report.as_json).toEqual({
        name: 'cyclic',
        self: '[circular]',
      });
    });

    test('it composes with inspection: "no-invoke"', () => {
      const report = new CorjMaker({
        inspection: 'no-invoke',
        redact: { keys: ['token'] },
      }).makeReport({
        token: SECRET,
        get lazy() {
          return SECRET;
        },
        plain: 'kept',
      });
      expect(report.as_json).toEqual({
        token: CORJ_REDACTED_MARKER,
        lazy: CORJ_OMITTED_MARKER,
        plain: 'kept',
      });
    });
  });

  describe('behavior is unchanged when no policy is configured', () => {
    test('the option defaults to null', () => {
      expect(new CorjMaker().options.redact).toBeNull();
    });

    test('an explicit null matches the default', () => {
      const caught = new Error('unchanged');
      expect(new CorjMaker({ redact: null }).makeReport(caught)).toEqual(
        new CorjMaker().makeReport(caught),
      );
    });

    test('an empty policy passes content through untouched', () => {
      const caught = new Error('unchanged');
      expect(new CorjMaker({ redact: {} }).makeReport(caught)).toEqual(
        makeReport(caught),
      );
    });

    test('withOptions() layers a policy onto a maker without changing it', () => {
      const base = new CorjMaker();
      const redacting = base.withOptions({ redact: { keys: ['token'] } });
      expect(base.options.redact).toBeNull();
      expect(redacting.makeReport({ token: SECRET }).as_json).toEqual({
        token: CORJ_REDACTED_MARKER,
      });
    });

    test('a resolved policy can be layered again', () => {
      const first = new CorjMaker({ redact: { keys: ['token'] } });
      const second = first.withOptions({ maxDepth: 1 });
      expect(second.makeReport({ token: SECRET }).as_json).toEqual({
        token: CORJ_REDACTED_MARKER,
      });
    });
  });

  describe('invalid policies are rejected', () => {
    test.each([
      [
        { keys: 'token' },
        /redact\.keys must be an array of strings or RegExps/,
      ],
      [{ keys: [1] }, /redact\.keys must be an array of strings or RegExps/],
      [{ paths: {} }, /redact\.paths must be an array of strings or RegExps/],
      [{ patterns: ['x'] }, /redact\.patterns must be an array of RegExps/],
      [{ patterns: 'x' }, /redact\.patterns must be an array of RegExps/],
      [{ replacement: 1 }, /redact\.replacement must be a string/],
      [{ transform: 'f' }, /redact\.transform must be a function/],
      [{ nope: true }, /Unknown redact option "nope"/],
    ])('%j throws', (redact, message) => {
      expect(() => new CorjMaker({ redact: redact as never })).toThrow(
        message as RegExp,
      );
    });

    test('a non-object policy throws', () => {
      expect(() => new CorjMaker({ redact: 'all' as never })).toThrow(
        /redact must be an object or null/,
      );
    });

    test('a resolved policy is frozen', () => {
      const { redact } = new CorjMaker({ redact: { keys: ['a'] } }).options;
      expect(Object.isFrozen(redact)).toBe(true);
      expect(Object.isFrozen(redact!.keys)).toBe(true);
    });

    test('the input arrays are copied, so later mutation has no effect', () => {
      const keys = ['token'];
      const maker = new CorjMaker({ redact: { keys } });
      keys.push('other');
      expect(maker.makeReport({ other: SECRET }).as_json).toEqual({
        other: SECRET,
      });
    });
  });
});

describe('redact: the reporting boundary itself', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('an excluded constructor name is replaced', () => {
    class SecretError extends Error {}
    const report = new CorjMaker({
      redact: { paths: ['$.constructor.name'] },
    }).makeReport({ constructor: SecretError });
    expect(report.constructor_name).toBe(CORJ_REDACTED_MARKER);
  });

  test('an excluded constructor is replaced before its name is reached', () => {
    const caught = {};
    Object.defineProperty(caught, 'constructor', {
      configurable: true,
      get(): never {
        throw new Error('never read');
      },
    });
    const report = new CorjMaker({
      redact: { keys: ['constructor'] },
    }).makeReport(caught);
    expect(report.constructor_name).toBe(CORJ_REDACTED_MARKER);
  });

  test('the line about a handler that threw goes through the policy', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const caught = Object.defineProperty({}, 'message', {
      enumerable: true,
      get(): never {
        throw new Error(`trap holding ${SECRET}`);
      },
    });
    new CorjMaker({
      redact: { patterns: [/sk-live-[A-Za-z0-9-]+/g] },
      onReportingError: (failure: unknown) => {
        throw new Error(`sink failed for ${String(failure)}`);
      },
    }).makeReport(caught);
    const printed = warn.mock.calls.map((call) => String(call[0])).join('\n');
    expect(printed).toContain('onReportingError threw');
    expect(printed).toContain(CORJ_REDACTED_MARKER);
    expect(printed).not.toContain(SECRET);
  });

  test('a failure with no field name is still redacted and reported', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    // A limiter failure carries neither a field nor a property in its context.
    jest.spyOn(reportSize, 'limitReportSize').mockImplementation(() => {
      throw new Error(`limiter failed on ${SECRET}`);
    });
    new CorjMaker({
      redact: { patterns: [new RegExp(SECRET, 'g')] },
    }).makeReport(new Error('caught'));
    expect(
      warn.mock.calls.some((call) => String(call).includes('stage=limit')),
    ).toBe(true);
    expect(allText(warn.mock.calls)).not.toContain(SECRET);
  });

  test('a transform that throws on as_string is reported without a property', () => {
    const onReportingError = jest.fn();
    new CorjMaker({
      redact: {
        transform: (value, context) => {
          if (context.stage === 'as_string')
            throw new Error('as_string policy');
          return value;
        },
      },
      onReportingError,
    }).makeReport(new Error('boom'));
    expect(onReportingError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'redact', reportKey: 'as_string' }),
    );
    expect(onReportingError.mock.calls[0]![1].sourceProperty).toBeUndefined();
  });

  test('a transform that drops the warning text yields the replacement', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const caught = {};
    Object.defineProperty(caught, 'exploding', {
      enumerable: true,
      configurable: true,
      get(): never {
        throw new Error('inspection failure');
      },
    });
    new CorjMaker({
      redact: {
        transform: (value, context) =>
          context.stage === 'warning' ? undefined : value,
      },
    }).makeReport(caught);
    expect(String(warn.mock.calls)).toContain(CORJ_REDACTED_MARKER);
    expect(String(warn.mock.calls)).not.toContain('inspection failure');
  });

  test('a non-string warning replacement still prints as a string', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const caught = {};
    Object.defineProperty(caught, 'exploding', {
      enumerable: true,
      configurable: true,
      get(): never {
        throw new Error('inspection failure');
      },
    });
    new CorjMaker({
      redact: {
        replacement: '[hidden]',
        transform: (value, context) =>
          context.stage === 'warning' ? { not: 'a string' } : value,
      },
    }).makeReport(caught);
    expect(String(warn.mock.calls)).toContain('[hidden]');
    expect(String(warn.mock.calls)).not.toContain('inspection failure');
  });
});

describe('redact: leaks found in review', () => {
  test('a pattern that is not global is rejected rather than half-applied', () => {
    expect(
      () => new CorjMaker({ redact: { patterns: [/sk-live-\w+/] } }),
    ).toThrow(/redact\.patterns must all be global/);
    expect(() => new CorjMaker({ redact: { patterns: [/x/y] } })).toThrow(
      /redact\.patterns must all be global/,
    );
    expect(
      () => new CorjMaker({ redact: { patterns: [/x/g, /y/gi] } }),
    ).not.toThrow();
  });

  test('every occurrence is replaced, not only the first', () => {
    const report = new CorjMaker({
      redact: { patterns: [/sk-live-\w+/g] },
    }).makeReport({ note: 'sk-live-AAA and sk-live-BBB' });
    expect(report.as_json).toEqual({ note: '[redacted] and [redacted]' });
  });

  test.each(['$&', '$1', "$'", '$`', '$$'])(
    'a replacement containing %s stays literal',
    (replacement) => {
      const report = new CorjMaker({
        redact: { patterns: [/(sk)-live-\w+/g], replacement },
      }).makeReport({ note: 'sk-live-AAA' });
      expect(report.as_json).toEqual({ note: replacement });
      expect(allText(report)).not.toContain('sk-live-AAA');
    },
  );

  test('object keys inside as_json are scrubbed, not only values', () => {
    const report = new CorjMaker({
      redact: { patterns: [/sk-live-\w+/g] },
    }).makeReport({ sessions: { 'sk-live-AAA': { user: 1 } } });
    expect(report.as_json).toEqual({
      sessions: { [CORJ_REDACTED_MARKER]: { user: 1 } },
    });
    expect(allText(report)).not.toContain('sk-live-AAA');
  });

  test('a matcher the caller already used still matches from the start', () => {
    const matcher = /^cause$/g;
    // The caller ran it first, leaving `lastIndex` past the end.
    expect(matcher.test('cause')).toBe(true);
    expect(matcher.lastIndex).toBeGreaterThan(0);
    const report = new CorjMaker({
      redact: { keys: [matcher] },
    }).makeReport({ cause: new Error('should be hidden') });
    expect(report.children_omitted).toBe('redacted');
    expect(report).not.toHaveProperty('children');
  });

  test('an empty policy does not change .toCorjAsJson output', () => {
    const caught = {
      toCorjAsJson: () => ({ cause: 'kept', errors: [1], a: 1 }),
    };
    expect(new CorjMaker({ redact: {} }).makeReport(caught).as_json).toEqual(
      makeReport(caught).as_json,
    );
  });

  test('a policy still hides the caught object own children sources from as_json', () => {
    const report = new CorjMaker({
      redact: { keys: ['nothing'] },
    }).makeReport({ cause: new Error('inner'), a: 1 });
    expect(report.as_json).toEqual({ a: 1 });
  });

  test('a transform that drops as_string keeps the report schema-valid', () => {
    const report = new CorjMaker({
      omitExpectedValues: false,
      redact: {
        transform: (value, context) =>
          context.stage === 'as_string' ? undefined : value,
      },
    }).makeReport({ a: 1 });
    expect(report.as_string).toBe(CORJ_REDACTED_MARKER);
    expect(getReportObjectReportValidator('full')(report)).toBe(true);
  });

  test('an id built from the caught object is scrubbed', () => {
    const rows = new CorjMaker({
      redact: { patterns: [new RegExp(SECRET, 'g')] },
      makeReportId: ({ caught }) => String((caught as Error).message),
    }).makeReportArray(new Error(SECRET));
    expect(rows.map((row) => row.id)).toEqual([CORJ_REDACTED_MARKER]);
    expect(allText(rows)).not.toContain(SECRET);
  });

  test('a scrubbed custom id is the same text in the parent child_ids', () => {
    const rows = new CorjMaker({
      redact: { patterns: [new RegExp(SECRET, 'g')] },
      makeReportId: ({ caught }) => String((caught as Error).message),
    }).makeReportArray(
      withCause(new Error(`outer ${SECRET}`), new Error(`inner ${SECRET}`)),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe(`outer ${CORJ_REDACTED_MARKER}`);
    expect(rows[1]?.id).toBe(`inner ${CORJ_REDACTED_MARKER}`);
    // The link is the scrubbed text itself, identical on both sides.
    expect(rows[0]?.child_ids).toEqual([rows[1]?.id]);
    expect(allText(rows)).not.toContain(SECRET);
  });
});

/** Each digit replaced by the marker, the way `patterns: [/\d/g]` rewrites text. */
function redactDigits(text: string): string {
  return text.replace(/\d/g, CORJ_REDACTED_MARKER);
}

/**
 * A default id is corj's own counter - "0", "1", ... - so an ordinary policy
 * such as `patterns: [/\d/g]` (account or card numbers) would rewrite every one
 * of them to the same marker and destroy the `child_ids` <-> `id` linkage.
 * A default id carries nothing from the caught object, so the policy never sees
 * it, while the rest of the report is scrubbed as usual.
 */
describe('redact: default report ids are structural', () => {
  /**
   * Three levels, each message holding a digit the policy has to scrub.
   *
   * The marker around the digit is `zq~`, which cannot occur in a hex
   * `fingerprint`, in the `occurrence_id` alphabet (`0-9A-HJKMNP-TV-Z`) or in a
   * stack path, so a report that still contains one has kept a message the
   * policy was meant to rewrite - and not merely rolled a random id that reads
   * like one.
   */
  function makeChain(): Error {
    return withCause(
      new Error('outer zq~1'),
      withCause(new Error('mid zq~2'), new Error('inner zq~3')),
    );
  }

  const policies: [string, CorjRedactPolicyInput][] = [
    ['patterns', { patterns: [/\d/g] }],
    ['transform', { transform: () => 'CONSTANT' }],
  ];

  test.each(policies)(
    'the object report keeps its default ids under a %s policy',
    (_name, redact) => {
      const report = new CorjMaker({ redact }).makeReport(makeChain());
      const children = report.children ?? [];
      expect(children.map((child) => child.id)).toEqual(['0', '1']);
      expect(children[0]?.child_ids).toEqual(['1']);
      expect(children[1]?.child_ids).toBeUndefined();
      // The policy is live in this very report: each marker ends in the digit
      // a `patterns: [/\d/g]` policy has to remove.
      for (const marker of ['zq~1', 'zq~2', 'zq~3']) {
        expect(allText(report)).not.toContain(marker);
      }
    },
  );

  test.each(policies)(
    'the array report keeps its default ids under a %s policy',
    (_name, redact) => {
      const rows = new CorjMaker({ redact }).makeReportArray(makeChain());
      expect(rows.map((row) => row.id)).toEqual(['root', '0', '1']);
      expect(rows[0]?.child_ids).toEqual(['0']);
      expect(rows[1]?.child_ids).toEqual(['1']);
      expect(rows[2]?.child_ids).toBeUndefined();
      for (const marker of ['zq~1', 'zq~2', 'zq~3']) {
        expect(allText(rows)).not.toContain(marker);
      }
    },
  );

  test('a digits policy still scrubs message, stack and as_json content', () => {
    const caught = withCause(
      new Error('card 4111111111111111'),
      new Error('inner 999'),
    );
    Object.assign(caught, { account: '12345' });
    const report = new CorjMaker({
      omitExpectedValues: false,
      redact: { patterns: [/\d/g] },
    }).makeReport(caught);
    expect(report.message).toBe(redactDigits('card 4111111111111111'));
    expect(report.as_json).toEqual({ account: redactDigits('12345') });
    expect(allText(report.stack)).not.toMatch(/\d/);
    expect(report.children?.[0]?.message).toBe(redactDigits('inner 999'));
    expect(report.children?.[0]?.id).toBe('0');
  });
});

describe("redact: scrubbing a consumer's own text and the policy resolver", () => {
  /** The context a consumer scrubbing its own text passes in. */
  const context: CorjContext = {
    stage: 'warning',
    path: '$',
    reportKey: 'message',
  };
  /** The part of it `scrubText` takes; the stage is always `warning`. */
  const where = { path: '$', reportKey: 'message' } as const;

  test('scrubText replaces a match with a literal $& replacement', () => {
    const out = new CorjMaker({
      redact: { patterns: [/sk-live-\w+/g], replacement: '<$&>' },
    }).scrubText('key sk-live-AAA here', where);
    expect(out).toBe('key <$&> here');
    expect(out).not.toContain('sk-live-AAA');
  });

  test('scrubText yields the replacement where a transform drops the value', () => {
    const out = new CorjMaker({
      redact: { replacement: '[hidden]', transform: () => undefined },
    }).scrubText('sensitive', where);
    expect(out).toBe('[hidden]');
    expect(typeof out).toBe('string');
  });

  test('scrubText yields the replacement where a transform returns a non-string', () => {
    expect(
      new CorjMaker({
        redact: {
          replacement: '[hidden]',
          transform: () => ({ not: 'a string' }),
        },
      }).scrubText('sensitive', where),
    ).toBe('[hidden]');
  });

  test('scrubText fails closed and reports once when a transform throws', () => {
    const onReportingError = jest.fn();
    const out = new CorjMaker({
      onReportingError,
      redact: {
        replacement: '[hidden]',
        transform: () => {
          throw new Error('policy is broken');
        },
      },
    }).scrubText('sensitive', where);
    expect(out).toBe('[hidden]');
    expect(onReportingError).toHaveBeenCalledTimes(1);
    // The record is itself scrubbed, and a policy that just threw is not
    // consulted again, so every text field of it is the replacement.
    expect(onReportingError.mock.calls[0]![1]).toEqual({
      stage: 'redact',
      path: '[hidden]',
      reportKey: context.reportKey,
      error: '[hidden]',
    });
  });

  test('resolveRedactPolicy returns null for null and for undefined', () => {
    expect(resolveRedactPolicy(null)).toBeNull();
    expect(resolveRedactPolicy(undefined)).toBeNull();
  });

  test('resolveRedactPolicy rejects a pattern that is not global', () => {
    expect(() => resolveRedactPolicy({ patterns: [/sk-live-\w+/] })).toThrow(
      TypeError,
    );
    expect(() => resolveRedactPolicy({ patterns: [/sk-live-\w+/] })).toThrow(
      /redact\.patterns must all be global/,
    );
  });

  test('resolveRedactPolicy accepts an already-resolved policy', () => {
    const once = resolveRedactPolicy({
      keys: ['token'],
      patterns: [/sk-live-\w+/g],
      replacement: '[hidden]',
    })!;
    const twice = resolveRedactPolicy(once)!;
    expect(twice).toEqual(once);
    expect(Object.isFrozen(twice)).toBe(true);
    expect(
      new CorjMaker({ redact: twice }).scrubText('sk-live-AAA', where),
    ).toBe('[hidden]');
  });
});

describe('redact: claims the README makes', () => {
  test('two property names that scrub to the same text collapse into one key', () => {
    const report = new CorjMaker({
      redact: { patterns: [/sk-live-\w+/g] },
    }).makeReport({ 'sk-live-AAA': 1, 'sk-live-BBB': 2 });
    expect(report.as_json).toEqual({ [CORJ_REDACTED_MARKER]: 2 });
    expect(Object.keys(report.as_json as object)).toHaveLength(1);
  });

  test('a custom onReportingError receives the caught object unchanged while the report is scrubbed', () => {
    const seen: unknown[] = [];
    const caught = new Error('top level holds sk-live-AAA');
    Object.defineProperty(caught, 'exploding', {
      enumerable: true,
      configurable: true,
      get(): never {
        throw new Error('inspection failure holds sk-live-AAA');
      },
    });
    const report = new CorjMaker({
      redact: { patterns: [/sk-live-\w+/g] },
      onReportingError: (failure) => seen.push(failure),
    }).makeReport(caught);
    expect(seen).toHaveLength(1);
    expect((seen[0] as Error).message).toBe(
      'inspection failure holds sk-live-AAA',
    );
    expect(allText(report)).not.toContain('sk-live-AAA');
  });
});
