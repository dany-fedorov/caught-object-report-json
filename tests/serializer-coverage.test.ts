import { configure, TRUNCATED_MARKER } from '../src/safe-stable-stringify';

// Boundaries below are expressed relative to the marker so they keep testing
// the same conditions if the marker text changes. `M + 2` is the JSON of the
// marker alone (with quotes); `M + 4` a one-element array holding it;
// `M + 10` an object holding it under the reserved "..." key.
const M = TRUNCATED_MARKER.length;
const MARKER_JSON = JSON.stringify(TRUNCATED_MARKER);

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

  test.each(['maximumDepth', 'maximumBreadth', 'lengthLimit', 'lengthUnit'])(
    'rejects an explicitly undefined %s before serialization',
    (key) => {
      expect(() => configure({ [key]: undefined })).toThrow(TypeError);
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
  test.each(['utf8-bytes', 'utf16-code-units'])(
    'preserves nested Unicode values without a limit and at an exact fit (%s)',
    (lengthUnit) => {
      const value = {
        first: ['Ж', { '😀': '界\n' }],
        last: { escaped: '\ud800', values: [true, null, 123] },
      };
      const expected = JSON.stringify(value);
      const measure = (json: string) =>
        lengthUnit === 'utf8-bytes'
          ? Buffer.byteLength(json, 'utf8')
          : json.length;
      const exactSize = measure(expected);

      expect(configure({ lengthUnit })(value)).toBe(expected);
      expect(configure({ lengthUnit, lengthLimit: exactSize })(value)).toBe(
        expected,
      );
      const truncated = configure({
        lengthUnit,
        lengthLimit: exactSize - 1,
      })(value)!;
      expect(measure(truncated)).toBeLessThanOrEqual(exactSize - 1);
      expect(JSON.parse(truncated)).not.toStrictEqual(value);
      expect(truncated).toContain(TRUNCATED_MARKER);
    },
  );

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
    [M + 1, 'null'],
    [M + 2, MARKER_JSON],
    [M + 3, `"x${TRUNCATED_MARKER}"`],
  ])('fits a root string marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })('x'.repeat(100))).toBe(want);
  });

  test.each([
    [M + 2, MARKER_JSON],
    [M + 3, MARKER_JSON],
    [M + 4, `[${MARKER_JSON}]`],
  ])('fits a root array marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })(['x'.repeat(100)])).toBe(want);
  });

  test.each([
    [M + 2, MARKER_JSON],
    [M + 9, MARKER_JSON],
    [M + 10, `{"...":${MARKER_JSON}}`],
  ])('fits a root object marker at limit %i', (lengthLimit, want) => {
    expect(configure({ lengthLimit })({ value: 'x'.repeat(100) })).toBe(want);
  });

  test('replaces an overlong circular string with a fitting root marker', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(
      configure({ lengthLimit: M + 2, circularValue: 'Ж'.repeat(100) })(value),
    ).toBe(MARKER_JSON);
  });

  test('fits extreme numeric representations within a modest budget', () => {
    const stringify = configure({ lengthLimit: 40 });
    expect(stringify(Number.MAX_VALUE)).toBe('1.7976931348623157e+308');
    expect(stringify(-Number.MAX_VALUE)).toBe('-1.7976931348623157e+308');
    expect(stringify(BigInt('1' + '0'.repeat(400)))).toBe('null');
  });

  test('replaces an existing metadata property when it is the only retained entry', () => {
    expect(
      configure({ lengthLimit: M + 10, deterministic: false })({
        '...': 1,
        long: 'x'.repeat(200),
      }),
    ).toBe(`{"...":${MARKER_JSON}}`);
  });

  test('uses the length marker when an array breadth explanation cannot fit', () => {
    // The 15-digit element plus the marker needs M + 20; the marker alone M + 4.
    expect(
      configure({ maximumBreadth: 1, lengthLimit: M + 6 })([
        123456789012345, 2,
      ]),
    ).toBe(`[${MARKER_JSON}]`);
  });

  test('uses the length marker when an object breadth explanation cannot fit', () => {
    // The 18-unit entry plus the "..." marker needs M + 29; the marker alone M + 10.
    expect(
      configure({ maximumBreadth: 1, lengthLimit: M + 10 })({
        key: '1234567890',
        later: 2,
      }),
    ).toBe(`{"...":${MARKER_JSON}}`);
  });

  test('uses null when an omitted-only object cannot fit any truncation marker', () => {
    expect(
      configure({ maximumBreadth: 1, lengthLimit: M + 1 })({
        a: undefined,
        b: 2,
      }),
    ).toBe('null');
  });
});

describe('skipAccessors', () => {
  test.each([1, true, {}, () => undefined])(
    'rejects a non-string marker: %j',
    (skipAccessors) => {
      expect(() => configure({ skipAccessors })).toThrow(
        /The "skipAccessors" argument must be of type string or undefined/,
      );
    },
  );

  test('an explicit undefined marker keeps the default reading path', () => {
    const stringify = configure({ skipAccessors: undefined });
    expect(
      stringify({
        get computed() {
          return 'invoked';
        },
      }),
    ).toBe('{"computed":"invoked"}');
  });

  test('accessors become the marker and toJSON is not consulted', () => {
    const stringify = configure({ skipAccessors: '[skipped]' });
    const value = {
      plain: 1,
      get computed() {
        throw new Error('never read');
      },
      nested: {
        toJSON() {
          throw new Error('never called');
        },
        kept: 2,
      },
    };
    expect(stringify(value)).toBe(
      '{"computed":"[skipped]","nested":{"kept":2},"plain":1}',
    );
  });

  test('a top-level toJSON is not consulted either', () => {
    const stringify = configure({ skipAccessors: '[skipped]' });
    expect(
      stringify({
        kept: 1,
        toJSON() {
          throw new Error('never called');
        },
      }),
    ).toBe('{"kept":1}');
  });

  test('array holes serialize as null, as they do without the option', () => {
    const stringify = configure({ skipAccessors: '[skipped]' });
    // eslint-disable-next-line no-sparse-arrays
    expect(stringify([1, , 3])).toBe('[1,null,3]');
  });

  test('an accessor element of an array becomes the marker', () => {
    const stringify = configure({ skipAccessors: '[skipped]' });
    const value: unknown[] = [1];
    Object.defineProperty(value, '1', {
      enumerable: true,
      configurable: true,
      get: () => 'never read',
    });
    expect(stringify(value)).toBe('[1,"[skipped]"]');
  });
});

describe('per-call redaction hooks', () => {
  test('rejects a non-function redact hook', () => {
    expect(() =>
      configure({})({ a: 1 }, null, { redact: 'all' } as never),
    ).toThrow(/The "redact" argument must be of type function/);
  });

  test('rejects a non-string base path', () => {
    expect(() =>
      configure({})({ a: 1 }, null, { basePath: 1 } as never),
    ).toThrow(/The "basePath" argument must be of type string/);
  });

  test('the hook sees the JSONPath of every value it is offered', () => {
    const paths: string[] = [];
    configure({})({ a: { b: [1] } }, null, {
      basePath: '$',
      redact: (_key: string, path: string, read: () => unknown) => {
        paths.push(path);
        return read();
      },
    } as never);
    expect(paths).toEqual(['$', '$.a', '$.a.b', '$.a.b[0]']);
  });
});

describe('per-call key mapping', () => {
  test('rejects a non-function key mapper', () => {
    expect(() =>
      configure({})({ a: 1 }, null, { mapKey: 'all' } as never),
    ).toThrow(/The "mapKey" argument must be of type function/);
  });

  test('rewrites object keys but leaves array indices alone', () => {
    const json = configure({})({ secret: 1, list: [2] }, null, {
      basePath: '$',
      mapKey: (key: string) => (key === 'secret' ? 'hidden' : key),
    } as never);
    // `configure({})` sorts keys deterministically.
    expect(json).toBe('{"list":[2],"hidden":1}');
  });
});
