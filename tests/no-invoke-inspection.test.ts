import type { CorjReport } from '../src';
import {
  CORJ_CIRCULAR_MARKER,
  CORJ_OMITTED_MARKER,
  CorjMaker,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const noInvoke = new CorjMaker({ inspection: 'no-invoke' });
const byDefault = new CorjMaker();

/** A `no-invoke` report with every omitted-for-being-expected field filled back in. */
function fullNoInvokeReport(caught: unknown): CorjReport {
  return restoreExpectedValues(noInvoke.makeReportObject(caught));
}

/**
 * A fixture that records every piece of its own code that runs. Any non-empty
 * `calls` after a `no-invoke` report is a failure of the mode, which is what
 * makes these tests fail if an excluded hook is ever invoked again.
 */
function makeSpyFixture() {
  const calls: string[] = [];
  const caught = {
    get message() {
      calls.push('get message');
      return 'secret message';
    },
    get detail() {
      calls.push('get detail');
      return 'secret detail';
    },
    set detail(_value: string) {
      calls.push('set detail');
    },
    plain: 'visible',
    toString() {
      calls.push('toString');
      return 'secret toString';
    },
    toJSON() {
      calls.push('toJSON');
      return { leaked: 'secret toJSON' };
    },
    toCorjAsString() {
      calls.push('toCorjAsString');
      return 'secret toCorjAsString';
    },
    toCorjAsJson() {
      calls.push('toCorjAsJson');
      return { leaked: 'secret toCorjAsJson' };
    },
  };
  return { calls, caught };
}

describe('inspection: "no-invoke"', () => {
  describe('no code on the caught object runs', () => {
    test('getters, setters and every formatting hook are left alone', () => {
      const { calls, caught } = makeSpyFixture();
      noInvoke.makeReportObject(caught);
      expect(calls).toEqual([]);
    });

    test('the same fixture does run its code under the default inspection', () => {
      const { calls, caught } = makeSpyFixture();
      byDefault.makeReportObject(caught);
      expect(calls).toContain('get message');
      expect(calls).toContain('toCorjAsString');
      expect(calls).toContain('toCorjAsJson');
    });

    test('no value produced by a hook reaches the report', () => {
      const { caught } = makeSpyFixture();
      const json = JSON.stringify(noInvoke.makeReportObject(caught));
      for (const marker of [
        'secret message',
        'secret detail',
        'secret toString',
        'secret toJSON',
        'secret toCorjAsString',
        'secret toCorjAsJson',
      ]) {
        expect(json).not.toContain(marker);
      }
      expect(json).toContain('visible');
    });

    test('a getter that throws is never reached, so nothing is warned about', () => {
      const onError = jest.fn();
      const caught = {
        get boom(): string {
          throw new Error('getter exploded');
        },
      };
      const report = new CorjMaker({
        inspection: 'no-invoke',
        onError,
      }).makeReportObject(caught);
      expect(onError).not.toHaveBeenCalled();
      expect(report.as_json).toEqual({ boom: CORJ_OMITTED_MARKER });
    });

    test('an accessor is read as a descriptor, not invoked, through makeCorj too', () => {
      const { calls, caught } = makeSpyFixture();
      makeCorj(caught, { inspection: 'no-invoke' });
      makeCorjArray(caught, { inspection: 'no-invoke' });
      expect(calls).toEqual([]);
    });
  });

  describe('omitted content is distinguishable from missing content', () => {
    test('an accessor-backed message is the marker, an absent one is absent', () => {
      const withAccessor = noInvoke.makeReportObject({
        get message() {
          return 'hidden';
        },
      });
      const withoutMessage = noInvoke.makeReportObject({ other: 1 });
      expect(withAccessor.message).toBe(CORJ_OMITTED_MARKER);
      expect(withoutMessage).not.toHaveProperty('message');
    });

    test('a data-property message is reported verbatim', () => {
      const report = noInvoke.makeReportObject({ message: 'plain value' });
      expect(report.message).toBe('plain value');
    });

    test('the marker is not the failure marker: null still means producing a value threw', () => {
      const report = noInvoke.makeReportObject({
        get message() {
          return 'hidden';
        },
      });
      expect(report.message).not.toBeNull();
      expect(report.message).toBe(CORJ_OMITTED_MARKER);
    });

    test('an accessor property inside as_json is marked, a data property is kept', () => {
      const report = noInvoke.makeReportObject({
        plain: 'kept',
        get computed() {
          return 'hidden';
        },
      });
      expect(report.as_json).toEqual({
        plain: 'kept',
        computed: CORJ_OMITTED_MARKER,
      });
    });

    test('an accessor-backed children source marks the node instead of inventing a child', () => {
      const report = noInvoke.makeReportObject({
        get cause() {
          return new Error('hidden cause');
        },
      });
      expect(report.children_omitted).toBe('not_inspected');
      expect(report).not.toHaveProperty('children');
    });

    test('an accessor element of an errors array marks the node', () => {
      const errors: unknown[] = [];
      Object.defineProperty(errors, '0', {
        enumerable: true,
        configurable: true,
        get: () => new Error('hidden element'),
      });
      const report = noInvoke.makeReportObject({ errors });
      expect(report.children_omitted).toBe('not_inspected');
    });

    test('a data-property cause is still reported as a child', () => {
      const report = noInvoke.makeReportObject({
        message: 'outer',
        cause: { message: 'inner' },
      });
      expect(report.children_omitted).toBeUndefined();
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.message).toBe('inner');
    });
  });

  describe('as_string is derived rather than produced by the caught object', () => {
    test('a native error reads exactly as Error.prototype.toString would', () => {
      const caught = new Error('boom');
      const report = fullNoInvokeReport(caught);
      expect(report.as_string).toBe('Error: boom');
      expect(String(caught)).toBe(report.as_string);
      expect(report.as_string_format).toBe('derived');
    });

    test('a subclass with its own name is derived from name and message', () => {
      class HttpError extends Error {
        override name = 'HttpError';
      }
      const caught = new HttpError('not found');
      const report = fullNoInvokeReport(caught);
      expect(report.as_string).toBe('HttpError: not found');
      expect(String(caught)).toBe(report.as_string);
    });

    test('an empty message drops the separator, as the built-in does', () => {
      const caught = new Error('');
      const report = fullNoInvokeReport(caught);
      expect(report.as_string).toBe('Error');
      expect(String(caught)).toBe(report.as_string);
    });

    test('a plain object uses Object.prototype.toString, which runs no user code', () => {
      const report = fullNoInvokeReport({ a: 1 });
      expect(report.as_string).toBe('[object Object]');
      expect(report.as_string_format).toBe('derived');
    });

    test('a custom toString is refused and marked', () => {
      const report = fullNoInvokeReport({
        toString() {
          return 'never called';
        },
      });
      expect(report.as_string).toBe(CORJ_OMITTED_MARKER);
    });

    test('an array is refused, because Array.prototype.toString reads elements', () => {
      const report = fullNoInvokeReport([1, 2]);
      expect(report.as_string).toBe(CORJ_OMITTED_MARKER);
    });

    test('a Symbol.toStringTag accessor is not invoked to build the tag', () => {
      let read = 0;
      const caught = {
        get [Symbol.toStringTag]() {
          read++;
          return 'Tagged';
        },
      };
      const report = fullNoInvokeReport(caught);
      expect(read).toBe(0);
      expect(report.as_string).toBe(CORJ_OMITTED_MARKER);
    });

    test('primitives stringify normally', () => {
      expect(fullNoInvokeReport('plain string').as_string).toBe('plain string');
      expect(fullNoInvokeReport(42).as_string).toBe('42');
      expect(fullNoInvokeReport(undefined).as_string).toBe('undefined');
    });
  });

  describe('supported behavior is retained', () => {
    test('a native error keeps its stack, which V8 exposes as an own accessor', () => {
      const report = fullNoInvokeReport(new Error('with stack'));
      expect(typeof report.stack === 'object' ? report.stack : []).not.toEqual([
        CORJ_OMITTED_MARKER,
      ]);
      expect(String(report.stack)).toContain('Error: with stack');
    });

    test('a cause chain is walked and linked', () => {
      const inner = new Error('inner');
      const outer = new Error('outer');
      (outer as { cause?: unknown }).cause = inner;
      const report = noInvoke.makeReportObject(outer);
      expect(report.children).toHaveLength(1);
      expect(report.children![0]!.path).toBe('$.cause');
      expect(String(report.children![0]!.stack)).toContain('inner');
    });

    test('cycles inside as_json become the circular marker', () => {
      const caught: Record<string, unknown> = { name: 'cyclic' };
      caught['self'] = caught;
      const report = noInvoke.makeReportObject(caught);
      expect(report.as_json).toEqual({
        name: 'cyclic',
        self: CORJ_CIRCULAR_MARKER,
      });
    });

    test('the report size limit is still honored', () => {
      const caught = { big: 'x'.repeat(50_000) };
      const report = new CorjMaker({
        inspection: 'no-invoke',
        maxReportSize: 1_024,
      }).makeReportObject(caught);
      expect(
        Buffer.byteLength(JSON.stringify(report), 'utf8'),
      ).toBeLessThanOrEqual(1_024);
      expect(report.truncated).toBe(true);
    });

    test('reports still validate against the published schemas', () => {
      const validateObject = getReportObjectReportValidator();
      const validateArray = getReportArrayReportValidator();
      const caught = {
        get hidden() {
          return 'x';
        },
        get cause() {
          return new Error('hidden');
        },
        plain: 1,
      };
      expect(validateObject(noInvoke.makeReportObject(caught))).toBe(true);
      expect(validateArray(noInvoke.makeReportArray(caught))).toBe(true);
    });
  });

  describe('Proxy limits are real and documented', () => {
    test('descriptor access still runs a proxy trap, which the docs state', () => {
      const traps: string[] = [];
      const caught = new Proxy(
        { message: 'proxied' },
        {
          getOwnPropertyDescriptor(target, prop) {
            traps.push(`getOwnPropertyDescriptor:${String(prop)}`);
            return Object.getOwnPropertyDescriptor(target, prop);
          },
          get(target, prop, receiver) {
            traps.push(`get:${String(prop)}`);
            return Reflect.get(target, prop, receiver);
          },
        },
      );
      const report = noInvoke.makeReportObject(caught);
      expect(traps.some((t) => t.startsWith('getOwnPropertyDescriptor:'))).toBe(
        true,
      );
      // The `get` trap, which is what an ordinary read would fire, stays unused.
      expect(traps.filter((t) => t.startsWith('get:'))).toEqual([]);
      expect(report.message).toBe('proxied');
    });
  });

  describe('the default inspection is unchanged', () => {
    test('the option defaults to "default"', () => {
      expect(new CorjMaker().options.inspection).toBe('default');
    });

    test('reports agree with a maker that never names the option', () => {
      const caught = new Error('unchanged');
      expect(
        new CorjMaker({ inspection: 'default' }).makeReportObject(caught),
      ).toEqual(byDefault.makeReportObject(caught));
    });

    test('an invalid inspection value is rejected', () => {
      expect(
        () => new CorjMaker({ inspection: 'sandbox' as 'default' }),
      ).toThrow(/inspection must be "default" or "no-invoke"/);
    });

    test('with() layers the mode onto an existing maker', () => {
      const { calls, caught } = makeSpyFixture();
      byDefault.with({ inspection: 'no-invoke' }).makeReportObject(caught);
      expect(calls).toEqual([]);
    });
  });
});

describe('inspection: "no-invoke" edge cases', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('an own property explicitly set to undefined counts as absent', () => {
    const report = noInvoke.makeReportObject({ message: undefined, a: 1 });
    expect(report).not.toHaveProperty('message');
  });

  test('two accessor-backed children sources mark the node once', () => {
    const report = noInvoke.makeReportObject({
      get cause() {
        return new Error('hidden');
      },
      get errors() {
        return [new Error('hidden too')];
      },
    });
    expect(report.children_omitted).toBe('not_inspected');
  });

  test('an accessor-backed constructor is marked', () => {
    const caught = {};
    Object.defineProperty(caught, 'constructor', {
      configurable: true,
      get: () => Object,
    });
    expect(noInvoke.makeReportObject(caught).constructor_name).toBe(
      CORJ_OMITTED_MARKER,
    );
  });

  test('an accessor-backed constructor name is marked', () => {
    const constructor = {};
    Object.defineProperty(constructor, 'name', {
      configurable: true,
      get: () => 'Hidden',
    });
    expect(noInvoke.makeReportObject({ constructor }).constructor_name).toBe(
      CORJ_OMITTED_MARKER,
    );
  });

  test('a non-string constructor name is left out', () => {
    expect(
      noInvoke.makeReportObject({ constructor: { name: 123 } }),
    ).not.toHaveProperty('constructor_name');
  });

  test('an error whose message is an accessor derives as_string with the marker', () => {
    class LazyError extends Error {
      override get message(): string {
        return 'computed';
      }
    }
    const report = fullNoInvokeReport(new LazyError());
    expect(report.as_string).toBe(`Error: ${CORJ_OMITTED_MARKER}`);
  });

  test('an object with no toString at all is marked', () => {
    const caught = Object.create(null) as Record<string, unknown>;
    caught['a'] = 1;
    expect(fullNoInvokeReport(caught).as_string).toBe(CORJ_OMITTED_MARKER);
  });

  test('an accessor-backed toString is marked without being invoked', () => {
    let read = 0;
    const caught = {};
    Object.defineProperty(caught, 'toString', {
      configurable: true,
      get: () => {
        read++;
        return () => 'never';
      },
    });
    expect(fullNoInvokeReport(caught).as_string).toBe(CORJ_OMITTED_MARKER);
    expect(read).toBe(0);
  });

  test('the Error format falls back to "Error" when name and message are absent', () => {
    const caught = Object.create(null) as Record<string, unknown>;
    caught['toString'] = Error.prototype.toString;
    expect(fullNoInvokeReport(caught).as_string).toBe('Error');
  });

  test('the Error format keeps the message when the name is empty', () => {
    const caught = Object.create(null) as Record<string, unknown>;
    caught['toString'] = Error.prototype.toString;
    caught['name'] = '';
    caught['message'] = 'only a message';
    expect(fullNoInvokeReport(caught).as_string).toBe('only a message');
  });

  test('a non-string name is treated as absent', () => {
    const caught = Object.create(null) as Record<string, unknown>;
    caught['toString'] = Error.prototype.toString;
    caught['name'] = 404;
    caught['message'] = 'not found';
    expect(fullNoInvokeReport(caught).as_string).toBe('Error: not found');
  });

  test('a Symbol.toStringTag data property supplies the tag', () => {
    expect(
      fullNoInvokeReport({ [Symbol.toStringTag]: 'Custom' }).as_string,
    ).toBe('[object Custom]');
  });

  test('an array carrying Object.prototype.toString is tagged Array', () => {
    const caught: unknown[] = [1];
    (caught as unknown as Record<string, unknown>)['toString'] =
      Object.prototype.toString;
    expect(fullNoInvokeReport(caught).as_string).toBe('[object Array]');
  });

  test('a function carrying Object.prototype.toString is tagged Function', () => {
    const caught = () => undefined;
    (caught as unknown as Record<string, unknown>)['toString'] =
      Object.prototype.toString;
    expect(fullNoInvokeReport(caught).as_string).toBe('[object Function]');
  });

  test('a throwing getOwnPropertyDescriptor trap is reported, not propagated', () => {
    const onError = jest.fn();
    const caught = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('trap exploded');
        },
        ownKeys() {
          return [];
        },
      },
    );
    const report = new CorjMaker({
      inspection: 'no-invoke',
      onError,
    }).makeReportObject(caught);
    expect(report.as_string).toBeNull();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ stage: 'as_string', key: 'as_string' }),
    );
  });

  describe('engines that do not expose stack as an accessor', () => {
    /**
     * Reload the module with the module-load probe for the native stack getter
     * steered: only that one descriptor lookup is intercepted, so the rest of
     * the module initializes normally.
     */
    function loadWithProbe(
      probe: () => PropertyDescriptor | undefined,
    ): typeof import('../src') {
      const real = Object.getOwnPropertyDescriptor;
      let loaded: typeof import('../src') | undefined;
      jest.isolateModules(() => {
        jest
          .spyOn(Object, 'getOwnPropertyDescriptor')
          .mockImplementation((target, prop) =>
            prop === 'stack' && target instanceof Error
              ? probe()
              : real(target, prop),
          );
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        loaded = require('../src') as typeof import('../src');
      });
      jest.restoreAllMocks();
      if (loaded === undefined) throw new Error('module did not load');
      return loaded;
    }

    test('a data-property stack means no accessor is ever called', () => {
      const corj = loadWithProbe(() => ({
        value: 'Error: from a data property',
        writable: true,
        enumerable: false,
        configurable: true,
      }));
      const report = corj.makeCorj(new Error('boom'), {
        inspection: 'no-invoke',
      });
      // This engine's own accessor is not recognized, so the stack is withheld.
      expect(report.stack).toEqual([corj.CORJ_OMITTED_MARKER]);
    });

    test('a probe that throws leaves the report working', () => {
      const corj = loadWithProbe(() => {
        throw new Error('probe exploded');
      });
      const report = corj.makeCorj(new Error('boom'), {
        inspection: 'no-invoke',
      });
      expect(report.stack).toEqual([corj.CORJ_OMITTED_MARKER]);
    });
  });
});

describe('inspection: "no-invoke" leaks found in review', () => {
  test('V8 lazy stack formatting never reaches a message or name accessor', () => {
    const calls: string[] = [];
    class LazyError extends Error {
      override get message(): string {
        calls.push('get message');
        return 'computed-secret';
      }
      override get name(): string {
        calls.push('get name');
        return 'LazyName';
      }
    }
    // The stack must not have been materialized before the report runs.
    const report = noInvoke.makeReportObject(new LazyError());
    expect(calls).toEqual([]);
    expect(report.stack).toEqual([CORJ_OMITTED_MARKER]);
    expect(JSON.stringify(report)).not.toContain('computed-secret');
  });

  test.each([
    [
      'message',
      {
        get message() {
          return 'secret';
        },
      },
    ],
    [
      'name',
      {
        get name() {
          return 'secret';
        },
      },
    ],
  ])(
    'an accessor on %s withholds the stack of a real error',
    (_prop, extra) => {
      const caught = new Error('boom');
      Object.defineProperties(caught, Object.getOwnPropertyDescriptors(extra));
      const report = noInvoke.makeReportObject(caught);
      expect(report.stack).toEqual([CORJ_OMITTED_MARKER]);
    },
  );

  test('the same fixture does run those accessors under the default inspection', () => {
    const calls: string[] = [];
    class LazyError extends Error {
      override get message(): string {
        calls.push('get message');
        return 'computed';
      }
    }
    byDefault.makeReportObject(new LazyError());
    expect(calls.length).toBeGreaterThan(0);
  });

  test('an ordinary error still keeps its stack', () => {
    const report = noInvoke.makeReportObject(new Error('ordinary'));
    expect(String(report.stack)).toContain('Error: ordinary');
  });

  test('an array does not fire a proxy get trap for its length', () => {
    const traps: string[] = [];
    const caught = new Proxy([1, 2], {
      get(target, prop, receiver) {
        traps.push(`get:${String(prop)}`);
        return Reflect.get(target, prop, receiver);
      },
    });
    noInvoke.makeReportObject(caught);
    noInvoke.makeReportObject({ list: caught });
    expect(traps).toEqual([]);
  });
});

describe('inspection: "no-invoke" stack safety edges', () => {
  test('an error with no name or message anywhere still yields its stack', () => {
    const caught = new Error();
    // With the prototype gone, `name` and `message` resolve nowhere, so stack
    // formatting reads `undefined` for both and runs nothing.
    Object.setPrototypeOf(caught, null);
    const report = noInvoke.makeReportObject(caught);
    expect(report.stack).not.toEqual([CORJ_OMITTED_MARKER]);
    expect(String(report.stack)).toContain('Error');
  });
});
