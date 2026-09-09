import type {
  CaughtObjectReportJson,
  CaughtObjectReportJsonChild,
  CorjMakerOptions,
} from './index';
import type { JsonSizeUnit } from './json-size';
import { configure } from './safe-stable-stringify';

export const DEFAULT_MAX_REPORT_SIZE = 100_000;
export const DEFAULT_REPORT_SIZE_UNIT: JsonSizeUnit = 'utf8-bytes';

export function resolveReportSizeOptions(
  options: Pick<CorjMakerOptions, 'maxReportSize' | 'reportSizeUnit'>,
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

type Report = CaughtObjectReportJson | CaughtObjectReportJsonChild[];
const contentKeys = [
  'message',
  'stack',
  'constructor_name',
  'as_string',
  'as_json',
  'children_sources',
  'children_omitted_reason',
] as const;
const metadataKeys = [
  '$schema',
  'v',
  'as_json_format',
  'as_string_format',
  'children_sources',
] as const;
const marker = '[caught-object-report-json: Truncated]';

/** Trim report content while keeping report schemas and retained child links valid. */
export function limitReportSize<T extends Report>(
  report: T,
  options: CorjMakerOptions,
): T {
  const { maxReportSize, reportSizeUnit } = resolveReportSizeOptions(options);
  if (maxReportSize === null) return report;

  let overflowed = false;
  const stringifyReport = configure({
    lengthLimit: maxReportSize,
    lengthUnit: reportSizeUnit,
    deterministic: false,
    onTruncate: () => {
      overflowed = true;
    },
  });
  const fits = (value: Report) => {
    overflowed = false;
    stringifyReport(value);
    return !overflowed;
  };
  if (fits(report)) return report;

  const isArray = Array.isArray(report);
  const root = (isArray ? report[0] : report) as CaughtObjectReportJsonChild;
  const children = (
    isArray ? report.slice(1) : root.children ?? []
  ) as CaughtObjectReportJsonChild[];
  const omittedReason = `Reached max report size - ${maxReportSize} ${reportSizeUnit}`;

  function candidate(
    valueLimit: number,
    childCount: number,
    keepMetadata: boolean,
  ): T {
    let fieldTruncated = false;
    const stringifyValue = configure({
      lengthLimit: valueLimit,
      lengthUnit: reportSizeUnit,
      deterministic: false,
      onTruncate: () => {
        fieldTruncated = true;
      },
    });
    const retained = children.slice(0, childCount);
    const retainedIds = new Set(retained.map((child) => child.id));

    function trimNode(
      source: CaughtObjectReportJsonChild,
      hasChildIds: boolean,
    ): CaughtObjectReportJsonChild {
      const result: Partial<CaughtObjectReportJsonChild> = { ...source };
      for (const key of contentKeys) {
        if (source[key] === undefined) continue;
        fieldTruncated = false;
        const json = stringifyValue(source[key]);
        if (fieldTruncated) {
          const value: unknown = JSON.parse(json!);
          if (key === 'children_sources' && !Array.isArray(value)) {
            result.children_sources = [];
          } else if (
            key === 'children_omitted_reason' &&
            typeof value !== 'string'
          ) {
            delete result.children_omitted_reason;
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
      if (hasChildIds && source.children) {
        const ids = source.children as (string | null)[];
        const kept = ids.filter((id) => id === null || retainedIds.has(id));
        result.children = kept as NonNullable<
          CaughtObjectReportJsonChild['children']
        >;
        if (kept.length !== ids.length) {
          result.children_omitted_reason = omittedReason;
          result.truncated = true;
        }
      }
      return result as CaughtObjectReportJsonChild;
    }

    const resultRoot = trimNode(root, isArray);
    const resultChildren = retained.map((child) => trimNode(child, true));
    resultRoot.truncated = true;
    if (childCount < children.length)
      resultRoot.children_omitted_reason = omittedReason;
    if (isArray) return [resultRoot, ...resultChildren] as T;
    if (root.children)
      resultRoot.children = resultChildren as NonNullable<
        CaughtObjectReportJsonChild['children']
      >;
    return resultRoot as unknown as T;
  }

  // Reserve enough content per field to retain a useful diagnostic prefix.
  // If that cannot fit even for the root, use the four-byte null fallback.
  let minimumValueLimit = 64;
  let keepMetadata = true;
  let best = candidate(minimumValueLimit, 0, keepMetadata);
  if (!fits(best)) {
    minimumValueLimit = 4;
    best = candidate(minimumValueLimit, 0, keepMetadata);
  }
  if (!fits(best)) {
    keepMetadata = false;
    best = candidate(minimumValueLimit, 0, keepMetadata);
  }
  if (!fits(best)) {
    // Custom IDs/paths can themselves exceed the entire budget. A minimal
    // root-only report has no references to break and fits the 256-unit floor.
    const minimal = {
      instanceof_error: root.instanceof_error,
      typeof: root.typeof,
      as_string: marker,
      as_json: null,
      truncated: true,
      ...(children.length
        ? { children_omitted_reason: 'Reached max report size' }
        : {}),
    };
    return (
      isArray ? [{ id: 'root', path: '$', level: 0, ...minimal }] : minimal
    ) as T;
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
