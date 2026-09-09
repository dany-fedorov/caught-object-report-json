import { configure } from '../src/safe-stable-stringify';

describe('serializer configuration contracts', () => {
  test.each([false, 1, {}, () => undefined])(
    'rejects unsupported circular replacement values: %j',
    (circularValue) => {
      expect(() => configure({ circularValue })).toThrow(TypeError);
    },
  );

  test('throws for a circular reference when TypeError is the replacement', () => {
    const value: unknown[] = [];
    value.push(value);
    expect(() => configure({ circularValue: TypeError })(value)).toThrow(
      TypeError,
    );
  });

  test.each([null, 1, 'ascending', {}])(
    'rejects invalid deterministic settings: %j',
    (deterministic) => {
      expect(() => configure({ deterministic })).toThrow(TypeError);
    },
  );

  test.each([null, 1, 'true', undefined])(
    'rejects nonboolean bigint settings: %j',
    (bigint) => {
      expect(() => configure({ bigint })).toThrow(TypeError);
    },
  );

  test.each(['maximumDepth', 'maximumBreadth', 'lengthLimit'])(
    'rejects a nonnumeric %s before serialization',
    (key) => {
      expect(() => configure({ [key]: '4' })).toThrow(TypeError);
    },
  );

  test.each([null, 1, 'true', undefined])(
    'rejects nonboolean strict settings: %j',
    (strict) => {
      expect(() => configure({ strict })).toThrow(TypeError);
    },
  );

  test('disabling strict mode keeps null replacement for nonfinite numbers', () => {
    expect(configure({ strict: false })([NaN, Infinity, -Infinity])).toBe(
      '[null,null,null]',
    );
  });

  test.each([NaN, Infinity, -Infinity])(
    'strict mode rejects the nonfinite number %s',
    (value) => {
      expect(() => configure({ strict: true })(value)).toThrow(/type number/);
    },
  );

  test('strict mode rejects functions without calling their toString', () => {
    const value = () => undefined;
    value.toString = () => {
      throw new Error('Functions must not be inspected');
    };
    expect(() => configure({ strict: true })(value)).toThrow(/type function/);
  });

  test('strict mode rejects symbols with a diagnostic identifying the value', () => {
    expect(() => configure({ strict: true })(Symbol('unsupported'))).toThrow(
      /type symbol \(Symbol\(unsupported\)\)/,
    );
  });

  test('strict mode rejects bigint by default', () => {
    expect(() => configure({ strict: true })(BigInt(42))).toThrow(
      /type bigint/,
    );
  });

  test('strict mode rejects cycles by default', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(() => configure({ strict: true })(value)).toThrow(TypeError);
  });

  test('strict mode respects explicit bigint and circular replacement settings', () => {
    const value: Record<string, unknown> = { bigint: BigInt(42) };
    value['self'] = value;
    expect(
      configure({ strict: true, bigint: true, circularValue: null })(value),
    ).toBe('{"bigint":42,"self":null}');
  });

  test('disabling bigint omits object properties and preserves array positions', () => {
    const stringify = configure({ bigint: false });
    expect(stringify(BigInt(42))).toBeUndefined();
    expect(stringify({ before: 1, bigint: BigInt(42), after: 2 })).toBe(
      '{"after":2,"before":1}',
    );
    expect(stringify([1, BigInt(42), 2])).toBe('[1,null,2]');
  });

  test('rejects array replacers instead of silently changing their semantics', () => {
    const stringify = configure();
    // @ts-expect-error Verify the runtime boundary for JavaScript callers.
    expect(() => stringify({ allowed: 1, excluded: 2 }, ['allowed'])).toThrow(
      /Array replacer is not supported/,
    );
  });
});

describe('stable serializer traversal', () => {
  test('sorts small objects lexicographically regardless of insertion order', () => {
    expect(configure()({ z: 1, c: 2, b: 3, a: 4 })).toBe(
      '{"a":4,"b":3,"c":2,"z":1}',
    );
  });

  test('sorts large objects lexicographically using every key', () => {
    const ascendingKeys = Array.from(
      { length: 201 },
      (_, index) => `key-${String(index).padStart(3, '0')}`,
    );
    const value = Object.fromEntries(
      [...ascendingKeys].reverse().map((key) => [key, key]),
    );
    const result = JSON.parse(configure()(value)!);
    expect(Object.keys(result)).toEqual(ascendingKeys);
    expect(result).toEqual(value);
  });

  test('uses the caller comparator for nested object keys', () => {
    const stringify = configure({
      deterministic: (left: string, right: string) =>
        left < right ? 1 : left > right ? -1 : 0,
    });
    expect(stringify({ a: { a: 1, c: 3, b: 2 }, c: 3, b: 2 })).toBe(
      '{"c":3,"b":2,"a":{"c":3,"b":2,"a":1}}',
    );
  });

  test('keeps typed array indices in numeric order, including custom properties', () => {
    const value = Object.assign(
      new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      { z: 1, a: 2 },
    );
    expect(configure()(value)).toBe(
      '{"0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"z":1,"a":2}',
    );
  });

  test('sorts custom properties on a typed array without indexed entries', () => {
    const value = Object.assign(new Uint8Array(0), { z: 1, a: 2 });
    expect(configure()(value)).toBe('{"a":2,"z":1}');
  });

  test('applies maximum depth separately to object and array descendants', () => {
    const stringify = configure({ maximumDepth: 1 });
    expect(stringify({ object: { child: true }, array: [1], empty: {} })).toBe(
      '{"array":"[Array]","empty":{},"object":"[Object]"}',
    );
    expect(stringify([{}, [], { child: true }, [1]])).toBe(
      '[{},[],"[Object]","[Array]"]',
    );
  });

  test('reports omitted object entries with singular and plural breadth markers', () => {
    const stringify = configure({ maximumBreadth: 1 });
    expect(stringify({ a: 1, b: 2 })).toBe(
      '{"a":1,"...":"1 item not stringified"}',
    );
    expect(stringify({ a: 1, b: 2, c: 3 })).toBe(
      '{"a":1,"...":"2 items not stringified"}',
    );
  });

  test('writes a breadth marker when every visited property was omitted', () => {
    expect(configure({ maximumBreadth: 1 })({ a: undefined, b: 2 })).toBe(
      '{"...":"1 item not stringified"}',
    );
  });

  test('calls toJSON before the replacer with the property key and holder', () => {
    const child = {
      toJSON(key: string) {
        return key === 'child' && this === child ? 'converted' : 'wrong call';
      },
    };
    const value = { child };
    expect(
      configure()(value, function (key, converted) {
        return key === 'child' && this === value
          ? `replaced ${converted}`
          : converted;
      }),
    ).toBe('{"child":"replaced converted"}');
  });

  test('serializes a repeated reference after its earlier traversal finishes', () => {
    const child = { value: 1 };
    expect(configure()({ a: child, b: child })).toBe(
      '{"a":{"value":1},"b":{"value":1}}',
    );
  });
});

describe('serializer truncation boundaries', () => {
  test.each([
    ['true', true, 'true'],
    ['false', false, 'null'],
    ['number', 12345, 'null'],
    ['bigint', BigInt(12345), 'null'],
    ['string', 'too long', 'null'],
    ['array', [1, 2], 'null'],
    ['object', { a: 1 }, 'null'],
    ['null', null, 'null'],
    ['empty array', [], '[]'],
    ['empty object', {}, '{}'],
  ])(
    'returns valid root output for %s with the four-unit minimum',
    (_name, value, want) => {
      expect(configure({ lengthLimit: 4 })(value)).toBe(want);
    },
  );

  test.each([
    [39, 'null'],
    [40, '"[caught-object-report-json: Truncated]"'],
    [41, '"x[caught-object-report-json: Truncated]"'],
  ])('fits a root string marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })('x'.repeat(100))).toBe(want);
  });

  test.each([
    [40, '"[caught-object-report-json: Truncated]"'],
    [41, '"[caught-object-report-json: Truncated]"'],
    [42, '["[caught-object-report-json: Truncated]"]'],
  ])('fits a root array marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })(['x'.repeat(100)])).toBe(want);
  });

  test.each([
    [40, '"[caught-object-report-json: Truncated]"'],
    [47, '"[caught-object-report-json: Truncated]"'],
    [48, '{"...":"[caught-object-report-json: Truncated]"}'],
  ])('fits a root object marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })({ value: 'x'.repeat(100) })).toBe(want);
  });

  test('replaces an overlong circular string with a fitting root marker', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(
      configure({ lengthLimit: 40, circularValue: 'Ж'.repeat(100) })(value),
    ).toBe('"[caught-object-report-json: Truncated]"');
  });

  test('fits extreme numeric representations within a marker-sized budget', () => {
    const stringify = configure({ lengthLimit: 40 });
    expect(stringify(Number.MAX_VALUE)).toBe('1.7976931348623157e+308');
    expect(stringify(-Number.MAX_VALUE)).toBe('-1.7976931348623157e+308');
    expect(stringify(BigInt('1' + '0'.repeat(400)))).toBe('null');
  });

  test('replaces an existing metadata property when it is the only retained entry', () => {
    expect(
      configure({ lengthLimit: 48, deterministic: false })({
        '...': 1,
        long: 'x'.repeat(200),
      }),
    ).toBe('{"...":"[caught-object-report-json: Truncated]"}');
  });

  test('uses the length marker when an array breadth explanation cannot fit', () => {
    expect(
      configure({ maximumBreadth: 1, lengthLimit: 44 })([123456789012345, 2]),
    ).toBe('["[caught-object-report-json: Truncated]"]');
  });

  test('uses the length marker when an object breadth explanation cannot fit', () => {
    expect(
      configure({ maximumBreadth: 1, lengthLimit: 48 })({
        key: '1234567890',
        later: 2,
      }),
    ).toBe('{"...":"[caught-object-report-json: Truncated]"}');
  });

  test('uses null when an omitted-only object cannot fit any truncation marker', () => {
    expect(
      configure({ maximumBreadth: 1, lengthLimit: 20 })({ a: undefined, b: 2 }),
    ).toBe('null');
  });
});
