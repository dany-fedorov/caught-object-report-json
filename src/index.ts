import { configure as configureJsonStringify } from './safe-stable-stringify';
import type { JsonSizeUnit as CorjReportSizeUnit } from './json-size';
import {
  DEFAULT_MAX_REPORT_SIZE,
  DEFAULT_REPORT_SIZE_UNIT,
  limitReportSize,
  makeMinimalReport,
  maxReportSizeOmittedReason,
  resolveReportSizeOptions,
} from './report-size';
import {
  CORJ_EXPECTED_VALUES,
  markFullVersion,
  omitExpectedValues,
} from './expected-values';
import {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
} from './version';
import type { CorjSchemaLink, CorjVersion } from './version';

export { CORJ_EXPECTED_VALUES, restoreExpectedValues } from './expected-values';
export {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
};
export type { CorjSchemaLink, CorjVersion };

// ████████╗██╗   ██╗██████╗ ███████╗███████╗
// ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔════╝
//    ██║    ╚████╔╝ ██████╔╝█████╗  ███████╗
//    ██║     ╚██╔╝  ██╔═══╝ ██╔══╝  ╚════██║
//    ██║      ██║   ██║     ███████╗███████║
//    ╚═╝      ╚═╝   ╚═╝     ╚══════╝╚══════╝

/**
 * Report object.
 *
 * Fields holding their expected value (see {@link CORJ_EXPECTED_VALUES}) are omitted
 * when {@link CorjMakerOptions.omitExpectedValues} is enabled, which is the default.
 * A missing `instanceof_error`, `typeof`, `as_json` or `as_string` therefore means
 * the expected value, not a failure; failures are reported as `null`.
 * Use {@link restoreExpectedValues} to fill them back in.
 */
export type CaughtObjectReportJson = {
  /** Present when content or child reports were omitted to meet the size limit.
   * When true, nullable content fields may also be null because their size budget was exhausted.
   */
  truncated?: true;
  /**
   * Result of
   * ```typescript
   * caught instanceof Error
   * ```
   * Omitted when `true` if `omitExpectedValues` is enabled (default).
   */
  instanceof_error?: boolean;
  /**
   * Result of
   * ```typescript
   * typeof caught
   * ```
   * Omitted when `"object"` if `omitExpectedValues` is enabled (default).
   */
  typeof?: CaughtObjectTypeof;
  /**
   * Result of
   * ```typescript
   * typeof caught?.constructor?.name !== 'string'
   *    ? undefined
   *    : caught?.constructor?.name;
   * ```
   * `undefined` result is not included in result object.
   *
   * `null` value means that accessing `constructor.name` on `caught` object failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Links
   * - [MDN on .constructor field on an instance](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/constructor)
   * - [MDN on .name field on a class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#telling_the_constructor_name_of_an_object)
   *
   * For example
   * ```typescript
   * try { asdf.sdf } catch (caught) { console.log(caught.constructor.name) }
   * ```
   * will print "TypeError".
   */
  constructor_name?: string | null;
  /**
   * Result of
   * ```typescript
   * typeof (caught as any)?.message !== 'string'
   *   ? undefined
   *   : (caught as any)?.message;
   * ```
   * `undefined` result is not included in result object.
   *
   * Normally JS Error instances include a `message` property with a string.
   *
   * `null` value means that accessing `message` property on `caught` object failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Links
   * - [MDN Error.prototype.message](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message)
   */
  message?: string | null;
  /**
   * A string produced from caught object using format at `as_string_format`<br>
   *
   * `null` value means that producing `as_string` property  failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Omitted when it equals the first line of `stack` if `omitExpectedValues` is enabled (default).
   * This is the case for regular `Error` instances in V8, where `stack` starts with `Error.prototype.toString()` output.
   */
  as_string?: string | null;
  /**
   * A JSON object produced from caught object using format at `as_json_format`<br>
   *
   * `null` value means that producing `as_json` property  failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Shares the whole report's {@link CorjMakerOptions.maxReportSize} budget with all other fields and children.
   * Oversized values retain a prefix with a `[caught-object-report-json: Truncated]` marker.
   * This also applies to values returned by `.toCorjAsJson()`.
   *
   * Omitted when it is `{}` if `omitExpectedValues` is enabled (default).
   * Regular `Error` instances have no enumerable own properties and serialize to `{}`.
   */
  as_json?: CorjJsonValue<CorjJsonPrimitive>;
  /**
   * A flattened representation of tree of nested error objects, collected from properties listed in `children_sources`.
   */
  children?: (CaughtObjectReportJsonChild | null)[];
  /**
   * Is set if this `caught` object has fields reported in `children_sources`, but they were omitted by implementation.
   */
  children_omitted_reason?: string;
  /**
   * Array of property names of caught object to collect into `children` property.
   *
   * Content of this field corresponds to a setting {@link CorjMakerOptions | CorjMakerOptions['childrenSources']}.
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['children_sources']}.
   * Omitted when it equals the default `["cause", "errors"]` if `omitExpectedValues` is enabled (default).
   */
  children_sources?: string[];
  /**
   * Result of
   * ```typescript
   * typeof (caught as any)?.stack !== 'string'
   *   ? undefined
   *   : (caught as any)?.stack;
   * ```
   * `undefined` result is not included in result object.
   *
   * Normally JS Error instances include a `stack` property with a string,
   * although the property is non-standard.
   *
   * By default ({@link CorjMakerOptions.parseStackToArray} is `true`) the string is
   * stored as `stack.split('\n')`: one element per line, split on `\n` only, so
   * a `\r` before the newline stays on its line and a trailing newline yields a
   * trailing empty string. Set `parseStackToArray: false` to keep the raw string.
   *
   * `null` value means that accessing `stack` property on `caught` object failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Links
   * - [MDN Error.prototype.stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack)
   */
  stack?: string | string[] | null;
  /**
   * A version of report: {@link CORJ_VERSION} for reports that omit expected values (default),
   * {@link CORJ_VERSION_FULL} for complete reports (`omitExpectedValues: false` or {@link restoreExpectedValues}).<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['v']}).
   */
  v?: CorjVersion;
  /**
   * Indicates a method used to obtain the value of `as_string`.<br>
   * - "String" means value was obtained with `as_string = String(caught)`.<br>
   *
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['as_string_format']}).
   * Omitted when it is `"String"` if `omitExpectedValues` is enabled (default).
   *
   * Links
   * - [MDN String() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String)
   */
  as_string_format?: CorjAsStringFormat | null;
  /**
   * Indicates a method used to obtain the value of `as_json`.<br>
   * - "safe-stable-stringify-with-length-limit" uses the bundled safe-stable-stringify
   *   serializer with the configured report size limit.
   *
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['as_json_format']}).
   * Omitted when it is `"safe-stable-stringify-with-length-limit"` if `omitExpectedValues` is enabled (default).
   */
  as_json_format?: CorjAsJsonFormat | null;
  /**
   * Optional link to JSON schema this object conforms to. Points to the `-full` schema when
   * `omitExpectedValues` is disabled.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['$schema']}).
   */
  $schema?: CorjSchemaLink;
};

export type CaughtObjectReportJsonChild = CaughtObjectReportJson & {
  id: string;
  path: string;
  level: number;
  children?: (string | null)[];
  children_omitted_reason?: string;
};

export type CaughtObjectTypeof =
  | 'undefined'
  | 'object'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  | 'function';

export type CaughtObjectReportJsonNestedEntries = [
  keyof CaughtObjectReportJsonChild,
  CaughtObjectReportJsonChild[keyof CaughtObjectReportJsonChild],
][];

export type CaughtObjectReportJsonEntries = [
  keyof CaughtObjectReportJson,
  CaughtObjectReportJson[keyof CaughtObjectReportJson],
][];

export type CorjJsonObject<P extends CorjJsonPrimitive> = {
  [x: string]: CorjJsonValue<P>;
};

export type CorjJsonArray<P extends CorjJsonPrimitive> = Array<
  CorjJsonValue<P>
>;

export type CorjJsonPrimitive = string | number | boolean | null;

export type CorjJsonValue<P extends CorjJsonPrimitive> =
  | P
  | CorjJsonObject<P>
  | CorjJsonArray<P>;

export type CaughtObjectAsJsonReport = {
  format: Required<CaughtObjectReportJson>['as_json_format'];
  value: CaughtObjectReportJson['as_json'];
  truncated?: true;
};

export type CaughtObjectAsStringReport = {
  format: Required<CaughtObjectReportJson>['as_string_format'];
  value: CaughtObjectReportJson['as_string'];
};

export type CorjMakerOnCaughtMakingReason =
  | 'prop-access'
  | 'error-converting-caught-to-string'
  | 'error-converting-caught-to-json'
  | 'unknown';

export type CorjMakerOnCaughtMakingContext = {
  reason: CorjMakerOnCaughtMakingReason;
  propAccessHostName?: string;
  propAccessPropName?: string;
  caughtWhenProcessingReportKey: keyof CaughtObjectReportJson | null;
  //   host: string | null;
  // key: keyof CaughtObjectReportJson | null;
  caughtObjectNestingInfo: NestedCfg | null;
};

export type CorjMakerOnCaughtMakingCallbackFn = (
  caughtNew: unknown,
  options: CorjMakerOnCaughtMakingContext,
) => void;

type CorjMakerOptionsMetadataFieldsConfig = {
  $schema: boolean;
  v: boolean;
  as_string_format: boolean;
  as_json_format: boolean;
  children_sources: boolean;
};

export type { CorjReportSizeUnit };

export type CorjMakerOptions = {
  /** Maximum size of compact JSON for the complete report (or report array), including all fields and children.
   * Defaults to 100,000. Must be a safe integer >= 256; null disables the limit.
   */
  maxReportSize?: number | null;
  /** Measurement for maxReportSize. Defaults to UTF-8 bytes; UTF-16 code units count JavaScript string characters. */
  reportSizeUnit?: CorjReportSizeUnit;
  /**
   * Leave out fields that hold their expected value to keep reports small. Defaults to `true`.
   *
   * | Field | Omitted when |
   * | --- | --- |
   * | `instanceof_error` | `true` |
   * | `typeof` | `"object"` |
   * | `as_json` | `{}` |
   * | `as_string` | equal to the first line of `stack` |
   * | `as_string_format` | `"String"` |
   * | `as_json_format` | `"safe-stable-stringify-with-length-limit"` |
   * | `children_sources` | `["cause", "errors"]` |
   *
   * Applies to the root report and to every child report. A reader must treat a missing
   * field as the expected value; `null` still marks a failure. See {@link CORJ_EXPECTED_VALUES}
   * and {@link restoreExpectedValues}.
   */
  omitExpectedValues: boolean;
  /**
   * Controls adding metadata fields to report.
   */
  metadataFields: boolean | CorjMakerOptionsMetadataFieldsConfig;
  childrenMetadataFields: boolean | CorjMakerOptionsMetadataFieldsConfig;
  /**
   *
   */
  asJsonFormatsToApply: [CorjAsJsonFormat, ...CorjAsJsonFormat[]];
  asStringFormatsToApply: [CorjAsStringFormat, ...CorjAsStringFormat[]];
  /**
   * Controls how much levels of nested errors will be included.
   * For example
   * - 1 means `caught.cause` is included, but `caught.cause.cause` is not.
   * - 2 means `caught.cause.cause` is included, but `caught.cause.cause.cause` is not.
   */
  maxChildrenLevel: number;
  /**
   * Fields to use as children.
   */
  childrenSources: string[];
  /**
   * Called once per discovered child report, and once for the root of an array report.
   * The returned ID is reused in references to that report.
   */
  makeReportId: (context: {
    index: number;
    level: number;
    path: string;
    caught: unknown;
  }) => string;
  /**
   * This function is called when {@link CorjMaker.makeReportObject | CorjMaker.makeReportObject} fails to produce along the way of producing a report.
   */
  onCaughtMaking: CorjMakerOnCaughtMakingCallbackFn | null;
  /**
   * Print warning when `onCaughtMaking` is not set, or when `onCaughtMaking` itself threw an error.
   */
  printWarningsOnUnhandledErrors: boolean;
  /**
   * Store `stack` as `stack.split('\n')` instead of a single string. Defaults to `true`.
   *
   * Only applies when `caught.stack` is a string; a non-string `stack` is not reported.
   * Splitting is literal: no trimming, `\r` is kept, empty lines are kept, an empty
   * stack becomes `[""]`.
   */
  parseStackToArray: boolean;
};

type DeepPartialOptions<T> = T extends object
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    T extends Function
    ? T
    : T extends unknown[]
    ? T
    : {
        [P in keyof T]?: DeepPartialOptions<T[P]>;
      }
  : T;

type NestedCfg = {
  path: string;
  level: number;
  index: number;
};

export type CorjAsStringFormat =
  | typeof CORJ_AS_STRING_FORMAT_STRING_COERCION
  | typeof CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD;

export type CorjAsJsonFormat =
  | typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT
  | typeof CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD;

//  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗ █████╗ ███╗   ██╗████████╗███████╗
// ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗████╗  ██║╚══██╔══╝██╔════╝
// ██║     ██║   ██║██╔██╗ ██║███████╗   ██║   ███████║██╔██╗ ██║   ██║   ███████╗
// ██║     ██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║╚██╗██║   ██║   ╚════██║
// ╚██████╗╚██████╔╝██║ ╚████║███████║   ██║   ██║  ██║██║ ╚████║   ██║   ███████║
// ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export const CORJ_NESTED_OMITTED_REASONS = {
  REACHED_MAX_DEPTH: (maxDepth: number) => `Reached max depth - ${maxDepth}`,
  REACHED_MAX_REPORT_SIZE: maxReportSizeOmittedReason,
};
export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT =
  'safe-stable-stringify-with-length-limit';
export const CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD = '.toCorjAsJson';
export const CORJ_AS_STRING_FORMAT_STRING_COERCION = 'String';
export const CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD = '.toCorjAsString';
export const CORJ_MAKER_DEFAULT_OPTIONS = Object.freeze({
  maxReportSize: DEFAULT_MAX_REPORT_SIZE,
  reportSizeUnit: DEFAULT_REPORT_SIZE_UNIT,
  omitExpectedValues: true,
  metadataFields: {
    $schema: false,
    as_json_format: true,
    children_sources: true,
    as_string_format: true,
    v: true,
  },
  childrenMetadataFields: {
    $schema: false,
    as_json_format: false,
    children_sources: false,
    as_string_format: false,
    v: false,
  },
  asJsonFormatsToApply: [
    '.toCorjAsJson',
    'safe-stable-stringify-with-length-limit',
  ] as [CorjAsJsonFormat, CorjAsJsonFormat],
  asStringFormatsToApply: ['.toCorjAsString', 'String'] as [
    CorjAsStringFormat,
    CorjAsStringFormat,
  ],
  maxChildrenLevel: 5,
  childrenSources: [...CORJ_EXPECTED_VALUES.children_sources],
  makeReportId: ({ index }) => (index === -1 ? 'root' : String(index)),
  onCaughtMaking: (
    caught: unknown,
    {
      reason,
      propAccessHostName,
      propAccessPropName,
      caughtWhenProcessingReportKey,
      caughtObjectNestingInfo,
    },
  ) => {
    const message = [
      `Reason - ${reason}`,
      `Caught Object - ${caught}`,
      reason !== 'prop-access' || typeof propAccessHostName !== 'string'
        ? null
        : `Prop Host - ${propAccessHostName}`,
      reason !== 'prop-access' || typeof propAccessPropName !== 'string'
        ? null
        : `Prop Name - ${propAccessPropName}`,
      !caughtWhenProcessingReportKey
        ? null
        : `Caught when processing Report Key - ${caughtWhenProcessingReportKey}`,
      !caughtObjectNestingInfo
        ? 'Level - Caught processing toplevel caught object'
        : `Level - Caught processing nested caught object ${jsonStringify(
            caughtObjectNestingInfo,
          )}`,
    ]
      .filter(Boolean)
      .map((l) => `[caught-object-report-json] [Default Error Handler] ${l}`)
      .join('\n');
    console.warn(message);
  },
  printWarningsOnUnhandledErrors: true,
  parseStackToArray: true,
}) satisfies CorjMakerOptions;

// ██╗  ██╗███████╗██╗     ██████╗ ███████╗██████╗ ███████╗
// ██║  ██║██╔════╝██║     ██╔══██╗██╔════╝██╔══██╗██╔════╝
// ███████║█████╗  ██║     ██████╔╝█████╗  ██████╔╝███████╗
// ██╔══██║██╔══╝  ██║     ██╔═══╝ ██╔══╝  ██╔══██╗╚════██║
// ██║  ██║███████╗███████╗██║     ███████╗██║  ██║███████║
// ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝

const jsonStringify = configureJsonStringify({
  circularValue: '[caught-object-report-json: Circular]',
  deterministic: false,
  lengthLimit: 100_000,
});

function handleCaught(
  caughtNew: unknown,
  options: CorjMakerOptions,
  context: CorjMakerOnCaughtMakingContext,
) {
  if (typeof options.onCaughtMaking === 'function') {
    try {
      options.onCaughtMaking(caughtNew, context);
    } catch (caughtNew2: unknown) {
      if (options.printWarningsOnUnhandledErrors) {
        console.warn(
          '[caught-object-report-json] `onCaughtMaking` callback threw!',
        );
      }
    }
  } else {
    if (options.printWarningsOnUnhandledErrors) {
      console.warn(
        '[caught-object-report-json] Muffling error because `onCaughtMaking` is not set.',
      );
    }
  }
}

function finishReport<
  T extends CaughtObjectReportJson | CaughtObjectReportJsonChild[],
>(report: T, options: CorjMakerOptions): T {
  try {
    // Omit before limiting so the size budget is spent on real content, and
    // again after: the limiter re-materializes `as_string` while trimming
    // `stack`, and omission only shrinks a report that already fits.
    return applyOmitExpectedValues(
      limitReportSize(applyOmitExpectedValues(report, options), options),
      options,
    );
  } catch (caught: unknown) {
    return reportLimitFailure(report, options, caught);
  }
}

function applyOmitExpectedValues<
  T extends CaughtObjectReportJson | CaughtObjectReportJsonChild[],
>(report: T, options: CorjMakerOptions): T {
  if (options.omitExpectedValues !== true) return report;
  try {
    return omitExpectedValues(report);
  } catch (e) {
    console.error(
      '[caught-object-report-json][Unhandled] Could not omit expected values',
    );
    // The report stays complete, so label it as such.
    return markFullVersion(report);
  }
}

function reportLimitFailure<
  T extends CaughtObjectReportJson | CaughtObjectReportJsonChild[],
>(report: T, options: CorjMakerOptions, caught: unknown): T {
  handleCaught(caught, options, {
    reason: 'unknown',
    caughtObjectNestingInfo: null,
    caughtWhenProcessingReportKey: null,
  });
  return applyOmitExpectedValues(
    makeMinimalReport(report, 'Could not limit report size'),
    options,
  );
}

function screenOptionsForAccessorErrors(
  options: DeepPartialOptions<CorjMakerOptions>,
): DeepPartialOptions<CorjMakerOptions> {
  if (options === CORJ_MAKER_DEFAULT_OPTIONS) {
    return options;
  }
  try {
    options.metadataFields;
    if (typeof options.metadataFields === 'object') {
      options.metadataFields.as_json_format;
      options.metadataFields.as_string_format;
      options.metadataFields.v;
      options.metadataFields.$schema;
    }
    options.childrenMetadataFields;
    if (typeof options.childrenMetadataFields === 'object') {
      options.childrenMetadataFields.as_json_format;
      options.childrenMetadataFields.as_string_format;
      options.childrenMetadataFields.v;
      options.childrenMetadataFields.$schema;
    }
    options.asJsonFormatsToApply;
    options.asJsonFormatsToApply?.forEach((f) => f);
    options.asStringFormatsToApply;
    options.asStringFormatsToApply?.forEach((f) => f);
    options.makeReportId;
    options.printWarningsOnUnhandledErrors;
    options.onCaughtMaking;
    options.maxChildrenLevel;
    options.childrenSources;
    options.childrenSources?.forEach((s) => s);
    options.parseStackToArray;
    options.maxReportSize;
    options.reportSizeUnit;
    options.omitExpectedValues;
    return options;
  } catch (caught: unknown) {
    console.warn(
      '[caught-object-report-json] Accessing one of properties on options object threw an error, falling back to default options',
    );
    return CORJ_MAKER_DEFAULT_OPTIONS;
  }
}

function safeAccessProp(
  caughtObjectNestingInfo: NestedCfg | null,
  reportKey: keyof CaughtObjectReportJson | null,
  options: CorjMakerOptions,
  hostName: string,
  host: unknown,
  propName: string,
): { value?: unknown; caughtDuring: boolean } {
  let caughtDuring = false;
  if (host === undefined || host === null) {
    return { caughtDuring };
  }
  try {
    if (
      ['number', 'string', 'symbol', 'bigint', 'boolean'].includes(typeof host)
    ) {
      const value = (host as any)[propName];
      if (value === undefined) {
        return { caughtDuring };
      }
      return { value, caughtDuring };
    } else {
      if (propName in (host as any)) {
        return { value: (host as any)[propName], caughtDuring };
      } else {
        return { caughtDuring };
      }
    }
  } catch (caughtNew: unknown) {
    caughtDuring = true;
    handleCaught(caughtNew, options, {
      propAccessPropName: propName,
      propAccessHostName: hostName,
      caughtObjectNestingInfo,
      reason: 'prop-access',
      caughtWhenProcessingReportKey: reportKey,
    });
  }
  return { caughtDuring };
}

function getNestedObjectsOfCaught(
  caught: unknown,
  maker: CorjMaker,
): { obj: unknown; path: string }[] {
  if (
    !caught ||
    typeof caught !== 'object' ||
    !('errors' in caught || 'cause' in caught)
  ) {
    return [];
  }
  const nestedObjects: { obj: unknown; path: string }[] = [];
  for (const childrenSourceProp of maker.options.childrenSources) {
    if (!(childrenSourceProp in caught)) {
      continue;
    }
    const source = (caught as any)[childrenSourceProp];
    const sourceArray = Array.isArray(source)
      ? source.map((s, i) => ({
          obj: s,
          path: `.${childrenSourceProp}[${i}]`,
        }))
      : [{ obj: source, path: `.${childrenSourceProp}` }];
    nestedObjects.push(...sourceArray);
  }
  return nestedObjects;
}

function makeMetadataValue<
  K extends
    | keyof CorjMakerOptionsMetadataFieldsConfig
    | keyof Pick<
        CaughtObjectReportJson,
        keyof CorjMakerOptionsMetadataFieldsConfig
      >,
>(
  nestedCfg: NestedCfg | null,
  options: CorjMakerOptions,
  propName: K,
  value: CaughtObjectReportJson[K],
): { value?: CaughtObjectReportJson[K] } {
  try {
    const metadataConfig =
      nestedCfg === null
        ? options.metadataFields
        : options.childrenMetadataFields;
    if (
      metadataConfig === true ||
      (typeof metadataConfig === 'object' && metadataConfig[propName] === true)
    ) {
      return { value };
    }
    return {};
  } catch (e) {
    console.error(
      `[caught-object-report-json][Unhandled] Could not make metadata value - ${propName}`,
    );
    return {};
  }
}

function mergeOptions(
  baseOptions: CorjMakerOptions,
  newOptions: DeepPartialOptions<CorjMakerOptions>,
): CorjMakerOptions {
  try {
    // An explicitly undefined option means "not provided", not "disabled".
    const providedOptions = Object.fromEntries(
      Object.entries(newOptions ?? {}).filter(([, v]) => v !== undefined),
    ) as DeepPartialOptions<CorjMakerOptions>;
    const effectiveOptions: CorjMakerOptions =
      newOptions === baseOptions
        ? (newOptions as CorjMakerOptions)
        : {
            ...baseOptions,
            ...providedOptions,
            ...(newOptions?.maxReportSize === undefined &&
            baseOptions.maxReportSize !== undefined
              ? { maxReportSize: baseOptions.maxReportSize }
              : {}),
            ...(newOptions?.reportSizeUnit === undefined &&
            baseOptions.reportSizeUnit !== undefined
              ? { reportSizeUnit: baseOptions.reportSizeUnit }
              : {}),
            metadataFields:
              typeof newOptions?.metadataFields === 'boolean'
                ? newOptions.metadataFields
                : newOptions?.metadataFields === undefined &&
                  typeof baseOptions.metadataFields === 'boolean'
                ? baseOptions.metadataFields
                : {
                    ...CORJ_MAKER_DEFAULT_OPTIONS.metadataFields,
                    ...(typeof baseOptions.metadataFields === 'boolean'
                      ? {}
                      : baseOptions.metadataFields),
                    ...(newOptions?.metadataFields ?? {}),
                  },
            childrenMetadataFields:
              typeof newOptions?.childrenMetadataFields === 'boolean'
                ? newOptions.childrenMetadataFields
                : newOptions?.childrenMetadataFields === undefined &&
                  typeof baseOptions.childrenMetadataFields === 'boolean'
                ? baseOptions.childrenMetadataFields
                : {
                    ...CORJ_MAKER_DEFAULT_OPTIONS.childrenMetadataFields,
                    ...(typeof baseOptions.childrenMetadataFields === 'boolean'
                      ? {}
                      : baseOptions.childrenMetadataFields),
                    ...(newOptions?.childrenMetadataFields ?? {}),
                  },
          };
    return effectiveOptions;
  } catch (e) {
    console.error(
      `[caught-object-report-json][Unhandled] Could not merge options, falling back to base options`,
    );
    return baseOptions;
  }
}

// ██████╗ ███████╗██████╗  ██████╗ ██████╗ ████████╗    ██████╗ ██████╗  ██████╗ ██████╗ ███████╗    ██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗██████╗ ███████╗
// ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██╔════╝    ██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔══██╗██╔════╝
// ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝   ██║       ██████╔╝██████╔╝██║   ██║██████╔╝███████╗    ██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██████╔╝███████╗
// ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔══██╗   ██║       ██╔═══╝ ██╔══██╗██║   ██║██╔═══╝ ╚════██║    ██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██╔══██╗╚════██║
// ██║  ██║███████╗██║     ╚██████╔╝██║  ██║   ██║       ██║     ██║  ██║╚██████╔╝██║     ███████║    ██████╔╝╚██████╔╝██║███████╗██████╔╝███████╗██║  ██║███████║
// ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝    ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝

function makeProp_as_string(
  caught: unknown,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
): CaughtObjectAsStringReport {
  try {
    const formats = options.asStringFormatsToApply;
    for (let i = 0; i < formats.length; ++i) {
      const format = formats[i] as CorjAsStringFormat;
      try {
        switch (format) {
          case CORJ_AS_STRING_FORMAT_STRING_COERCION:
            return {
              format,
              value: String(caught),
            };
          case CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD: {
            const r = safeAccessProp(
              nestedCfg,
              'as_string',
              options,
              'caught',
              caught,
              'toCorjAsString',
            );
            if (!('value' in r) || typeof r.value !== 'function') {
              if (i < formats.length - 1) {
                continue;
              } else {
                return {
                  format,
                  value: null,
                };
              }
            } else {
              const value = r.value.call(caught, {
                options,
                caught,
                nestedCfg,
              });
              if (typeof value !== 'string') {
                if (i < formats.length - 1) {
                  continue;
                } else {
                  return {
                    format,
                    value: null,
                  };
                }
              }
              return {
                format,
                value,
              };
            }
          }
        }
      } catch (caughtNew: unknown) {
        if (i < formats.length - 1) {
          continue;
        } else {
          handleCaught(caughtNew, options, {
            reason: 'error-converting-caught-to-json',
            caughtObjectNestingInfo: nestedCfg,
            caughtWhenProcessingReportKey: 'as_string',
          });
          return {
            format,
            value: null,
          };
        }
      }
    }
    return {
      format: null,
      value: null,
    };
  } catch (e) {
    console.error(
      `[caught-object-report-json][Unhandled] Could not make as_string`,
    );
    return {
      format: null,
      value: null,
    };
  }
}

function makeProp_as_string_format(
  format: CorjAsStringFormat | null,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
) {
  const res = makeMetadataValue(nestedCfg, options, 'as_string_format', format);
  if ('value' in res) {
    return res.value;
  }
  return undefined;
}

function makeProp_children_sources(
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
) {
  const res = makeMetadataValue(
    nestedCfg,
    options,
    'children_sources',
    options.childrenSources,
  );
  if ('value' in res) {
    return res.value;
  }
  return undefined;
}

function makeProp_as_json_format(
  format: CorjAsJsonFormat | null,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
) {
  const res = makeMetadataValue(nestedCfg, options, 'as_json_format', format);
  if ('value' in res) {
    return res.value;
  }
  return undefined;
}

function makeProp_v(options: CorjMakerOptions, nestedCfg: NestedCfg | null) {
  const res = makeMetadataValue(
    nestedCfg,
    options,
    'v',
    options.omitExpectedValues === true ? CORJ_VERSION : CORJ_VERSION_FULL,
  );
  if ('value' in res) {
    return res.value;
  }
  return undefined;
}

function makeProp_$schema(
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
) {
  const res = makeMetadataValue(
    nestedCfg,
    options,
    '$schema',
    options.omitExpectedValues === true
      ? nestedCfg === null
        ? CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
        : CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK
      : nestedCfg === null
      ? CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK
      : CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  );
  if ('value' in res) {
    return res.value;
  }
  return undefined;
}

function makeProp_as_json(
  caught: unknown,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
): CaughtObjectAsJsonReport {
  const { maxReportSize, reportSizeUnit } = resolveReportSizeOptions(options);
  let truncated = false;
  const jsonStringify = configureJsonStringify({
    circularValue: '[caught-object-report-json: Circular]',
    deterministic: false,
    ...(maxReportSize === null ? {} : { lengthLimit: maxReportSize }),
    lengthUnit: reportSizeUnit,
    onTruncate: () => {
      truncated = true;
    },
  });
  try {
    const formats = options.asJsonFormatsToApply;
    for (let i = 0; i < formats.length; ++i) {
      const format = formats[i] as CorjAsJsonFormat;
      truncated = false;
      try {
        switch (format) {
          case CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD: {
            const r = safeAccessProp(
              nestedCfg,
              'as_string',
              options,
              'caught',
              caught,
              'toCorjAsJson',
            );
            if (!('value' in r) || typeof r.value !== 'function') {
              if (i < formats.length - 1) {
                continue;
              } else {
                return {
                  format,
                  value: null,
                };
              }
            } else {
              const stringValue = jsonStringify(
                r.value.call(caught, { options, caught, nestedCfg }),
              );
              if (typeof stringValue !== 'string') {
                if (i < formats.length - 1) {
                  continue;
                } else {
                  return {
                    format,
                    value: null,
                  };
                }
              } else {
                return {
                  format,
                  value: JSON.parse(stringValue),
                  ...(truncated ? { truncated: true as const } : {}),
                };
              }
            }
          }
          case CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT: {
            const jsonString = jsonStringify(
              caught,
              function (this: object, key: string, value: unknown) {
                if (this === caught && options.childrenSources.includes(key)) {
                  return undefined;
                }
                return value;
              },
            );
            if (typeof jsonString !== 'string') {
              const err = new Error(
                `Could not convert caught object to json string using ${format}.`,
              );
              (err as any).originalCaught = caught;
              (err as any).originalCaughtStringifyResult = jsonString;
              throw err;
            }
            return {
              format,
              value: JSON.parse(jsonString),
              ...(truncated ? { truncated: true as const } : {}),
            };
          }
        }
      } catch (caughtNew: unknown) {
        if (i < formats.length - 1) {
          continue;
        }
        handleCaught(caughtNew, options, {
          reason: 'error-converting-caught-to-json',
          caughtObjectNestingInfo: nestedCfg,
          caughtWhenProcessingReportKey: 'as_json',
        });
        return {
          format,
          value: null,
        };
      }
    }
    return {
      format: null,
      value: null,
    };
  } catch (e) {
    console.error(
      `[caught-object-report-json][Unhandled] Could not make as_json`,
    );
    return {
      format: null,
      value: null,
    };
  }
}

function makeProp_message(
  caught: unknown,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
): string | null | undefined {
  try {
    const safeAccessPropHere = safeAccessProp.bind(
      null,
      nestedCfg,
      'message',
      options,
    );
    const r = safeAccessPropHere('caught', caught, 'message');
    if (r.caughtDuring) {
      return null;
    }
    if (!('value' in r) || typeof r.value !== 'string') {
      return undefined;
    }
    return r.value;
  } catch (caughtNew: unknown) {
    handleCaught(caughtNew, options, {
      reason: 'unknown',
      caughtObjectNestingInfo: nestedCfg,
      caughtWhenProcessingReportKey: 'message',
    });
    return null;
  }
}

function makeProp_stack(
  caught: unknown,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
): string | string[] | null | undefined {
  try {
    const safeAccessPropHere = safeAccessProp.bind(
      null,
      nestedCfg,
      'stack',
      options,
    );
    const r = safeAccessPropHere('caught', caught, 'stack');
    if (r.caughtDuring) {
      return null;
    }
    if (!('value' in r) || typeof r.value !== 'string') {
      return undefined;
    }
    if (options.parseStackToArray) {
      const stackArr = r.value.split('\n');
      return stackArr;
    }
    return r.value;
  } catch (caughtNew: unknown) {
    handleCaught(caughtNew, options, {
      reason: 'unknown',
      caughtObjectNestingInfo: nestedCfg,
      caughtWhenProcessingReportKey: 'stack',
    });
    return null;
  }
}

function makeProp_constructor_name(
  caught: unknown,
  options: CorjMakerOptions,
  nestedCfg: NestedCfg | null,
): string | null | undefined {
  try {
    const safeAccessPropHere = safeAccessProp.bind(
      null,
      nestedCfg,
      'constructor_name',
      options,
    );
    const r = safeAccessPropHere('caught', caught, 'constructor');
    if (r.caughtDuring) {
      return null;
    }
    if (!('value' in r)) {
      return undefined;
    }
    const constructor = r.value;
    const rr = safeAccessPropHere('caught.constructor', constructor, 'name');
    if (rr.caughtDuring) {
      return null;
    }
    if (!('value' in rr) || typeof rr.value !== 'string') {
      return undefined;
    }
    return rr.value;
  } catch (caughtNew: unknown) {
    handleCaught(caughtNew, options, {
      reason: 'unknown',
      caughtWhenProcessingReportKey: 'constructor_name',
      caughtObjectNestingInfo: nestedCfg,
    });
    return null;
  }
}

// ██████╗ ███████╗██████╗  ██████╗ ██████╗ ████████╗    ██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗██████╗ ███████╗
// ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔══██╗██╔════╝
// ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝   ██║       ██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██████╔╝███████╗
// ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔══██╗   ██║       ██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██╔══██╗╚════██║
// ██║  ██║███████╗██║     ╚██████╔╝██║  ██║   ██║       ██████╔╝╚██████╔╝██║███████╗██████╔╝███████╗██║  ██║███████║
// ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝

function makeChildrenEntries(
  maker: CorjMaker,
  caught: unknown,
): {
  omittedReason: string | undefined;
  flatChildrenEntries?: [string, unknown][][];
  rootIds: string[];
} {
  const root = { index: -1, obj: caught, path: '$', level: 0 };
  const stack: { index: number; obj: unknown; path: string; level: number }[] =
    [root];
  const childrenObject = [];
  let index = 0;
  while (stack.length > 0) {
    const cur = stack.pop() as {
      level: number;
      nestedIds: string[];
      omittedReason?: string;
      index: number;
      obj: unknown;
      path: string;
    };
    cur.nestedIds = [];
    const thisLevel = cur.level + 1;
    const nestedObjectsOf = getNestedObjectsOfCaught(cur.obj, maker);
    if (thisLevel > maker.options.maxChildrenLevel) {
      if (nestedObjectsOf.length > 0) {
        cur.omittedReason = CORJ_NESTED_OMITTED_REASONS.REACHED_MAX_DEPTH(
          maker.options.maxChildrenLevel,
        );
      }
      continue;
    }
    const withIds = nestedObjectsOf.map((n) => {
      const child = {
        index: index++,
        obj: n.obj,
        path: cur.path + n.path,
        level: thisLevel,
      };
      return {
        ...child,
        id: maker.options.makeReportId({
          caught: child.obj,
          index: child.index,
          path: child.path,
          level: child.level,
        }),
      };
    });
    cur.nestedIds = withIds.map((n) => n.id);
    childrenObject.push(...withIds);
    stack.push(...withIds);
  }
  if (childrenObject.length === 0) {
    return {
      rootIds: (root as any).nestedIds,
      omittedReason: (root as any).omittedReason,
    };
  }
  return {
    rootIds: (root as any).nestedIds,
    omittedReason: (root as any).omittedReason,
    flatChildrenEntries: childrenObject
      .map((no) => {
        const { mainEntries, metadataEntries } = makeParentObjectSelfEntries(
          maker,
          no.obj,
          {
            level: no.level,
            path: no.path,
            index: no.index,
          },
        );
        return [
          ['id', no.id],
          ['path', no.path],
          ['level', no.level],
          ...mainEntries,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          ['children', no.nestedIds.length > 0 ? no.nestedIds : undefined],
          ['children_omitted_reason', (no as any).omittedReason],
          ...metadataEntries,
        ].filter(([, v]) => v !== undefined) as [string, unknown][];
      })
      .filter(([, v]) => v !== undefined) as [string, unknown][][],
  };
}

function makeParentObjectSelfEntries(
  maker: CorjMaker,
  caught: unknown,
  nestedCfg: NestedCfg | null,
): { mainEntries: [string, unknown][]; metadataEntries: [string, unknown][] } {
  // Preserve required fields even when a proxy throws during instanceof.
  let instanceof_error: CaughtObjectReportJson['instanceof_error'] = false;
  const typeof_prop: CaughtObjectReportJson['typeof'] = typeof caught;
  let constructor_name: CaughtObjectReportJson['constructor_name'] | undefined;
  let message: CaughtObjectReportJson['message'] | undefined;
  let as_string_format: CaughtObjectReportJson['as_string_format'] | undefined;
  let as_string: CaughtObjectReportJson['as_string'] = null;
  let as_json_format: CaughtObjectReportJson['as_json_format'] | undefined;
  let as_json: CaughtObjectReportJson['as_json'] = null;
  let truncated: true | undefined;
  let stack: CaughtObjectReportJson['stack'] | undefined;
  let v: CaughtObjectReportJson['v'] | undefined;
  let $schema: CaughtObjectReportJson['$schema'] | undefined;
  let children_sources: CaughtObjectReportJson['children_sources'] | undefined;
  try {
    // Metadata
    v = makeProp_v(maker.options, nestedCfg);
    $schema = makeProp_$schema(maker.options, nestedCfg);
    children_sources = makeProp_children_sources(maker.options, nestedCfg);

    // Less likely to throw in onCaughtMaking
    instanceof_error = caught instanceof Error;
    constructor_name = makeProp_constructor_name(
      caught,
      maker.options,
      nestedCfg,
    );
    message = makeProp_message(caught, maker.options, nestedCfg);
    stack = makeProp_stack(caught, maker.options, nestedCfg);

    // More likely to throw in onCaughtMaking
    const asString = makeProp_as_string(caught, maker.options, nestedCfg);
    as_string_format = makeProp_as_string_format(
      asString.format,
      maker.options,
      nestedCfg,
    );
    as_string = asString.value;
    const asJson = makeProp_as_json(caught, maker.options, nestedCfg);
    as_json_format = makeProp_as_json_format(
      asJson.format,
      maker.options,
      nestedCfg,
    );
    as_json = asJson.value;
    truncated = asJson.truncated;
  } catch (caughtNew: unknown) {
    handleCaught(caughtNew, maker.options, {
      reason: 'unknown',
      caughtObjectNestingInfo: nestedCfg,
      caughtWhenProcessingReportKey: null,
    });
  }
  const mainEntries = [
    ['as_string', as_string],
    ['as_json', as_json],
    ['truncated', truncated],
    ['stack', stack],
    ['instanceof_error', instanceof_error],
    ['typeof', typeof_prop],
    ['constructor_name', constructor_name],
    ['message', message],
  ].filter(([, v]) => v !== undefined);
  const metadataEntries = [
    ['children_sources', children_sources],
    ['as_string_format', as_string_format],
    ['as_json_format', as_json_format],
    ['v', v],
    ['$schema', $schema],
  ].filter(([, v]) => v !== undefined);
  return {
    mainEntries: mainEntries as [string, unknown][],
    metadataEntries: metadataEntries as [string, unknown][],
  };
}

// ███████╗██╗  ██╗██████╗  ██████╗ ██████╗ ████████╗███████╗
// ██╔════╝╚██╗██╔╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝
// █████╗   ╚███╔╝ ██████╔╝██║   ██║██████╔╝   ██║   ███████╗
// ██╔══╝   ██╔██╗ ██╔═══╝ ██║   ██║██╔══██╗   ██║   ╚════██║
// ███████╗██╔╝ ██╗██║     ╚██████╔╝██║  ██║   ██║   ███████║
// ╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

export class CorjMaker {
  public options: CorjMakerOptions;

  constructor(options: CorjMakerOptions) {
    this.options = screenOptionsForAccessorErrors(options) as CorjMakerOptions;
    resolveReportSizeOptions(this.options);
  }

  /**
   * This exists to produce entries in dependable order.
   */
  makeReportObjectEntries(caught: unknown): CaughtObjectReportJsonEntries {
    const { mainEntries, metadataEntries } = makeParentObjectSelfEntries(
      this,
      caught,
      null,
    );
    const { omittedReason, flatChildrenEntries } = makeChildrenEntries(
      this,
      caught,
    );
    const entries = [
      ...mainEntries,
      ['children_omitted_reason', omittedReason],
      [
        'children',
        !Array.isArray(flatChildrenEntries)
          ? undefined
          : flatChildrenEntries.map((chEntries) =>
              Object.fromEntries(chEntries as [string, unknown][]),
            ),
      ],
      ...metadataEntries,
    ].filter(([, v]) => v !== undefined) as [
      string,
      unknown,
    ][] as CaughtObjectReportJsonEntries;
    const report = Object.fromEntries(entries) as CaughtObjectReportJson;
    // Each child was just constructed with Object.fromEntries above.
    if (report.children?.some((child) => child!.truncated))
      report.truncated = true;
    return Object.entries(
      finishReport(report, this.options),
    ) as CaughtObjectReportJsonEntries;
  }

  makeReportObject(caught: unknown): CaughtObjectReportJson {
    return Object.fromEntries(
      this.makeReportObjectEntries(caught),
    ) as CaughtObjectReportJson;
  }

  makeReportArrayEntries(
    caught: unknown,
  ): CaughtObjectReportJsonNestedEntries[] {
    let effectiveMaker: CorjMaker;
    try {
      effectiveMaker = this.cloneWith({
        childrenMetadataFields: this.options.metadataFields,
      });
    } catch (failure: unknown) {
      const { mainEntries } = makeParentObjectSelfEntries(this, caught, null);
      const root = Object.fromEntries([
        ['id', 'root'],
        ['path', '$'],
        ['level', 0],
        ...mainEntries,
      ]) as CaughtObjectReportJsonChild;
      const fallback = reportLimitFailure([root], this.options, failure);
      return fallback.map((row) =>
        Object.entries(row),
      ) as CaughtObjectReportJsonNestedEntries[];
    }
    const { mainEntries, metadataEntries } = makeParentObjectSelfEntries(
      effectiveMaker,
      caught,
      null,
    );
    const rootId = effectiveMaker.options.makeReportId({
      caught,
      index: -1,
      path: '$',
      level: 0,
    });
    const { rootIds, omittedReason, flatChildrenEntries } = makeChildrenEntries(
      effectiveMaker,
      caught,
    );
    const entries = [
      [
        ['id', rootId],
        ['path', '$'],
        ['level', 0],
        ...mainEntries,
        ['children_omitted_reason', omittedReason],
        ['children', rootIds],
        ...metadataEntries,
      ].filter(([_, v]) => v !== undefined),
      ...(!Array.isArray(flatChildrenEntries) ? [] : flatChildrenEntries),
    ] as CaughtObjectReportJsonNestedEntries[];
    const report = entries.map((row) =>
      Object.fromEntries(row),
    ) as CaughtObjectReportJsonChild[];
    if (report.some((row) => row.truncated)) report[0]!.truncated = true;
    return finishReport(report, this.options).map((row) =>
      Object.entries(row),
    ) as CaughtObjectReportJsonNestedEntries[];
  }

  makeReportArray(caught: unknown): CaughtObjectReportJsonChild[] {
    const arrayEntries = this.makeReportArrayEntries(caught);
    return arrayEntries.map((reportObjectEntries) =>
      Object.fromEntries(
        reportObjectEntries as CaughtObjectReportJsonNestedEntries,
      ),
    ) as unknown as CaughtObjectReportJsonChild[];
  }

  static withDefaults(
    options: DeepPartialOptions<CorjMakerOptions> = CORJ_MAKER_DEFAULT_OPTIONS,
  ): CorjMaker {
    const screenedOptions = screenOptionsForAccessorErrors(options);
    const effectiveOptions: CorjMakerOptions = mergeOptions(
      CORJ_MAKER_DEFAULT_OPTIONS,
      screenedOptions,
    );
    return new CorjMaker(effectiveOptions);
  }

  cloneWith(
    options: DeepPartialOptions<CorjMakerOptions> = CORJ_MAKER_DEFAULT_OPTIONS,
  ): CorjMaker {
    return new CorjMaker(mergeOptions(this.options, options));
  }
}

/**
 * Wrapper for {@link CorjMaker#makeReportObjectReportObject | CorjMaker.makeReportObject} with default options specified in {@link CORJ_MAKER_DEFAULT_OPTIONS}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: DeepPartialOptions<CorjMakerOptions>,
): CaughtObjectReportJson {
  return CorjMaker.withDefaults(options).makeReportObject(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;

/**
 * Wrapper for {@link CorjMaker#makeReportObjectReportObject | CorjMaker.makeReportArray} with default options specified in {@link CORJ_MAKER_DEFAULT_OPTIONS}.
 */
export function makeCaughtObjectReportJsonArray(
  caught: unknown,
  options?: DeepPartialOptions<CorjMakerOptions>,
): CaughtObjectReportJsonChild[] {
  return CorjMaker.withDefaults(options).makeReportArray(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJsonArray}.
 */
export const bakeCorjArray = makeCaughtObjectReportJsonArray;
