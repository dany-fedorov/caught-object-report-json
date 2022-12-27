import { configure } from 'safe-stable-stringify';

export const CORJ_SAFE_STABLE_STRINGIFY_VERSION = 'safe-stable-stringify@2.4.1';
export const CORJ_STRINGIFY_VERSION = 'String';
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
  format: typeof CORJ_SAFE_STABLE_STRINGIFY_VERSION | null;
};

export type CaughtObjectAsString = {
  value: string | null;
  format: typeof CORJ_STRINGIFY_VERSION | null;
};

export type CaughtObjectReportJson = {
  constructor_name?: string;
  message_prop?: string;
  as_string: CaughtObjectAsString;
  typeof:
    | 'undefined'
    | 'object'
    | 'boolean'
    | 'number'
    | 'bigint'
    | 'string'
    | 'symbol'
    | 'function';
  is_error_instance: boolean;
  as_json: CaughtObjectAsJson;
  stack_prop?: string;
  v: typeof CORJ_VERSION;
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
      format: CORJ_STRINGIFY_VERSION,
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
      const err = new Error(`Could not convert caught object to json string.`);
      (err as any).caught = caught;
      (err as any).stringifiedResult = jsonString;
      throw err;
    }
    return {
      value: JSON.parse(jsonString),
      format: CORJ_SAFE_STABLE_STRINGIFY_VERSION,
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
    const caughtObjectConstructorName = caught?.constructor?.name;
    const caughtObjectAsJson = makeCaughtObjectAsJsonProp(caught, this.options);
    const caughtObjectMessageProp = (caught as any)?.message;
    const caughtObjectStackProp = (caught as any)?.stack;
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
