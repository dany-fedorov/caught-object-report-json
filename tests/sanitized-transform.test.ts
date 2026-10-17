import { CorjMaker, type CorjContext } from '../src';
import { Redactor, resolveRedactPolicy } from '../src/redaction';

const where: CorjContext = {
  stage: 'as_json',
  path: '$',
  reportKey: 'as_json',
};
function redactor(
  options: Record<string, unknown> = {},
  failures: unknown[] = [],
) {
  return new Redactor(resolveRedactPolicy(options as never)!, (failure) =>
    failures.push(failure),
  );
}

describe('sanitized transform input', () => {
  test('containers are detached by default', () => {
    const raw = { token: 'secret' };
    let seen: unknown;
    const policy = redactor({
      transform: (value: unknown) => {
        seen = value;
        return value;
      },
    });
    policy.apply(raw, where);
    expect(seen).not.toBe(raw);
    expect(Object.getPrototypeOf(seen)).toBeNull();
  });

  test('copies own data without prototypes, getters, hooks, functions or BigInts', () => {
    let invoked = 0;
    const source = Object.assign(
      Object.create({ inherited: 'secret' }) as Record<string, unknown>,
      {
        nested: { token: 'secret', value: 'secret text' },
        array: [1, BigInt(2), () => 'secret'],
        toJSON: () => {
          invoked++;
          return 'secret';
        },
      },
    );
    Object.defineProperty(source, 'accessor', {
      enumerable: true,
      get() {
        invoked++;
        return 'secret';
      },
    });
    let seen: unknown;
    const out = redactor({
      keys: ['token'],
      patterns: [/secret/g],
      transform: (value: unknown) => {
        seen = value;
        return value;
      },
    }).apply(source, where);
    expect(out).toBe(seen);
    expect(seen).not.toBe(source);
    expect(JSON.stringify(seen)).toBe(
      '{"nested":{"token":"[redacted]","value":"[redacted] text"},"array":[1,"[not-inspected]","[not-inspected]"],"toJSON":"[not-inspected]","accessor":"[not-inspected]"}',
    );
    expect(Object.getPrototypeOf(seen)).toBeNull();
    expect(invoked).toBe(0);
    expect((source.nested as { token: string }).token).toBe('secret');
  });

  test('excludes paths and keys before consulting property descriptors', () => {
    const descriptors: string[] = [];
    const source = new Proxy(
      { token: 'secret', nested: { password: 'secret' } },
      {
        getOwnPropertyDescriptor(target, key) {
          descriptors.push(String(key));
          return Reflect.getOwnPropertyDescriptor(target, key);
        },
      },
    );
    let seen: unknown;
    redactor({
      keys: ['token'],
      paths: ['$.nested.password'],
      transform: (value: unknown) => {
        seen = value;
        return value;
      },
    }).apply(source, where);
    expect(descriptors).not.toContain('token');
    expect(seen).toEqual({
      token: '[redacted]',
      nested: { password: '[redacted]' },
    });
  });

  test('uses array indices and object property paths and only treats ancestors as cycles', () => {
    const shared = { token: 'secret' };
    const source: Record<string, unknown> = {
      left: shared,
      right: shared,
      array: [{ token: 'secret' }],
      '0': { token: 'secret' },
    };
    source['self'] = source;
    const seen = redactor({
      paths: ['$.left.token', '$.array[0].token', '$.0.token'],
      transform: (value: unknown) => value,
    }).apply(source, where);
    expect(seen).toEqual({
      left: { token: '[redacted]' },
      right: { token: 'secret' },
      array: [{ token: '[redacted]' }],
      '0': { token: '[redacted]' },
      self: '[circular]',
    });
  });

  test('scrubs property names and preserves collisions with suffixes', () => {
    const seen = redactor({
      patterns: [/secret[A-Z]/g],
      transform: (value: unknown) => value,
    }).apply({ secretA: 1, secretB: 2, '[redacted] (2)': 3 }, where);
    expect(seen).toEqual({
      '[redacted]': 1,
      '[redacted] (2)': 2,
      '[redacted] (2) (2)': 3,
    });
  });

  test('does not rescrub prepared nested strings or keys when serializing the snapshot', () => {
    const inputs: unknown[] = [];
    const maker = new CorjMaker({
      onReportingError: () => undefined,
      redact: {
        patterns: [/x/g],
        replacement: 'xx',
        transform(value: unknown, context: CorjContext) {
          if (context.reportKey === 'as_json') inputs.push(value);
          return value;
        },
      } as never,
    });
    const report = maker.makeReport({ nested: { x: 'x' } });
    expect(report.as_json).toEqual({ nested: { xx: 'xx' } });
    expect(inputs).toContain('xx');
    expect(JSON.stringify(inputs)).not.toContain('xxxx');
  });

  test('fails closed before huge strings reach patterns or callbacks', () => {
    const failures: unknown[] = [];
    let called = false;
    const pattern = /secret/g;
    pattern[Symbol.replace] = () => {
      throw new Error('pattern must not run');
    };
    const result = redactor(
      {
        patterns: [pattern],
        transform: () => {
          called = true;
        },
      },
      failures,
    ).apply('secret'.repeat(200_000), where);
    expect(result).toBe('[redacted]');
    expect(called).toBe(false);
    expect(failures).toHaveLength(1);
    expect(String(failures[0])).not.toContain('secret');
  });

  test('bounds snapshot depth, width and aggregate text', () => {
    const failures: unknown[] = [];
    let nested: unknown = 'end';
    for (let i = 0; i < 200; i++) nested = { child: nested };
    let seen: unknown;
    const redact = redactor(
      {
        transform: (value: unknown) => {
          seen = value;
          return value;
        },
      },
      failures,
    );
    redact.apply(
      {
        nested,
        wide: Array.from({ length: 20_000 }, () => 'text'),
        text: 'a'.repeat(20_000),
      },
      where,
    );
    expect(JSON.stringify(seen).length).toBeLessThan(100_000);
    expect(JSON.stringify(seen)).toContain('[truncated]');
    expect(failures.length).toBeGreaterThan(0);
  });

  test('never exposes hostile inspection errors to the callback', () => {
    const failures: unknown[] = [];
    const source = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('secret');
        },
      },
    );
    let seen: unknown;
    const out = redactor(
      {
        transform: (value: unknown) => {
          seen = value;
          return value;
        },
      },
      failures,
    ).apply(source, where);
    expect(out).toBe('[redacted]');
    expect(seen).toBe('[redacted]');
    expect(failures).toHaveLength(1);
    expect(String(failures[0])).not.toContain('secret');
  });
});

describe('snapshot scopes and callback outputs', () => {
  test('identity values and names retain single pattern application in a scope', () => {
    const r = redactor({
      patterns: [/x/g],
      replacement: 'xx',
      transform: (v: unknown) => v,
    });
    r.withScope(() => {
      const snapshot = r.apply({ x: 'x' }, where) as Record<string, unknown>;
      expect(r.key('xx', where, snapshot)).toBe('xx');
      expect(
        r.apply(snapshot['xx'], where, { parent: snapshot, key: 'xx' }),
      ).toBe('xx');
      expect(r.sourceContext(snapshot, 'xx', where).path).toBe('$.x');
    });
  });

  test('fresh callback containers are sanitized before returning', () => {
    const raw = { token: 'secret', nested: { value: 'secret' } };
    const r = redactor({
      keys: ['token'],
      patterns: [/secret/g],
      transform: () => raw,
    });
    const result = r.apply(1, where);
    expect(result).toEqual({
      token: '[redacted]',
      nested: { value: '[redacted]' },
    });
    expect(result).not.toBe(raw);
  });

  test('callback mutations cannot return raw nested values', () => {
    const raw = { token: 'secret' };
    const r = redactor({
      keys: ['token'],
      transform: (v: unknown) => {
        if (v && typeof v === 'object')
          (v as Record<string, unknown>)['added'] = raw;
        return v;
      },
    });
    const result = r.apply({ value: 1 }, where) as Record<string, unknown>;
    expect(result['added']).toEqual({ token: '[redacted]' });
    expect(result['added']).not.toBe(raw);
  });

  test('changed values and new scopes are fresh input and scopes restore after throws', () => {
    const r = redactor({
      patterns: [/x/g],
      replacement: 'xx',
      transform: (v: unknown) => v,
    });
    let retained: Record<string, unknown>;
    r.withScope(() => {
      retained = r.apply({ x: 'x' }, where) as Record<string, unknown>;
      retained['xx'] = 'new x';
      expect(
        r.apply(retained['xx'], where, { parent: retained, key: 'xx' }),
      ).toBe('new xx');
      expect(() =>
        r.withScope(() => {
          throw new Error('reentrant');
        }),
      ).toThrow('reentrant');
      expect(r.sourceContext(retained, 'xx', where).path).toBe('$.x');
    });
    const later = r.apply(retained!, where);
    expect(later).toEqual({ xxxx: 'new xx' });
  });

  test('nested reentrant scope does not consume or erase outer provenance', () => {
    const r = redactor({
      patterns: [/x/g],
      replacement: 'xx',
      transform: (v: unknown) => v,
    });
    r.withScope(() => {
      const snapshot = r.apply({ x: 'x' }, where) as Record<string, unknown>;
      r.withScope(() =>
        expect(r.apply(snapshot, where)).toEqual({ xxxx: 'xxxx' }),
      );
      expect(
        r.apply(snapshot['xx'], where, { parent: snapshot, key: 'xx' }),
      ).toBe('xx');
    });
  });
});

test.each([() => 'secret', Symbol('secret'), BigInt(42)])(
  'withholds executable and opaque root values from transforms',
  (raw) => {
    let seen: unknown;
    redactor({
      transform: (value: unknown) => {
        seen = value;
        return value;
      },
    }).apply(raw, where);
    expect(seen).toBe('[not-inspected]');
  },
);

test('replacement expansion stops later policy callbacks', () => {
  let called = false;
  const r = redactor({
    patterns: [/x/g],
    replacement: 'x'.repeat(128),
    transform: () => {
      called = true;
    },
  });
  expect(r.apply('x'.repeat(10_000), where)).toBe('x'.repeat(128));
  expect(called).toBe(false);
});

test('mutated prepared string properties do not retain unprocessed property names', () => {
  let call = 0;
  const r = redactor({
    patterns: [/x/g],
    replacement: 'xx',
    transform: (v: unknown) => {
      if (call++ === 0) (v as Record<string, unknown>)['xx'] = 'fresh x';
      return v;
    },
  });
  expect(r.apply({ x: 'x' }, where)).toEqual({ xxxx: 'fresh xx' });
});

describe('snapshot bounded work and compatibility', () => {
  test('aggregate text budget stops scanning safe partial content', () => {
    const failures: unknown[] = [];
    const r = redactor({ transform: (v: unknown) => v }, failures);
    const result = r.apply(
      { first: 'a'.repeat(600_000), second: 'b'.repeat(600_000) },
      where,
    );
    expect(JSON.stringify(result)).toContain('[truncated]');
    expect(failures).toHaveLength(1);
  });

  test('oversized nested values and keys never reach pattern methods', () => {
    let subjects = 0;
    const pattern = /secret/g;
    pattern[Symbol.replace] = (subject: string) => {
      expect(subject.length).toBeLessThanOrEqual(1_000_000);
      subjects++;
      return subject;
    };
    const r = redactor({ patterns: [pattern], transform: (v: unknown) => v });
    expect(r.apply({ value: 'secret'.repeat(200_000) }, where)).toEqual({
      '...': '[truncated]',
    });
    expect(r.apply({ ['s'.repeat(1_000_001)]: 1 }, where)).toEqual({});
    expect(subjects).toBe(0);
  });

  test('oversized paths fail closed before matchers run', () => {
    const r = redactor({ paths: [/secret/g] });
    expect(r.excludes({ ...where, path: 'a'.repeat(1_000_001) })).toBe(true);
    expect(
      r.excludes({ ...where, sourceProperty: 'a'.repeat(1_000_001) }),
    ).toBe(true);
  });

  test('unsafe lazy stacks are withheld without materializing their descriptors', () => {
    let reads = 0;
    const source = new Error();
    Object.defineProperty(source, 'name', {
      get() {
        reads++;
        return 'secret';
      },
    });
    const result = redactor({ transform: (v: unknown) => v }).apply(
      source,
      where,
    );
    expect(result).toEqual({ stack: '[not-inspected]' });
    expect(reads).toBe(0);
  });

  test('symbols, nonenumerables and disappearing descriptors are omitted', () => {
    const source = new Proxy(
      { visible: 1 },
      {
        ownKeys: () => ['gone', 'visible', 'hidden', Symbol('secret')],
        getOwnPropertyDescriptor: (target, key) =>
          key === 'hidden'
            ? { value: 'secret', configurable: true }
            : Reflect.getOwnPropertyDescriptor(target, key),
      },
    );
    expect(
      redactor({ transform: (v: unknown) => v }).apply(source, where),
    ).toEqual({ visible: 1 });
  });

  test('snapshot collisions and losses independently notify fingerprint incompatibility', () => {
    const notifications: string[] = [];
    const limits: string[] = [];
    const r = new Redactor(
      resolveRedactPolicy({ patterns: [/secret[A-Z]/g], transform: (v) => v })!,
      () => undefined,
      (c) => limits.push(c.path),
      (c) => notifications.push(c.path),
    );
    r.apply({ secretA: 1, secretB: 2, fn: () => undefined }, where);
    expect(notifications).toContain('$.secretB');
    expect(notifications).toContain('$.fn');
    expect(limits).toEqual([]);
    r.apply({ value: 'x'.repeat(1_000_001) }, where);
    expect(limits).toEqual(['$.value']);
  });

  test('callback freezing cannot preserve unsafe mutated members', () => {
    const r = redactor({
      keys: ['token'],
      transform: (v: unknown) => {
        if (v && typeof v === 'object') {
          Object.defineProperty(v, 'added', {
            value: { token: 'secret' },
            enumerable: true,
          });
          Object.freeze(v);
        }
        return v;
      },
    });
    expect(r.apply({ a: 1 }, where)).toEqual({
      a: 1,
      added: { token: '[redacted]' },
    });
  });

  test('naturally suffixed names reserve collisions and safe prototype member names survive', () => {
    const input = Object.create(null) as Record<string, unknown>;
    Object.assign(input, {
      '[redacted] (2)': 0,
      secretA: 1,
      secretB: 2,
      secretC: 3,
      constructor: 4,
    });
    Object.defineProperty(input, '__proto__', { value: 5, enumerable: true });
    expect(
      redactor({
        patterns: [/secret[A-Z]/g],
        transform: (v: unknown) => v,
      }).apply(input, where),
    ).toEqual({
      '[redacted] (2)': 0,
      '[redacted]': 1,
      '[redacted] (3)': 2,
      '[redacted] (4)': 3,
      constructor: 4,
      ['__proto__']: 5,
    });
  });

  test('oversized callback results are withheld', () => {
    expect(
      redactor({ transform: () => 'secret'.repeat(200_000) }).apply(
        'ok',
        where,
      ),
    ).toBe('[redacted]');
  });
});

test('standalone key mapping has a temporary scope and retains transform opportunity', () => {
  const r = redactor({
    patterns: [/x/g],
    replacement: 'xx',
    transform: (v: unknown) => v,
  });
  expect(r.key('x', where, {})).toBe('xx');
});

test('replacement expansion consumes aggregate retained text before later fields', () => {
  const r = redactor({
    patterns: [/x/g],
    replacement: 'x'.repeat(100),
    transform: (v: unknown) => v,
  });
  const result = r.apply(
    { expanded: 'x'.repeat(9_000), later: 'y'.repeat(200_000) },
    where,
  ) as Record<string, unknown>;
  expect(JSON.stringify(result)).toContain('[truncated]');
  expect(result['later']).not.toBe('y'.repeat(200_000));
});

test('aggregate text exhaustion while preparing a key emits a safe marker', () => {
  const r = redactor({ transform: (v: unknown) => v });
  const result = r.apply({ large: 'a'.repeat(999_999) }, where);
  expect(result).toEqual({ '...': '[truncated]' });
});

test('callback addition of a wide tail consumes the remaining preparation budget', () => {
  let descriptors = 0;
  const raw = new Proxy(
    Object.fromEntries(
      Array.from({ length: 20_000 }, (_, i) => [String(i), i]),
    ),
    {
      getOwnPropertyDescriptor(target, key) {
        descriptors++;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    },
  );
  const r = redactor({
    transform: (v: unknown) => {
      if (v && typeof v === 'object')
        (v as Record<string, unknown>)['added'] = raw;
      return v;
    },
  });
  const result = r.apply({ original: 1 }, where);
  expect(descriptors).toBeLessThan(10_000);
  expect(JSON.stringify(result)).toContain('[truncated]');
});

test('source context fallback works before a scope exists', () => {
  expect(redactor().sourceContext({}, 'new', where)).toBe(where);
});

test('optional source properties may be absent when paths exceed input limits', () => {
  expect(redactor().excludes({ ...where, path: 'x'.repeat(1_000_001) })).toBe(
    true,
  );
});

test('later callbacks cannot see nested mutations of a retained root snapshot', () => {
  let retained: Record<string, unknown> | undefined;
  let later: unknown;
  const view = new CorjMaker({
    onReportingError: () => undefined,
    redact: {
      patterns: [/SECRET/g],
      transform(value, context) {
        if (context.path === '$' && value && typeof value === 'object')
          retained = value as Record<string, unknown>;
        if (context.path === '$.a' && value === 1)
          (retained!['b'] as Record<string, unknown>)['token'] = 'SECRET';
        if (context.path === '$.b' && value && typeof value === 'object')
          later = (value as Record<string, unknown>)['token'];
        return value;
      },
    },
  }).makeJsonView({ a: 1, b: { token: 'safe' } });
  expect(later).toBe('[redacted]');
  expect(view.value).toEqual({ a: 1, b: { token: '[redacted]' } });
});

test('retained snapshot prototype mutations cannot execute inherited hooks', () => {
  let retained: Record<string, unknown> | undefined;
  let invoked = 0;
  let laterPrototype: unknown = 'unset';
  const view = new CorjMaker({
    onReportingError: () => undefined,
    redact: {
      transform(value, context) {
        if (context.path === '$' && value && typeof value === 'object')
          retained = value as Record<string, unknown>;
        if (context.path === '$.a' && value === 1)
          Object.setPrototypeOf(retained!['b'], {
            toJSON() {
              invoked++;
              return 'SECRET';
            },
          });
        if (context.path === '$.b' && value && typeof value === 'object')
          laterPrototype = Object.getPrototypeOf(value);
        return value;
      },
    },
  }).makeJsonView({ a: 1, b: { safe: 2 } });
  expect(laterPrototype).toBeNull();
  expect(invoked).toBe(0);
  expect(view.value).toEqual({ a: 1, b: { safe: 2 } });
});

test('prepared reads withhold changed accessors and missing members without invoking hooks', () => {
  const r = redactor({ transform: (v: unknown) => v });
  expect(r.read({}, 'raw', () => 'raw')).toBe('raw');
  r.withScope(() => {
    const snapshot = r.apply({ field: 1 }, where) as Record<string, unknown>;
    Object.defineProperty(snapshot, 'field', {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error('secret');
      },
    });
    expect(
      r.read(snapshot, 'field', () => {
        throw new Error('fallback');
      }),
    ).toBe('[not-inspected]');
    expect(
      r.read(snapshot, 'missing', () => {
        throw new Error('fallback');
      }),
    ).toBeUndefined();
    Object.defineProperty(snapshot, 'field', {
      value: 'fresh',
      enumerable: true,
      configurable: true,
    });
    expect(r.read(snapshot, 'field', () => 'fallback')).toBe('fresh');
  });
});

test('sparse arrays preserve trailing holes within the preparation budget', () => {
  const sparse = [1, , ,];
  const r = redactor({ transform: (value: unknown) => value });
  const result = r.apply(sparse, where) as unknown[];
  expect(Array.isArray(result)).toBe(true);
  expect(result.length).toBe(3);
  expect(JSON.stringify(result)).toBe('[1,null,null]');
});

test('huge sparse array extents are bounded and notify input truncation', () => {
  const limits: string[] = [];
  const r = new Redactor(
    resolveRedactPolicy({ transform: (value) => value })!,
    () => undefined,
    (context) => limits.push(context.path),
  );
  const result = r.apply(new Array(1_000_000_000), where) as unknown[];
  expect(result.length).toBeLessThanOrEqual(10_001);
  expect(JSON.stringify(result)).toContain('[truncated]');
  expect(limits).toHaveLength(1);
});

test('nonplain prototype loss notifies compatibility without invoking hooks', () => {
  let invoked = 0;
  class Custom {
    toJSON() {
      invoked++;
      return { secret: 1 };
    }
  }
  const notifications: string[] = [];
  const r = new Redactor(
    resolveRedactPolicy({ transform: (value) => value })!,
    () => undefined,
    undefined,
    (context) => notifications.push(context.path),
  );
  r.apply({ date: new Date('2020-01-01'), custom: new Custom() }, where);
  expect(notifications).toContain('$.date');
  expect(notifications).toContain('$.custom');
  expect(invoked).toBe(0);
});

test('original key matcher subjects share a bounded aggregate policy budget', () => {
  let units = 0;
  const matcher = /secret/g;
  matcher.test = (subject) => {
    units += subject.length;
    return false;
  };
  const source: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) source['a'.repeat(100_000) + i] = i;
  const result = redactor({
    keys: [matcher],
    patterns: [/^a+/g],
    replacement: 'x',
    transform: (v: unknown) => v,
  }).apply(source, where);
  expect(units).toBeLessThanOrEqual(1_000_000);
  expect(JSON.stringify(result)).toContain('[truncated]');
});

test('changed scalar identity policy notifies fingerprint incompatibility once without rerunning patterns', () => {
  const notifications: string[] = [];
  let replacements = 0;
  const pattern = /x/g;
  pattern[Symbol.replace] = (value) => {
    replacements++;
    return value.replace(/x/g, 'xx');
  };
  const r = new Redactor(
    resolveRedactPolicy({
      patterns: [pattern],
      replacement: 'xx',
      transform: (value) => value,
    })!,
    () => undefined,
    undefined,
    (context) => notifications.push(context.path),
  );
  expect(r.apply('x', where)).toBe('xx');
  expect(replacements).toBe(1);
  expect(notifications).toEqual(['$']);
});

test('aggregate original matcher subjects are checked before repeated exclusions', () => {
  let units = 0;
  const matcher = /never/g;
  matcher.test = (subject) => {
    units += subject.length;
    return false;
  };
  const r = redactor({ keys: [matcher] });
  r.withScope(() => {
    expect(r.excludes({ ...where, sourceProperty: 'a'.repeat(600_000) })).toBe(
      false,
    );
    expect(r.excludes({ ...where, sourceProperty: 'b'.repeat(600_000) })).toBe(
      true,
    );
  });
  expect(units).toBe(600_000);
});

test('excluded array length is never inspected and array extra data remains detached', () => {
  const raw = Object.assign([1], {
    extra: { token: 'secret' },
    [Symbol('hidden')]: 'secret',
  });
  const proxy = new Proxy(raw, {
    getOwnPropertyDescriptor(target, key) {
      if (key === 'length') throw new Error('length should be excluded');
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  const r = redactor({
    keys: ['length', 'token'],
    transform: (v: unknown) => v,
  });
  const result = r.apply(proxy, where) as unknown[] & { extra: unknown };
  expect(result.extra).toEqual({ token: '[redacted]' });
  expect(result.extra).not.toBe(raw.extra);
});

test('prototype traversal exhaustion notifies the snapshot input limit', () => {
  let proxy: object;
  proxy = new Proxy(
    {},
    {
      ownKeys: () => ['stack'],
      getOwnPropertyDescriptor: () => undefined,
      getPrototypeOf: () => proxy,
    },
  );
  const limits: string[] = [];
  const r = new Redactor(
    resolveRedactPolicy({ transform: (v) => v })!,
    () => undefined,
    (context) => limits.push(context.path),
  );
  expect(r.apply(proxy, where)).toBe('[redacted]');
  expect(limits).toEqual(['$']);
});

test('collision suffixes count toward aggregate snapshot key retention', () => {
  let retainedUnits = 0;
  const source = Object.fromEntries(
    Array.from({ length: 10_000 }, (_, index) => [`secret${index}`, null]),
  );
  redactor({
    patterns: [/^secret\d+$/g],
    replacement: 'a'.repeat(128),
    transform: (value: unknown) => {
      retainedUnits = Object.keys(value as object).reduce(
        (sum, key) => sum + key.length,
        0,
      );
      return value;
    },
  }).apply(source, where);
  expect(retainedUnits).toBeLessThanOrEqual(1_000_000);
});
