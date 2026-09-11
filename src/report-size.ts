import type { CorjOptions, CorjReport, CorjReportChild } from './index';
import type { JsonSizeUnit } from './json-size';
import { TRUNCATED_MARKER } from './safe-stable-stringify';
import { stackDerivedFields } from './expected-values';

export const DEFAULT_MAX_REPORT_SIZE = 100_000;
export const DEFAULT_REPORT_SIZE_UNIT: JsonSizeUnit = 'utf8-bytes';

/** Appended to a string, array or object that was cut to fit the report size limit. */
export const CORJ_TRUNCATED_MARKER: string = TRUNCATED_MARKER;
/** Replaces a circular reference inside `as_json`. */
export const CORJ_CIRCULAR_MARKER = '[circular]';

/** A configured serializer with optional per-call limit overrides. */
export type Stringify = (
  value: unknown,
  replacer?: ((this: object, key: string, value: unknown) => unknown) | null,
  perCall?: { lengthLimit?: number; onTruncate?: () => void },
) => string | undefined;

export function resolveReportSizeOptions(
  options: Pick<CorjOptions, 'maxReportSize' | 'reportSizeUnit'>,
) {
  const maxReportSize =
    options.maxReportSize === undefined
      ? DEFAULT_MAX_REPORT_SIZE
      : options.maxReportSize;
  const reportSizeUnit =
    options.reportSizeUnit === undefined
      ? DEFAULT_REPORT_SIZE_UNIT
      : options.reportSizeUnit;
  if (
    maxReportSize !== null &&
    (!Number.isSafeInteger(maxReportSize) || maxReportSize < 256)
  ) {
    throw new RangeError(
      'maxReportSize must be a safe integer >= 256, or null to disable the limit',
    );
  }
  if (
    reportSizeUnit !== 'utf8-bytes' &&
    reportSizeUnit !== 'utf16-code-units'
  ) {
    throw new TypeError(
      'reportSizeUnit must be utf8-bytes or utf16-code-units',
    );
  }
  return { maxReportSize, reportSizeUnit };
}

type Report = CorjReport | CorjReportChild[];
const contentKeys = [
  'message',
  'stack',
  'constructor_name',
  'as_string',
  'as_json',
  'children_sources',
] as const;
const metadataKeys = [
  '$schema',
  'v',
  'as_json_format',
  'as_string_format',
  'children_sources',
] as const;

/** A root-only report that fits the minimum supported budget without serialization. */
export function makeMinimalReport<T extends Report>(report: T): T {
  const isArray = Array.isArray(report);
  const root = (isArray ? report[0] : report) as CorjReport;
  const hasChildren = isArray
    ? report.length > 1
    : (root.children ?? []).length > 0;
  const minimal: CorjReport = {
    truncated: true,
    ...(root.instanceof_error === undefined
      ? {}
      : { instanceof_error: root.instanceof_error }),
    ...(root.typeof === undefined ? {} : { typeof: root.typeof }),
    as_string: CORJ_TRUNCATED_MARKER,
    as_json: null,
    ...(hasChildren ? { children_omitted: 'max_size' as const } : {}),
  };
  return (
    isArray ? [{ id: 'root', path: '$', level: 0, ...minimal }] : minimal
  ) as T;
}

/** Trim report content while keeping report schemas and retained child links valid. */
export function limitReportSize<T extends Report>(
  report: T,
  options: CorjOptions,
  stringify: Stringify,
): T {
  const { maxReportSize } = resolveReportSizeOptions(options);
  if (maxReportSize === null) return report;

  const measure = (
    value: unknown,
    lengthLimit: number,
  ): { json: string | undefined; truncated: boolean } => {
    let truncated = false;
    const json = stringify(value, null, {
      lengthLimit,
      onTruncate: () => {
        truncated = true;
      },
    });
    return { json, truncated };
  };
  const fits = (value: Report) => !measure(value, maxReportSize).truncated;
  if (fits(report)) return report;

  const isArray = Array.isArray(report);
  const root = (isArray ? report[0] : report) as CorjReportChild & CorjReport;
  const children: CorjReportChild[] = isArray
    ? report.slice(1)
    : root.children ?? [];

  function candidate(
    valueLimit: number,
    childCount: number,
    keepMetadata: boolean,
  ): T {
    const retained = children.slice(0, childCount);
    const droppedIds = new Set(
      children.slice(childCount).map((child) => child.id),
    );

    function trimNode(
      node: CorjReportChild,
      hasChildIds: boolean,
    ): CorjReportChild {
      // `as_string`, `constructor_name` and `message` may have been omitted as
      // derivable from the first line of `stack`. Put them back before trimming
      // so a shortened `stack` cannot lose them; the final omission pass removes
      // them again when the line survived intact.
      const source: CorjReportChild = {
        ...node,
        ...stackDerivedFields(node),
      };
      const result: Partial<CorjReportChild> = { ...source };
      for (const key of contentKeys) {
        if (source[key] === undefined) continue;
        const { json, truncated } = measure(source[key], valueLimit);
        if (truncated) {
          const value: unknown = JSON.parse(json!);
          if (key === 'children_sources' && !Array.isArray(value)) {
            result.children_sources = [];
          } else {
            Object.assign(result, { [key]: value });
          }
          result.truncated = true;
        }
      }
      if (!keepMetadata) {
        for (const key of metadataKeys) delete result[key];
        result.truncated = true;
      }
      if (hasChildIds && source.child_ids) {
        const kept = source.child_ids.filter((id) => !droppedIds.has(id));
        if (kept.length === 0) {
          delete result.child_ids;
        } else {
          result.child_ids = kept;
        }
        if (kept.length !== source.child_ids.length) {
          result.children_omitted = 'max_size';
          result.truncated = true;
        }
      }
      return result as CorjReportChild;
    }

    const resultRoot = trimNode(root, isArray) as CorjReportChild & CorjReport;
    const resultChildren = retained.map((child) => trimNode(child, true));
    resultRoot.truncated = true;
    if (childCount < children.length) resultRoot.children_omitted = 'max_size';
    if (isArray) return [resultRoot, ...resultChildren] as T;
    if (root.children) {
      if (resultChildren.length === 0) {
        delete resultRoot.children;
      } else {
        resultRoot.children = resultChildren;
      }
    }
    return resultRoot as unknown as T;
  }

  // Reserve enough content per field to retain a useful diagnostic prefix.
  // Prefer useful content over optional metadata, then use the null fallback.
  let minimumValueLimit = 64;
  let keepMetadata = true;
  let best = candidate(minimumValueLimit, 0, keepMetadata);
  if (!fits(best)) {
    keepMetadata = false;
    best = candidate(minimumValueLimit, 0, keepMetadata);
  }
  if (!fits(best)) {
    minimumValueLimit = 4;
    best = candidate(minimumValueLimit, 0, keepMetadata);
  }
  if (!fits(best)) {
    // Custom IDs/paths can themselves exceed the entire budget. A minimal
    // root-only report has no references to break and fits the 256-unit floor.
    return makeMinimalReport(report);
  }

  // Keep complete child report records; never insert a string into children.
  let childCount = 0;
  let low = 1;
  let high = children.length;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const next = candidate(minimumValueLimit, middle, keepMetadata);
    if (fits(next)) {
      best = next;
      childCount = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  // Share the remaining room across content fields. Every accepted candidate
  // is measured as a complete report, including flags, metadata and links.
  low = minimumValueLimit + 1;
  high = maxReportSize;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const next = candidate(middle, childCount, keepMetadata);
    if (fits(next)) {
      best = next;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}
