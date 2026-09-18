import { CorjMaker, makeCorj, makeCorjArray } from '../src/index';
import type { CorjFingerprintPart, CorjOptionsInput } from '../src/index';

// The compile target predates `cause` and AggregateError; the runtime has both.
const ErrorWithCause = Error as unknown as new (
  message?: string,
  options?: { cause?: unknown },
) => Error;
const AggregateErrorCtor: new (errors: unknown[], message?: string) => Error = (
  globalThis as never
)['AggregateError'];

const silent = () => undefined;
const withParts = (
  fingerprintParts: readonly CorjFingerprintPart[] | null,
  more: CorjOptionsInput = {},
) => new CorjMaker({ onError: silent, fingerprintParts, ...more });
const DEFAULT_PARTS = ['constructor_name', 'stack'] as const;

function thrownAt(message: string): Error {
  return new Error(message); // every call creates the error on this same line
}

describe('fingerprint', () => {
  test('null and [] both turn the field off', () => {
    expect(withParts(null).makeReportObject(new Error('x'))).not.toHaveProperty(
      'fingerprint',
    );
    expect(withParts([]).makeReportObject(new Error('x'))).not.toHaveProperty(
      'fingerprint',
    );
    expect(withParts(null).makeFingerprint(new Error('x'))).toBeUndefined();
  });

  test('same site, different interpolated message: same fingerprint by default', () => {
    const maker = withParts(DEFAULT_PARTS);
    // One call site for both: a stack frame carries line and column, so two
    // separate `thrownAt(...)` expressions would already be two places.
    const [a, b] = ['User 12345 not found', 'User 67890 not found'].map(
      (message) => maker.makeReportObject(thrownAt(message)).fingerprint,
    );
    expect(a).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(b).toBe(a);
  });

  test('adding the message part separates them', () => {
    const maker = withParts(['message', 'stack']);
    const [one, two] = ['one', 'two'].map(
      (message) => maker.makeReportObject(thrownAt(message)).fingerprint,
    );
    expect(one).not.toBe(two);
  });

  test('a different site gives a different fingerprint', () => {
    const maker = withParts(DEFAULT_PARTS);
    const elsewhere = new Error('x');
    expect(maker.makeReportObject(thrownAt('x')).fingerprint).not.toBe(
      maker.makeReportObject(elsewhere).fingerprint,
    );
  });

  test('part order in the config does not matter', () => {
    const error = thrownAt('x');
    expect(withParts(['stack', 'message']).makeFingerprint(error)).toBe(
      withParts(['message', 'stack']).makeFingerprint(error),
    );
  });

  test('the budget, the stack format, omission and the report shape do not move it', () => {
    const error = new ErrorWithCause('m'.repeat(5000), {
      cause: new Error('inner'),
    });
    const base = withParts(DEFAULT_PARTS).makeReportObject(error).fingerprint;
    expect(
      withParts(DEFAULT_PARTS, { maxReportSize: 512 }).makeReportObject(error)
        .fingerprint,
    ).toBe(base);
    expect(
      withParts(DEFAULT_PARTS, { stackFormat: 'string' }).makeReportObject(
        error,
      ).fingerprint,
    ).toBe(base);
    expect(
      withParts(DEFAULT_PARTS, {
        omitExpectedValues: false,
      }).makeReportObject(error).fingerprint,
    ).toBe(base);
    expect(
      withParts(DEFAULT_PARTS).makeReportArray(error)[0]!.fingerprint,
    ).toBe(base);
    expect(withParts(DEFAULT_PARTS).makeFingerprint(error)).toBe(base);
  });

  test('causes are part of it, with their path', () => {
    const maker = withParts(['constructor_name']);
    class A extends Error {}
    class B extends Error {}
    expect(
      maker.makeFingerprint(new ErrorWithCause('x', { cause: new A('a') })),
    ).not.toBe(
      maker.makeFingerprint(new ErrorWithCause('x', { cause: new B('b') })),
    );
    expect(
      maker.makeFingerprint(new ErrorWithCause('x', { cause: new A('a') })),
    ).not.toBe(
      maker.makeFingerprint(new AggregateErrorCtor([new A('a')], 'x')),
    );
  });

  test('a field part applies to every node', () => {
    const maker = withParts([{ field: 'code' }]);
    const refused = new ErrorWithCause('x', {
      cause: Object.assign(new Error('c'), { code: 'ECONNREFUSED' }),
    });
    const reset = new ErrorWithCause('x', {
      cause: Object.assign(new Error('c'), { code: 'ECONNRESET' }),
    });
    expect(maker.makeFingerprint(refused)).not.toBe(
      maker.makeFingerprint(reset),
    );
  });

  test('a path part reads relative to each node', () => {
    const maker = withParts([{ path: ['details', 'tool'] }]);
    const search = Object.assign(new Error('x'), {
      details: { tool: 'search', userId: 1 },
    });
    const sameTool = Object.assign(new Error('y'), {
      details: { tool: 'search', userId: 2 },
    });
    const otherTool = Object.assign(new Error('x'), {
      details: { tool: 'fetch', userId: 1 },
    });
    expect(maker.makeFingerprint(search)).toBe(maker.makeFingerprint(sameTool));
    expect(maker.makeFingerprint(search)).not.toBe(
      maker.makeFingerprint(otherTool),
    );
  });

  test('a nested value hashes the same whatever its key order', () => {
    const maker = withParts([{ field: 'details' }]);
    const ab = Object.assign(new Error('x'), {
      details: { a: 1, b: { c: [1, 2] } },
    });
    const ba = Object.assign(new Error('x'), {
      details: { b: { c: [1, 2] }, a: 1 },
    });
    const other = Object.assign(new Error('x'), {
      details: { a: 2, b: { c: [1, 2] } },
    });
    expect(maker.makeFingerprint(ab)).toBe(maker.makeFingerprint(ba));
    expect(maker.makeFingerprint(ab)).not.toBe(maker.makeFingerprint(other));
  });

  test('a huge nested value is cut at a fixed cap, not at the report budget', () => {
    const big = Object.assign(new Error('x'), {
      details: { blob: 'd'.repeat(50_000) },
    });
    expect(
      withParts([{ field: 'details' }], { maxReportSize: 512 }).makeFingerprint(
        big,
      ),
    ).toBe(
      withParts([{ field: 'details' }], {
        maxReportSize: null,
      }).makeFingerprint(big),
    );
  });

  test('numbers and booleans count; functions, symbols, bigints and undefined are null', () => {
    const maker = withParts([{ field: 'v' }]);
    const of = (v: unknown) =>
      maker.makeFingerprint(Object.assign(new Error('x'), { v }));
    expect(of(1)).not.toBe(of(2));
    expect(of(true)).not.toBe(of(false));
    expect(of(() => 1)).toBe(of(undefined));
    expect(of(Symbol('s'))).toBe(of(undefined));
    expect(of(BigInt(1))).toBe(of(undefined));
    expect(of(Number.NaN)).toBe(of(undefined));
  });

  test('thrown primitives do not all share one fingerprint', () => {
    const maker = withParts(DEFAULT_PARTS);
    expect(maker.makeFingerprint('socket closed')).not.toBe(
      maker.makeFingerprint('disk full'),
    );
    expect(maker.makeFingerprint('same')).toBe(maker.makeFingerprint('same'));
  });

  test('values are hashed after redaction: a secret cannot be confirmed from the hash', () => {
    const maker = withParts(['message'], {
      redact: { patterns: [/sk-[a-z]{10}/g] },
    });
    expect(maker.makeFingerprint(thrownAt('key sk-aaaaaaaaaa'))).toBe(
      maker.makeFingerprint(thrownAt('key sk-bbbbbbbbbb')),
    );
  });

  test('a skipped field hashes as the replacement; a no-invoke getter as the marker', () => {
    const skipping = withParts([{ field: 'code' }], {
      redact: { keys: ['code'] },
    });
    expect(
      skipping.makeFingerprint(Object.assign(new Error('x'), { code: 'A' })),
    ).toBe(
      skipping.makeFingerprint(Object.assign(new Error('x'), { code: 'B' })),
    );
    let ran = 0;
    class WithGetter extends Error {
      get code() {
        ran++;
        return 'G';
      }
    }
    const strict = withParts([{ field: 'code' }], { inspection: 'no-invoke' });
    expect(strict.makeFingerprint(new WithGetter('x'))).toMatch(/^fp1_/);
    expect(ran).toBe(0);
    const loosened = withParts([{ field: 'code', inspection: 'default' }], {
      inspection: 'no-invoke',
    });
    loosened.makeFingerprint(new WithGetter('x'));
    expect(ran).toBe(1);
  });

  test('a function part is called per node; a throw is recorded and counts as null', () => {
    const paths: string[] = [];
    const maker = withParts([
      ({ path }) => {
        paths.push(path);
        if (path === '$.cause') throw new Error('part failed');
        return 'constant';
      },
    ]);
    const report = maker.makeReportObject(
      new ErrorWithCause('x', { cause: new Error('y') }),
    );
    expect(paths).toEqual(['$', '$.cause']);
    expect(report.fingerprint).toMatch(/^fp1_/);
    expect(report.reporting_errors).toEqual([
      {
        stage: 'other',
        path: '$.cause',
        key: 'fingerprint',
        error: 'Error: part failed',
      },
    ]);
  });

  test('a part the node has no value for contributes nothing', () => {
    const maker = withParts(['message']);
    // A thrown string has no `message`, so only the root fallback tells these apart.
    expect(maker.makeFingerprint('socket closed')).not.toBe(
      maker.makeFingerprint('disk full'),
    );
  });

  test('a caught object with no string form still hashes', () => {
    // `String()` of a null-prototype object throws, so `as_string` is null.
    expect(
      withParts(DEFAULT_PARTS).makeFingerprint(Object.create(null)),
    ).toMatch(/^fp1_/);
  });

  test('a value with no JSON form counts as nothing', () => {
    const maker = withParts([{ field: 'details' }]);
    const none = Object.assign(new Error('x'), {
      details: { toJSON: () => undefined },
    });
    expect(maker.makeFingerprint(none)).toBe(
      maker.makeFingerprint(new Error('x')),
    );
  });

  test('a policy that drops a value leaves the part empty', () => {
    const maker = withParts([{ field: 'code' }], {
      redact: {
        transform: (value, { key }) =>
          key === 'fingerprint' ? undefined : value,
      },
    });
    expect(
      maker.makeFingerprint(Object.assign(new Error('x'), { code: 'A' })),
    ).toBe(maker.makeFingerprint(Object.assign(new Error('x'), { code: 'B' })));
  });

  test('a policy reaches inside a nested value', () => {
    const maker = withParts([{ field: 'details' }], {
      redact: { keys: ['token'] },
    });
    const a = Object.assign(new Error('x'), {
      details: { token: 'A', tool: 'search' },
    });
    const b = Object.assign(new Error('x'), {
      details: { token: 'B', tool: 'search' },
    });
    expect(maker.makeFingerprint(a)).toBe(maker.makeFingerprint(b));
  });

  test('no-invoke inspection reaches inside a nested value too', () => {
    let ran = 0;
    const details = { plain: 1 };
    Object.defineProperty(details, 'secret', {
      enumerable: true,
      get() {
        ran++;
        return 'G';
      },
    });
    const caught = Object.assign(new Error('x'), { details });
    const withheld = withParts([{ field: 'details' }], {
      inspection: 'no-invoke',
    }).makeFingerprint(caught);
    expect(ran).toBe(0);
    expect(withParts([{ field: 'details' }]).makeFingerprint(caught)).not.toBe(
      withheld,
    );
    expect(ran).toBe(1);
  });

  test('a serializer failure inside a part is recorded, and the part counts as null', () => {
    const maker = withParts([{ field: 'details' }]);
    const trap = Object.assign(new Error('x'), {
      details: {
        toJSON() {
          throw new Error('toJSON trap');
        },
      },
    });
    const report = maker.makeReportObject(trap);
    expect(report.fingerprint).toBe(maker.makeFingerprint(new Error('x')));
    expect(report.reporting_errors).toContainEqual({
      stage: 'as_json',
      path: '$',
      key: 'fingerprint',
      error: 'Error: toJSON trap',
    });
  });

  test('the call argument wins, works with the feature off, and is validated', () => {
    expect(
      withParts(DEFAULT_PARTS).makeReportObject(new Error('x'), {
        fingerprint: 'group-7',
      }).fingerprint,
    ).toBe('group-7');
    expect(
      withParts(null).makeReportObject(new Error('x'), {
        fingerprint: 'group-7',
      }).fingerprint,
    ).toBe('group-7');
    expect(() =>
      withParts(null).makeReportObject(new Error('x'), {
        fingerprint: 'x'.repeat(65),
      }),
    ).toThrow(
      'fingerprint must be 1 to 64 printable ASCII characters without spaces',
    );
  });

  test('fingerprint follows occurrence_id at the head of the root, in both shapes', () => {
    const options = {
      onError: silent,
      occurrenceIdSources: [{ auto: 'random' }],
      fingerprintParts: DEFAULT_PARTS,
    } as const;
    expect(Object.keys(makeCorj(new Error('x'), options)).slice(0, 2)).toEqual([
      'occurrence_id',
      'fingerprint',
    ]);
    const rows = makeCorjArray(
      new ErrorWithCause('x', { cause: new Error('y') }),
      options,
    );
    expect(Object.keys(rows[0]!).slice(0, 2)).toEqual([
      'occurrence_id',
      'fingerprint',
    ]);
    expect(rows[1]).not.toHaveProperty('fingerprint');
  });

  test('makeFingerprint never builds as_json', () => {
    let serialized = 0;
    const error = Object.assign(new Error('x'), {
      toCorjAsJson() {
        serialized++;
        return {};
      },
    });
    withParts(DEFAULT_PARTS).makeFingerprint(error);
    expect(serialized).toBe(0);
  });

  test('a custom toCorjAsString does not leak the message into the default fingerprint', () => {
    const maker = withParts(DEFAULT_PARTS);
    const [one, two] = ['User 1', 'User 2'].map((message) =>
      maker.makeFingerprint(
        Object.assign(thrownAt(message), { toCorjAsString: () => 'custom' }),
      ),
    );
    expect(one).toBe(two);
  });
});
