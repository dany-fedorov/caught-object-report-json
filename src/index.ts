import { configure } from 'safe-stable-stringify';

export const CORJ_SAFE_STABLE_STRINGIFY_VERSION = 'safe-stable-stringify@2.4.1';
export const CORJ_STRINGIFY_VERSION = 'String';
export const CORJ_VERSION = 'corj/v0.1';
export const CORJ_JSON_SCHEMA_LINK =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json';

export type JsonObject<P extends JsonPrimitive> = { [x: string]: JsonValue<P> };
export type JsonArray<P extends JsonPrimitive> = Array<JsonValue<P>>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue<P extends JsonPrimitive> =
  | P
  | JsonObject<P>
  | JsonArray<P>;

export type CaughtObjectJson = {
  value: JsonValue<JsonPrimitive>;
  format: typeof CORJ_SAFE_STABLE_STRINGIFY_VERSION | null;
};

export type CaughtObjectString = {
  value: string | null;
  format: typeof CORJ_STRINGIFY_VERSION | null;
};

export type CaughtObjectReportJson = {
  constructor_name?: string;
  message_prop?: string;
  as_string: CaughtObjectString;
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
  as_json: CaughtObjectJson;
  stack_prop?: string;
  v: typeof CORJ_VERSION;
  $schema?: typeof CORJ_JSON_SCHEMA_LINK;
};

const stringify = configure({
  circularValue: '[caught-object-report-json: Circular]',
  deterministic: false,
});

function makeErrorString(
  caught: unknown,
  options: CorjBuilderOptions,
): CaughtObjectString {
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

function makeErrorJson(
  caught: unknown,
  options: CorjBuilderOptions,
): CaughtObjectJson {
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

/**
 *
 */
export type CorjBuilderOnCaughtBuildingDuring =
  | 'caught-producing-as_json'
  | 'caught-producing-as_string';

export type CorjBuilderObCaughtBuildingFnOptions = {
  caughtDuring: CorjBuilderOnCaughtBuildingDuring;
};

export type CorjBuilderObCaughtBuildingFn = (
  caught: unknown,
  options: CorjBuilderObCaughtBuildingFnOptions,
) => void;

export type CorjBuilderOptions = {
  /**
   * Adds a `$schema` property to result json with a link to appropriate JSON Schema.
   */
  addJsonSchemaLink: boolean;
  /**
   * This function is called when {@link CorjBuilder.build | CorjBuilder.build} fails to produce `as_json` or `as_string` fields of report json.
   */
  onCaughtBuilding: CorjBuilderObCaughtBuildingFn;
};

export class CorjBuilder {
  constructor(public readonly options: CorjBuilderOptions) {}

  build(caught: unknown): CaughtObjectReportJson {
    const errorType = typeof caught;
    const isErrorInstance = caught instanceof Error;
    const errorString = makeErrorString(caught, this.options);
    const errorConstructorName = caught?.constructor?.name;
    const errorJson = makeErrorJson(caught, this.options);
    const errorMessage = (caught as any)?.message;
    const errorStack = (caught as any)?.stack;
    const res = Object.fromEntries(
      [
        ['is_error_instance', isErrorInstance],
        ['typeof', errorType],
        ['constructor_name', errorConstructorName],
        ['message_prop', errorMessage],
        ['as_string', errorString],
        ['as_json', errorJson],
        ['stack_prop', errorStack],
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

export const DEFAULT_CORJ_BUILDER_OPTIONS = {
  addJsonSchemaLink: false,
  onCaughtBuilding: (caught: unknown) => {
    console.warn(
      'caught-object-report-json: Caught when converting caught object to json',
      caught,
    );
  },
} as CorjBuilderOptions;

/**
 * Wrapper for {@link CorjBuilder.build | CorjBuilder.build} with default options specified in {@link DEFAULT_CORJ_BUILDER_OPTIONS}.
 */
export function makeCaughtObjectReportJson(
  caught: unknown,
  options?: Partial<CorjBuilderOptions>,
): CaughtObjectReportJson {
  const effectiveOptions = {
    ...DEFAULT_CORJ_BUILDER_OPTIONS,
    ...(options ?? {}),
  };
  const builder = new CorjBuilder(effectiveOptions);
  return builder.build(caught);
}

/**
 * Alias for {@link makeCaughtObjectReportJson}.
 */
export const bakeCorj = makeCaughtObjectReportJson;
