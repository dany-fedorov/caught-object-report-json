import { configure } from 'safe-stable-stringify';

export const CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 =
  'safe-stable-stringify@2.4.1';
export const CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR = 'String';
export const CORJ_VERSION = 'corj/v0.1';
export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json';

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
  value: CorjJsonValue<CorjJsonPrimitive>;
  format: typeof CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1 | null;
};

export type CaughtObjectAsString = {
  value: string | null;
  format: typeof CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR | null;
};

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
  message_prop?: string;
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
  is_error_instance: boolean;
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
  stack_prop?: string;
  /**
   * Indicates a version of a standard for this object.
   * Version produced by this library is {@link CORJ_VERSION}
   */
  v: typeof CORJ_VERSION;
  /**
   * Optionally include a link to JSON schema this object conforms to - {@link CORJ_JSON_SCHEMA_LINK}.<br>
   * This is controlled by {@link CorjBuilderOptions}
   */
  $schema?: typeof CORJ_JSON_SCHEMA_LINK;
};

const stringify = configure({
  circularValue: '[caught-object-report-json: Circular]',
  deterministic: false,
});

function makeCaughtObjAsStringProp(
  caught: unknown,
  options: CorjBuilderOptions,
): CaughtObjectAsString {
  try {
    return {
      value: String(caught),
      format: CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
    };
  } catch (caught) {
    if (typeof options.onCaughtBuilding === 'function') {
      options.onCaughtBuilding(caught, {
        caughtDuring: 'caught-producing-as_string',
      });
    }
    return {
      value: null,
      format: null,
    };
  }
}

function makeCaughtObjectAsJsonProp(
  caught: unknown,
  options: CorjBuilderOptions,
): CaughtObjectAsJson {
  try {
    const jsonString = stringify(caught);
    if (typeof jsonString !== 'string') {
      const err = new Error(
        `Could not convert caught object to json string using ${CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1}.`,
      );
      (err as any).originalCaught = caught;
      (err as any).originalCaughtStringifyResult = jsonString;
      throw err;
    }
    return {
      value: JSON.parse(jsonString),
      format: CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
    };
  } catch (caught: unknown) {
    if (typeof options.onCaughtBuilding === 'function') {
      options.onCaughtBuilding(caught, {
        caughtDuring: 'caught-producing-as_json',
      });
    }
    return {
      value: null,
      format: null,
    };
  }
}

export type CorjBuilderOnCaughtBuildingCallbackFnOptionsDuring =
  | 'caught-producing-as_json'
  | 'caught-producing-as_string';

export type CorjBuilderOnCaughtBuildingCallbackFnOptions = {
  caughtDuring: CorjBuilderOnCaughtBuildingCallbackFnOptionsDuring;
};

export type CorjBuilderOnCaughtBuildingCallbackFn = (
  caught: unknown,
  options: CorjBuilderOnCaughtBuildingCallbackFnOptions,
) => void;

export type CorjBuilderOptions = {
  /**
   * Adds a `$schema` property to result json with a link to appropriate JSON Schema.
   */
  addJsonSchemaLink: boolean;
  /**
   * This function is called when {@link CorjBuilder.build | CorjBuilder.build} fails to produce `as_json` or `as_string` fields of report json.
   */
  onCaughtBuilding: CorjBuilderOnCaughtBuildingCallbackFn;
};

export class CorjBuilder {
  constructor(public readonly options: CorjBuilderOptions) {}

  build(caught: unknown): CaughtObjectReportJson {
    const caughtObjectTypeof = typeof caught;
    const caughtObjectIsErrorInstance = caught instanceof Error;
    const caughtObjectAsString = makeCaughtObjAsStringProp(
      caught,
      this.options,
    );
    const caughtObjectConstructorName =
      typeof caught?.constructor?.name !== 'string'
        ? undefined
        : caught?.constructor?.name;
    const caughtObjectAsJson = makeCaughtObjectAsJsonProp(caught, this.options);
    const caughtObjectMessageProp =
      typeof (caught as any)?.message !== 'string'
        ? undefined
        : (caught as any)?.message;
    const caughtObjectStackProp =
      typeof (caught as any)?.stack !== 'string'
        ? undefined
        : (caught as any)?.stack;
    const res = Object.fromEntries(
      [
        ['is_error_instance', caughtObjectIsErrorInstance],
        ['typeof', caughtObjectTypeof],
        ['constructor_name', caughtObjectConstructorName],
        ['message_prop', caughtObjectMessageProp],
        ['as_string', caughtObjectAsString],
        ['as_json', caughtObjectAsJson],
        ['stack_prop', caughtObjectStackProp],
        ['v', CORJ_VERSION],
        [
          '$schema',
          !this.options.addJsonSchemaLink ? undefined : CORJ_JSON_SCHEMA_LINK,
        ],
      ].filter(([, v]) => v !== undefined),
    );
    return res as CaughtObjectReportJson;
  }
}
