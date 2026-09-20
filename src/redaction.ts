/**
 * Field selection and redaction applied at the reporting boundary.
 *
 * The package supplies the traversal and the transformation mechanism; which
 * content is sensitive stays the application's decision. A configured policy
 * cannot discover an unknown secret, and redacted error text is still text a
 * caught object controlled: it is diagnostic material, never instructions.
 */

import type { CorjReport, CorjReportNode } from './index';

/** Replaces content a redaction policy excluded. */
export const CORJ_REDACTED_MARKER = '[redacted]';

/** Where in the report process a value was produced or an error was caught. */
export type CorjStage =
  /** A property of the caught object, consulted before the property is read. */
  | 'prop-access'
  /** The string form of a node. */
  | 'as_string'
  /** A value reached while building the JSON form of a node. */
  | 'as_json'
  /** A property children are collected from. */
  | 'children'
  /** Enforcing a size or count limit. */
  | 'limit'
  /** Running the redaction policy itself. */
  | 'redact'
  /** The text the default `onReportingError` handler prints. */
  | 'warning'
  /** Anywhere else. */
  | 'other';

/** A field of a report node. */
export type CorjReportKey = keyof CorjReport | keyof CorjReportNode;

/** What a redaction policy or an error handler is told about a value. */
export type CorjContext = {
  stage: CorjStage;
  /** JSONPath of the value. `$` is the caught root; a named root such as `$context` is a separate document. */
  path: string;
  /** Report field the value is destined for, when known. */
  reportKey?: CorjReportKey | undefined;
  /** Property of the caught object the value came from, when known. */
  sourceProperty?: string | undefined;
};

/**
 * The last word on a value, run after `keys`, `paths` and `patterns`. Returning
 * `undefined` leaves the field out of the report entirely.
 */
export type CorjRedactTransform = (
  value: unknown,
  context: CorjContext,
) => unknown;

/** A redaction policy as it is passed in; every part is optional. */
export type CorjRedactPolicyInput = {
  /** Property names never read from the caught object. A string matches exactly. */
  keys?: readonly (string | RegExp)[];
  /** JSONPaths never read, e.g. `"$.cause.config.headers"`. A string matches exactly. */
  paths?: readonly (string | RegExp)[];
  /** Applied with `String.prototype.replace` to every string the report emits. */
  patterns?: readonly RegExp[];
  /** What an excluded value and a pattern match become. Defaults to {@link CORJ_REDACTED_MARKER}. */
  replacement?: string;
  /** Runs after the above on every value the report emits. */
  transform?: CorjRedactTransform | null;
};

/** A resolved redaction policy, as {@link CorjOptions.redact} holds it. */
export type CorjRedactPolicy = {
  keys: readonly (string | RegExp)[];
  paths: readonly (string | RegExp)[];
  patterns: readonly RegExp[];
  replacement: string;
  transform: CorjRedactTransform | null;
};

const MAX_REPLACEMENT_LENGTH = 128;
/** Policies this module froze; handing one back in skips validation. */
const resolved = new WeakSet<object>();

function isMatcherList(value: unknown): value is readonly (string | RegExp)[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' || entry instanceof RegExp)
  );
}

/** Validates and freezes a policy. `undefined` and `null` both mean "no policy". */
export function resolveRedactPolicy(
  input: CorjRedactPolicyInput | null | undefined,
): CorjRedactPolicy | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'object') {
    throw new TypeError('redact must be an object or null');
  }
  if (resolved.has(input)) return input as CorjRedactPolicy;
  const known = ['keys', 'paths', 'patterns', 'replacement', 'transform'];
  for (const key of Object.keys(input)) {
    if (!known.includes(key)) {
      throw new TypeError(
        `Unknown redact option "${key}". Known redact options: ${known.join(
          ', ',
        )}`,
      );
    }
  }
  for (const key of ['keys', 'paths'] as const) {
    if (input[key] !== undefined && !isMatcherList(input[key])) {
      throw new TypeError(
        `redact.${key} must be an array of strings or RegExps`,
      );
    }
  }
  if (
    input.patterns !== undefined &&
    (!Array.isArray(input.patterns) ||
      !input.patterns.every((entry) => entry instanceof RegExp))
  ) {
    throw new TypeError('redact.patterns must be an array of RegExps');
  }
  // A pattern without `g` replaces only the first occurrence, which reads as
  // protection and is not. Rejecting it is louder than silently adding the flag.
  for (const pattern of input.patterns ?? []) {
    if (!pattern.global) {
      throw new TypeError(
        `redact.patterns must all be global; ${String(
          pattern,
        )} would replace only its first match`,
      );
    }
  }
  if (
    input.replacement !== undefined &&
    (typeof input.replacement !== 'string' ||
      input.replacement.length > MAX_REPLACEMENT_LENGTH)
  ) {
    throw new TypeError(
      `redact.replacement must be a string of at most ${MAX_REPLACEMENT_LENGTH} characters`,
    );
  }
  if (
    input.transform !== undefined &&
    input.transform !== null &&
    typeof input.transform !== 'function'
  ) {
    throw new TypeError('redact.transform must be a function');
  }
  const policy = Object.freeze({
    keys: Object.freeze([...(input.keys ?? [])]),
    paths: Object.freeze([...(input.paths ?? [])]),
    patterns: Object.freeze([...(input.patterns ?? [])]),
    replacement: input.replacement ?? CORJ_REDACTED_MARKER,
    transform: input.transform ?? null,
  });
  resolved.add(policy);
  return policy;
}

function matches(
  matchers: readonly (string | RegExp)[],
  subject: string,
): boolean {
  for (const matcher of matchers) {
    if (typeof matcher === 'string') {
      if (matcher === subject) return true;
      continue;
    }
    // A global or sticky RegExp carries `lastIndex` between calls, and the
    // caller may have used this very object before handing it over. Reset on
    // both sides of the test so a matcher always answers from the start.
    matcher.lastIndex = 0;
    const matched = matcher.test(subject);
    matcher.lastIndex = 0;
    if (matched) return true;
  }
  return false;
}

/** Marks a field the policy dropped rather than replaced. */
export const CORJ_REDACT_DROP = Symbol('corj.redact.drop');

/**
 * Applies one policy, reporting a throwing callback exactly once per value and
 * failing closed: a policy that cannot decide yields the replacement rather
 * than the value it was asked about.
 */
export class Redactor {
  readonly policy: CorjRedactPolicy;
  private readonly onFailure: (caught: unknown, context: CorjContext) => void;
  /**
   * Set while a policy failure is being reported. Reporting a failure runs the
   * default `onReportingError`, which redacts the line it prints; this stops the same
   * throwing policy from being consulted again to describe its own failure.
   */
  private failing = false;

  constructor(
    policy: CorjRedactPolicy,
    onFailure: (caught: unknown, context: CorjContext) => void,
  ) {
    this.policy = policy;
    this.onFailure = onFailure;
  }

  private fail(caught: unknown, context: CorjContext): void {
    this.failing = true;
    try {
      this.onFailure(caught, context);
    } finally {
      this.failing = false;
    }
  }

  /** Whether a property is excluded by name or path, decided without reading it. */
  excludes(context: CorjContext): boolean {
    try {
      const { keys, paths } = this.policy;
      if (
        context.sourceProperty !== undefined &&
        matches(keys, context.sourceProperty)
      )
        return true;
      return matches(paths, context.path);
    } catch (caught: unknown) {
      this.fail(caught, context);
      return true;
    }
  }

  /**
   * Every pattern applied to one string. The replacement goes through a function
   * so that `$&`, `$1` and friends stay literal text: a `replacement` that
   * re-expanded the match would put the secret straight back.
   */
  private scrub(value: string): string {
    const literal = () => this.policy.replacement;
    let out = value;
    for (const pattern of this.policy.patterns) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, literal);
      pattern.lastIndex = 0;
    }
    return out;
  }

  /**
   * Patterns and then `transform` applied to one emitted value. Returns
   * {@link CORJ_REDACT_DROP} when the policy left the field out.
   */
  apply(value: unknown, context: CorjContext): unknown {
    if (this.failing) return this.policy.replacement;
    let out = value;
    try {
      if (typeof out === 'string') out = this.scrub(out);
      if (this.policy.transform !== null) {
        out = this.policy.transform(out, context);
        if (out === undefined) return CORJ_REDACT_DROP;
        if (typeof out === 'string') out = this.scrub(out);
      }
      return out;
    } catch (caught: unknown) {
      this.fail(caught, context);
      return this.policy.replacement;
    }
  }

  /** {@link apply} for a value that must stay a string, such as `message` or a stack. */
  text(value: string, context: CorjContext): string {
    const out = this.apply(value, context);
    if (out === CORJ_REDACT_DROP) return this.policy.replacement;
    return typeof out === 'string' ? out : this.policy.replacement;
  }
}
