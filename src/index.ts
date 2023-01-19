import { configure as configureJsonStringify } from 'safe-stable-stringify';

/**
 * ---------
 * ~ Types ~
 * ---------
 */

export type CaughtObjectReportJson = {
  /**
   * Result of
   * ```typescript
   * typeof caught?.constructor?.name !== 'string'
   *    ? undefined
   *    : caught?.constructor?.name;
   * ```
   * Undefined result is not included in result object.
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
  constructor_name?: string;
  /**
   * Result of
   * ```typescript
   * typeof (caught as any)?.message !== 'string'
   *   ? undefined
   *   : (caught as any)?.message;
   * ```
   * Undefined result is not included in result object.
   *
   * Normally JS Error instances include a `message` property with a string.
   *
   * Links
   * - [MDN Error.prototype.message](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/message)
   */
  message?: string;
  /**
   * - `as_string.value`<br>
   *   A string produced from caught object using `as_string.format`<br>
   *
   * - `as_string.format`<br>
   *   Indicates a method used to obtain `as_string.value`.<br>
   *   - "String" means value was obtained with `as_string.value = String(caught)`.<br>
   *
   * If code that produces `as_string` throws, both `as_string.value` and `as_string.format` are set to `null`.
   *
   * Links
   * - [MDN String() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String)
   */
  as_string: CaughtObjectAsString;
  /**
   * Result of
   * ```typescript
   * typeof caught
   * ```
   */
  typeof:
    | 'undefined'
    | 'object'
    | 'boolean'
    | 'number'
    | 'bigint'
    | 'string'
    | 'symbol'
    | 'function';
  /**
   * Result of
   * ```typescript
   * caught instanceof Error
   * ```
   */
  instanceof_error: boolean;
  /**
   * - `as_json.value`<br>
   *   A JSON object produced from caught object using `as_json.format`<br>
   *
   * - `as_string.format`<br>
   *   Indicates a method used to obtain `as_json.value`.<br>
   *   - "safe-stable-stringify@2.4.1" means value was obtained with safe-stable-stringify library.`<br>
   *
   * If code that produces `as_json` throws, both `as_json.value` and `as_json.format` are set to `null`.
   *
   * Links
   * - [safe-stable-stringify@2.4.1 on NPM](https://www.npmjs.com/package/safe-stable-stringify)
   */
  as_json: CaughtObjectAsJson;
  /**
   * Result of
   * ```typescript
   * typeof (caught as any)?.stack !== 'string'
   *   ? undefined
   *   : (caught as any)?.stack;
   * ```
   * Undefined result is not included in result object.
   *
   * Normally JS Error instances include a `stack` property with a string,
   * although the property is non-standard.
   *
   * Links
   * - [MDN Error.prototype.stack](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Stack)
   */
  stack?: string;
  /**
   * Indicates a version of a standard for this object.
   * Version produced by this library is {@link CORJ_VERSION}
   */
  v: typeof CORJ_VERSION;
  /**
   * Optionally include a link to JSON schema this object conforms to - {@link CORJ_JSON_SCHEMA_LINK}.<br>
   * This is controlled by {@link CorjMakerOptions}
   */
  $schema?: typeof CORJ_JSON_SCHEMA_LINK;
};

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

export type CaughtObjectAsJson = {
  format: typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 | null;
  value: CorjJsonValue<CorjJsonPrimitive>;
};

export type CaughtObjectAsString = {
  format: typeof CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR | null;
  value: string | null;
};

export type CorjMakerOnCaughtBuildingCallbackFnOptionsDuring = {
  key: keyof CaughtObjectReportJson;
};

export type CorjMakerOnCaughtBuildingCallbackFnOptions = {
  caughtDuring: CorjMakerOnCaughtBuildingCallbackFnOptionsDuring;
};

export type CorjMakerOnCaughtBuildingCallbackFn = (
  caught: unknown,
  options: CorjMakerOnCaughtBuildingCallbackFnOptions,
) => void;

export type CorjMakerOptions = {
  /**
   * Adds a `$schema` property to result json with a link to appropriate JSON Schema.
   */
  addJsonSchemaLink: boolean;
  /**
   * This function is called when {@link CorjMaker.make | CorjMaker.make} fails to produce `as_json` or `as_string` fields of report json.
   */
  onCaughtMaking: CorjMakerOnCaughtBuildingCallbackFn;
};

/**
 * -------------
 * ~ Constants ~
 * -------------
 */

export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 =
  'safe-stable-stringify@2.4.1';
export const CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR = 'String';
export const CORJ_VERSION = 'corj/v0.4';
export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.3.json';
export const CORJ_MAKER_DEFAULT_OPTIONS_1 = {
  addJsonSchemaLink: false,
  onCaughtMaking: (caught: unknown, { caughtDuring }) => {
    console.warn(
      `caught-object-report-json: Caught when building key "${caughtDuring.key}" for report json.`,
      caught,
    );
  },
} as CorjMakerOptions;

/**
 * ------------------
 * ~ Implementation ~
 * ------------------
 */

const jsonStringify = configureJsonStringify({
  circularValue: '[caught-object-report-json: Circular]',
  deterministic: false,
});

function makeCaughtObjectProp_as_string(
  caught: unknown,
  options: CorjMakerOptions,
): CaughtObjectAsString {
  try {
    return {
      format: CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
      value: String(caught),
    };
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        caughtDuring: {
          key: 'as_string',
        },
      });
    }
    return {
      format: null,
      value: null,
    };
  }
}

function makeCaughtObjectProp_as_json(
  caught: unknown,
  options: CorjMakerOptions,
): CaughtObjectAsJson {
  try {
    const jsonString = jsonStringify(caught);
    if (typeof jsonString !== 'string') {
      const err = new Error(
        `Could not convert caught object to json string using ${CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1}.`,
      );
      (err as any).originalCaught = caught;
      (err as any).originalCaughtStringifyResult = jsonString;
      throw err;
    }
    return {
      format: CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
      value: JSON.parse(jsonString),
    };
  } catch (caughtNew: unknown) {
    if (typeof options.onCaughtMaking === 'function') {
      options.onCaughtMaking(caughtNew, {
        caughtDuring: {
          key: 'as_json',
        },
      });
    }
    return {
      format: null,
      value: null,
    };
  }
}

function makeCaughtObjectProp_message(
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
        caughtDuring: {
          key: 'message',
        },
      });
    }
    return null;
  }
}

function makeCaughtObjectProp_stack(
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
        caughtDuring: {
          key: 'stack',
        },
      });
    }
    return null;
  }
}

function makeCaughtObjectProp_constructor_name(
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
        caughtDuring: {
          key: 'constructor_name',
        },
      });
    }
    return null;
  }
}

export class CorjMaker {
  constructor(public readonly options: CorjMakerOptions) {}

  make(caught: unknown): CaughtObjectReportJson {
    const typeof_prop = typeof caught;
    const instanceof_error_prop = caught instanceof Error;
    const as_string_prop = makeCaughtObjectProp_as_string(caught, this.options);
    const constructor_name_prop = makeCaughtObjectProp_constructor_name(
      caught,
      this.options,
    );
    const as_json_prop = makeCaughtObjectProp_as_json(caught, this.options);
    const message_prop = makeCaughtObjectProp_message(caught, this.options);
    const stack_prop = makeCaughtObjectProp_stack(caught, this.options);
    const report = Object.fromEntries(
      [
        ['instanceof_error', instanceof_error_prop],
        ['typeof', typeof_prop],
        ['constructor_name', constructor_name_prop],
        ['message', message_prop],
        ['as_string', as_string_prop],
        ['as_json', as_json_prop],
        ['stack', stack_prop],
        ['v', CORJ_VERSION],
        [
          '$schema',
          !this.options.addJsonSchemaLink ? undefined : CORJ_JSON_SCHEMA_LINK,
        ],
      ].filter(([, v]) => v !== undefined),
    );
    return report as CaughtObjectReportJson;
  }
}

/**
 * ------------
 * ~ Wrappers ~
 * ------------
 */

/**
 * Wrapper for {@link CorjMaker.make | CorjMaker.make} with default options specified in {@link CORJ_MAKER_DEFAULT_OPTIONS_1}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: Partial<CorjMakerOptions>,
): CaughtObjectReportJson {
  const effectiveOptions = {
    ...CORJ_MAKER_DEFAULT_OPTIONS_1,
    ...(options ?? {}),
  };
  const builder = new CorjMaker(effectiveOptions);
  return builder.make(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;
