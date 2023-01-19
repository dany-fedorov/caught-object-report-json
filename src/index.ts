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
  constructor_name?: string | null;
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
  message?: string | null;
  /**
   * A string produced from caught object using `as_string_format`<br>
   * If code that produces `as_string` throws, `as_string` is set to `null`.
   */
  as_string: string | null;
  /**
   * A JSON object produced from caught object using `as_json.format`<br>
   *
   * If code that produces `as_json` throws, both `as_json` is set to `null`.
   *
   * Links
   * - [safe-stable-stringify@2.4.1 on NPM](https://www.npmjs.com/package/safe-stable-stringify)
   */
  as_json: CorjJsonValue<CorjJsonPrimitive>;
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
  stack?: string | null;
  /**
   * Metadata field.
   *
   * Element 0:
   * Indicates a version of a standard for this object.
   * Version produced by this library is {@link CORJ_VERSION}
   *
   * Element 1:
   * Indicates a method used to obtain the value of `as_string`.<br>
   * - "String" means value was obtained with `as_string = String(caught)`.<br>
   *
   * Element 2:
   * Indicates a method used to obtain the value of `as_json`.<br>
   * - "safe-stable-stringify@2.4.1" means value was obtained with safe-stable-stringify library.`
   *
   * Links
   * - [MDN String() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String)
   */
  _m: [
    typeof CORJ_VERSION,
    typeof CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
    typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
  ];
  /**
   * Optionally include a link to JSON schema this object conforms to - {@link CORJ_JSON_SCHEMA_LINK}.<br>
   * This is controlled by {@link CorjMakerOptions}
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
  format: CaughtObjectReportJson['_m'][2];
  value: CaughtObjectReportJson['as_json'];
};

export type CaughtObjectAsStringReport = {
  format: CaughtObjectReportJson['_m'][1];
  value: CaughtObjectReportJson['as_string'];
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
   * Adds an `_m` property with metadata.
   */
  addMetadata: boolean;
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
export const CORJ_VERSION = 'v0.4';
export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.4.json';
export const CORJ_MAKER_DEFAULT_OPTIONS_1 = Object.freeze({
  addJsonSchemaLink: false,
  addMetadata: true,
  onCaughtMaking: (caught: unknown, { caughtDuring }) => {
    console.warn(
      `caught-object-report-json: Caught when building key "${caughtDuring.key}" for report json.`,
      caught,
    );
  },
}) as CorjMakerOptions;

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
  const corj = new CorjMaker(effectiveOptions);
  return corj.make(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;

/**
 * ------------------
 * ~ Implementation ~
 * ------------------
 */

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
        caughtDuring: {
          key: 'as_string',
        },
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
        caughtDuring: {
          key: 'as_json',
        },
      });
    }
    return {
      format,
      value: null,
    };
  }
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
        caughtDuring: {
          key: 'message',
        },
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
        caughtDuring: {
          key: 'stack',
        },
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

  /**
   * This exists to produce entires in dependable order.
   */
  entries(caught: unknown): CaughtObjectReportJsonEntries {
    let instanceof_error: CaughtObjectReportJson['instanceof_error'];
    let typeof_prop: CaughtObjectReportJson['typeof'] | undefined;
    let constructor_name:
      | CaughtObjectReportJson['constructor_name']
      | undefined;
    let message: CaughtObjectReportJson['message'] | undefined;
    let as_string: CaughtObjectReportJson['as_string'];
    let as_json: CaughtObjectReportJson['as_json'];
    let stack: CaughtObjectReportJson['stack'] | undefined;
    let _m: CaughtObjectReportJson['_m'] | undefined;
    let $schema: CaughtObjectReportJson['$schema'] | undefined;
    try {
      instanceof_error = caught instanceof Error;
      typeof_prop = typeof caught;
      constructor_name = makeProp_constructor_name(caught, this.options);
      message = makeProp_message(caught, this.options);
      const asString = makeProp_as_string(caught, this.options);
      as_string = asString.value;
      const asJson = makeProp_as_json(caught, this.options);
      as_json = asJson.value;
      stack = makeProp_stack(caught, this.options);
      _m = !this.options.addMetadata
        ? undefined
        : [CORJ_VERSION, asString.format, asJson.format];
      $schema = !this.options.addJsonSchemaLink
        ? undefined
        : CORJ_JSON_SCHEMA_LINK;
    } catch (caughtNew: unknown) {
      console.error(
        'caught-object-report-json:',
        'Caught somewhere along the way of producing report.',
        'Resulting report JSON is not going to be complete, but will include all fields produced before error.',
        'Caught:',
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
      ['stack', stack],
      ['_m', _m],
      ['$schema', $schema],
    ].filter(([, v]) => v !== undefined) as CaughtObjectReportJsonEntries;
  }

  make(caught: unknown): CaughtObjectReportJson {
    return Object.fromEntries(this.entries(caught)) as CaughtObjectReportJson;
  }
}
