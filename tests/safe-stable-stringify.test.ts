import { configure, TRUNCATED_MARKER } from '../src/safe-stable-stringify';
import { measureStringSize } from '../src/json-size';
import { CORJ_TRUNCATED_MARKER } from '../src';

const marker = TRUNCATED_MARKER;
// Limits below are relative to the marker length so they keep testing the same
// boundary conditions if the marker text changes.
const M = marker.length;

test('the public marker constant is the serializer marker', () => {
  expect(CORJ_TRUNCATED_MARKER).toBe(TRUNCATED_MARKER);
  expect(TRUNCATED_MARKER).toBe('[truncated]');
});

describe('UTF-8 length-limited serialization', () => {
  test.each(['Ж', '界', '😀', '\n', '"', '\\', '\ud800'])(
    'counts serialized bytes when truncating strings containing %j',
    (character) => {
      const result = configure({
        lengthLimit: 80,
        lengthUnit: 'utf8-bytes',
      })(character.repeat(200))!;
      expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(80);
      const parsed: string = JSON.parse(result);
      expect(parsed.endsWith(marker)).toBe(true);
      expect(parsed.length).toBeGreaterThan(marker.length);
      if (character === '😀') {
        expect(parsed.slice(0, -marker.length)).toMatch(/^(😀)+$/u);
      }
    },
  );

  test.each([
    ['"Ж"', 'Ж'],
    ['"😀"', '😀'],
    ['"\\ud800"', '\ud800'],
    ['{"ключ":"😀"}', { ключ: '😀' }],
    ['["Ж","界","😀"]', ['Ж', '界', '😀']],
  ])('preserves exact UTF-8 fits: %s', (expected, value) => {
    expect(
      configure({
        lengthLimit: Buffer.byteLength(expected, 'utf8'),
        lengthUnit: 'utf8-bytes',
      })(value),
    ).toBe(expected);
  });

  test('uses UTF-16 code units by default and accepts that unit explicitly', () => {
    const value = '😀'.repeat(8);
    const json = JSON.stringify(value);
    expect(configure({ lengthLimit: json.length })(value)).toBe(json);
    expect(
      configure({ lengthLimit: json.length, lengthUnit: 'utf16-code-units' })(
        value,
      ),
    ).toBe(json);
    // Measured in UTF-8 bytes the same limit is too small for the value, so
    // it is truncated to a prefix of complete emoji plus the marker.
    const utf8 = configure({
      lengthLimit: json.length,
      lengthUnit: 'utf8-bytes',
    })(value)!;
    expect(utf8).not.toBe(json);
    expect(Buffer.byteLength(utf8, 'utf8')).toBeLessThanOrEqual(json.length);
    const prefix = JSON.parse(utf8).slice(0, -marker.length);
    expect(JSON.parse(utf8).endsWith(marker)).toBe(true);
    expect(prefix).toMatch(/^(😀)*$/u);
    expect(prefix.length).toBeLessThan(value.length);
  });

  test.each([
    // Quotes and marker take M + 2; each emoji is 4 UTF-8 bytes / 2 code units.
    ['utf8-bytes', M + 5, ''],
    ['utf8-bytes', M + 6, '😀'],
    ['utf8-bytes', M + 10, '😀😀'],
    ['utf16-code-units', M + 3, ''],
    ['utf16-code-units', M + 4, '😀'],
    ['utf16-code-units', M + 6, '😀😀'],
  ])(
    'preserves every complete emoji that fits %s limit %i',
    (lengthUnit, lengthLimit, prefix) => {
      const result = configure({ lengthLimit, lengthUnit })('😀'.repeat(200));
      expect(JSON.parse(result!)).toBe(prefix + marker);
    },
  );

  test('counts Unicode keys, ancestor punctuation, and object truncation metadata', () => {
    const value = {
      ключ: [{ '\n😀': { текст: 'Ж'.repeat(200) } }],
      later: true,
    };
    const result = configure({
      deterministic: false,
      lengthLimit: 100,
      lengthUnit: 'utf8-bytes',
    })(value)!;
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(100);
    expect(JSON.parse(result)).not.toHaveProperty('later');
    expect(result).toContain(marker);
  });

  test('counts Unicode entries when making room for container markers', () => {
    const stringify = configure({
      deterministic: false,
      lengthLimit: 65,
      lengthUnit: 'utf8-bytes',
    });
    for (const value of [
      Array.from({ length: 30 }, () => '😀'),
      Object.fromEntries(
        Array.from({ length: 30 }, (_, i) => [`ключ${i}`, 'Ж']),
      ),
    ]) {
      const result = stringify(value)!;
      expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(65);
      expect(() => JSON.parse(result)).not.toThrow();
      expect(result).toContain(marker);
    }
  });

  test('counts escaped circular markers in UTF-8 bytes', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    const result = configure({
      circularValue: '😀'.repeat(20) + '\n',
      lengthLimit: 60,
      lengthUnit: 'utf8-bytes',
    })(value)!;
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(60);
    expect(JSON.parse(result)).toEqual({ '...': marker });
  });

  test('reclaims the measured size of an existing truncation metadata key', () => {
    // The first two entries take 30 bytes, so `long` cannot fit even the
    // marker, while the retained entry plus the "..." marker fits in M + 22.
    const lengthLimit = M + 32;
    const result = configure({
      deterministic: false,
      lengthLimit,
      lengthUnit: 'utf8-bytes',
    })({ '...': '😀😀', keep: 'Ж', long: '界'.repeat(200) })!;
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(lengthLimit);
    expect(JSON.parse(result)).toEqual({ keep: 'Ж', '...': marker });
    expect(result.match(/"\.\.\.":/g)).toHaveLength(1);
  });

  test.each(['bytes', 'utf8', '', null, 8])(
    'rejects an unknown length unit: %j',
    (lengthUnit) => {
      expect(() => configure({ lengthUnit })).toThrow(TypeError);
    },
  );

  test('notifies once per successful truncation and keeps later calls isolated', () => {
    let truncations = 0;
    const stringify = configure({
      lengthLimit: 80,
      lengthUnit: 'utf8-bytes',
      onTruncate: () => truncations++,
    });
    expect(stringify('fits')).toBe('"fits"');
    expect(truncations).toBe(0);
    stringify('😀'.repeat(200));
    expect(truncations).toBe(1);
    stringify({ outer: { inner: ['Ж'.repeat(200)] } });
    expect(truncations).toBe(2);
    expect(stringify('still fits')).toBe('"still fits"');
    expect(truncations).toBe(2);
  });

  test('does not notify about truncation when serialization throws', () => {
    let truncations = 0;
    const stringify = configure({
      lengthLimit: 80,
      onTruncate: () => truncations++,
    });
    expect(() =>
      stringify({
        get broken(): never {
          throw new Error('Getter failed');
        },
      }),
    ).toThrow('Getter failed');
    expect(truncations).toBe(0);
  });

  test.each([null, 1, 'callback', false])(
    'rejects an invalid truncation callback: %j',
    (onTruncate) => {
      expect(() => configure({ onTruncate })).toThrow(TypeError);
    },
  );

  test('measures mixed strings exactly like Buffer.byteLength on both paths', () => {
    const samples = [
      '',
      'plain ascii',
      'x'.repeat(5_000),
      'Ж',
      'ascii then Ж',
      '界',
      '😀',
      'a😀b',
      '\ud800',
      '\udc00',
      '\ud800\ud800',
      'ключ: 😀 界 \n " \\',
      '\u0000\u001f',
    ];
    for (const sample of samples) {
      for (const text of [sample, JSON.stringify(sample)]) {
        expect(measureStringSize(text)).toBe(Buffer.byteLength(text, 'utf8'));
        expect(measureStringSize(text, 'utf8-bytes')).toBe(
          Buffer.byteLength(text, 'utf8'),
        );
        expect(measureStringSize(text, 'utf16-code-units')).toBe(text.length);
      }
    }
  });
});

describe('per-call overrides', () => {
  test('a per-call length limit applies to that call only', () => {
    const stringify = configure({ lengthLimit: 80 });
    const long = 'x'.repeat(200);
    const withLimit = stringify(long, null, { lengthLimit: 30 })!;
    expect(withLimit.length).toBeLessThanOrEqual(30);
    expect(withLimit.endsWith(marker + '"')).toBe(true);
    const configured = stringify(long)!;
    expect(configured.length).toBeLessThanOrEqual(80);
    expect(configured.length).toBeGreaterThan(30);
    expect(stringify(long, null, {})!.length).toBe(configured.length);
    expect(
      stringify(long, null, { lengthLimit: undefined } as unknown as {
        lengthLimit?: number;
      })!.length,
    ).toBe(configured.length);
  });

  test('a per-call length limit can exceed the configured one', () => {
    const stringify = configure({ lengthLimit: 20 });
    const long = 'x'.repeat(50);
    expect(stringify(long, null, { lengthLimit: 100 })).toBe(
      JSON.stringify(long),
    );
    expect(stringify(long)!.length).toBeLessThanOrEqual(20);
  });

  test('a per-call length limit works without a configured one', () => {
    const stringify = configure();
    expect(stringify('x'.repeat(50), null, { lengthLimit: 20 })!.length).toBe(
      20,
    );
    expect(stringify('x'.repeat(50))).toBe(JSON.stringify('x'.repeat(50)));
  });

  test('a per-call truncation callback replaces the configured one for that call', () => {
    let configuredCalls = 0;
    let perCallCalls = 0;
    const stringify = configure({
      lengthLimit: 20,
      onTruncate: () => configuredCalls++,
    });
    const long = 'x'.repeat(50);
    stringify(long, null, { onTruncate: () => perCallCalls++ });
    expect(perCallCalls).toBe(1);
    expect(configuredCalls).toBe(0);
    stringify(long);
    expect(perCallCalls).toBe(1);
    expect(configuredCalls).toBe(1);
    stringify('fits', null, { onTruncate: () => perCallCalls++ });
    expect(perCallCalls).toBe(1);
    stringify(long, null, { onTruncate: undefined } as unknown as {
      onTruncate?: () => void;
    });
    expect(configuredCalls).toBe(2);
  });

  test('a per-call truncation callback works without a configured one', () => {
    let calls = 0;
    const stringify = configure({ lengthLimit: 20 });
    stringify('x'.repeat(50), null, { onTruncate: () => calls++ });
    expect(calls).toBe(1);
    expect(stringify('x'.repeat(50))!.length).toBeLessThanOrEqual(20);
  });

  test('both overrides combine, and a per-call limit with a replacer is honoured', () => {
    let calls = 0;
    const stringify = configure({ lengthLimit: 80 });
    const result = stringify(
      { ignored: 'x'.repeat(200), keep: 'y'.repeat(200) },
      (key, value) => (key === 'ignored' ? undefined : value),
      { lengthLimit: 40, onTruncate: () => calls++ },
    )!;
    expect(result.length).toBeLessThanOrEqual(40);
    expect(calls).toBe(1);
    expect(JSON.parse(result)).not.toHaveProperty('ignored');
    expect(JSON.parse(result).keep).toContain(marker);
  });

  test.each([
    [0, RangeError],
    [1, RangeError],
    [3, RangeError],
    [-1, RangeError],
    [4.5, TypeError],
    [NaN, TypeError],
    [Infinity, TypeError],
    ['40', TypeError],
    [null, TypeError],
  ])('rejects an unusable per-call length limit: %s', (lengthLimit, error) => {
    const stringify = configure({ lengthLimit: 80 });
    expect(() =>
      stringify('value', null, { lengthLimit } as { lengthLimit?: number }),
    ).toThrow(error);
  });

  test('rejects a per-call length limit of 3 with a RangeError', () => {
    expect(() => configure()('value', null, { lengthLimit: 3 })).toThrow(
      RangeError,
    );
    expect(() => configure()('value', null, { lengthLimit: 4 })).not.toThrow();
  });

  test.each([null, 1, 'callback', false])(
    'rejects an invalid per-call truncation callback: %j',
    (onTruncate) => {
      expect(() =>
        configure()('value', null, { onTruncate } as unknown as {
          onTruncate?: () => void;
        }),
      ).toThrow(TypeError);
    },
  );

  test('a rejected override does not change later calls', () => {
    let calls = 0;
    const stringify = configure({ lengthLimit: 20, onTruncate: () => calls++ });
    expect(() => stringify('x', null, { lengthLimit: 1 })).toThrow(RangeError);
    expect(stringify('x'.repeat(50))!.length).toBeLessThanOrEqual(20);
    expect(calls).toBe(1);
  });
});

describe('length-limited serialization', () => {
  afterEach(() => jest.restoreAllMocks());

  test('returns undefined for unsupported root values without writing to stdout', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const stringify = configure({ lengthLimit: 100 });
    expect(stringify(undefined)).toBeUndefined();
    expect(stringify(Symbol('unsupported'))).toBeUndefined();
    expect(stringify(() => undefined)).toBeUndefined();
    expect(stringify({ value: 1 })).toBe('{"value":1}');
    expect(log).not.toHaveBeenCalled();
  });

  test.each([
    ['null', null],
    ['true', true],
    ['false', false],
    ['1234', 1234],
    ['"hi"', 'hi'],
    ['"\\n\\"\\\\"', '\n"\\'],
    ['"😀"', '😀'],
    ['"\\ud800"', '\ud800'],
    ['[1,null,3]', [1, undefined, 3]],
    ['{"a":1,"b":[2]}', { a: 1, b: [2] }],
  ])('preserves an exact-fit JSON value: %s', (expected, value) => {
    expect(configure({ lengthLimit: expected.length })(value)).toBe(expected);
  });

  test.each(['a', '\n', '"', '\\', '\ud800', '😀'])(
    'bounds escaped strings containing %j',
    (character) => {
      const stringify = configure({ lengthLimit: 80 });
      const result = stringify(character.repeat(200))!;
      expect(result.length).toBeLessThanOrEqual(80);
      const parsed: string = JSON.parse(result);
      expect(parsed.endsWith(marker)).toBe(true);
      expect(parsed.length).toBeGreaterThan(marker.length);
      if (character === '😀') {
        expect(parsed.slice(0, -marker.length)).toMatch(/^(😀)+$/u);
      }
    },
  );

  test('preserves leading array elements and marks omitted elements within the budget', () => {
    const result = configure({ lengthLimit: 60 })(
      Array.from({ length: 100 }, (_, i) => i),
    )!;
    expect(result.length).toBeLessThanOrEqual(60);
    const parsed = JSON.parse(result);
    expect(parsed.slice(0, 3)).toEqual([0, 1, 2]);
    expect(parsed[parsed.length - 1]).toBe(marker);
  });

  test('preserves leading object properties and marks omitted properties within the budget', () => {
    const value = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`key${i}`, i]),
    );
    const result = configure({ deterministic: false, lengthLimit: 80 })(value)!;
    expect(result.length).toBeLessThanOrEqual(80);
    expect(JSON.parse(result)).toMatchObject({
      key0: 0,
      key1: 1,
      '...': marker,
    });
  });

  test('counts escaped keys and ancestor punctuation in deeply nested output', () => {
    const value = {
      '\n"\\': [{ inner: { text: 'x'.repeat(200) } }],
      later: true,
    };
    const result = configure({ deterministic: false, lengthLimit: 80 })(value)!;
    expect(result.length).toBeLessThanOrEqual(80);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(result).toContain(marker);
    expect(JSON.parse(result)).not.toHaveProperty('later');
  });

  test('stops accessing later properties after truncating a value', () => {
    const value = {
      first: 'x'.repeat(200),
      get later(): never {
        throw new Error('Must not read past the limit');
      },
    };
    const result = configure({ deterministic: false, lengthLimit: 80 })(value)!;
    expect(result.length).toBeLessThanOrEqual(80);
    expect(JSON.parse(result).first).toContain(marker);
  });

  test('does not spend the budget on properties omitted by the replacer', () => {
    const value = { ignored: 'x'.repeat(200), keep: 1 };
    const result = configure({ lengthLimit: 10 })(value, function (key, val) {
      return key === 'ignored' ? undefined : val;
    });
    expect(result).toBe('{"keep":1}');
  });

  test.each([7, 8])(
    'preserves fitting objects with trailing omitted properties at limit %i',
    (lengthLimit) => {
      const stringify = configure({ lengthLimit, deterministic: false });
      expect(
        stringify({ a: 1, b: undefined, c: Symbol(), d: () => undefined }),
      ).toBe('{"a":1}');
      expect(
        stringify({ a: 1, cause: 'excluded' }, (key, value) =>
          key === 'cause' ? undefined : value,
        ),
      ).toBe('{"a":1}');
    },
  );

  test('keeps the budget local to each serialization, including reentrant replacers', () => {
    const stringify = configure({ lengthLimit: 80 });
    expect(stringify('x'.repeat(200))!.length).toBeLessThanOrEqual(80);
    expect(
      stringify({ a: 1 }, function (key, value) {
        if (key === 'a') stringify('x'.repeat(200));
        return value;
      }),
    ).toBe('{"a":1}');
    expect(stringify({ a: 1 })).toBe('{"a":1}');
  });

  test.each([4, 5, 10, 20, 40, 60])(
    'returns valid JSON with a small limit of %i',
    (lengthLimit) => {
      const stringify = configure({ lengthLimit });
      for (const value of [
        'x'.repeat(200),
        [1, 2, 'x'.repeat(200)],
        { a: 'x'.repeat(200) },
        1234567890,
      ]) {
        const result = stringify(value)!;
        expect(result.length).toBeLessThanOrEqual(lengthLimit);
        expect(() => JSON.parse(result)).not.toThrow();
      }
    },
  );

  test.each([0, 1, 3, -1, 4.5, NaN, Infinity])(
    'rejects an unusable length limit: %s',
    (lengthLimit) => {
      expect(() => configure({ lengthLimit })).toThrow();
    },
  );

  test('escapes circular markers and supports null or omitted circular references', () => {
    const value: Record<string, unknown> = {};
    value['self'] = value;
    expect(configure({ circularValue: '"\n' })(value)).toBe(
      '{"self":"\\"\\n"}',
    );
    expect(configure({ circularValue: null })(value)).toBe('{"self":null}');
    expect(configure({ circularValue: undefined })(value)).toBe('{}');
    expect(() => configure({ circularValue: Error })(value)).toThrow(TypeError);
  });

  test('reports every array element omitted by maximumBreadth', () => {
    expect(configure({ maximumBreadth: 2 })([1, 2, 3])).toBe(
      '[1,2,"... 1 item not stringified"]',
    );
    expect(configure({ maximumBreadth: 2 })([1, 2, 3, 4])).toBe(
      '[1,2,"... 2 items not stringified"]',
    );
  });
});
