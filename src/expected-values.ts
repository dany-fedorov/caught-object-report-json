import type { CorjReport, CorjReportBase, CorjReportChild } from './index';
import {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
} from './version';

/**
 * Values that a report field is expected to hold most of the time.
 *
 * When `omitExpectedValues` is enabled (the default), a field holding its
 * expected value is left out of the report, and a reader must treat a missing
 * field as holding the expected value.
 *
 * `as_string` has no fixed expected value: it is omitted when it equals the
 * first line of `stack`, which is what `Error.prototype.toString` produces.
 * `constructor_name` and `message` are omitted together with `as_string` when
 * that line is exactly `${constructor_name}: ${message}` (or `constructor_name`
 * alone for an empty message), see {@link parseStackHeader}.
 */
export const CORJ_EXPECTED_VALUES = Object.freeze({
  instanceof_error: true,
  typeof: 'object',
  as_json: Object.freeze({}),
  as_string_format: 'String',
  as_json_format: 'safe-stable-stringify-with-length-limit',
  children_sources: Object.freeze(['cause', 'errors']),
} as const);

type Report = CorjReport | CorjReportChild[];
type Node = CorjReportBase;

export function firstStackLine(
  stack: CorjReportBase['stack'] | undefined,
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

/**
 * Split the first line of a stack, as produced by `Error.prototype.toString`,
 * into error name and message: `"Name: message"` or `"Name"` for an empty message.
 * The split happens at the first `": "`, so a message may itself contain `": "`.
 */
export function parseStackHeader(line: string): {
  name: string;
  message: string;
} {
  const separator = line.indexOf(': ');
  if (separator === -1) {
    return { name: line, message: '' };
  }
  return { name: line.slice(0, separator), message: line.slice(separator + 2) };
}

/**
 * Fields a reader derives from `stack` when they are absent: `as_string` is the
 * first line, and when `constructor_name` and `message` are both absent as well
 * they are parsed from that line. A present `as_string` disables the derivation
 * of the pair, which lets a report say "these fields were never there".
 */
export function stackDerivedFields(
  node: Node,
): Pick<Node, 'as_string' | 'constructor_name' | 'message'> {
  const line = firstStackLine(node.stack);
  if (line === undefined || node.as_string !== undefined) {
    return {};
  }
  if (node.constructor_name !== undefined || node.message !== undefined) {
    return { as_string: line };
  }
  const header = parseStackHeader(line);
  return {
    as_string: line,
    constructor_name: header.name,
    message: header.message,
  };
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
  const line = firstStackLine(result.stack);
  if (typeof result.as_string === 'string' && result.as_string === line) {
    const header = parseStackHeader(line);
    if (
      result.constructor_name === header.name &&
      result.message === header.message
    ) {
      delete result.as_string;
      delete result.constructor_name;
      delete result.message;
    } else if (
      result.constructor_name !== undefined ||
      result.message !== undefined
    ) {
      delete result.as_string;
    }
    // Otherwise neither field exists: keep `as_string` so a reader does not
    // parse the line into fields the caught object never had.
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

function mapReport<T extends Report>(
  report: T,
  fn: <N extends Node>(node: N) => N,
): T {
  if (Array.isArray(report)) {
    return report.map((row) => fn(row)) as T;
  }
  const root: CorjReport = fn(report);
  if (Array.isArray(root.children)) {
    root.children = root.children.map((child) => fn(child));
  }
  return root as T;
}

/** Remove fields holding their expected value from a report object or report array. */
export function omitExpectedValues<T extends Report>(report: T): T {
  return mapReport(report, omitExpectedValuesFromNode);
}

function markFullVersionOnNode<T extends Node>(node: T): T {
  const result: Node = { ...node };
  if (result.v === CORJ_VERSION) {
    result.v = CORJ_VERSION_FULL;
  }
  if (result.$schema === CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK) {
    result.$schema = CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK;
  } else if (result.$schema === CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK) {
    result.$schema = CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK;
  }
  return result as T;
}

/** Relabel a complete report with the `-full` version and schema links. */
export function markFullVersion<T extends Report>(report: T): T {
  return mapReport(report, markFullVersionOnNode);
}

function restoreExpectedValuesOnNode<T extends Node>(node: T): T {
  const result: Node = markFullVersionOnNode(node);
  if (!('instanceof_error' in result)) {
    result.instanceof_error = CORJ_EXPECTED_VALUES.instanceof_error;
  }
  if (!('typeof' in result)) {
    result.typeof = CORJ_EXPECTED_VALUES.typeof;
  }
  if (!('as_json' in result)) {
    result.as_json = {};
  }
  if (!('as_string_format' in result)) {
    result.as_string_format = CORJ_EXPECTED_VALUES.as_string_format;
  }
  if (!('as_json_format' in result)) {
    result.as_json_format = CORJ_EXPECTED_VALUES.as_json_format;
  }
  Object.assign(result, stackDerivedFields(result));
  return result as T;
}

/**
 * Fill in the fields a report omitted as expected values, so every node has
 * `instanceof_error`, `typeof`, `as_json`, `as_string_format` and
 * `as_json_format`, the root has `children_sources`, and `as_string`,
 * `constructor_name` and `message` are parsed back out of the first stack
 * line when they were omitted as well.
 *
 * The result is a complete report, so `v` and `$schema` are relabelled to the
 * `-full` version. `v` and `$schema` themselves are not added when absent,
 * since a missing one means metadata was disabled.
 */
export function restoreExpectedValues<T extends Report>(report: T): T {
  const result = mapReport(report, restoreExpectedValuesOnNode);
  const root = (Array.isArray(result) ? result[0] : result) as
    | CorjReportBase
    | undefined;
  if (root !== undefined && !('children_sources' in root)) {
    root.children_sources = [...CORJ_EXPECTED_VALUES.children_sources];
  }
  return result;
}
