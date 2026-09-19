import type { CorjFingerprintPart, CorjJsonValue } from './index';
import { sha256Hex } from './sha256';
import { validateSourceEntry } from './tokens';

/** Prefix of every fingerprint. It changes whenever the hash input recipe does, so old and new never look comparable. */
export const FINGERPRINT_VERSION = 'fp1';
export const FIELD_PARTS = [
  'as_string',
  'constructor_name',
  'message',
  'stack',
  'typeof',
] as const;

export type ResolvedPart = { label: string; part: CorjFingerprintPart };
export type FingerprintValue = string | number | boolean | null | CorjJsonValue;

const ONE_OF =
  'must be one of as_string, constructor_name, message, stack, typeof, an entry object, or a function';

/** Validates the option and puts it in canonical order: named parts by label, then functions as given. */
export function resolveFingerprintParts(
  value: unknown,
): readonly ResolvedPart[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) {
    throw new TypeError('fingerprintParts must be an array or null');
  }
  const named: ResolvedPart[] = [];
  const functions: ResolvedPart[] = [];
  const seen = new Set<string>();
  value.forEach((part: unknown, index) => {
    const where = `fingerprintParts[${index}]`;
    if (typeof part === 'function') {
      functions.push({
        label: `fn:${functions.length}`,
        part: part as CorjFingerprintPart,
      });
      return;
    }
    let label: string;
    if (typeof part === 'string') {
      if (!(FIELD_PARTS as readonly string[]).includes(part)) {
        throw new TypeError(`${where} ${ONE_OF}`);
      }
      label = part;
    } else if (typeof part === 'object' && part !== null) {
      validateSourceEntry(part, where);
      const entry = part as {
        field?: string;
        path?: readonly (string | number)[];
      };
      // `{ path: ['a'] }` is the one-segment case of `{ field: 'a' }`: the same
      // read, so the same label, and listing both is a repeat rather than two
      // spellings of one part hashing differently.
      const path = entry.path;
      const only =
        path !== undefined && path.length === 1 ? path[0] : undefined;
      label =
        entry.field !== undefined
          ? `field:${entry.field}`
          : typeof only === 'string'
          ? `field:${only}`
          : `path:${JSON.stringify(path)}`;
    } else {
      throw new TypeError(`${where} ${ONE_OF}`);
    }
    if (seen.has(label)) throw new TypeError(`${where} repeats "${label}"`);
    seen.add(label);
    named.push({ label, part: part as CorjFingerprintPart });
  });
  if (named.length + functions.length === 0) return null;
  named.sort((a, b) => (a.label < b.label ? -1 : 1));
  return Object.freeze([...named, ...functions]);
}

const V8_FIRST_FRAME = /\n {4}at /;

/**
 * The stack without the node's own header, so the `message` and `stack` parts
 * do not overlap. A message may span lines, so the header is cut by prefix, not
 * by line; Firefox and Safari stacks carry no header and come back unchanged.
 */
export function stackWithoutHeader(stack: string, asString: unknown): string {
  if (
    typeof asString === 'string' &&
    asString !== '' &&
    stack.startsWith(asString)
  ) {
    const rest = stack.slice(asString.length);
    // Only a whole header is a header. `toCorjAsString: () => 'E'` prefixes
    // `Error: <message>` without being its first line, and cutting there would
    // leave the message in what the `stack` part contributes.
    if (rest === '') return rest;
    if (rest.startsWith('\n')) return rest.slice(1);
  }
  const match = V8_FIRST_FRAME.exec(stack);
  return match === null ? stack : stack.slice(match.index + 1);
}

/** A V8 frame: `    at <something>` on its own line. */
const V8_FRAME = /(^|\n)\s+at \S/;
/** A SpiderMonkey or JavaScriptCore frame: `<name>@<location>:<line>[:<column>]`. */
const AT_SIGN_FRAME = /(^|\n)[^\n@]*@[^\n]*:\d+(:\d+)?(\n|$)/;

/**
 * Whether a stack, cut as the `stack` part hashes it, carries at least one
 * frame. Frames are what a reader outside the deployment cannot reproduce; a
 * sentence someone assigned to `.stack`, a redaction marker or an empty string
 * carries nothing they could not have guessed. The word "at" inside a message
 * is not a frame: a frame begins its own line.
 */
export function hasStackFrames(cut: string): boolean {
  return V8_FRAME.test(cut) || AT_SIGN_FRAME.test(cut);
}

export type FingerprintRow = readonly [
  path: string,
  values: readonly FingerprintValue[],
];

/**
 * Whether the root row is hashed with its `[typeof, as_string]` appended, which
 * makes the hash one of the root's own text: either the root has no stack to be
 * identified by, or every part came back empty and the text is all that is left.
 */
export function rootFallsBackToText(
  rows: readonly FingerprintRow[],
  forceFallback: boolean,
): boolean {
  const root = rows[0];
  if (root === undefined) return false;
  return (
    forceFallback || root[1].every((value) => value === null || value === '')
  );
}

/** Hash one canonical JSON document: the recipe version, the labels, and one row of values per node. */
export function fingerprintOf(
  labels: readonly string[],
  rows: readonly FingerprintRow[],
  rootFallback: readonly [typeofValue: string, asString: string | null],
  /** Set when the root has no string stack: a thrown primitive or plain object, whose only identity is its string form. */
  forceFallback = false,
): string {
  const fallsBack = rootFallsBackToText(rows, forceFallback);
  const hashed = rows.map((row, index) =>
    index === 0 && fallsBack
      ? [row[0], row[1], rootFallback]
      : [row[0], row[1]],
  );
  const input = JSON.stringify([FINGERPRINT_VERSION, labels, hashed]);
  return `${FINGERPRINT_VERSION}_${sha256Hex(input).slice(0, 32)}`;
}
