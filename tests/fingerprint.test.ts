import { CorjMaker, makeCorj, makeCorjArray } from '../src/index';
import type {
  CorjFingerprintPart,
  CorjOptionsInput,
  CorjReportingError,
} from '../src/index';
import * as sha256 from '../src/sha256';

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

  test('numbers, booleans, bigints and non-finite numbers count; functions, symbols and undefined are null', () => {
    const maker = withParts([{ field: 'v' }]);
    const of = (v: unknown) =>
      maker.makeFingerprint(Object.assign(new Error('x'), { v }));
    expect(of(1)).not.toBe(of(2));
    expect(of(true)).not.toBe(of(false));
    expect(of(() => 1)).toBe(of(undefined));
    expect(of(Symbol('s'))).toBe(of(undefined));
    // A bigint is `<digits>n`, so it is neither the number nor the field missing.
    expect(of(BigInt(1))).not.toBe(of(BigInt(2)));
    expect(of(BigInt(1))).not.toBe(of(1));
    expect(of(BigInt(1))).not.toBe(of(undefined));
    // A non-finite number is its `String()` form, as the nested view writes it.
    expect(of(Number.NaN)).not.toBe(of(undefined));
    expect(of(Number.NaN)).not.toBe(of(Number.POSITIVE_INFINITY));
    expect(of(Number.POSITIVE_INFINITY)).not.toBe(of(Number.NEGATIVE_INFINITY));
  });

  test('a one-segment path entry is the same recipe as the field entry', () => {
    const error = Object.assign(new Error('x'), { a: 'v' });
    expect(withParts([{ field: 'a' }]).makeFingerprint(error)).toBe(
      withParts([{ path: ['a'] }]).makeFingerprint(error),
    );
    expect(() => withParts([{ field: 'a' }, { path: ['a'] }])).toThrow(
      'fingerprintParts[1] repeats "field:a"',
    );
    // An index segment is not a field name, so it keeps its own label.
    expect(withParts([{ path: [0] }]).makeFingerprint(error)).not.toBe(
      withParts([{ path: ['0'] }]).makeFingerprint(error),
    );
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

  test('a policy that drops a value leaves the part as empty as a missing one', () => {
    const maker = withParts([{ field: 'code' }], {
      redact: {
        transform: (value, { key }) =>
          key === 'fingerprint' ? undefined : value,
      },
    });
    const dropped = maker.makeFingerprint(
      Object.assign(new Error('x'), { code: 'A' }),
    );
    expect(dropped).toBe(
      maker.makeFingerprint(Object.assign(new Error('x'), { code: 'B' })),
    );
    expect(dropped).toBe(maker.makeFingerprint(new Error('x')));
  });

  test('a number or a boolean meets the policy too', () => {
    // The fingerprint is published, so a value a policy scrubs must not be
    // confirmable from the hash whatever its type.
    const parts = [{ field: 'code' }] as const;
    const of = (maker: CorjMaker, code: unknown) =>
      maker.makeFingerprint(Object.assign(new Error('x'), { code }));
    const scrubbing = withParts(parts, {
      redact: { transform: (value) => (typeof value === 'number' ? 0 : value) },
    });
    expect(of(scrubbing, 12345)).toBe(of(scrubbing, 67890));
    const plain = withParts(parts);
    expect(of(plain, 12345)).not.toBe(of(plain, 67890));
    const flattening = withParts(parts, {
      redact: {
        transform: (value) => (typeof value === 'boolean' ? false : value),
      },
    });
    expect(of(flattening, true)).toBe(of(flattening, false));
  });

  test('a policy that throws over a part fails closed, once, without throwing', () => {
    const maker = withParts([{ field: 'code' }], {
      redact: {
        transform: (value, { key }) => {
          if (key === 'fingerprint') throw new Error('policy failed');
          return value;
        },
      },
    });
    const report = maker.makeReportObject(
      Object.assign(new Error('x'), { code: 'A' }),
    );
    expect(report.fingerprint).toBe(
      maker.makeFingerprint(Object.assign(new Error('x'), { code: 'B' })),
    );
    expect(
      report.reporting_errors!.filter((r) => r.key === 'fingerprint'),
    ).toEqual([
      {
        stage: 'redact',
        path: '[redacted]',
        key: 'fingerprint',
        prop: '[redacted]',
        error: '[redacted]',
      },
    ]);
  });

  test('a policy keyed on the fingerprint reaches inside a nested value', () => {
    const maker = withParts([{ field: 'details' }], {
      redact: {
        transform: (value, { key }) =>
          key === 'fingerprint' && typeof value === 'number' ? 0 : value,
      },
    });
    const of = (retries: number) =>
      maker.makeFingerprint(
        Object.assign(new Error('x'), { details: { tool: 'search', retries } }),
      );
    expect(of(1)).toBe(of(2));
  });

  test('a cyclic nested value hashes without throwing', () => {
    const maker = withParts([{ field: 'details' }]);
    const of = (tool: string) => {
      const details: Record<string, unknown> = { tool };
      details['self'] = details;
      return maker.makeFingerprint(Object.assign(new Error('x'), { details }));
    };
    expect(of('search')).toMatch(/^fp1_/);
    expect(of('search')).toBe(of('search'));
    expect(of('search')).not.toBe(of('fetch'));
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
  });

  test('an invalid call argument is recorded, never quoted, and falls through', () => {
    const records: CorjReportingError[] = [];
    const maker = new CorjMaker({
      onError: (_caught, record) => void records.push(record),
      fingerprintParts: DEFAULT_PARTS,
    });
    const report = maker.makeReportObject(new Error('x'), {
      fingerprint: 'group 7',
    });
    expect(report.fingerprint).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(report.reporting_errors).toEqual([
      {
        stage: 'other',
        path: '$',
        key: 'fingerprint',
        error:
          'fingerprint must be 1 to 64 printable ASCII characters without spaces',
      },
    ]);
    expect(records).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain('group 7');
    // With the feature off there is nothing to fall through to.
    expect(
      withParts(null).makeReportObject(new Error('x'), {
        fingerprint: 'x'.repeat(65),
      }),
    ).not.toHaveProperty('fingerprint');
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

describe('fingerprint values are redacted under their own path', () => {
  const pair = (
    options: CorjOptionsInput,
    make: (secret: string) => unknown,
  ): [string | undefined, string | undefined] => {
    const maker = new CorjMaker({ onError: silent, ...options });
    const [a, b] = ['AAA', 'BBB'].map((secret) =>
      maker.makeFingerprint(make(secret)),
    );
    return [a, b];
  };
  const withDetails = (secret: string) =>
    Object.assign(new Error('boom'), {
      details: { tool: 'grep', token: secret, inner: { token2: secret } },
    });

  test('a paths rule on a property inside the value reaches the hash', () => {
    const options = {
      fingerprintParts: [{ field: 'details' }],
      redact: { paths: ['$.details.token', '$.details.inner.token2'] },
    } as const;
    const [a, b] = pair(options, withDetails);
    expect(a).toBe(b);
    expect(
      new CorjMaker({ onError: silent, ...options }).makeReportObject(
        withDetails('AAA'),
      ).as_json,
    ).toEqual({
      details: {
        tool: 'grep',
        token: '[redacted]',
        inner: { token2: '[redacted]' },
      },
    });
  });

  test('an anchored paths RegExp reaches the hash', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ field: 'details' }],
        redact: { paths: [/^\$\.details\.(token|inner)$/] },
      },
      withDetails,
    );
    expect(a).toBe(b);
  });

  test('a path entry hashes under the path it read from', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ path: ['details', 'inner'] }],
        redact: { paths: ['$.details.inner.token2'] },
      },
      withDetails,
    );
    expect(a).toBe(b);
  });

  test('a transform keyed on the path of a nested value reaches the hash', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ field: 'details' }],
        redact: {
          transform: (value, { path }) =>
            path === '$.details.token' || path === '$.details.inner.token2'
              ? '[x]'
              : value,
        },
      },
      withDetails,
    );
    expect(a).toBe(b);
  });

  test('a transform keyed on the path of a string field reaches the hash', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ field: 'secretField' }],
        redact: {
          transform: (value, { path }) =>
            path === '$.secretField' ? '[x]' : value,
        },
      },
      (secret) => Object.assign(new Error('boom'), { secretField: secret }),
    );
    expect(a).toBe(b);
  });

  test('a keys rule still reaches the hash', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ field: 'details' }],
        redact: { keys: ['token', 'token2'] },
      },
      withDetails,
    );
    expect(a).toBe(b);
  });

  test('a child node hashes under its own path', () => {
    const [a, b] = pair(
      {
        fingerprintParts: [{ field: 'details' }],
        redact: { paths: ['$.cause.details.token'] },
      },
      (secret) =>
        new ErrorWithCause('outer', {
          cause: Object.assign(new Error('boom'), {
            details: { token: secret },
          }),
        }),
    );
    expect(a).toBe(b);
  });
});

describe('the fingerprint hash input is bounded and cannot throw', () => {
  // Big enough to have broken the old `number[]` hash input, small enough to
  // keep the suite fast now that every string part is cut first.
  const HUGE = 20 * 1024 * 1024;

  test('a huge thrown string is reported with a fingerprint', () => {
    const report = makeCorj('x'.repeat(HUGE), { onError: silent });
    expect(report.fingerprint).toMatch(/^fp1_[0-9a-f]{32}$/);
  });

  test('a huge message is reported with a fingerprint', () => {
    const report = makeCorj(new Error(`upstream said: ${'y'.repeat(HUGE)}`), {
      onError: silent,
      fingerprintParts: ['constructor_name', 'message'],
    });
    expect(report.fingerprint).toMatch(/^fp1_[0-9a-f]{32}$/);
  });

  test('two strings that differ only after the cap share a fingerprint', () => {
    const maker = withParts(['message']);
    const head = 'z'.repeat(20_000);
    expect(maker.makeFingerprint(new Error(`${head}A`))).toBe(
      maker.makeFingerprint(new Error(`${head}B`)),
    );
    expect(maker.makeFingerprint(new Error(`A${head}`))).not.toBe(
      maker.makeFingerprint(new Error(`B${head}`)),
    );
  });

  // The fallback is cut like any other string, and it may also be absent.
  test('a root whose string form failed still hashes its fallback', () => {
    const hostile = {
      toString() {
        throw new Error('no string');
      },
    };
    expect(withParts(DEFAULT_PARTS).makeFingerprint(hostile)).toMatch(
      /^fp1_[0-9a-f]{32}$/,
    );
  });

  test('a failure inside hashing leaves the report without a fingerprint', () => {
    const spy = jest.spyOn(sha256, 'sha256Hex').mockImplementation(() => {
      throw new Error('hash boom');
    });
    try {
      const records: CorjReportingError[] = [];
      const report = makeCorj(new Error('x'), {
        onError: (_caught, record) => void records.push(record),
      });
      expect(report).not.toHaveProperty('fingerprint');
      expect(report.reporting_errors).toEqual([
        {
          stage: 'other',
          path: '$',
          key: 'fingerprint',
          error: 'Error: hash boom',
        },
      ]);
      expect(records).toHaveLength(1);
      expect(
        withParts(DEFAULT_PARTS).makeFingerprint(new Error('x')),
      ).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('makeFingerprint({ requireStack: true })', () => {
  const maker = withParts(DEFAULT_PARTS);
  const required = (caught: unknown) =>
    maker.makeFingerprint(caught, { requireStack: true });

  const stackless: readonly (readonly [string, unknown])[] = [
    ['a thrown string', 'PIN 4921 rejected for alice@example.com'],
    ['a thrown number', 4921],
    ['a thrown null', null],
    ['a plain object', { code: 'PIN_REJECTED', pin: 4921 }],
    [
      'an object with a custom toString',
      { toString: () => 'PIN 4921 rejected' },
    ],
    ['an error whose stack was deleted', deleteStack(new Error('x'))],
    ['an error whose stack is not a string', withStack(new Error('x'), 42)],
  ];

  test.each(stackless)(
    '%s has no fingerprint, because its hash would be its own text',
    (_label, caught) => {
      expect(maker.makeFingerprint(caught)).toMatch(/^fp1_[0-9a-f]{32}$/);
      expect(required(caught)).toBeUndefined();
    },
  );

  test('an error with a stack keeps the fingerprint the report carries', () => {
    const error = new Error('x');
    const plain = maker.makeFingerprint(error);
    expect(plain).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(required(error)).toBe(plain);
    expect(maker.makeReportObject(error).fingerprint).toBe(plain);
  });

  test('a recipe whose parts are all empty has no fingerprint either', () => {
    // The root falls back to its own text here too, stack or no stack.
    const absent = withParts([{ field: 'absent' }]);
    const error = new Error('x');
    expect(absent.makeFingerprint(error)).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(
      absent.makeFingerprint(error, { requireStack: true }),
    ).toBeUndefined();
  });

  test('a stack that "no-invoke" withheld does not count as a stack', () => {
    let ran = 0;
    const caught = new Error('boom');
    Object.defineProperty(caught, 'stack', {
      configurable: true,
      get() {
        ran++;
        return 'Error: boom\n    at secret.js:1:1';
      },
    });
    const noInvoke = withParts(DEFAULT_PARTS, { inspection: 'no-invoke' });
    expect(noInvoke.makeFingerprint(caught)).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(
      noInvoke.makeFingerprint(caught, { requireStack: true }),
    ).toBeUndefined();
    expect(ran).toBe(0);
  });

  test('false, {} and no argument at all are the same call', () => {
    const error = new Error('x');
    const plain = maker.makeFingerprint(error);
    expect(maker.makeFingerprint(error, {})).toBe(plain);
    expect(maker.makeFingerprint(error, { requireStack: false })).toBe(plain);
    expect(
      maker.makeFingerprint('socket closed', { requireStack: false }),
    ).toBe(maker.makeFingerprint('socket closed'));
  });

  test('the option is the caller’s alone: reports are unchanged', () => {
    const thrown = 'socket closed';
    expect(required(thrown)).toBeUndefined();
    expect(makeCorj(thrown).fingerprint).toBe(makeCorj(thrown).fingerprint);
    expect(makeCorj(thrown).fingerprint).toBe(maker.makeFingerprint(thrown));
    expect(makeCorjArray(thrown)[0]!.fingerprint).toBe(
      maker.makeFingerprint(thrown),
    );
  });

  test('an options argument that is not an object throws', () => {
    expect(() => maker.makeFingerprint(new Error('x'), 'yes' as never)).toThrow(
      new TypeError('makeFingerprint options must be an object'),
    );
    expect(() => maker.makeFingerprint(new Error('x'), [] as never)).toThrow(
      new TypeError('makeFingerprint options must be an object'),
    );
  });

  test('an unknown option throws', () => {
    expect(() =>
      maker.makeFingerprint(new Error('x'), { requireStacks: true } as never),
    ).toThrow(
      new TypeError(
        'Unknown makeFingerprint option "requireStacks". Known options: requireStack',
      ),
    );
  });

  test('a non-boolean requireStack throws', () => {
    expect(() =>
      maker.makeFingerprint(new Error('x'), { requireStack: 'yes' as never }),
    ).toThrow(new TypeError('requireStack must be a boolean'));
  });

  test('the shape is checked before anything else is read', () => {
    let read = 0;
    const caught = {
      get message() {
        read++;
        return 'x';
      },
    };
    expect(() =>
      withParts(null).makeFingerprint(caught, { requireStack: 'yes' as never }),
    ).toThrow(TypeError);
    expect(read).toBe(0);
  });

  test('a stack with no frames is a sentence, and a sentence is guessable', () => {
    // The reviewer's case: a caller assigned text to `.stack`.
    const leaky = (message: string) =>
      withStack(
        new Error('x'),
        `PIN ${message} rejected for alice@example.com`,
      );
    expect(maker.makeFingerprint(leaky('4921'))).not.toBe(
      maker.makeFingerprint(leaky('1234')),
    );
    expect(required(leaky('4921'))).toBeUndefined();
  });

  test('a stack a skip rule replaced has no frames left', () => {
    const scrubbed = withParts(DEFAULT_PARTS, { redact: { keys: ['stack'] } });
    // Every error of the same class shares this hash: nothing of the place is in it.
    expect(scrubbed.makeFingerprint(new Error('x'))).toBe(
      scrubbed.makeFingerprint(new Error('y')),
    );
    expect(
      scrubbed.makeFingerprint(new Error('x'), { requireStack: true }),
    ).toBeUndefined();
  });

  test('a recipe without `stack` has nothing to require', () => {
    const byMessage = withParts(['message']);
    expect(byMessage.makeFingerprint(new Error('x'))).toMatch(/^fp1_/);
    expect(
      byMessage.makeFingerprint(new Error('x'), { requireStack: true }),
    ).toBeUndefined();
  });

  test('`{ field: "stack" }` is not the `stack` part', () => {
    // It reads the property rather than the cut stack, so it is not the part
    // the rule is about.
    const byField = withParts([{ field: 'stack' }]);
    expect(byField.makeFingerprint(new Error('x'))).toMatch(/^fp1_/);
    expect(
      byField.makeFingerprint(new Error('x'), { requireStack: true }),
    ).toBeUndefined();
  });

  test('a recipe of message and stack still fingerprints an ordinary error', () => {
    const both = withParts(['message', 'stack']);
    const error = new Error('x');
    const value = both.makeFingerprint(error, { requireStack: true });
    expect(value).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(value).toBe(both.makeReportObject(error).fingerprint);
  });

  test('a Firefox or Safari stack counts as frames', () => {
    const firefox = withStack(
      new Error('x'),
      'handler@https://app.example.com/main.js:12:9\nrun@https://app.example.com/main.js:44:3',
    );
    expect(required(firefox)).toMatch(/^fp1_[0-9a-f]{32}$/);
  });

  test('a one-character toCorjAsString no longer leaves the message in the hash', () => {
    // 'E' is a prefix of `Error: <message>`, so the header cut used to stop
    // inside the header and hash the rest of it.
    // One call site for both, so only the message could tell them apart.
    const [one, two] = ['PIN 4921 rejected for alice@example.com', 'PIN'].map(
      (message) =>
        maker.makeFingerprint(
          Object.assign(thrownAt(message), { toCorjAsString: () => 'E' }),
          { requireStack: true },
        ),
    );
    expect(one).toMatch(/^fp1_[0-9a-f]{32}$/);
    expect(two).toBe(one);
  });
});

function deleteStack(error: Error): Error {
  delete (error as { stack?: unknown }).stack;
  return error;
}

function withStack(error: Error, stack: unknown): Error {
  Object.defineProperty(error, 'stack', { configurable: true, value: stack });
  return error;
}
