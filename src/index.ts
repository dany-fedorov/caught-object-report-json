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
   * A string produced from caught object using format at `_m[1]`<br>
   *
   * `null` value means that producing `as_string` property  failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
   */
  as_string: string | null;
  /**
   * A JSON object produced from caught object using format at `_m[2]`<br>
   *
   * `null` value means that producing `as_json` property  failed.<br>
   * Use `onCaughtMaking` option to access objects thrown when report JSON was being created.
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
   * Optional metadata field, consists of a length 3 tuple.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['addMetadata']}.
   *
   * Element [0]:
   * Indicates a version of a standard for this object.
   * Version produced by this library is {@link CORJ_VERSION}
   *
   * Element [1]:
   * Indicates a method used to obtain the value of `as_string`.<br>
   * - "String" means value was obtained with `as_string = String(caught)`.<br>
   *
   * Element [2]:
   * Indicates a method used to obtain the value of `as_json`.<br>
   * - "safe-stable-stringify@2.4.1" means value was obtained with safe-stable-stringify library.`
   *
   * Links
   * - [MDN String() constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String)
   */
  _m?: [
    typeof CORJ_VERSION,
    typeof CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
    typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
  ];
  /**
   * Optional link to JSON schema this object conforms to - {@link CORJ_JSON_SCHEMA_LINK}.<br>
   * Adding this field is controlled by {@link CorjMakerOptions | CorjMakerOptions['addJsonSchemaLink']}).
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
  format: Required<CaughtObjectReportJson>['_m'][2];
  value: CaughtObjectReportJson['as_json'];
};

export type CaughtObjectAsStringReport = {
  format: Required<CaughtObjectReportJson>['_m'][1];
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

//   /$$$$$$                                  /$$                           /$$
//  /$$__  $$                                | $$                          | $$
// | $$  \__/  /$$$$$$  /$$$$$$$   /$$$$$$$ /$$$$$$    /$$$$$$  /$$$$$$$  /$$$$$$   /$$$$$$$
// | $$       /$$__  $$| $$__  $$ /$$_____/|_  $$_/   |____  $$| $$__  $$|_  $$_/  /$$_____/
// | $$      | $$  \ $$| $$  \ $$|  $$$$$$   | $$      /$$$$$$$| $$  \ $$  | $$   |  $$$$$$
// | $$    $$| $$  | $$| $$  | $$ \____  $$  | $$ /$$ /$$__  $$| $$  | $$  | $$ /$$\____  $$
// |  $$$$$$/|  $$$$$$/| $$  | $$ /$$$$$$$/  |  $$$$/|  $$$$$$$| $$  | $$  |  $$$$//$$$$$$$/
//  \______/  \______/ |__/  |__/|_______/    \___/   \_______/|__/  |__/   \___/ |_______/

export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 =
  'safe-stable-stringify@2.4.1';

export const CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR = 'String';

export const CORJ_VERSION = 'corj/v0.4';

export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.4.json';
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
 * Wrapper for {@link CorjMaker.make | CorjMaker.make} with default options specified in {@link CORJ_MAKER_DEFAULT_OPTIONS_1}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: Partial<CorjMakerOptions>,
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

  static withDefaults(options?: Partial<CorjMakerOptions>): CorjMaker {
    const effectiveOptions = {
      ...CORJ_MAKER_DEFAULT_OPTIONS_1,
      ...(options ?? {}),
    };
    return new CorjMaker(effectiveOptions);
  }
}
