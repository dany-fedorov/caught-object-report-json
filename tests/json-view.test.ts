import { CorjMaker, resolveCorjRedactPolicy } from '../src/index';
import * as corj from '../src/index';

const silent = () => undefined;

describe('maker.makeJson', () => {
  test('returns the bounded JSON form of any value', () => {
    const view = new CorjMaker().makeJson({ runId: 'run-1', nested: { n: 1 } });
    expect(view).toEqual({
      value: { runId: 'run-1', nested: { n: 1 } },
      truncated: false,
      errors: [],
    });
  });

  test('does not hide children sources: a view has no children', () => {
    const view = new CorjMaker().makeJson({ cause: 'kept', errors: [1] });
    expect(view.value).toEqual({ cause: 'kept', errors: [1] });
  });

  test('maxSize bounds the view and reports truncation', () => {
    const view = new CorjMaker().makeJson(
      { big: 'x'.repeat(5000) },
      { maxSize: 256 },
    );
    expect(view.truncated).toBe(true);
    expect(JSON.stringify(view.value).length).toBeLessThanOrEqual(256);
  });

  test('a named root is where paths start, so rules can tell documents apart', () => {
    const maker = new CorjMaker({
      onError: silent,
      redact: { paths: ['$context.user.email'] },
    });
    const inContext = maker.makeJson(
      { user: { email: 'a@b.c', name: 'A' } },
      { root: '$context' },
    );
    expect(inContext.value).toEqual({
      user: { email: '[redacted]', name: 'A' },
    });
    const elsewhere = maker.makeJson(
      { user: { email: 'a@b.c' } },
      { root: '$public' },
    );
    expect(elsewhere.value).toEqual({ user: { email: 'a@b.c' } });
  });

  test('a rule rooted at the caught value does not reach a named root', () => {
    const maker = new CorjMaker({ redact: { paths: ['$.password'] } });
    expect(
      maker.makeJson({ password: 'p' }, { root: '$context' }).value,
    ).toEqual({
      password: 'p',
    });
    expect(maker.makeJson({ password: 'p' }).value).toEqual({
      password: '[redacted]',
    });
  });

  test('failures come back as records with the named root in their path', () => {
    const hostile = {};
    Object.defineProperty(hostile, 'bad', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });
    const view = new CorjMaker({ onError: silent }).makeJson(hostile, {
      root: '$context',
    });
    expect(view.errors.length).toBeGreaterThan(0);
    expect(view.errors[0]!.path.startsWith('$context')).toBe(true);
  });

  test.each([['context'], ['$'.repeat(2)], ['$.a'], ['$a.b'], ['$1a'], ['']])(
    'rejects the root %j',
    (root) => {
      expect(() => new CorjMaker().makeJson({}, { root })).toThrow(TypeError);
    },
  );

  test.each([[255], [1.5], [Number.NaN]])('rejects maxSize %p', (maxSize) => {
    expect(() => new CorjMaker().makeJson({}, { maxSize })).toThrow(RangeError);
  });

  test('maxSize: null removes the view bound', () => {
    const view = new CorjMaker({ maxReportSize: 512 }).makeJson(
      { big: 'x'.repeat(5000) },
      { maxSize: null },
    );
    expect(view.truncated).toBe(false);
  });

  test('obeys inspection: no-invoke reads no getter', () => {
    let ran = 0;
    const value = {};
    Object.defineProperty(value, 'lazy', {
      enumerable: true,
      get() {
        ran++;
        return 1;
      },
    });
    const view = new CorjMaker({ inspection: 'no-invoke' }).makeJson(value);
    expect(ran).toBe(0);
    expect(view.value).toEqual({ lazy: '[not-inspected]' });
  });
});

describe('maker.scrubText', () => {
  test('applies the scrub rules to one string, with a literal replacement', () => {
    const maker = new CorjMaker({
      redact: { patterns: [/sk-[a-z]{10}/g], replacement: '<$&>' },
    });
    expect(maker.scrubText('key sk-abcdefghij here')).toBe('key <$&> here');
  });

  test('is the identity without a policy', () => {
    expect(new CorjMaker().scrubText('unchanged')).toBe('unchanged');
  });

  test('passes where to a transform with stage warning', () => {
    const seen: unknown[] = [];
    const maker = new CorjMaker({
      redact: {
        transform: (value, context) => {
          seen.push(context);
          return value;
        },
      },
    });
    maker.scrubText('text', { path: '$public.message', key: 'message' });
    expect(seen).toEqual([
      {
        stage: 'warning',
        path: '$public.message',
        key: 'message',
        prop: undefined,
      },
    ]);
  });

  test('a throwing policy fails closed to the replacement', () => {
    const maker = new CorjMaker({
      onError: silent,
      redact: {
        transform: () => {
          throw new Error('bug');
        },
      },
    });
    expect(maker.scrubText('anything')).toBe('[redacted]');
  });
});

describe('policy validation', () => {
  test('a replacement longer than 128 characters is rejected', () => {
    expect(() =>
      resolveCorjRedactPolicy({ replacement: 'x'.repeat(129) }),
    ).toThrow('redact.replacement must be a string of at most 128 characters');
    expect(
      resolveCorjRedactPolicy({ replacement: 'x'.repeat(128) }),
    ).not.toBeNull();
  });

  test('a resolved policy is returned as is, without re-validation', () => {
    const resolved = resolveCorjRedactPolicy({ keys: ['a'] });
    expect(resolveCorjRedactPolicy(resolved)).toBe(resolved);
  });

  test('CorjRedactor is no longer exported', () => {
    expect(Object.keys(corj)).not.toContain('CorjRedactor');
  });
});

describe('the edges of the view API', () => {
  test('a root that is not a string is rejected', () => {
    expect(() =>
      new CorjMaker().makeJson({}, { root: 7 as unknown as string }),
    ).toThrow(TypeError);
  });

  test('text that is not a string is rejected', () => {
    expect(() => new CorjMaker().scrubText(7 as unknown as string)).toThrow(
      TypeError,
    );
  });

  test('the unbounded serializer is built once and reused', () => {
    const maker = new CorjMaker({ maxReportSize: 512 });
    const big = { big: 'x'.repeat(5000) };
    expect(maker.makeJson(big, { maxSize: null }).truncated).toBe(false);
    expect(maker.makeJson(big, { maxSize: null }).truncated).toBe(false);
  });

  test('a value with no JSON form comes back as null', () => {
    expect(new CorjMaker().makeJson(() => undefined).value).toBeNull();
  });

  test('the caught value keeps its own .toCorjAsJson in a named root', () => {
    const value = {
      toCorjAsJson: () => ({ own: true }),
    };
    expect(new CorjMaker().makeJson(value, { root: '$context' }).value).toEqual(
      { own: true },
    );
  });
});
