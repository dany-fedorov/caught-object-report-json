import { configure as configureStringify } from './safe-stable-stringify';
import type { JsonSizeUnit } from './json-size';
import {
  CORJ_CIRCULAR_MARKER,
  CORJ_OMITTED_MARKER,
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
import { CORJ_REDACT_DROP, Redactor, resolveRedactPolicy } from './redaction';
import type {
  CorjRedactContext,
  CorjRedactPolicy,
  CorjRedactPolicyInput,
  CorjRedactStage,
  CorjRedactTransform,
} from './redaction';
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
export { CORJ_REDACTED_MARKER } from './redaction';
export type {
  CorjRedactContext,
  CorjRedactPolicy,
  CorjRedactPolicyInput,
  CorjRedactStage,
  CorjRedactTransform,
};
export { CORJ_CIRCULAR_MARKER, CORJ_OMITTED_MARKER, CORJ_TRUNCATED_MARKER };
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

/**
 * How `as_string` was produced: `String(caught)`, the caught object's own
 * `.toCorjAsString()`, or, under `inspection: "no-invoke"`, `derived` — built
 * from values read off property descriptors without calling any method.
 */
export type CorjAsStringFormat = 'String' | '.toCorjAsString' | 'derived';
/** How `as_json` was produced: the bundled length-limited serializer or the caught object's own `.toCorjAsJson()`. */
export type CorjAsJsonFormat =
  | 'safe-stable-stringify-with-length-limit'
  | '.toCorjAsJson';
/** Why child reports of a node are missing: the `maxDepth` limit, the `maxChildren` limit, the `maxReportSize` limit, a children source that `inspection: "no-invoke"` would not read, or one the `redact` policy excluded. */
export type CorjChildrenOmitted =
  | 'max_depth'
  | 'max_children'
  | 'max_size'
  | 'not_inspected'
  | 'redacted';

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
/**
 * How much of the caught object CORJ is willing to run to describe it.
 *
 * - `default` — read properties normally and use `.toCorjAsString()`,
 *   `.toCorjAsJson()`, `toString` and `toJSON` when present. Getters, proxy
 *   traps and formatting hooks can execute.
 * - `no-invoke` — read values off property descriptors only and call none of
 *   those hooks. Content that could only be obtained by running code is
 *   replaced with {@link CORJ_OMITTED_MARKER}. This is not a sandbox: reading a
 *   descriptor off a `Proxy` still runs its `getOwnPropertyDescriptor` and
 *   `ownKeys` traps, and a trap that never returns still hangs the caller. For
 *   hard CPU isolation, produce the report behind a worker or process boundary.
 */
export type CorjInspection = 'default' | 'no-invoke';
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
  | 'redact'
  | 'other';

export type CorjErrorContext = {
  stage: CorjErrorStage;
  /** JSONPath of the node being processed, `$` for the root. */
  path: string;
  /** Report field being produced, when known. */
  key?: keyof CorjReport | keyof CorjReportChild | undefined;
  /** Property of the caught object being accessed, when known. */
  prop?: string | undefined;
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
  /** How much of the caught object may be executed while reporting it. Defaults to `"default"`. */
  inspection: CorjInspection;
  /** Field selection and redaction applied to everything the report emits. `null` (the default) applies none. */
  redact: CorjRedactPolicy | null;
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
  [K in Exclude<keyof CorjOptions, 'metadata' | 'redact'>]?: CorjOptions[K];
} & {
  /** `true` adds both `v` and `$schema`, `false` neither; an object sets them individually. */
  metadata?: boolean | Partial<CorjMetadata>;
  /** A redaction policy, or `null` for none. See {@link CorjRedactPolicyInput}. */
  redact?: CorjRedactPolicyInput | null;
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

function defaultOnError(
  caught: unknown,
  context: CorjErrorContext,
  redactor?: Redactor,
): void {
  const where = [
    `stage=${context.stage}`,
    `path=${context.path}`,
    context.key === undefined ? null : `field=${context.key}`,
    context.prop === undefined ? null : `prop=${context.prop}`,
  ]
    .filter(Boolean)
    .join(' ');
  const described = describeValue(caught);
  // A failure is described with the caught object's own text, so the warning
  // line goes through the same policy the report content does.
  const text =
    redactor === undefined
      ? described
      : redactor.text(described, {
          stage: 'warning',
          path: context.path,
          key: context.key,
          prop: context.prop,
        });
  console.warn(`[caught-object-report-json] ${where}: ${text}`);
}

export const CORJ_DEFAULT_OPTIONS: CorjOptions = Object.freeze({
  maxReportSize: DEFAULT_MAX_REPORT_SIZE,
  reportSizeUnit: DEFAULT_REPORT_SIZE_UNIT,
  omitExpectedValues: true,
  stackFormat: 'lines',
  inspection: 'default',
  redact: null,
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
  'inspection',
  'redact',
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
  const pick = <K extends Exclude<keyof CorjOptions, 'metadata' | 'redact'>>(
    key: K,
  ): CorjOptions[K] =>
    (input[key] === undefined ? base[key] : input[key]) as CorjOptions[K];
  // A resolved policy is itself a valid policy input, so `with()` can layer one
  // maker's options onto another.
  const redact = resolveRedactPolicy(
    input.redact === undefined ? base.redact : input.redact,
  );
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
    inspection: pick('inspection'),
    redact,
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
  if (options.inspection !== 'default' && options.inspection !== 'no-invoke') {
    throw new TypeError('inspection must be "default" or "no-invoke"');
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

type Ctx = {
  options: CorjOptions;
  stringify: Stringify;
  /** `null` when no redaction policy is configured, which is the default. */
  redactor: Redactor | null;
};
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
    if (ctx.options.onError === defaultOnError && ctx.redactor !== null) {
      defaultOnError(caught, context, ctx.redactor);
    } else {
      ctx.options.onError(caught, context);
    }
  } catch (failure: unknown) {
    console.warn(
      `[caught-object-report-json] onError threw: ${describeValue(failure)}`,
    );
  }
}

/**
 * One emitted string through the policy. `undefined` means the policy dropped
 * the field, which leaves it out of the report the way an absent property does.
 */
function redactText(
  ctx: Ctx,
  value: string,
  context: CorjRedactContext,
): string | undefined {
  if (ctx.redactor === null) return value;
  const out = ctx.redactor.apply(value, context);
  if (out === CORJ_REDACT_DROP) return undefined;
  return typeof out === 'string' ? out : ctx.redactor.policy.replacement;
}

/**
 * {@link redactText} for a field the report schema requires. A policy may
 * rewrite `as_string`, but dropping it would emit a report that fails the
 * `-full` schema, so a drop yields the replacement instead.
 */
function redactRequiredText(
  ctx: Ctx,
  value: string,
  context: CorjRedactContext,
): string {
  if (ctx.redactor === null) return value;
  const out = ctx.redactor.apply(value, context);
  return out === CORJ_REDACT_DROP || typeof out !== 'string'
    ? ctx.redactor.policy.replacement
    : out;
}

function isObjectLike(value: unknown): value is object {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  );
}

/**
 * `omitted` marks a property that exists but whose value `no-invoke` inspection
 * refused to read because doing so would have called an accessor.
 */
type Access = {
  found: boolean;
  threw: boolean;
  omitted?: boolean;
  /** Set to the replacement text when the policy excluded this property, which was then never read. */
  redacted?: string;
  value?: unknown;
};

/**
 * V8 installs `stack` on every error as an own accessor property. It is engine
 * code rather than anything the caught object supplied, so `no-invoke`
 * inspection calls this exact function and nothing else that it finds behind an
 * accessor. Engines that expose `stack` as a data property never reach this.
 *
 * Calling it is only safe when `name` and `message` are data properties: V8
 * formats the stack string lazily, and formatting performs a `[[Get]]` on both,
 * which would run exactly the accessors this mode refuses to run.
 */
const NATIVE_ERROR_STACK_GETTER: (() => unknown) | undefined = (() => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(
      new Error('caught-object-report-json probe'),
      'stack',
    );
    return descriptor !== undefined && typeof descriptor.get === 'function'
      ? (descriptor.get as () => unknown)
      : undefined;
  } catch {
    return undefined;
  }
})();

/** Whether `prop` resolves to a data property, so reading it runs nothing. */
function isDataProperty(host: unknown, prop: PropertyKey): boolean {
  let current: unknown = host;
  while (current !== undefined && current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current as object, prop);
    if (descriptor !== undefined) return 'value' in descriptor;
    current = Object.getPrototypeOf(current as object);
  }
  // Absent is safe: formatting reads `undefined` and runs nothing.
  return true;
}

/**
 * Whether materializing `host.stack` would run code the caught object supplied.
 *
 * V8 builds the stack string on first read, reading `name` and `message` to do
 * it, so an accessor on either turns the engine's own getter into a call into
 * the caught object. `Error.prepareStackTrace` is a global application hook
 * rather than anything this object owns, and is out of reach either way.
 */
function lazyStackFormattingIsSafe(host: unknown): boolean {
  return isDataProperty(host, 'name') && isDataProperty(host, 'message');
}

/** Walk the prototype chain for `prop` reading descriptors only; never calls a getter. */
function accessNoInvoke(host: unknown, prop: PropertyKey): Access {
  let current: unknown = host;
  while (current !== undefined && current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current as object, prop);
    if (descriptor !== undefined) {
      if ('value' in descriptor) {
        return descriptor.value === undefined
          ? { found: false, threw: false }
          : { found: true, threw: false, value: descriptor.value };
      }
      if (
        NATIVE_ERROR_STACK_GETTER !== undefined &&
        descriptor.get === NATIVE_ERROR_STACK_GETTER &&
        lazyStackFormattingIsSafe(host)
      ) {
        return {
          found: true,
          threw: false,
          value: NATIVE_ERROR_STACK_GETTER.call(host),
        };
      }
      return { found: true, threw: false, omitted: true };
    }
    current = Object.getPrototypeOf(current as object);
  }
  return { found: false, threw: false };
}

/**
 * Read `host[prop]` without letting a getter, proxy trap or primitive host throw
 * out. `redactPath` overrides the JSONPath the policy is asked about, for reads
 * whose path is not `<node path>.<prop>`.
 */
function access(
  ctx: Ctx,
  context: CorjErrorContext,
  host: unknown,
  prop: string,
  redactPath?: string,
): Access {
  if (host === undefined || host === null) {
    return { found: false, threw: false };
  }
  // The policy is consulted before the read, so an excluded getter never runs.
  if (
    ctx.redactor !== null &&
    ctx.redactor.excludes({
      stage: context.stage === 'children' ? 'children' : 'prop-access',
      path: redactPath ?? `${context.path}.${prop}`,
      key: context.key,
      prop,
    })
  ) {
    return {
      found: true,
      threw: false,
      redacted: ctx.redactor.policy.replacement,
    };
  }
  try {
    if (ctx.options.inspection === 'no-invoke') {
      return accessNoInvoke(host, prop);
    }
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
    // `makeReportId` is handed the caught object, so an id built from it can
    // carry the same content every other field is scrubbed for.
    return ctx.redactor === null
      ? id
      : ctx.redactor.text(id, {
          stage: 'prop-access',
          path: context.path,
          key: 'id',
        });
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
): { obj: unknown; path: string; omitted?: CorjChildrenOmitted }[] {
  const host = node.obj;
  if (!isObjectLike(host)) return [];
  const out: { obj: unknown; path: string; omitted?: CorjChildrenOmitted }[] =
    [];
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
    // A children source behind an accessor is left unread rather than reported
    // as the marker string, which would invent a child that does not exist.
    if (source.redacted !== undefined || source.omitted) {
      out.push({
        obj: undefined,
        path: `${node.path}.${prop}`,
        omitted: source.redacted !== undefined ? 'redacted' : 'not_inspected',
      });
      continue;
    }
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
      const element = access(
        ctx,
        context,
        array,
        key,
        `${node.path}.${prop}[${key}]`,
      );
      if (element.redacted !== undefined || element.omitted) {
        out.push({
          obj: undefined,
          path: `${node.path}.${prop}[${key}]`,
          omitted:
            element.redacted !== undefined ? 'redacted' : 'not_inspected',
        });
        continue;
      }
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
      if (source.omitted !== undefined) {
        current.childrenOmitted ??= source.omitted;
        continue;
      }
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
  if (r.redacted !== undefined) return r.redacted;
  if (r.omitted) return CORJ_OMITTED_MARKER;
  if (typeof r.value !== 'string') return undefined;
  return redactText(ctx, r.value, {
    stage: 'prop-access',
    path: `${node.path}.${prop}`,
    key,
    prop,
  });
}

function makeConstructorName(ctx: Ctx, node: Node): string | null | undefined {
  const context: CorjErrorContext = {
    stage: 'prop-access',
    path: node.path,
    key: 'constructor_name',
  };
  const ctor = access(ctx, context, node.obj, 'constructor');
  if (ctor.threw) return null;
  if (ctor.redacted !== undefined) return ctor.redacted;
  if (ctor.omitted) return CORJ_OMITTED_MARKER;
  if (!ctor.found) return undefined;
  const name = access(
    ctx,
    context,
    ctor.value,
    'name',
    `${node.path}.constructor.name`,
  );
  if (name.threw) return null;
  if (name.redacted !== undefined) return name.redacted;
  if (name.omitted) return CORJ_OMITTED_MARKER;
  if (typeof name.value !== 'string') return undefined;
  return redactText(ctx, name.value, {
    stage: 'prop-access',
    path: `${node.path}.constructor.name`,
    key: 'constructor_name',
    prop: 'name',
  });
}

/** The string a resolved property holds, or a marker when it was withheld. */
function stringOrMarker(r: Access): string | undefined {
  if (r.redacted !== undefined) return r.redacted;
  if (r.omitted) return CORJ_OMITTED_MARKER;
  return typeof r.value === 'string' ? r.value : undefined;
}

/**
 * `as_string` for `no-invoke` inspection. Primitives stringify without running
 * anything. For objects, only two built-in `toString` implementations are
 * reproduced: `Error.prototype.toString`, rebuilt here from `name` and
 * `message` read off descriptors, and `Object.prototype.toString`, which is
 * called directly when no `Symbol.toStringTag` accessor could intercept it.
 * Any other `toString` belongs to the caught object and is not run.
 */
function makeAsStringNoInvoke(
  ctx: Ctx,
  node: Node,
): { value: string | null; format: CorjAsStringFormat } {
  const { obj, path } = node;
  const context: CorjErrorContext = {
    stage: 'as_string',
    path,
    key: 'as_string',
  };
  try {
    if (!isObjectLike(obj)) {
      return { value: String(obj), format: 'derived' };
    }
    const toString = accessNoInvoke(obj, 'toString');
    if (toString.omitted || typeof toString.value !== 'function') {
      return { value: CORJ_OMITTED_MARKER, format: 'derived' };
    }
    if (toString.value === Error.prototype.toString) {
      // Routed through `access` so a policy that excludes `name` or `message`
      // reaches the derived string too, not just the field of the same name.
      const name =
        stringOrMarker(
          access(ctx, { ...context, stage: 'prop-access' }, obj, 'name'),
        ) ?? 'Error';
      const message =
        stringOrMarker(
          access(ctx, { ...context, stage: 'prop-access' }, obj, 'message'),
        ) ?? '';
      const value =
        name === '' ? message : message === '' ? name : `${name}: ${message}`;
      return { value, format: 'derived' };
    }
    if (toString.value === Object.prototype.toString) {
      // `Object.prototype.toString` performs a [[Get]] of `Symbol.toStringTag`,
      // which a Proxy turns into a `get` trap, so the tag is resolved off
      // descriptors and the result assembled here instead of calling it.
      const tag = accessNoInvoke(obj, Symbol.toStringTag);
      if (tag.omitted) {
        return { value: CORJ_OMITTED_MARKER, format: 'derived' };
      }
      const label =
        typeof tag.value === 'string'
          ? tag.value
          : Array.isArray(obj)
          ? 'Array'
          : typeof obj === 'function'
          ? 'Function'
          : 'Object';
      return { value: `[object ${label}]`, format: 'derived' };
    }
    return { value: CORJ_OMITTED_MARKER, format: 'derived' };
  } catch (caught: unknown) {
    reportError(ctx, caught, context);
    return { value: null, format: 'derived' };
  }
}

function makeAsString(
  ctx: Ctx,
  node: Node,
): { value: string | null; format: CorjAsStringFormat } {
  if (ctx.options.inspection === 'no-invoke') {
    return makeAsStringNoInvoke(ctx, node);
  }
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

/**
 * The policy applied to every value the JSON form reaches, keyed by the
 * JSONPath the serializer reports. An excluded property is replaced without
 * being read, so a getter behind it never runs.
 */
function jsonRedact(
  ctx: Ctx,
  node: Node,
  /** Only the caught object itself hides its children sources from `as_json`; a
   * `.toCorjAsJson()` return value is the object's own text and is left alone. */
  skipChildrenSources: boolean,
): ((key: string, path: string, read: () => unknown) => unknown) | undefined {
  const redactor = ctx.redactor;
  if (redactor === null) return undefined;
  const sources = ctx.options.childrenSources;
  return (key, path, read) => {
    if (
      skipChildrenSources &&
      sources.some((source) => path === `${node.path}.${source}`)
    ) {
      return undefined;
    }
    const context: CorjRedactContext = {
      stage: 'as_json',
      path,
      key: 'as_json',
      prop: key,
    };
    if (redactor.excludes(context)) return redactor.policy.replacement;
    const out = redactor.apply(read(), context);
    return out === CORJ_REDACT_DROP ? undefined : out;
  };
}

/** A property name is emitted text too, so the policy's patterns reach it. */
function jsonKeyRedact(
  ctx: Ctx,
): ((key: string, path: string) => string) | undefined {
  const redactor = ctx.redactor;
  if (redactor === null) return undefined;
  return (key, path) =>
    redactor.text(key, { stage: 'as_json', path, key: 'as_json', prop: key });
}

function serialize(
  ctx: Ctx,
  value: unknown,
  replacer: ((this: object, key: string, value: unknown) => unknown) | null,
  node: Node,
  skipChildrenSources: boolean,
): { json: string | undefined; truncated: boolean } {
  let truncated = false;
  const redact = jsonRedact(ctx, node, skipChildrenSources);
  const mapKey = jsonKeyRedact(ctx);
  const json = ctx.stringify(value, replacer, {
    onTruncate: () => {
      truncated = true;
    },
    ...(redact === undefined ? {} : { redact, mapKey, basePath: node.path }),
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
  // `no-invoke` never consults the caught object's own JSON hook; the
  // serializer it runs under also skips `toJSON` and accessor properties.
  const method =
    ctx.options.inspection === 'no-invoke'
      ? { found: false, threw: false, value: undefined }
      : access(ctx, { ...context, stage: 'prop-access' }, obj, 'toCorjAsJson');
  if (method.found && typeof method.value === 'function') {
    try {
      const raw: unknown = method.value.call(obj, {
        path,
        options: ctx.options,
      });
      const { json, truncated } = serialize(ctx, raw, null, node, false);
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
    const { json, truncated } = serialize(
      ctx,
      obj,
      function (key, value) {
        return this === obj && sources.includes(key) ? undefined : value;
      },
      node,
      true,
    );
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
  const asStringValue =
    typeof asString.value === 'string'
      ? redactRequiredText(ctx, asString.value, {
          stage: 'as_string',
          path,
          key: 'as_string',
        })
      : asString.value;
  const asJson = makeAsJson(ctx, node);
  return {
    entries: [
      ['instanceof_error', instanceofError],
      ['typeof', typeof obj],
      ['constructor_name', constructorName],
      ['message', message],
      ['as_string', asStringValue],
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
      redactor: null,
      stringify: configureStringify({
        circularValue: CORJ_CIRCULAR_MARKER,
        deterministic: false,
        lengthUnit: reportSizeUnit,
        ...(this.options.inspection === 'no-invoke'
          ? { skipAccessors: CORJ_OMITTED_MARKER }
          : {}),
        ...(maxReportSize === null ? {} : { lengthLimit: maxReportSize }),
      }) as Stringify,
    };
    const policy = this.options.redact;
    if (policy !== null) {
      this.ctx.redactor = new Redactor(policy, (caught, context) =>
        reportError(this.ctx, caught, {
          stage: 'redact',
          path: context.path,
          key: context.key as keyof CorjReport | undefined,
          prop: context.prop,
        }),
      );
    }
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
