import { configure, TRUNCATED_MARKER } from '../src/safe-stable-stringify';

describe('serializer input boundaries', () => {
  test('counts omitted object values before reading the next property', () => {
    let reads = 0;
    let truncations = 0;
    const value = Object.fromEntries(
      Array.from({ length: 10001 }, (_, index) => [String(index), undefined]),
    );
    const result = configure({ maximumVisits: 10000 })(
      value,
      (_key: string, child: unknown) => {
        reads++;
        return child;
      },
      { onTruncate: () => truncations++ },
    );
    expect(JSON.parse(result!)).toEqual({ '...': TRUNCATED_MARKER });
    expect(reads).toBe(10001); // root plus 10,000 entries
    expect(truncations).toBe(1);
  });

  test('shares visits across repeated child references and sparse array entries', () => {
    const child = [undefined, undefined];
    const result = configure({ maximumVisits: 4 })([child, child]);
    expect(JSON.parse(result!)).toEqual([[null, null], [TRUNCATED_MARKER]]);
  });

  test('stops deeply nested input before overflowing the JavaScript stack', () => {
    const value: Record<string, unknown> = {};
    let current = value;
    for (let i = 0; i < 20000; i++) {
      const next = {};
      current['child'] = next;
      current = next;
    }
    let truncations = 0;
    const result = configure({ inputDepthLimit: 128 })(value, null, {
      onTruncate: () => truncations++,
    });
    let parsed = JSON.parse(result!);
    for (let i = 0; i < 128; i++) parsed = parsed.child;
    expect(parsed).toBe(TRUNCATED_MARKER);
    expect(truncations).toBe(1);
  });

  test('can disable configured input guards per call for generated data', () => {
    const stringify = configure({ maximumVisits: 1, inputDepthLimit: 1 });
    const value = { a: { b: 1 }, c: 2 };
    expect(
      stringify(value, null, {
        maximumVisits: Infinity,
        inputDepthLimit: Infinity,
      }),
    ).toBe('{"a":{"b":1},"c":2}');
  });

  test('can lower input guards per call without changing later calls', () => {
    const stringify = configure();
    expect(stringify([1, 2], null, { maximumVisits: 1 })).toBe(
      '[1,"[truncated]"]',
    );
    expect(stringify({ a: { b: true } }, null, { inputDepthLimit: 1 })).toBe(
      '{"a":"[truncated]"}',
    );
    expect(stringify([1, 2])).toBe('[1,2]');
  });
});

describe('serializer emitted keys', () => {
  test('preserves every emitted value when mapped keys collide', () => {
    const paths: string[] = [];
    const result = configure({ deterministic: false })(
      { a: 1, b: 2, c: 3 },
      null,
      {
        mapKey: (_key: string, path: string) => {
          paths.push(path);
          return 'hidden';
        },
      },
    );
    expect(result).toBe('{"hidden":1,"hidden (2)":2,"hidden (3)":3}');
    expect(paths).toEqual(['$.a', '$.b', '$.c']);
  });

  test('avoids suffixes that have already been emitted', () => {
    const result = configure({ deterministic: false })(
      { first: 1, second: 2, third: 3 },
      null,
      { mapKey: (key: string) => (key === 'first' ? 'hidden (2)' : 'hidden') },
    );
    expect(result).toBe('{"hidden (2)":1,"hidden":2,"hidden (3)":3}');
  });

  test('omitted values neither reserve emitted names nor cause collision failure', () => {
    const result = configure()({ a: undefined, b: 2 }, null, {
      mapKey: () => 'hidden',
      keyCollision: 'throw',
    });
    expect(result).toBe('{"hidden":2}');
    expect(() =>
      configure()({ a: 1, b: 2 }, null, {
        mapKey: () => 'hidden',
        keyCollision: 'throw',
      }),
    ).toThrow(/collision/i);
  });

  test('charges suffixed keys against the output budget', () => {
    const result = configure({ lengthLimit: 36 })({ a: 1, b: 2, c: 3 }, null, {
      mapKey: () => 'hidden',
    })!;
    expect(result.length).toBeLessThanOrEqual(36);
    expect(JSON.parse(result)).toEqual({ hidden: 1, '...': TRUNCATED_MARKER });
  });
});

describe('new safety contracts', () => {
  test('accepts zero and notifies input categories independently from output truncation', () => {
    const reasons: string[] = [];
    const stringify = configure({
      maximumVisits: 0,
      onInputLimit: (reason: string) => reasons.push(reason),
    });
    expect(stringify({ a: 1 })).toBe('{"...":"[truncated]"}');
    expect(reasons).toEqual(['visits']);
    expect(configure({ inputDepthLimit: 0 })({})).toBe('"[truncated]"');
  });
  test('withholds complete oversized text before escaping and maps no oversized source key', () => {
    const reasons: string[] = [];
    const mapKey = jest.fn((key: string) => key);
    const stringify = configure({
      maximumTextLength: 3,
      onInputLimit: (reason: string) => reasons.push(reason),
    });
    expect(stringify('secret')).toBe('"[truncated]"');
    expect(stringify({ secret: 1 }, null, { mapKey })).toBe(
      '{"...":"[truncated]"}',
    );
    expect(mapKey).not.toHaveBeenCalled();
    expect(reasons).toEqual(['text', 'text']);
    expect(stringify('abc')).toBe('"abc"');
    expect(stringify('secret', null, { maximumTextLength: Infinity })).toBe(
      '"secret"',
    );
  });
  test('bounds deterministic sorting before invoking the comparator on a wide input', () => {
    let comparisons = 0;
    const stringify = configure({
      maximumVisits: 1,
      deterministic: () => {
        comparisons++;
        return 0;
      },
    });
    expect(stringify({ a: 1, b: 2 })).toBe('{"a":1,"...":"[truncated]"}');
    expect(comparisons).toBe(0);
  });
  test('guards signed BigInt thresholds without decimal formatting', () => {
    const limits = require('../src/input-limits');
    const threshold = BigInt('1' + '0'.repeat(16384));
    expect(limits.INPUT_MAX_VISITS).toBe(10000);
    expect(limits.INPUT_MAX_DEPTH).toBe(128);
    expect(limits.INPUT_MAX_TEXT_LENGTH).toBe(1000000);
    expect(limits.INPUT_MAX_STACK_LINES).toBe(10000);
    expect(limits.INPUT_MAX_BIGINT_DIGITS).toBe(16384);
    for (const value of [
      threshold - BigInt(1),
      -threshold + BigInt(1),
      BigInt(0),
    ])
      expect(limits.bigintExceedsInputLimit(value)).toBe(false);
    for (const value of [threshold, -threshold])
      expect(limits.bigintExceedsInputLimit(value)).toBe(true);
  });
});

describe('serializer guard validation and isolation', () => {
  test.each(['maximumVisits', 'inputDepthLimit', 'maximumTextLength'])(
    'validates %s in configuration and overrides',
    (key) => {
      for (const value of [
        '1',
        null,
        true,
        NaN,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
        -1,
        -Infinity,
      ]) {
        expect(() => configure({ [key]: value })).toThrow();
        expect(() => configure()(1, null, { [key]: value })).toThrow();
      }
      expect(configure({ [key]: undefined })(1)).toBe('1');
      expect(configure({ [key]: 0 })(1)).toBe('1');
    },
  );
  test('validates notifications and collision mode', () => {
    for (const value of [null, 1, 'callback']) {
      expect(() => configure({ onInputLimit: value })).toThrow(TypeError);
      expect(() =>
        configure()(1, null, { onInputLimit: value } as any),
      ).toThrow(TypeError);
    }
    expect(() => configure({ keyCollision: 'replace' })).toThrow(TypeError);
    expect(() =>
      configure()(1, null, { keyCollision: 'replace' } as any),
    ).toThrow(TypeError);
  });
  test('isolates overrides, notification throws, reentry and later calls', () => {
    const stringify = configure({
      maximumVisits: 1,
      onInputLimit: () => {
        throw new Error('notify');
      },
    });
    expect(() => stringify([1, 2])).toThrow('notify');
    const reasons: string[] = [];
    expect(
      stringify([1, 2], null, {
        onInputLimit: (reason) => reasons.push(reason),
      }),
    ).toBe('[1,"[truncated]"]');
    expect(reasons).toEqual(['visits']);
    expect(
      stringify([1], (key: string, value: unknown) => {
        if (key === '0') expect(stringify([3])).toBe('[3]');
        return value;
      }),
    ).toBe('[1]');
    expect(
      stringify({ a: {} }, null, {
        inputDepthLimit: 0,
        onInputLimit: (reason) => reasons.push(reason),
      }),
    ).toBe('"[truncated]"');
    expect(reasons).toEqual(['visits', 'depth']);
    expect(stringify({ a: { b: 1 } }, null, { maximumDepth: 1 })).toBe(
      '{"a":"[Object]"}',
    );
  });
  test('notifies once for each text category even when replacement is too large', () => {
    const reasons: string[] = [];
    const stringify = configure({ maximumTextLength: 2 });
    expect(
      stringify('ok', () => 'secret', {
        onInputLimit: (reason) => reasons.push(reason),
      }),
    ).toBe('"[truncated]"');
    expect(reasons).toEqual(['text']);
    expect(stringify({ a: 1 }, null, { mapKey: () => 'secret' })).toBe(
      '{"...":"[truncated]"}',
    );
    expect(stringify('secret', null, { lengthLimit: 4 })).toBe('null');
  });
  test('withholds unsafe sorted canonical input before sorting and reading', () => {
    const read = jest.fn();
    const comparator = jest.fn();
    const stringify = configure({
      maximumVisits: 0,
      keyCollision: 'throw',
      deterministic: comparator,
    });
    expect(
      stringify({
        get a() {
          read();
          return 1;
        },
      }),
    ).toBe('"[truncated]"');
    expect(read).not.toHaveBeenCalled();
    expect(comparator).not.toHaveBeenCalled();
  });
  test('passes actual parents and source paths through recursive collision allocation', () => {
    const input = { a: { x: 1, y: 2 }, b: 3, c: 4, d: undefined };
    const parents: object[] = [];
    const result = configure({ deterministic: false })(input, null, {
      redact: (key, _path, read, parent) => {
        if (key) parents.push(parent);
        return read();
      },
      mapKey: (key) => (key === 'c' ? '__proto__ (2)' : '__proto__'),
    });
    expect(JSON.parse(result!)).toEqual(
      JSON.parse(
        '{"__proto__":{"__proto__":1,"__proto__ (2)":2},"__proto__ (2)":3,"__proto__ (2) (2)":4}',
      ),
    );
    expect(parents).toEqual([input, input.a, input.a, input, input, input]);
    expect(
      configure()({ a: 1, b: undefined }, null, {
        mapKey: () => 'same',
        keyCollision: 'throw',
      }),
    ).toBe('{"same":1}');
  });
  test('counts sparse entries at exact boundaries and preserves escaped suffixed keys', () => {
    expect(configure({ maximumVisits: 2 })(new Array(2))).toBe('[null,null]');
    expect(configure({ maximumVisits: 0 })([])).toBe('[]');
    expect(configure({ maximumVisits: 0 })({})).toBe('{}');
    expect(configure()({ a: 1, b: 2 }, null, { mapKey: () => '界"' })).toBe(
      '{"界\\"":1,"界\\" (2)":2}',
    );
  });
});

test('bounds cumulative text retention and original policy paths before callbacks', () => {
  const stringify = configure({ maximumTextLength: 12 });
  expect(stringify(['abcdef', 'abcdef', 'x'])).toBe(
    '["abcdef","abcdef","[truncated]"]',
  );
  const mapKey = jest.fn((key: string) => key);
  const redact = jest.fn((_key: string, _path: string, read: () => unknown) =>
    read(),
  );
  expect(stringify({ abcdef: { ghijkl: 1 } }, null, { mapKey, redact })).toBe(
    '{"abcdef":{"...":"[truncated]"}}',
  );
  expect(mapKey.mock.calls.map((args) => args[0])).toEqual(['abcdef']);
  expect(redact).toHaveBeenCalledTimes(2); // root and outer property
});

test('covers repeated safety notifications and derived names within their text budgets', () => {
  const reasons: string[] = [];
  expect(
    configure({ maximumTextLength: 3 })('secret', () => 'other secret', {
      onInputLimit: (reason) => reasons.push(reason),
    }),
  ).toBe('"[truncated]"');
  expect(reasons).toEqual(['text']);
  expect(
    configure({ maximumTextLength: 10 })({ a: 1 }, null, {
      mapKey: () => 'a'.repeat(11),
    }),
  ).toBe('{"...":"[truncated]"}');
  expect(
    configure({ maximumTextLength: 3 })({ a: 1, b: 2 }, null, {
      mapKey: () => '',
    }),
  ).toBe('{"":1,"...":"[truncated]"}');
  expect(configure({ lengthLimit: 4 })({ a: {} })).toBe('null');
});

test('withholds an unsafe lazy stack without invoking its accessor dependencies', () => {
  const error = new Error('safe');
  Object.defineProperty(error, 'stack', {
    enumerable: true,
    configurable: true,
    value: 'safe',
  });
  const name = jest.fn(() => 'unsafe');
  Object.defineProperty(error, 'name', { get: name });
  expect(configure({ skipAccessors: '[not-inspected]' })(error)).toBe(
    '{"stack":"[not-inspected]"}',
  );
  expect(name).not.toHaveBeenCalled();
});

test('charges allocated collision suffixes to the cumulative text budget', () => {
  expect(
    configure({ maximumTextLength: 12 })({ a: 1, b: 2, c: 3 }, null, {
      mapKey: () => 'x',
    }),
  ).toBe('{"x":1,"x (2)":2,"...":"[truncated]"}');
});
