import {
  CorjMaker,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src/index';

// The compile target predates `cause`; the runtime has it.
const ErrorWithCause = Error as unknown as new (
  message?: string,
  options?: { cause?: unknown },
) => Error;

const silent = () => undefined;

describe('call input: context', () => {
  test('context is rendered into the root of an object report', () => {
    const report = makeCorj(new Error('x'), undefined, {
      context: { runId: 'run-1' },
    });
    expect(report.context).toEqual({ runId: 'run-1' });
  });

  test('context sits on the root row of an array report', () => {
    const rows = makeCorjArray(
      new ErrorWithCause('x', { cause: new Error('y') }),
      undefined,
      {
        context: { runId: 'run-1' },
      },
    );
    expect(rows[0]!.context).toEqual({ runId: 'run-1' });
    expect(rows[1]).not.toHaveProperty('context');
  });

  test('no context argument, no field; an explicit undefined is the same', () => {
    expect(makeCorj(new Error('x'))).not.toHaveProperty('context');
    expect(
      makeCorj(new Error('x'), undefined, { context: undefined }),
    ).not.toHaveProperty('context');
  });

  test('context: null is kept as null', () => {
    expect(
      makeCorj(new Error('x'), undefined, { context: null }).context,
    ).toBeNull();
  });

  test('context paths start at $context, so the policy can address it', () => {
    const report = makeCorj(
      Object.assign(new Error('x'), { user: { email: 'kept@caught' } }),
      { redact: { paths: ['$context.user.email'] } },
      { context: { user: { email: 'gone@context' } } },
    );
    expect(report.context).toEqual({ user: { email: '[redacted]' } });
    expect(report.as_json).toEqual({ user: { email: 'kept@caught' } });
  });

  test('a failure inside context is recorded with a $context path', () => {
    const context = {};
    Object.defineProperty(context, 'bad', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });
    const report = makeCorj(new Error('x'), { onError: silent }, { context });
    expect(
      report.reporting_errors!.some((r) => r.path.startsWith('$context')),
    ).toBe(true);
  });

  test('maxContextSize caps the container on its own', () => {
    const report = makeCorj(
      new Error('x'),
      { maxContextSize: 256 },
      { context: { big: 'c'.repeat(5000) } },
    );
    expect(JSON.stringify(report.context).length).toBeLessThanOrEqual(256);
    expect(report.truncated).toBe(true);
  });

  test('maxContextSize: null leaves only the report budget', () => {
    const report = makeCorj(
      new Error('x'),
      { maxContextSize: null, maxReportSize: null },
      { context: { big: 'c'.repeat(20_000) } },
    );
    expect((report.context as { big: string }).big).toHaveLength(20_000);
  });

  test.each([[255], [1.5], ['1000']])(
    'rejects maxContextSize %p',
    (maxContextSize) => {
      expect(
        () => new CorjMaker({ maxContextSize: maxContextSize as number }),
      ).toThrow(RangeError);
    },
  );

  test('a call input that is not an object, or has an unknown key, is rejected', () => {
    const maker = new CorjMaker();
    expect(() => maker.makeReportObject(new Error('x'), 5 as never)).toThrow(
      TypeError,
    );
    expect(() =>
      maker.makeReportObject(new Error('x'), { contxt: 1 } as never),
    ).toThrow(
      'Unknown call input "contxt". Known call inputs: occurrenceId, fingerprint, context',
    );
  });

  test('one maker serves calls with different context', () => {
    const maker = new CorjMaker();
    expect(maker.makeReportObject(new Error('a'), { context: 1 }).context).toBe(
      1,
    );
    expect(maker.makeReportObject(new Error('b'), { context: 2 }).context).toBe(
      2,
    );
    expect(maker.makeReportObject(new Error('c'))).not.toHaveProperty(
      'context',
    );
  });

  test('restoreExpectedValues leaves context alone', () => {
    const report = makeCorj(new Error('x'), undefined, { context: { a: 1 } });
    expect(restoreExpectedValues(report).context).toEqual({ a: 1 });
  });
});
