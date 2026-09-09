import { configure } from '../src/safe-stable-stringify';

const marker = '[caught-object-report-json: Truncated]';

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
    expect(
      configure({ lengthLimit: json.length, lengthUnit: 'utf8-bytes' })(value),
    ).toBe('null');
  });

  test.each([
    ['utf8-bytes', 43, ''],
    ['utf8-bytes', 44, '😀'],
    ['utf8-bytes', 48, '😀😀'],
    ['utf16-code-units', 41, ''],
    ['utf16-code-units', 42, '😀'],
    ['utf16-code-units', 44, '😀😀'],
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
    const result = configure({
      deterministic: false,
      lengthLimit: 70,
      lengthUnit: 'utf8-bytes',
    })({ '...': '😀😀', keep: 'Ж', long: '界'.repeat(200) })!;
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(70);
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
