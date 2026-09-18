import { sha256Hex } from '../src/sha256';

describe('sha256Hex', () => {
  test.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
  ])('matches the FIPS 180-4 vector for %j', (input, digest) => {
    expect(sha256Hex(input)).toBe(digest);
  });

  test('agrees with node crypto across block boundaries and UTF-8 widths', () => {
    const { createHash } =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('node:crypto') as typeof import('node:crypto');
    const reference = (text: string) =>
      createHash('sha256').update(new TextEncoder().encode(text)).digest('hex');
    const loneSurrogates = `${String.fromCharCode(
      0xd800,
    )} lone ${String.fromCharCode(0xdc00)}`;
    const widths = [0x00, 0x7f, 0x80, 0x7ff, 0x800, 0xffff]
      .map((c) => String.fromCharCode(c))
      .join('');
    const inputs = [
      'a'.repeat(55),
      'a'.repeat(56),
      'a'.repeat(63),
      'a'.repeat(64),
      'a'.repeat(65),
      'a'.repeat(100_000),
      `emoji ${String.fromCodePoint(0x1f642)}`,
      loneSurrogates,
      // A high surrogate at the very end: there is no next code unit to pair.
      `trailing ${String.fromCharCode(0xd800)}`,
      widths,
    ];
    for (const input of inputs) expect(sha256Hex(input)).toBe(reference(input));
  });
});
