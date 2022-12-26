import { configure } from 'safe-stable-stringify';

export const CORJ_SAFE_STABLE_STRINGIFY_VERSION = 'safe-stable-stringify@2.4.1';
export const CORJ_STRINGIFY_VERSION = 'String';

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
  caught_obj_constructor_name?: string;
  error_message?: string;
  caught_obj_stringified?: CaughtObjectString;
  caught_obj_typeof:
    | 'undefined'
    | 'object'
    | 'boolean'
    | 'number'
    | 'bigint'
    | 'string'
    | 'symbol'
    | 'function';
  is_error_instance: boolean;
  caught_obj_json?: CaughtObjectJson;
  error_stack?: string;
  $schema: string;
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
        caughtDuring: 'caught-object-stringify',
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
        caughtDuring: 'caught-object-json-stringify',
      });
    }
    return {
      value: null,
      format: null,
    };
  }
}

type CorjBuilderOnCaughtBuildingDuring =
  | 'caught-object-json-stringify'
  | 'caught-object-stringify';

export type CorjBuilderOptions = {
  shortSchema: boolean;
  onCaughtBuilding: (
    caught: unknown,
    options: {
      caughtDuring: CorjBuilderOnCaughtBuildingDuring;
    },
  ) => void;
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
        ['caught_obj_constructor_name', errorConstructorName],
        ['error_message', errorMessage],
        ['caught_obj_stringified', errorString],
        ['caught_obj_typeof', errorType],
        ['is_error_instance', isErrorInstance],
        ['caught_obj_json', errorJson],
        ['error_stack', errorStack],
        [
          '$schema',
          this.options.shortSchema
            ? 'v0.1'
            : 'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json',
        ],
      ].filter(([, v]) => v !== undefined),
    );
    return res as CaughtObjectReportJson;
  }
}

export const DEFAULT_CORJ_BUILDER_OPTIONS = {
  shortSchema: true,
  onCaughtBuilding: (caught: unknown) => {
    console.warn(
      'caught-object-report-json: Caught when converting caught object to json',
      caught,
    );
  },
} as CorjBuilderOptions;

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

export const bakeCorj = makeCaughtObjectReportJson;
