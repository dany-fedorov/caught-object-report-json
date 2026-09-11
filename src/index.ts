import { configure as configureStringify } from './safe-stable-stringify';
import type { JsonSizeUnit } from './json-size';
import {
  CORJ_CIRCULAR_MARKER,
  CORJ_TRUNCATED_MARKER,
  DEFAULT_MAX_REPORT_SIZE,
  DEFAULT_REPORT_SIZE_UNIT,
  limitReportSize,
  makeMinimalReport,
  resolveReportSizeOptions,
} from './report-size';
import type { Stringify } from './report-size';
import {
  CORJ_EXPECTED_VALUES,
  markFullVersion,
  omitExpectedValues,
} from './expected-values';
import {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
} from './version';
import type { CorjSchemaLink, CorjVersion } from './version';

export { CORJ_EXPECTED_VALUES, restoreExpectedValues } from './expected-values';
export { CORJ_CIRCULAR_MARKER, CORJ_TRUNCATED_MARKER };
export {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
};
export type { CorjSchemaLink, CorjVersion };

// ████████╗██╗   ██╗██████╗ ███████╗███████╗
// ╚══██╔══╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔════╝
//    ██║    ╚████╔╝ ██████╔╝█████╗  ███████╗
//    ██║     ╚██╔╝  ██╔═══╝ ██╔══╝  ╚════██║
//    ██║      ██║   ██║     ███████╗███████║
//    ╚═╝      ╚═╝   ╚═╝     ╚══════╝╚══════╝

export type CorjTypeof =
  | 'undefined'
  | 'object'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  | 'function';

export type CorjJsonPrimitive = string | number | boolean | null;
export type CorjJsonObject = { [x: string]: CorjJsonValue };
export type CorjJsonArray = CorjJsonValue[];
export type CorjJsonValue = CorjJsonPrimitive | CorjJsonObject | CorjJsonArray;

/** How `as_string` was produced: `String(caught)` or the caught object's own `.toCorjAsString()`. */
export type CorjAsStringFormat = 'String' | '.toCorjAsString';
/** How `as_json` was produced: the bundled length-limited serializer or the caught object's own `.toCorjAsJson()`. */
export type CorjAsJsonFormat =
  | 'safe-stable-stringify-with-length-limit'
  | '.toCorjAsJson';
/** Why child reports of a node are missing: the `maxDepth` limit, the `maxChildren` limit, or the `maxReportSize` limit. */
export type CorjChildrenOmitted = 'max_depth' | 'max_children' | 'max_size';

/**
 * Fields shared by the root report and every child report.
 *
 * With `omitExpectedValues` (the default) a field holding its expected value is
 * left out, see {@link CORJ_EXPECTED_VALUES}: a missing field means the expected
 * value, `null` means producing the value failed. {@link restoreExpectedValues}
 * fills them back in.
 */
export type CorjReportBase = {
  /** Present when content or child reports were cut to meet `maxReportSize`. On a root it covers the whole report. */
  truncated?: true;
  /** `caught instanceof Error`. Omitted when `true`. */
  instanceof_error?: boolean;
  /** `typeof caught`. Omitted when `"object"`. */
  typeof?: CorjTypeof;
  /** `caught.constructor.name` when it is a string; `null` when reading it threw. Omitted together with `as_string` and `message` when the first stack line is `"<constructor_name>: <message>"`. */
  constructor_name?: string | null;
  /** `caught.message` when it is a string; `null` when reading it threw. Omitted as described for `constructor_name`. */
  message?: string | null;
  /** String form of `caught`, see `as_string_format`; `null` when producing it threw. Omitted when it equals the first line of `stack`. */
  as_string?: string | null;
  /** JSON form of `caught` without the `children_sources` properties, see `as_json_format`; `null` when it has no JSON form or producing it threw. Cut values end with {@link CORJ_TRUNCATED_MARKER}. Omitted when `{}`. */
  as_json?: CorjJsonValue | null;
  /** `caught.stack` when it is a string, split into lines by default (`stackFormat`); `null` when reading it threw. */
  stack?: string | string[] | null;
  /** Present when this node has child sources that were not reported. */
  children_omitted?: CorjChildrenOmitted;
  /** Root only. The properties children were collected from. Omitted when `["cause", "errors"]`. */
  children_sources?: string[];
  /** Omitted when `"String"`. */
  as_string_format?: CorjAsStringFormat;
  /** Omitted when `"safe-stable-stringify-with-length-limit"`. */
  as_json_format?: CorjAsJsonFormat;
  /** Root only. Report version, controlled by the `metadata` option. */
  v?: CorjVersion;
  /** Root only. Link to the JSON Schema of this report, controlled by the `metadata` option. */
  $schema?: CorjSchemaLink;
};

/** Report object produced by {@link makeCorj} and {@link CorjMaker.makeReportObject}. */
export type CorjReport = CorjReportBase & {
  /** Every nested error found through `children_sources`, flattened breadth-first. Absent when there are none. */
  children?: CorjReportChild[];
};

/**
 * One node of a flattened error tree: an element of {@link CorjReport.children},
 * or of the array produced by {@link makeCorjArray} whose first element is the root.
 */
export type CorjReportChild = CorjReportBase & {
  /** From `makeReportId`; `"root"` for the root and the discovery index otherwise by default. */
  id: string;
  /** JSONPath from the root caught object, e.g. `$.cause.errors[0]`. */
  path: string;
  /** Depth in the error tree; the root is `0`. */
  level: number;
  /** IDs of this node's direct children. An object seen before is not reported twice: its first ID is referenced instead. */
  child_ids?: string[];
};

/** @deprecated Use {@link CorjReport}. */
export type CaughtObjectReportJson = CorjReport;
/** @deprecated Use {@link CorjReportChild}. */
export type CaughtObjectReportJsonChild = CorjReportChild;

export type CorjReportSizeUnit = JsonSizeUnit;
export type CorjStackFormat = 'lines' | 'string';
export type CorjMetadata = { v: boolean; $schema: boolean };

export type CorjReportIdContext = {
  /** `-1` for the root, then the discovery index starting at `0`. */
  index: number;
  level: number;
  path: string;
  caught: unknown;
};

/** Where in the report process an error was caught. */
export type CorjErrorStage =
  | 'prop-access'
  | 'as_string'
  | 'as_json'
  | 'children'
  | 'limit'
  | 'other';

export type CorjErrorContext = {
  stage: CorjErrorStage;
  /** JSONPath of the node being processed, `$` for the root. */
  path: string;
  /** Report field being produced, when known. */
  key?: keyof CorjReport | keyof CorjReportChild;
  /** Property of the caught object being accessed, when known. */
  prop?: string;
};

export type CorjErrorHandler = (
  caught: unknown,
  context: CorjErrorContext,
) => void;

export type CorjOptions = {
  /** Size limit of the compact JSON of the whole report, children included. Defaults to `100000`; `null` disables it. */
  maxReportSize: number | null;
  /** Unit of `maxReportSize`. Defaults to UTF-8 bytes; `utf16-code-units` counts `json.length`. */
  reportSizeUnit: CorjReportSizeUnit;
  /** Leave out fields holding their expected value, see {@link CORJ_EXPECTED_VALUES}. Defaults to `true`. */
  omitExpectedValues: boolean;
  /** Store `stack` as `stack.split('\n')` (`lines`, the default) or as the raw string. */
  stackFormat: CorjStackFormat;
  /** Which of `v` and `$schema` to add to the root. Defaults to `v` only. */
  metadata: CorjMetadata;
  /** Deepest level of nested errors to report; `1` reports `caught.cause` but not `caught.cause.cause`. Defaults to `5`. */
  maxDepth: number;
  /** Most child reports in one report. Defaults to `100`. */
  maxChildren: number;
  /** Properties to collect children from. Arrays contribute one child per element. Defaults to `["cause", "errors"]`. */
  childrenSources: readonly string[];
  /** Produces the `id` of a node. Called once per discovered node. */
  makeReportId: (context: CorjReportIdContext) => string;
  /** Called when something throws while the report is produced. Defaults to `console.warn`. */
  onError: CorjErrorHandler;
};

/** @deprecated Use {@link CorjOptions}. */
export type CorjMakerOptions = CorjOptions;

/** Options accepted by {@link CorjMaker}, {@link makeCorj} and {@link makeCorjArray}. Missing ones keep their defaults. */
export type CorjOptionsInput = {
  [K in Exclude<keyof CorjOptions, 'metadata'>]?: CorjOptions[K];
} & {
  /** `true` adds both `v` and `$schema`, `false` neither; an object sets them individually. */
  metadata?: boolean | Partial<CorjMetadata>;
};

//  ██████╗ ██████╗ ███╗   ██╗███████╗████████╗ █████╗ ███╗   ██╗████████╗███████╗
// ██╔════╝██╔═══██╗████╗  ██║██╔════╝╚══██╔══╝██╔══██╗████╗  ██║╚══██╔══╝██╔════╝
// ██║     ██║   ██║██╔██╗ ██║███████╗   ██║   ███████║██╔██╗ ██║   ██║   ███████╗
// ██║     ██║   ██║██║╚██╗██║╚════██║   ██║   ██╔══██║██║╚██╗██║   ██║   ╚════██║
// ╚██████╗╚██████╔╝██║ ╚████║███████║   ██║   ██║  ██║██║ ╚████║   ██║   ███████║
//  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝

function describeValue(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '[unprintable value]';
  }
}

function defaultOnError(caught: unknown, context: CorjErrorContext): void {
  const where = [
    `stage=${context.stage}`,
    `path=${context.path}`,
    context.key === undefined ? null : `field=${context.key}`,
    context.prop === undefined ? null : `prop=${context.prop}`,
  ]
    .filter(Boolean)
    .join(' ');
  console.warn(
    `[caught-object-report-json] ${where}: ${describeValue(caught)}`,
  );
}

export const CORJ_DEFAULT_OPTIONS: CorjOptions = Object.freeze({
  maxReportSize: DEFAULT_MAX_REPORT_SIZE,
  reportSizeUnit: DEFAULT_REPORT_SIZE_UNIT,
  omitExpectedValues: true,
  stackFormat: 'lines',
  metadata: Object.freeze({ v: true, $schema: false }),
  maxDepth: 5,
  maxChildren: 100,
  childrenSources: CORJ_EXPECTED_VALUES.children_sources,
  makeReportId: ({ index }: CorjReportIdContext) =>
    index === -1 ? 'root' : String(index),
  onError: defaultOnError,
});

const OPTION_KEYS: readonly (keyof CorjOptions)[] = Object.freeze([
  'maxReportSize',
  'reportSizeUnit',
  'omitExpectedValues',
  'stackFormat',
  'metadata',
  'maxDepth',
  'maxChildren',
  'childrenSources',
  'makeReportId',
  'onError',
]);

function resolveOptions(
  base: CorjOptions,
  input: CorjOptionsInput | undefined,
): CorjOptions {
  if (input === undefined) return base;
  if (typeof input !== 'object' || input === null) {
    throw new TypeError('options must be an object');
  }
  for (const key of Object.keys(input)) {
    if (!OPTION_KEYS.includes(key as keyof CorjOptions)) {
      throw new TypeError(
        `Unknown option "${key}". Known options: ${OPTION_KEYS.join(', ')}`,
      );
    }
  }
  const pick = <K extends Exclude<keyof CorjOptions, 'metadata'>>(
    key: K,
  ): CorjOptions[K] =>
    (input[key] === undefined ? base[key] : input[key]) as CorjOptions[K];
  const metadataInput = input.metadata;
  let metadata: CorjMetadata;
  if (metadataInput === undefined) {
    metadata = base.metadata;
  } else if (typeof metadataInput === 'boolean') {
    metadata = { v: metadataInput, $schema: metadataInput };
  } else if (typeof metadataInput === 'object' && metadataInput !== null) {
    metadata = {
      v: metadataInput.v === undefined ? base.metadata.v : metadataInput.v,
      $schema:
        metadataInput.$schema === undefined
          ? base.metadata.$schema
          : metadataInput.$schema,
    };
  } else {
    throw new TypeError('metadata must be a boolean or an object');
  }
  if (
    typeof metadata.v !== 'boolean' ||
    typeof metadata.$schema !== 'boolean'
  ) {
    throw new TypeError('metadata.v and metadata.$schema must be booleans');
  }
  const options: CorjOptions = {
    maxReportSize: pick('maxReportSize'),
    reportSizeUnit: pick('reportSizeUnit'),
    omitExpectedValues: pick('omitExpectedValues'),
    stackFormat: pick('stackFormat'),
    metadata: Object.freeze(metadata),
    maxDepth: pick('maxDepth'),
    maxChildren: pick('maxChildren'),
    childrenSources: pick('childrenSources'),
    makeReportId: pick('makeReportId'),
    onError: pick('onError'),
  };
  resolveReportSizeOptions(options);
  if (typeof options.omitExpectedValues !== 'boolean') {
    throw new TypeError('omitExpectedValues must be a boolean');
  }
  if (options.stackFormat !== 'lines' && options.stackFormat !== 'string') {
    throw new TypeError('stackFormat must be "lines" or "string"');
  }
  for (const key of ['maxDepth', 'maxChildren'] as const) {
    if (!Number.isInteger(options[key]) || options[key] < 0) {
      throw new RangeError(`${key} must be an integer >= 0`);
    }
  }
  if (
    !Array.isArray(options.childrenSources) ||
    !options.childrenSources.every((source) => typeof source === 'string')
  ) {
    throw new TypeError('childrenSources must be an array of strings');
  }
  options.childrenSources = Object.freeze([...options.childrenSources]);
  if (typeof options.makeReportId !== 'function') {
    throw new TypeError('makeReportId must be a function');
  }
  if (typeof options.onError !== 'function') {
    throw new TypeError('onError must be a function');
  }
  return Object.freeze(options);
}

// ██╗  ██╗███████╗██╗     ██████╗ ███████╗██████╗ ███████╗
// ██║  ██║██╔════╝██║     ██╔══██╗██╔════╝██╔══██╗██╔════╝
// ███████║█████╗  ██║     ██████╔╝█████╗  ██████╔╝███████╗
// ██╔══██║██╔══╝  ██║     ██╔═══╝ ██╔══╝  ██╔══██╗╚════██║
// ██║  ██║███████╗███████╗██║     ███████╗██║  ██║███████║
// ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝

type Ctx = { options: CorjOptions; stringify: Stringify };
type Entry = [string, unknown];
type Report = CorjReport | CorjReportChild[];

type Node = {
  id: string;
  index: number;
  level: number;
  path: string;
  obj: unknown;
  childIds: string[];
  childrenOmitted?: CorjChildrenOmitted;
};

function reportError(
  ctx: Ctx,
  caught: unknown,
  context: CorjErrorContext,
): void {
  try {
    ctx.options.onError(caught, context);
  } catch (failure: unknown) {
    console.warn(
      `[caught-object-report-json] onError threw: ${describeValue(failure)}`,
    );
  }
}

function isObjectLike(value: unknown): value is object {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  );
}

type Access = { found: boolean; threw: boolean; value?: unknown };

/** Read `host[prop]` without letting a getter, proxy trap or primitive host throw out. */
function access(
  ctx: Ctx,
  context: CorjErrorContext,
  host: unknown,
  prop: string,
): Access {
  if (host === undefined || host === null) {
    return { found: false, threw: false };
  }
  try {
    if (!isObjectLike(host)) {
      const value = (host as Record<string, unknown>)[prop];
      return value === undefined
        ? { found: false, threw: false }
        : { found: true, threw: false, value };
    }
    if (!(prop in host)) {
      return { found: false, threw: false };
    }
    return {
      found: true,
      threw: false,
      value: (host as Record<string, unknown>)[prop],
    };
  } catch (caught: unknown) {
    reportError(ctx, caught, { ...context, prop });
    return { found: false, threw: true };
  }
}

function makeId(ctx: Ctx, context: CorjReportIdContext): string {
  try {
    const id = ctx.options.makeReportId(context);
    if (typeof id !== 'string') {
      throw new TypeError(
        `makeReportId must return a string, got ${describeValue(id)}`,
      );
    }
    return id;
  } catch (caught: unknown) {
    reportError(ctx, caught, {
      stage: 'other',
      path: context.path,
      key: 'id',
    });
    return context.index === -1 ? 'root' : String(context.index);
  }
}

function childSources(
  ctx: Ctx,
  node: Node,
  isNew: (value: unknown) => boolean,
): { obj: unknown; path: string }[] {
  const host = node.obj;
  if (!isObjectLike(host)) return [];
  const out: { obj: unknown; path: string }[] = [];
  const context: CorjErrorContext = {
    stage: 'children',
    path: node.path,
    key: node.index === -1 ? 'children' : 'child_ids',
  };
  // No report can hold more than `maxChildren` new nodes, so stop collecting
  // once that many unseen objects are found; references to seen ones are free.
  const enough = ctx.options.maxChildren + 1;
  const local = new Set<object>();
  let fresh = 0;
  const push = (obj: unknown, path: string) => {
    out.push({ obj, path });
    if (!isObjectLike(obj)) {
      fresh++;
    } else if (isNew(obj) && !local.has(obj)) {
      local.add(obj);
      fresh++;
    }
  };
  for (const prop of ctx.options.childrenSources) {
    if (fresh >= enough) break;
    const source = access(ctx, context, host, prop);
    if (!source.found || source.value === undefined) continue;
    if (!Array.isArray(source.value)) {
      push(source.value, `${node.path}.${prop}`);
      continue;
    }
    // Own keys rather than `length`: a sparse array is not walked hole by hole.
    const array: unknown[] = source.value;
    let keys: string[];
    try {
      keys = Object.keys(array);
    } catch (caught: unknown) {
      reportError(ctx, caught, { ...context, prop });
      continue;
    }
    for (const key of keys) {
      if (fresh >= enough) break;
      if (!/^(0|[1-9][0-9]*)$/.test(key)) continue;
      const element = access(ctx, context, array, key);
      if (!element.found || element.value === undefined) continue;
      push(element.value, `${node.path}.${prop}[${key}]`);
    }
  }
  return out;
}

/** Breadth-first walk of the error tree. Each object is reported once; repeats become ID references. */
function discover(ctx: Ctx, caught: unknown): { root: Node; nodes: Node[] } {
  const { maxDepth, maxChildren } = ctx.options;
  const root: Node = {
    id: makeId(ctx, { index: -1, level: 0, path: '$', caught }),
    index: -1,
    level: 0,
    path: '$',
    obj: caught,
    childIds: [],
  };
  const seen = new Map<object, string>();
  if (isObjectLike(caught)) seen.set(caught, root.id);
  const isNew = (value: unknown) => !(isObjectLike(value) && seen.has(value));
  const nodes: Node[] = [];
  const queue: Node[] = [root];
  let index = 0;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    const sources = childSources(ctx, current, isNew);
    if (sources.length === 0) continue;
    if (current.level >= maxDepth) {
      current.childrenOmitted = 'max_depth';
      continue;
    }
    for (const source of sources) {
      const seenId = isObjectLike(source.obj)
        ? seen.get(source.obj)
        : undefined;
      if (seenId !== undefined) {
        current.childIds.push(seenId);
        continue;
      }
      if (nodes.length >= maxChildren) {
        current.childrenOmitted = 'max_children';
        break;
      }
      const node: Node = {
        id: '',
        index: index++,
        level: current.level + 1,
        path: source.path,
        obj: source.obj,
        childIds: [],
      };
      node.id = makeId(ctx, {
        index: node.index,
        level: node.level,
        path: node.path,
        caught: node.obj,
      });
      if (isObjectLike(source.obj)) seen.set(source.obj, node.id);
      current.childIds.push(node.id);
      nodes.push(node);
      queue.push(node);
    }
  }
  return { root, nodes };
}

// ██████╗ ███████╗██████╗  ██████╗ ██████╗ ████████╗    ██████╗ ██████╗  ██████╗ ██████╗ ███████╗
// ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝    ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██╔════╝
// ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝   ██║       ██████╔╝██████╔╝██║   ██║██████╔╝███████╗
// ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██╔══██╗   ██║       ██╔═══╝ ██╔══██╗██║   ██║██╔═══╝ ╚════██║
// ██║  ██║███████╗██║     ╚██████╔╝██║  ██║   ██║       ██║     ██║  ██║╚██████╔╝██║     ███████║
// ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝       ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝

function stringProp(
  ctx: Ctx,
  node: Node,
  key: keyof CorjReportBase,
  prop: string,
): string | null | undefined {
  const r = access(
    ctx,
    { stage: 'prop-access', path: node.path, key },
    node.obj,
    prop,
  );
  if (r.threw) return null;
  return typeof r.value === 'string' ? r.value : undefined;
}

function makeConstructorName(ctx: Ctx, node: Node): string | null | undefined {
  const context: CorjErrorContext = {
    stage: 'prop-access',
    path: node.path,
    key: 'constructor_name',
  };
  const ctor = access(ctx, context, node.obj, 'constructor');
  if (ctor.threw) return null;
  if (!ctor.found) return undefined;
  const name = access(ctx, context, ctor.value, 'name');
  if (name.threw) return null;
  return typeof name.value === 'string' ? name.value : undefined;
}

function makeAsString(
  ctx: Ctx,
  node: Node,
): { value: string | null; format: CorjAsStringFormat } {
  const { obj, path } = node;
  const context: CorjErrorContext = {
    stage: 'as_string',
    path,
    key: 'as_string',
  };
  const method = access(
    ctx,
    { ...context, stage: 'prop-access' },
    obj,
    'toCorjAsString',
  );
  if (method.found && typeof method.value === 'function') {
    try {
      const value: unknown = method.value.call(obj, {
        path,
        options: ctx.options,
      });
      if (typeof value === 'string') {
        return { value, format: '.toCorjAsString' };
      }
    } catch (caught: unknown) {
      reportError(ctx, caught, { ...context, prop: 'toCorjAsString' });
    }
  }
  try {
    return { value: String(obj), format: 'String' };
  } catch (caught: unknown) {
    reportError(ctx, caught, context);
    return { value: null, format: 'String' };
  }
}

function serialize(
  ctx: Ctx,
  value: unknown,
  replacer: ((this: object, key: string, value: unknown) => unknown) | null,
): { json: string | undefined; truncated: boolean } {
  let truncated = false;
  const json = ctx.stringify(value, replacer, {
    onTruncate: () => {
      truncated = true;
    },
  });
  return { json, truncated };
}

function makeAsJson(
  ctx: Ctx,
  node: Node,
): {
  value: CorjJsonValue | null;
  format: CorjAsJsonFormat;
  truncated: boolean;
} {
  const { obj, path } = node;
  const context: CorjErrorContext = { stage: 'as_json', path, key: 'as_json' };
  const method = access(
    ctx,
    { ...context, stage: 'prop-access' },
    obj,
    'toCorjAsJson',
  );
  if (method.found && typeof method.value === 'function') {
    try {
      const raw: unknown = method.value.call(obj, {
        path,
        options: ctx.options,
      });
      const { json, truncated } = serialize(ctx, raw, null);
      if (json !== undefined) {
        return { value: JSON.parse(json), format: '.toCorjAsJson', truncated };
      }
    } catch (caught: unknown) {
      reportError(ctx, caught, { ...context, prop: 'toCorjAsJson' });
    }
  }
  const format = CORJ_EXPECTED_VALUES.as_json_format;
  try {
    const sources = ctx.options.childrenSources;
    const { json, truncated } = serialize(ctx, obj, function (key, value) {
      return this === obj && sources.includes(key) ? undefined : value;
    });
    if (json === undefined) {
      // Functions, symbols and undefined have no JSON form.
      return { value: null, format, truncated: false };
    }
    return { value: JSON.parse(json), format, truncated };
  } catch (caught: unknown) {
    reportError(ctx, caught, context);
    return { value: null, format, truncated: false };
  }
}

type NodeFields = {
  entries: Entry[];
  formatEntries: Entry[];
  truncated: boolean;
};

function makeNodeFields(ctx: Ctx, node: Node): NodeFields {
  const { obj, path } = node;
  let instanceofError = false;
  try {
    instanceofError = obj instanceof Error;
  } catch (caught: unknown) {
    reportError(ctx, caught, { stage: 'other', path, key: 'instanceof_error' });
  }
  const constructorName = makeConstructorName(ctx, node);
  const message = stringProp(ctx, node, 'message', 'message');
  const rawStack = stringProp(ctx, node, 'stack', 'stack');
  const stack =
    typeof rawStack === 'string' && ctx.options.stackFormat === 'lines'
      ? rawStack.split('\n')
      : rawStack;
  const asString = makeAsString(ctx, node);
  const asJson = makeAsJson(ctx, node);
  return {
    entries: [
      ['instanceof_error', instanceofError],
      ['typeof', typeof obj],
      ['constructor_name', constructorName],
      ['message', message],
      ['as_string', asString.value],
      ['as_json', asJson.value],
      ['stack', stack],
    ],
    formatEntries: [
      ['as_string_format', asString.format],
      ['as_json_format', asJson.format],
    ],
    truncated: asJson.truncated,
  };
}

function toObject<T>(entries: Entry[]): T {
  return Object.fromEntries(
    entries.filter(([, value]) => value !== undefined),
  ) as T;
}

function build(ctx: Ctx, caught: unknown, asArray: boolean): Report {
  const { root, nodes } = discover(ctx, caught);
  const rootFields = makeNodeFields(ctx, root);
  let anyTruncated = rootFields.truncated;
  const rows = nodes.map((node) => {
    const fields = makeNodeFields(ctx, node);
    anyTruncated ||= fields.truncated;
    return toObject<CorjReportChild>([
      ['id', node.id],
      ['path', node.path],
      ['level', node.level],
      ['truncated', fields.truncated ? true : undefined],
      ...fields.entries,
      ['children_omitted', node.childrenOmitted],
      ['child_ids', node.childIds.length > 0 ? node.childIds : undefined],
      ...fields.formatEntries,
    ]);
  });
  const { metadata, omitExpectedValues: omit } = ctx.options;
  const schemaLink = omit
    ? asArray
      ? CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK
      : CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
    : asArray
    ? CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK
    : CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK;
  const tail: Entry[] = [
    ['children_sources', [...ctx.options.childrenSources]],
    ...rootFields.formatEntries,
    ['v', metadata.v ? (omit ? CORJ_VERSION : CORJ_VERSION_FULL) : undefined],
    ['$schema', metadata.$schema ? schemaLink : undefined],
  ];
  if (asArray) {
    const rootRow = toObject<CorjReportChild>([
      ['id', root.id],
      ['path', root.path],
      ['level', root.level],
      ['truncated', anyTruncated ? true : undefined],
      ...rootFields.entries,
      ['children_omitted', root.childrenOmitted],
      ['child_ids', root.childIds.length > 0 ? root.childIds : undefined],
      ...tail,
    ]);
    return [rootRow, ...rows];
  }
  return toObject<CorjReport>([
    ['truncated', anyTruncated ? true : undefined],
    ...rootFields.entries,
    ['children_omitted', root.childrenOmitted],
    ['children', rows.length > 0 ? rows : undefined],
    ...tail,
  ]);
}

function finish<T extends Report>(ctx: Ctx, report: T): T {
  let omissionFailed = false;
  const omit = <R extends Report>(value: R): R => {
    if (!ctx.options.omitExpectedValues || omissionFailed) return value;
    try {
      return omitExpectedValues(value);
    } catch (caught: unknown) {
      omissionFailed = true;
      reportError(ctx, caught, { stage: 'other', path: '$' });
      // The report stays complete, so label it as such.
      return markFullVersion(value);
    }
  };
  try {
    // Omit before limiting so the size budget is spent on real content, and
    // again after: the limiter re-materializes `as_string` while trimming
    // `stack`, and omission only shrinks a report that already fits.
    return omit(limitReportSize(omit(report), ctx.options, ctx.stringify));
  } catch (caught: unknown) {
    reportError(ctx, caught, { stage: 'limit', path: '$' });
    return omit(makeMinimalReport(report));
  }
}

// ███████╗██╗  ██╗██████╗  ██████╗ ██████╗ ████████╗███████╗
// ██╔════╝╚██╗██╔╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝
// █████╗   ╚███╔╝ ██████╔╝██║   ██║██████╔╝   ██║   ███████╗
// ██╔══╝   ██╔██╗ ██╔═══╝ ██║   ██║██╔══██╗   ██║   ╚════██║
// ███████╗██╔╝ ██╗██║     ╚██████╔╝██║  ██║   ██║   ███████║
// ╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝

/** Produces reports with one set of options. Construct once, reuse for every caught object. */
export class CorjMaker {
  readonly options: CorjOptions;
  private readonly ctx: Ctx;

  /** Invalid options throw a `TypeError` or `RangeError`; unknown option names are rejected too. */
  constructor(options?: CorjOptionsInput) {
    this.options = resolveOptions(CORJ_DEFAULT_OPTIONS, options);
    const { maxReportSize, reportSizeUnit } = this.options;
    this.ctx = {
      options: this.options,
      stringify: configureStringify({
        circularValue: CORJ_CIRCULAR_MARKER,
        deterministic: false,
        lengthUnit: reportSizeUnit,
        ...(maxReportSize === null ? {} : { lengthLimit: maxReportSize }),
      }) as Stringify,
    };
  }

  /** A new maker with these options applied on top of this maker's options. */
  with(options: CorjOptionsInput): CorjMaker {
    return new CorjMaker(resolveOptions(this.options, options));
  }

  makeReportObject(caught: unknown): CorjReport {
    return finish(this.ctx, build(this.ctx, caught, false) as CorjReport);
  }

  /** The root as the first element followed by every child; nodes link to each other by `child_ids`. */
  makeReportArray(caught: unknown): CorjReportChild[] {
    return finish(this.ctx, build(this.ctx, caught, true) as CorjReportChild[]);
  }
}

let defaultMaker: CorjMaker | undefined;

function makerFor(options: CorjOptionsInput | undefined): CorjMaker {
  if (options !== undefined) return new CorjMaker(options);
  defaultMaker ??= new CorjMaker();
  return defaultMaker;
}

/** {@link CorjMaker.makeReportObject} with {@link CORJ_DEFAULT_OPTIONS} and the given overrides. */
export function makeCorj(
  caught: unknown,
  options?: CorjOptionsInput,
): CorjReport {
  return makerFor(options).makeReportObject(caught);
}

/** {@link CorjMaker.makeReportArray} with {@link CORJ_DEFAULT_OPTIONS} and the given overrides. */
export function makeCorjArray(
  caught: unknown,
  options?: CorjOptionsInput,
): CorjReportChild[] {
  return makerFor(options).makeReportArray(caught);
}
