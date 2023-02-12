import { configure as configureJsonStringify } from 'safe-stable-stringify';

// ████████╗██╗   ██╗██████╗ ███████╗███████╗
// ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔════╝
//    ██║    ╚████╔╝ ██████╔╝█████╗  ███████╗
//    ██║     ╚██╔╝  ██╔═══╝ ██╔══╝  ╚════██║
//    ██║      ██║   ██║     ███████╗███████║
//    ╚═╝      ╚═╝   ╚═╝     ╚══════╝╚══════╝

export type CaughtObjectReportJson = {
  /**
   * Result of
   * ```typescript
   * caught instanceof Error
   * ```
   */
  instanceof_error: boolean;
  /**
   * Result of
   * ```typescript
   * typeof caught
   * ```
   */
  typeof: CaughtObjectTypeof;
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
   */
  as_string: string | null;
  /**
   * A JSON object produced from caught object using format at `as_json_format`<br>
   *
   * `null` value means that producing `as_json` property  failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Links
   * - [safe-stable-stringify@2.4.1 on NPM](https://www.npmjs.com/package/safe-stable-stringify)
   */
  as_json: CorjJsonValue<CorjJsonPrimitive>;
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
   */
  children_sources: string[];
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
   * `null` value means that accessing `stack` property on `caught` object failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   *
   * Links
   * - [MDN Error.prototype.stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack)
   */
  stack?: string | null;
  /**
   * A version of report.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['v']}).
   */
  v?: typeof CORJ_VERSION;
  /**
   * Indicates a method used to obtain the value of `as_string`.<br>
   * - "String" means value was obtained with `as_string = String(caught)`.<br>
   *
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['as_string_format']}).
   *
   * Links
   * - [MDN String() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String)
   */
  as_string_format?: CorjAsStringFormat | null;
  /**
   * Indicates a method used to obtain the value of `as_json`.<br>
   * - "safe-stable-stringify@2.4.1" means value was obtained with safe-stable-stringify library.`
   *
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['as_json_format']}).
   */
  as_json_format: CorjAsJsonFormat | null;
  /**
   * Optional link to JSON schema this object conforms to.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['$schema']}).
   */
  $schema?:
    | typeof CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
    | typeof CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK;
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

export type CorjMakerOptions = {
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
   *
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
  | typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1
  | typeof CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD;

//  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗ █████╗ ███╗   ██╗████████╗███████╗
// ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗████╗  ██║╚══██╔══╝██╔════╝
// ██║     ██║   ██║██╔██╗ ██║███████╗   ██║   ███████║██╔██╗ ██║   ██║   ███████╗
// ██║     ██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║╚██╗██║   ██║   ╚════██║
// ╚██████╗╚██████╔╝██║ ╚████║███████║   ██║   ██║  ██║██║ ╚████║   ██║   ███████║
// ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

export const CORJ_NESTED_OMITTED_REASONS = {
  REACHED_MAX_DEPTH: (maxDepth: number) => `Reached max depth - ${maxDepth}`,
};
export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 =
  'safe-stable-stringify@2.4.1';
export const CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD = '.toCorjAsJson';
export const CORJ_AS_STRING_FORMAT_STRING_COERCION = 'String';
export const CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD = '.toCorjAsString';
export const CORJ_VERSION = 'corj/v0.8';
export const CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK = `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/${CORJ_VERSION}/report-object.json`;
export const CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK = `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/${CORJ_VERSION}/report-array.json`;
export const CORJ_MAKER_DEFAULT_OPTIONS = Object.freeze({
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
  asJsonFormatsToApply: ['.toCorjAsJson', 'safe-stable-stringify@2.4.1'] as [
    CorjAsJsonFormat,
    CorjAsJsonFormat,
  ],
  asStringFormatsToApply: ['.toCorjAsString', 'String'] as [
    CorjAsStringFormat,
    CorjAsStringFormat,
  ],
  maxChildrenLevel: 5,
  childrenSources: ['cause', 'errors'],
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
}

function mergeOptions(
  baseOptions: CorjMakerOptions,
  newOptions: DeepPartialOptions<CorjMakerOptions>,
): CorjMakerOptions {
  const effectiveOptions: CorjMakerOptions =
    newOptions === baseOptions
      ? (newOptions as CorjMakerOptions)
      : {
          ...baseOptions,
          ...(newOptions ?? {}),
          metadataFields:
            typeof newOptions?.metadataFields === 'boolean'
              ? newOptions.metadataFields
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
              : {
                  ...CORJ_MAKER_DEFAULT_OPTIONS.childrenMetadataFields,
                  ...(typeof baseOptions.childrenMetadataFields === 'boolean'
                    ? {}
                    : baseOptions.childrenMetadataFields),
                  ...(newOptions?.childrenMetadataFields ?? {}),
                },
        };
  return effectiveOptions;
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
            const value = r.value.call(caught, { options, caught, nestedCfg });
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
  const res = makeMetadataValue(nestedCfg, options, 'v', CORJ_VERSION);
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
    nestedCfg === null
      ? CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
      : CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
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
  const formats = options.asJsonFormatsToApply;
  for (let i = 0; i < formats.length; ++i) {
    const format = formats[i] as CorjAsJsonFormat;
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
              };
            }
          }
        }
        case CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1: {
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
): string | null | undefined {
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
      return {
        index: index++,
        obj: n.obj,
        path: cur.path + n.path,
        level: thisLevel,
      };
    });
    cur.nestedIds = withIds.map((n) =>
      maker.options.makeReportId({
        caught: n.obj,
        index: n.index,
        path: n.path,
        level: n.level,
      }),
    );
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
          [
            'id',
            maker.options.makeReportId({
              caught,
              index: no.index,
              path: no.path,
              level: no.level,
            }),
          ],
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
  let instanceof_error: CaughtObjectReportJson['instanceof_error'];
  let typeof_prop: CaughtObjectReportJson['typeof'] | undefined;
  let constructor_name: CaughtObjectReportJson['constructor_name'] | undefined;
  let message: CaughtObjectReportJson['message'] | undefined;
  let as_string_format: CaughtObjectReportJson['as_string_format'] | undefined;
  let as_string: CaughtObjectReportJson['as_string'];
  let as_json_format: CaughtObjectReportJson['as_json_format'] | undefined;
  let as_json: CaughtObjectReportJson['as_json'];
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
    typeof_prop = typeof caught;
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
  } catch (caughtNew: unknown) {
    handleCaught(caughtNew, maker.options, {
      reason: 'unknown',
      caughtObjectNestingInfo: nestedCfg,
      caughtWhenProcessingReportKey: null,
    });
  }
  const mainEntries = [
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    ['instanceof_error', instanceof_error],
    ['typeof', typeof_prop],
    ['constructor_name', constructor_name],
    ['message', message],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    ['as_string', as_string],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    ['as_json', as_json],
    ['stack', stack],
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
    return [
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
  }

  makeReportObject(caught: unknown): CaughtObjectReportJson {
    return Object.fromEntries(
      this.makeReportObjectEntries(caught),
    ) as CaughtObjectReportJson;
  }

  makeReportArrayEntries(
    caught: unknown,
  ): CaughtObjectReportJsonNestedEntries[] {
    const effectiveMaker = this.cloneWith({
      childrenMetadataFields: this.options.metadataFields,
    });
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
    return [
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
