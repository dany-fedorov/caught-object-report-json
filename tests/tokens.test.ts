import {
  isValidId,
  randomOccurrenceId,
  validateSourceEntry,
} from '../src/tokens';

describe('tokens', () => {
  test.each([['AE_1'], ['req-42'], ['!'.repeat(128)], ['a:b/c=d']])(
    'accepts the id %j',
    (id) => {
      expect(isValidId(id)).toBe(true);
    },
  );

  test.each([
    [''],
    [' '],
    ['has space'],
    ['x'.repeat(129)],
    ['tab\there'],
    ['café'],
    [42],
    [null],
  ])('rejects the id %j', (id) => {
    expect(isValidId(id)).toBe(false);
  });

  test('a random id is CORJ_ plus 26 Crockford base32 characters', () => {
    expect(randomOccurrenceId('primitive')).toMatch(
      /^CORJ_[0-9A-HJKMNP-TV-Z]{26}$/,
    );
  });

  test('one object keeps one id; primitives get a new one each time', () => {
    const error = new Error('x');
    expect(randomOccurrenceId(error)).toBe(randomOccurrenceId(error));
    expect(randomOccurrenceId(new Error('x'))).not.toBe(
      randomOccurrenceId(error),
    );
    expect(randomOccurrenceId('s')).not.toBe(randomOccurrenceId('s'));
    const fn = () => 1;
    expect(randomOccurrenceId(fn)).toBe(randomOccurrenceId(fn));
  });

  test('uses the platform source when there is one', () => {
    // jest's sandbox may or may not expose `crypto`; a fake makes the branch deterministic.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: { getRandomValues: (array: Uint8Array) => array.fill(7) },
      configurable: true,
    });
    try {
      expect(randomOccurrenceId('p')).toBe(`CORJ_${'7'.repeat(26)}`);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
      else delete (globalThis as { crypto?: unknown }).crypto;
    }
  });

  test('falls back to Math.random when the platform has no crypto', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    });
    try {
      expect(randomOccurrenceId('p')).toMatch(/^CORJ_[0-9A-HJKMNP-TV-Z]{26}$/);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
      else delete (globalThis as { crypto?: unknown }).crypto;
    }
  });

  test.each([
    [{ sourceProperty: '' }, 'x[0].sourceProperty must be a nonempty string'],
    [{ sourceProperty: 1 }, 'x[0].sourceProperty must be a nonempty string'],
    [
      { path: [] },
      'x[0].path must be an array of 1 to 16 strings or nonnegative integers',
    ],
    [
      { path: ['a', -1] },
      'x[0].path must be an array of 1 to 16 strings or nonnegative integers',
    ],
    [
      { path: new Array(17).fill('a') },
      'x[0].path must be an array of 1 to 16 strings or nonnegative integers',
    ],
    [
      { sourceProperty: 'a', path: ['a'] },
      'x[0] must have exactly one of sourceProperty or path',
    ],
    [
      { sourceProperty: 'a', inspection: 'strict' },
      'x[0].inspection must be "default" or "no-invoke"',
    ],
    [{ sourceProperty: 'a', extra: 1 }, 'x[0] has an unknown key "extra"'],
    [{}, 'x[0] must have exactly one of sourceProperty or path'],
  ])('validateSourceEntry rejects %j', (entry, message) => {
    expect(() => validateSourceEntry(entry, 'x[0]')).toThrow(message);
  });

  test('validateSourceEntry accepts both forms, with and without inspection', () => {
    expect(() =>
      validateSourceEntry({ sourceProperty: 'id' }, 'x[0]'),
    ).not.toThrow();
    expect(() =>
      validateSourceEntry(
        { path: ['a', 0, 'b'], inspection: 'no-invoke' },
        'x[0]',
      ),
    ).not.toThrow();
  });
});
