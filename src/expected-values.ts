import type {
  CaughtObjectReportJson,
  CaughtObjectReportJsonChild,
} from './index';

/**
 * Values that a report field is expected to hold most of the time.
 *
 * When {@link CorjMakerOptions.omitExpectedValues} is enabled (the default),
 * a field holding its expected value is left out of the report, and a reader
 * must treat a missing field as holding the expected value.
 *
 * `as_string` has no fixed expected value: it is omitted when it equals the
 * first line of `stack`, which is what `Error.prototype.toString` produces.
 */
export const CORJ_EXPECTED_VALUES = Object.freeze({
  instanceof_error: true,
  typeof: 'object',
  as_json: Object.freeze({}),
  as_string_format: 'String',
  as_json_format: 'safe-stable-stringify-with-length-limit',
  children_sources: Object.freeze(['cause', 'errors']),
} as const);

type Report = CaughtObjectReportJson | CaughtObjectReportJsonChild[];
type Node = CaughtObjectReportJson | CaughtObjectReportJsonChild;

export function firstStackLine(
  stack: CaughtObjectReportJson['stack'] | undefined,
): string | undefined {
  if (typeof stack === 'string') {
    const newline = stack.indexOf('\n');
    return newline === -1 ? stack : stack.slice(0, newline);
  }
  if (Array.isArray(stack) && typeof stack[0] === 'string') {
    return stack[0];
  }
  return undefined;
}

function isEmptyPlainObject(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  );
}

function isExpectedChildrenSources(value: unknown): boolean {
  const expected = CORJ_EXPECTED_VALUES.children_sources;
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((item, i) => item === expected[i])
  );
}

function omitExpectedValuesFromNode<T extends Node>(node: T): T {
  const result: Node = { ...node };
  if (result.instanceof_error === CORJ_EXPECTED_VALUES.instanceof_error) {
    delete result.instanceof_error;
  }
  if (result.typeof === CORJ_EXPECTED_VALUES.typeof) {
    delete result.typeof;
  }
  if (isEmptyPlainObject(result.as_json)) {
    delete result.as_json;
  }
  if (
    typeof result.as_string === 'string' &&
    result.as_string === firstStackLine(result.stack)
  ) {
    delete result.as_string;
  }
  if (result.as_string_format === CORJ_EXPECTED_VALUES.as_string_format) {
    delete result.as_string_format;
  }
  if (result.as_json_format === CORJ_EXPECTED_VALUES.as_json_format) {
    delete result.as_json_format;
  }
  if (isExpectedChildrenSources(result.children_sources)) {
    delete result.children_sources;
  }
  return result as T;
}

/** Remove fields holding their expected value from a report object or report array. */
export function omitExpectedValues<T extends Report>(report: T): T {
  if (Array.isArray(report)) {
    return report.map((row) => omitExpectedValuesFromNode(row)) as T;
  }
  const root: CaughtObjectReportJson = omitExpectedValuesFromNode(report);
  if (Array.isArray(root.children)) {
    root.children = root.children.map((child) =>
      child === null ? null : omitExpectedValuesFromNode(child),
    );
  }
  return root as T;
}

function restoreExpectedValuesOnNode<T extends Node>(node: T): T {
  const result: Node = { ...node };
  if (!('instanceof_error' in result)) {
    result.instanceof_error = CORJ_EXPECTED_VALUES.instanceof_error;
  }
  if (!('typeof' in result)) {
    result.typeof = CORJ_EXPECTED_VALUES.typeof;
  }
  if (!('as_json' in result)) {
    result.as_json = {};
  }
  if (!('as_string' in result)) {
    const line = firstStackLine(result.stack);
    if (line !== undefined) {
      result.as_string = line;
    }
  }
  return result as T;
}

/**
 * Fill in `instanceof_error`, `typeof`, `as_json` and `as_string` when a report
 * omitted them as expected values, so every report object has the fields that
 * were required before corj/v0.11.
 *
 * Metadata fields are not restored: a missing metadata field can mean either
 * "expected value" or "metadata disabled".
 */
export function restoreExpectedValues<T extends Report>(report: T): T {
  if (Array.isArray(report)) {
    return report.map((row) => restoreExpectedValuesOnNode(row)) as T;
  }
  const root: CaughtObjectReportJson = restoreExpectedValuesOnNode(report);
  if (Array.isArray(root.children)) {
    root.children = root.children.map((child) =>
      child === null ? null : restoreExpectedValuesOnNode(child),
    );
  }
  return root as T;
}
