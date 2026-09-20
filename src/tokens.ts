/** A bounded printable-ASCII token without spaces. Ids bypass redaction, so they are nothing else. */
export const ID_PATTERN = /^[\x21-\x7e]{1,128}$/;
export const FINGERPRINT_PATTERN = /^[\x21-\x7e]{1,64}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

// Crockford base32: no I, L, O or U.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ID_BODY_LENGTH = 26;

function randomBody(): string {
  const values = new Uint8Array(ID_BODY_LENGTH);
  const platform = (
    globalThis as {
      crypto?: { getRandomValues?: (array: Uint8Array) => unknown };
    }
  ).crypto;
  if (
    platform !== undefined &&
    typeof platform.getRandomValues === 'function'
  ) {
    platform.getRandomValues(values);
  } else {
    // A correlation handle, not a secret: uniqueness is what matters here.
    for (let i = 0; i < ID_BODY_LENGTH; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  // 256 is a multiple of 32, so `& 31` is unbiased.
  for (let i = 0; i < ID_BODY_LENGTH; i++) {
    out += ALPHABET[values[i]! & 31];
  }
  return out;
}

const memo = new WeakMap<object, string>();

/** One id per object or function for the life of the process; a primitive gets a new one each time. */
export function randomOccurrenceId(caught: unknown): string {
  const keyable =
    (typeof caught === 'object' && caught !== null) ||
    typeof caught === 'function';
  if (!keyable) return `CORJ_${randomBody()}`;
  const existing = memo.get(caught as object);
  if (existing !== undefined) return existing;
  const created = `CORJ_${randomBody()}`;
  memo.set(caught as object, created);
  return created;
}

const MAX_PATH_SEGMENTS = 16;

/** Validates a `{ sourceProperty }` or `{ path }` entry. `where` names it in the message, e.g. `occurrenceIdSources[0]`. */
export function validateSourceEntry(entry: unknown, where: string): void {
  const record = entry as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'sourceProperty' && key !== 'path' && key !== 'inspection') {
      throw new TypeError(`${where} has an unknown key "${key}"`);
    }
  }
  const hasField = record['sourceProperty'] !== undefined;
  const hasPath = record['path'] !== undefined;
  if (hasField === hasPath) {
    throw new TypeError(
      `${where} must have exactly one of sourceProperty or path`,
    );
  }
  if (
    hasField &&
    (typeof record['sourceProperty'] !== 'string' ||
      record['sourceProperty'] === '')
  ) {
    throw new TypeError(`${where}.sourceProperty must be a nonempty string`);
  }
  if (hasPath) {
    const path = record['path'];
    const valid =
      Array.isArray(path) &&
      path.length >= 1 &&
      path.length <= MAX_PATH_SEGMENTS &&
      path.every(
        (segment) =>
          (typeof segment === 'string' && segment !== '') ||
          (Number.isSafeInteger(segment) && (segment as number) >= 0),
      );
    if (!valid) {
      throw new TypeError(
        `${where}.path must be an array of 1 to ${MAX_PATH_SEGMENTS} strings or nonnegative integers`,
      );
    }
  }
  const inspection = record['inspection'];
  if (
    inspection !== undefined &&
    inspection !== 'default' &&
    inspection !== 'no-invoke'
  ) {
    throw new TypeError(`${where}.inspection must be "default" or "no-invoke"`);
  }
}
