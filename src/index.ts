import { configure as configureJsonStringify } from 'safe-stable-stringify';

//  /$$$$$$$$
// |__  $$__/
//    | $$    /$$   /$$  /$$$$$$   /$$$$$$   /$$$$$$$
//    | $$   | $$  | $$ /$$__  $$ /$$__  $$ /$$_____/
//    | $$   | $$  | $$| $$  \ $$| $$$$$$$$|  $$$$$$
//    | $$   | $$  | $$| $$  | $$| $$_____/ \____  $$
//    | $$   |  $$$$$$$| $$$$$$$/|  $$$$$$$ /$$$$$$$/
//    |__/    \____  $$| $$____/  \_______/|_______/
//            /$$  | $$| $$
//           |  $$$$$$/| $$
//            \______/ |__/

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
   * Result of `caught.cause` formatted to report JSON.
   */
  cause?: CaughtObjectReportJson;
  /**
   * Result of `caught.errors` formatted to report JSON.
   */
  errors?: (CaughtObjectReportJson | null)[];
  /**
   * When `caught` object has a `cause` field, but it was not included, this field is set.
   * Reasons provided by this implementation - {@link CORJ_CAUSE_OMITTED_REASONS}
   */
  cause_omitted_reason?: string;
  /**
   * When `caught` object has a `cause` field, but it was not included, this field is set.
   * Reasons provided by this implementation - {@link CORJ_ERRORS_OMITTED_REASONS}
   */
  errors_omitted_reason?: string;
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
  as_string_format?: typeof CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR;
  /**
   * Indicates a method used to obtain the value of `as_json`.<br>
   * - "safe-stable-stringify@2.4.1" means value was obtained with safe-stable-stringify library.`
   *
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['as_json_format']}).
   */
  as_json_format: typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1;
  /**
   * Optional link to JSON schema this object conforms to - {@link CORJ_JSON_SCHEMA_LINK}.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['metadataFields']['$schema']}).
   */
  $schema?: typeof CORJ_JSON_SCHEMA_LINK;
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

export type CorjMakerOnCaughtBuildingCallbackFnOptions = {
  key: keyof CaughtObjectReportJson;
};

export type CorjMakerOnCaughtBuildingCallbackFn = (
  caught: unknown,
  options: CorjMakerOnCaughtBuildingCallbackFnOptions,
) => void;

export type CorjMakerOptions = {
  /**
   * Controls adding metadata fields to report.
   */
  metadataFields:
    | boolean
    | {
        $schema: boolean;
        v: boolean;
        as_string_format: boolean;
        as_json_format: boolean;
      };
  /**
   * Controls how much levels of nested `cause` or `errors` props will be included.
   * - 1 means `caught.cause` is included, but `caught.cause.cause` is not.
   * - 2 means `caught.cause.cause` is included, but `caught.cause.cause.cause` is not.
   */
  maxNestingLevels: number;
  /**
   * This function is called when {@link CorjMaker.make | CorjMaker.make} fails to produce `as_json` or `as_string` fields of report json.
   */
  onCaughtMaking: CorjMakerOnCaughtBuildingCallbackFn;
};
type DeepPartial<T> = T extends object
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    T extends Function
    ? T
    : {
        [P in keyof T]?: DeepPartial<T[P]>;
      }
  : T;
//   /$$$$$$                                  /$$                           /$$
//  /$$__  $$                                | $$                          | $$
// | $$  \__/  /$$$$$$  /$$$$$$$   /$$$$$$$ /$$$$$$    /$$$$$$  /$$$$$$$  /$$$$$$   /$$$$$$$
// | $$       /$$__  $$| $$__  $$ /$$_____/|_  $$_/   |____  $$| $$__  $$|_  $$_/  /$$_____/
// | $$      | $$  \ $$| $$  \ $$|  $$$$$$   | $$      /$$$$$$$| $$  \ $$  | $$   |  $$$$$$
// | $$    $$| $$  | $$| $$  | $$ \____  $$  | $$ /$$ /$$__  $$| $$  | $$  | $$ /$$\____  $$
// |  $$$$$$/|  $$$$$$/| $$  | $$ /$$$$$$$/  |  $$$$/|  $$$$$$$| $$  | $$  |  $$$$//$$$$$$$/
//  \______/  \______/ |__/  |__/|_______/    \___/   \_______/|__/  |__/   \___/ |_______/

export const CORJ_CAUSE_OMITTED_REASONS = {
  RECURSIVE_CALL_FAILED: 'Recursive call failed',
  REACHED_MAX_DEPTH: (maxDepth: number) => `Reached max depth - ${maxDepth}`,
};

export const CORJ_ERRORS_OMITTED_REASONS = {
  REACHED_MAX_DEPTH: (maxDepth: number) => `Reached max depth - ${maxDepth}`,
};

export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 =
  'safe-stable-stringify@2.4.1';

export const CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR = 'String';

export const CORJ_VERSION = 'corj/v0.5';

export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.5.json';

export const CORJ_MAKER_DEFAULT_OPTIONS_1 = Object.freeze({
  metadataFields: {
    $schema: false,
    as_json_format: true,
    as_string_format: true,
    v: true,
  },
  maxNestingLevels: 5,
  onCaughtMaking: (caught: unknown, { key }) => {
    console.warn(
      `caught-object-report-json: Caught when building key "${key}" for report json.`,
      caught,
    );
  },
}) satisfies CorjMakerOptions;

//  /$$      /$$
// | $$  /$ | $$
// | $$ /$$$| $$  /$$$$$$  /$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$   /$$$$$$$
// | $$/$$ $$ $$ /$$__  $$|____  $$ /$$__  $$ /$$__  $$ /$$__  $$ /$$__  $$ /$$_____/
// | $$$$_  $$$$| $$  \__/ /$$$$$$$| $$  \ $$| $$  \ $$| $$$$$$$$| $$  \__/|  $$$$$$
// | $$$/ \  $$$| $$      /$$__  $$| $$  | $$| $$  | $$| $$_____/| $$       \____  $$
// | $$/   \  $$| $$     |  $$$$$$$| $$$$$$$/| $$$$$$$/|  $$$$$$$| $$       /$$$$$$$/
// |__/     \__/|__/      \_______/| $$____/ | $$____/  \_______/|__/      |_______/
//                                 | $$      | $$
//                                 | $$      | $$
//                                 |__/      |__/

/**
 * Wrapper for {@link CorjMaker#make | CorjMaker.make} with default options specified in {@link CORJ_MAKER_DEFAULT_OPTIONS_1}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: DeepPartial<CorjMakerOptions>,
): CaughtObjectReportJson {
  return CorjMaker.withDefaults(options).make(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;

//  /$$$$$$                         /$$                                               /$$                 /$$     /$$
// |_  $$_/                        | $$                                              | $$                | $$    |__/
//   | $$   /$$$$$$/$$$$   /$$$$$$ | $$  /$$$$$$  /$$$$$$/$$$$   /$$$$$$  /$$$$$$$  /$$$$$$    /$$$$$$  /$$$$$$   /$$  /$$$$$$  /$$$$$$$
//   | $$  | $$_  $$_  $$ /$$__  $$| $$ /$$__  $$| $$_  $$_  $$ /$$__  $$| $$__  $$|_  $$_/   |____  $$|_  $$_/  | $$ /$$__  $$| $$__  $$
//   | $$  | $$ \ $$ \ $$| $$  \ $$| $$| $$$$$$$$| $$ \ $$ \ $$| $$$$$$$$| $$  \ $$  | $$      /$$$$$$$  | $$    | $$| $$  \ $$| $$  \ $$
//   | $$  | $$ | $$ | $$| $$  | $$| $$| $$_____/| $$ | $$ | $$| $$_____/| $$  | $$  | $$ /$$ /$$__  $$  | $$ /$$| $$| $$  | $$| $$  | $$
//  /$$$$$$| $$ | $$ | $$| $$$$$$$/| $$|  $$$$$$$| $$ | $$ | $$|  $$$$$$$| $$  | $$  |  $$$$/|  $$$$$$$  |  $$$$/| $$|  $$$$$$/| $$  | $$
// |______/|__/ |__/ |__/| $$____/ |__/ \_______/|__/ |__/ |__/ \_______/|__/  |__/   \___/   \_______/   \___/  |__/ \______/ |__/  |__/
//                       | $$
//                       | $$
//                       |__/

const jsonStringify = configureJsonStringify({
  circularValue: '[caught-object-report-json: Circular]',
  deterministic: false,
});

function makeProp_as_string(
  caught: unknown,
  options: CorjMakerOptions,
): CaughtObjectAsStringReport {
  const format = CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR;
  try {
    return {
      format,
      value: String(caught),
    };
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        key: 'as_string',
      });
    }
    return {
      format,
      value: null,
    };
  }
}

function makeProp_as_json(
  caught: unknown,
  options: CorjMakerOptions,
): CaughtObjectAsJsonReport {
  const format = CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1;
  try {
    const jsonString = jsonStringify(caught);
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
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        key: 'as_json',
      });
    }
    return {
      format,
      value: null,
    };
  }
}

function makeProp_cause(
  caught: unknown,
  maker: CorjMaker,
  level: number,
): {
  cause: undefined | null | CaughtObjectReportJson;
  cause_omitted_reason: string | undefined;
} {
  try {
    if (!caught || typeof caught !== 'object' || !('cause' in caught)) {
      return {
        cause: undefined,
        cause_omitted_reason: undefined,
      };
    }
    if (level > maker.options.maxNestingLevels) {
      return {
        cause: undefined,
        cause_omitted_reason: CORJ_CAUSE_OMITTED_REASONS.REACHED_MAX_DEPTH(
          maker.options.maxNestingLevels,
        ),
      };
    }
    const causeFormatted = Object.fromEntries(
      maker.entriesForLevel(caught.cause, level),
    );
    return {
      cause: causeFormatted as CaughtObjectReportJson,
      cause_omitted_reason: undefined,
    };
  } catch (caughtNew) {
    if (typeof maker.options.onCaughtMaking === 'function') {
      maker.options.onCaughtMaking(caughtNew, {
        key: 'cause',
      });
    }
    return {
      cause: undefined,
      cause_omitted_reason: CORJ_CAUSE_OMITTED_REASONS.RECURSIVE_CALL_FAILED,
    };
  }
}

function makeProp_errors(
  caught: unknown,
  maker: CorjMaker,
  level: number,
): {
  errors: undefined | (CaughtObjectReportJson | null)[];
  errors_omitted_reason: string | undefined;
} {
  if (!caught || typeof caught !== 'object' || !('errors' in caught)) {
    return {
      errors: undefined,
      errors_omitted_reason: undefined,
    };
  }
  if (level > maker.options.maxNestingLevels) {
    return {
      errors: undefined,
      errors_omitted_reason: CORJ_ERRORS_OMITTED_REASONS.REACHED_MAX_DEPTH(
        maker.options.maxNestingLevels,
      ),
    };
  }
  const errorsArray = !Array.isArray(caught.errors)
    ? [caught.errors]
    : caught.errors;
  const errorsReport = [];
  for (const error of errorsArray) {
    try {
      const errorFormatted = Object.fromEntries(
        maker.entriesForLevel(error, level),
      ) as CaughtObjectReportJson;
      errorsReport.push(errorFormatted);
    } catch (caughtNew) {
      if (typeof maker.options.onCaughtMaking === 'function') {
        maker.options.onCaughtMaking(caughtNew, {
          key: 'cause',
        });
      }
      errorsReport.push(null);
    }
  }
  return {
    errors: errorsReport,
    errors_omitted_reason: undefined,
  };
}

function makeProp_message(
  caught: unknown,
  options: CorjMakerOptions,
): string | null | undefined {
  try {
    return typeof (caught as any)?.message !== 'string'
      ? undefined
      : (caught as any).message;
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        key: 'message',
      });
    }
    return null;
  }
}

function makeProp_stack(
  caught: unknown,
  options: CorjMakerOptions,
): string | null | undefined {
  try {
    return typeof (caught as any)?.stack !== 'string'
      ? undefined
      : (caught as any).stack;
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        key: 'stack',
      });
    }
    return null;
  }
}

function makeProp_constructor_name(
  caught: unknown,
  options: CorjMakerOptions,
): string | null | undefined {
  try {
    return typeof caught?.constructor?.name !== 'string'
      ? undefined
      : caught.constructor.name;
  } catch (caught) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caught, {
        key: 'constructor_name',
      });
    }
    return null;
  }
}

export class CorjMaker {
  constructor(public readonly options: CorjMakerOptions) {}

  entriesForLevel(
    caught: unknown,
    level: number,
  ): CaughtObjectReportJsonEntries {
    let instanceof_error: CaughtObjectReportJson['instanceof_error'];
    let typeof_prop: CaughtObjectReportJson['typeof'] | undefined;
    let constructor_name:
      | CaughtObjectReportJson['constructor_name']
      | undefined;
    let message: CaughtObjectReportJson['message'] | undefined;
    let as_string_format:
      | CaughtObjectReportJson['as_string_format']
      | undefined;
    let as_string: CaughtObjectReportJson['as_string'];
    let as_json_format: CaughtObjectReportJson['as_json_format'] | undefined;
    let as_json: CaughtObjectReportJson['as_json'];
    let cause: CaughtObjectReportJson['cause'] | null | undefined;
    let cause_omitted_reason:
      | CaughtObjectReportJson['cause_omitted_reason']
      | undefined;
    let errors: CaughtObjectReportJson['errors'] | undefined;
    let errors_omitted_reason:
      | CaughtObjectReportJson['errors_omitted_reason']
      | undefined;
    let stack: CaughtObjectReportJson['stack'] | undefined;
    let v: CaughtObjectReportJson['v'] | undefined;
    let $schema: CaughtObjectReportJson['$schema'] | undefined;
    try {
      // Less likely to throw in onCaughtMaking
      instanceof_error = caught instanceof Error;
      typeof_prop = typeof caught;
      constructor_name = makeProp_constructor_name(caught, this.options);
      message = makeProp_message(caught, this.options);
      stack = makeProp_stack(caught, this.options);

      // More likely to throw in onCaughtMaking
      const asString = makeProp_as_string(caught, this.options);
      as_string_format =
        !this.options.metadataFields ||
        (typeof this.options.metadataFields === 'object' &&
          !this.options.metadataFields?.as_string_format)
          ? undefined
          : asString.format;
      as_string = asString.value;
      const asJson = makeProp_as_json(caught, this.options);
      as_json_format =
        !this.options.metadataFields ||
        (typeof this.options.metadataFields === 'object' &&
          !this.options.metadataFields?.as_json_format)
          ? undefined
          : asJson.format;
      as_json = asJson.value;
      const causeReport = makeProp_cause(caught, this, level + 1);
      cause = causeReport.cause;
      cause_omitted_reason = causeReport.cause_omitted_reason;
      const errorsReport = makeProp_errors(caught, this, level + 1);
      errors = errorsReport.errors;
      errors_omitted_reason = errorsReport.errors_omitted_reason;

      // Metadata
      v =
        !this.options.metadataFields ||
        (typeof this.options.metadataFields === 'object' &&
          !this.options.metadataFields?.v)
          ? undefined
          : CORJ_VERSION;
      $schema =
        !this.options.metadataFields ||
        (typeof this.options.metadataFields === 'object' &&
          !this.options.metadataFields?.$schema)
          ? undefined
          : CORJ_JSON_SCHEMA_LINK;
    } catch (caughtNew: unknown) {
      console.error(
        'caught-object-report-json:',
        'Caught somewhere along the way of producing report completely unexpectedly!',
        'Resulting report JSON is not going to be complete, but will include all fields produced before error.',
        'Level:',
        level,
        'Caught New:',
        caughtNew,
      );
    }
    return [
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
      ['cause', cause],
      ['cause_omitted_reason', cause_omitted_reason],
      ['errors', errors],
      ['errors_omitted_reason', errors_omitted_reason],
      ['stack', stack],
      ['as_string_format', as_string_format],
      ['as_json_format', as_json_format],
      ['v', v],
      ['$schema', $schema],
    ].filter(([, v]) => v !== undefined) as CaughtObjectReportJsonEntries;
  }

  /**
   * This exists to produce entries in dependable order.
   */
  entries(caught: unknown): CaughtObjectReportJsonEntries {
    return this.entriesForLevel(caught, 0);
  }

  make(caught: unknown): CaughtObjectReportJson {
    return Object.fromEntries(this.entries(caught)) as CaughtObjectReportJson;
  }

  static withDefaults(options?: DeepPartial<CorjMakerOptions>): CorjMaker {
    const effectiveOptions: CorjMakerOptions = {
      ...CORJ_MAKER_DEFAULT_OPTIONS_1,
      ...(options ?? {}),
      metadataFields:
        typeof options?.metadataFields === 'boolean'
          ? options.metadataFields
          : {
              ...CORJ_MAKER_DEFAULT_OPTIONS_1.metadataFields,
              ...(options?.metadataFields ?? {}),
            },
    };
    return new CorjMaker(effectiveOptions);
  }
}
