// export type CorjOptions = {}

import { _corj_jsonStringifySafe } from './utils';

export const CORJ_SAFE_STABLE_STRINGIFY_VERSION = 'safe-stable-stringify@2.4.1';

export type CaughtObjectJson = {
  value: unknown;
  format: typeof CORJ_SAFE_STABLE_STRINGIFY_VERSION | null;
};

export type CaughtObjectReportJson = {
  caught_obj_constructor_name?: string;
  error_message?: string;
  caught_obj_stringified?: string;
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

function mkErrorJson(caught: unknown): CaughtObjectJson {
  try {
    return {
      value: JSON.parse(_corj_jsonStringifySafe(caught)),
      format: CORJ_SAFE_STABLE_STRINGIFY_VERSION,
    };
  } catch (caught) {
    console.warn(
      'caught-object-report-json: Caught when converting caught object to json',
      caught,
    );
    return {
      value: null,
      format: null,
    };
  }
}

export class CorjBuilder {
  build(caught: unknown): CaughtObjectReportJson {
    const errorType = typeof caught;
    const isErrorInstance = caught instanceof Error;
    const errorString = String(caught);
    const errorConstructorName = caught?.constructor?.name;
    const errorJson = mkErrorJson(caught);
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
          'https://github.com/dany-fedorov/caught-object-report-json/blob/main/json-schema-v0.1.json',
        ],
      ].filter(([, v]) => v !== undefined),
    );
    return res as CaughtObjectReportJson;
  }
}

export function makeCaughtObjectReportJson(
  caught: unknown,
): CaughtObjectReportJson {
  const builder = new CorjBuilder();
  return builder.build(caught);
}

export const bakeCorj = makeCaughtObjectReportJson;
