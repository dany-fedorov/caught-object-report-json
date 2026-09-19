/**
 * Synchronous SHA-256 of a string's UTF-8 encoding, as lowercase hex.
 *
 * The web platform's digest is async and corj is synchronous with no
 * dependencies, so the fingerprint carries its own implementation.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** How many UTF-8 bytes one code point needs. */
function utf8Size(code: number): number {
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
}

/** Every code point of a string; a lone surrogate becomes U+FFFD, as `TextEncoder` does. */
function forEachCodePoint(text: string, visit: (code: number) => void): void {
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }
    visit(code);
  }
}

/** One code point written at `at`; returns the next free offset. */
function writeUtf8(out: Uint8Array, at: number, code: number): number {
  let next = at;
  if (code < 0x80) {
    out[next++] = code;
  } else if (code < 0x800) {
    out[next++] = 0xc0 | (code >> 6);
    out[next++] = 0x80 | (code & 0x3f);
  } else if (code < 0x10000) {
    out[next++] = 0xe0 | (code >> 12);
    out[next++] = 0x80 | ((code >> 6) & 0x3f);
    out[next++] = 0x80 | (code & 0x3f);
  } else {
    out[next++] = 0xf0 | (code >> 18);
    out[next++] = 0x80 | ((code >> 12) & 0x3f);
    out[next++] = 0x80 | ((code >> 6) & 0x3f);
    out[next++] = 0x80 | (code & 0x3f);
  }
  return next;
}

/**
 * UTF-8 bytes of a string. Counted first and filled second, into an exactly
 * sized `Uint8Array`: a `number[]` cost a JS number per byte and threw
 * `RangeError: Invalid array length` once the input passed about 128 MB.
 */
function utf8(text: string): Uint8Array {
  let length = 0;
  forEachCodePoint(text, (code) => {
    length += utf8Size(code);
  });
  const out = new Uint8Array(length);
  let at = 0;
  forEachCodePoint(text, (code) => {
    at = writeUtf8(out, at, code);
  });
  return out;
}

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

export function sha256Hex(text: string): string {
  const bytes = utf8(text);
  const bitLength = bytes.length * 8;
  // The padded message: the bytes, one `0x80`, zeroes up to 56 mod 64, and the
  // 64-bit big-endian bit length. Sized once, so nothing grows while hashing.
  const zeroes = (((55 - (bytes.length % 64)) % 64) + 64) % 64;
  const message = new Uint8Array(bytes.length + 9 + zeroes);
  message.set(bytes);
  message[bytes.length] = 0x80;
  let tail = message.length - 8;
  for (const word of [Math.floor(bitLength / 0x100000000), bitLength >>> 0]) {
    message[tail++] = (word >>> 24) & 0xff;
    message[tail++] = (word >>> 16) & 0xff;
    message[tail++] = (word >>> 8) & 0xff;
    message[tail++] = word & 0xff;
  }
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < message.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        (message[j]! << 24) |
        (message[j + 1]! << 16) |
        (message[j + 2]! << 8) |
        message[j + 3]!;
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) | 0;
    }
    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i]! + w[i]!) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] = h[0]! + a;
    h[1] = h[1]! + b;
    h[2] = h[2]! + c;
    h[3] = h[3]! + d;
    h[4] = h[4]! + e;
    h[5] = h[5]! + f;
    h[6] = h[6]! + g;
    h[7] = h[7]! + hh;
  }
  let hex = '';
  // Indexed: this compile target does not iterate a typed array directly.
  for (let i = 0; i < h.length; i++) hex += h[i]!.toString(16).padStart(8, '0');
  return hex;
}
