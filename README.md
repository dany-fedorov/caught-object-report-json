# Caught Object Report JSON

Uniform, bounded exception data for self-correction in agentic workflows, LLM harnesses, and agent graphs.

![Jest coverage](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/badges/coverage-jest%20coverage.svg "Jest coverage")
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release "semantic-release: angular")](https://github.com/semantic-release/semantic-release)
[![Code Style by Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg "Code Style by Prettier")](https://github.com/prettier/prettier)
[![Strictest TypeScript Config](https://img.shields.io/badge/typescript-strictest-blue "Strictest TypeScript Config")](https://www.npmjs.com/package/@tsconfig/strictest)
[![Package License MIT](https://img.shields.io/npm/l/caught-object-report-json.svg "Package License MIT")](https://www.npmjs.org/package/caught-object-report-json)
[![Npm Version](https://img.shields.io/npm/v/caught-object-report-json.svg "Npm Version")](https://www.npmjs.org/package/caught-object-report-json)

<img src="https://github.com/dany-fedorov/caught-object-report-json/raw/main/banner.png">

Normalize caught values and nested causes into one typed JSON format. Give your
harness or LLM consistent exception data to inspect when correcting tool inputs
or choosing a recovery step, instead of handling every SDK's error shape.
Configure report size and traversal; select and redact fields before model exposure.

```typescript
import { makeCorj } from 'caught-object-report-json';

try {
  await fetchUser(id);
} catch (caught: unknown) {
  logger.error({ error: makeCorj(caught) });
}
```

# Table Of Contents

* [Motivation](#motivation)
* [Why CORJ for agentic development?](#why-corj-for-agentic-development)
* [Before Using This Library](#before-using-this-library)
* [Installation](#installation)
* [Quick start](#quick-start)
* [LLM harnesses and agent graphs](#llm-harnesses-and-agent-graphs)
* [The report](#the-report)
    * [Fields](#fields)
    * [Omitted expected values](#omitted-expected-values)
    * [Two report versions](#two-report-versions)
    * [Stack as an array of lines](#stack-as-an-array-of-lines)
    * [Nested errors](#nested-errors)
    * [Size limit](#size-limit)
    * [Errors while reporting](#errors-while-reporting)
* [Options](#options)
* [Redacting what the report emits](#redacting-what-the-report-emits)
    * [What the policy reaches](#what-the-policy-reaches)
    * [Applying the policy to your own text](#applying-the-policy-to-your-own-text)
    * [When the policy itself fails](#when-the-policy-itself-fails)
    * [What a policy cannot do](#what-a-policy-cannot-do)
* [Reporting without running the caught object](#reporting-without-running-the-caught-object)
    * [What the mode does](#what-the-mode-does)
    * [What the mode is not](#what-the-mode-is-not)
* [Examples](#examples)
* [API](#api)
* [Supported runtimes](#supported-runtimes)
    * [Imports](#imports)
    * [Tested versions](#tested-versions)
* [Report schema history](#report-schema-history)
* [Upgrading from v9](#upgrading-from-v9)
* [Upgrading from v8](#upgrading-from-v8)
* [Links](#links)

# Motivation

- JavaScript has no standard JSON form for an `Error`, and `JSON.stringify(new Error('x'))` gives `{}`.
- Errors nest: [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)
  has `errors`, any error may have a [`cause`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause),
  libraries add their own. What you catch can be a deep tree, and it can contain cycles.
- `throw` accepts any value. `throw null`, `throw 42` and `throw undefined` are valid, and TypeScript types a caught value as `unknown`.
- Property access on a caught object can itself throw (getters, proxies, revoked proxies).

CORJ represents these failures in a shared report format described by published JSON Schemas,
including recovery from many property-access and serialization errors.

# Why CORJ for agentic development?

- **Uniform feedback for self-correction.** Expose messages, captured values, and nested causes through one report contract.
  Correction code and LLM feedback can use consistent fields to inspect what failed, while SDK-specific payloads remain available
  for application-specific handling. Your harness selects a correction and validates the next action.
- **Configurable diagnostic volume at reporting boundaries.** Report a failure where a feature, tool, or graph node meets its
  caller. A shared `CorjMaker` gives independently developed components one diagnostic contract. Configure depth, child count,
  and report size to limit diagnostic volume; compact reports omit predictable fields. The host selects relevance and redacts
  content before model exposure; byte limits do not measure tokens.
- **Types and fixtures for failure-path checks.** Use `CorjReport`, `CorjReportChild`, and typed options to check report consumers, then exercise
  the same boundary with deterministic failures. Test error capture, selected feedback, and recovery routing without calling a model;
  use live-model evals to assess the quality of proposed corrections.
- **Metadata for programmable diagnostics.** Version and JSON Schema metadata identify the report format. Flat child reports,
  paths, and `child_ids` let application code inspect nested failures without parsing a different error shape for every SDK.
  Add run IDs, tool names, or eval labels in your own envelope around the report.

CORJ supplies the diagnostic representation at your catch boundary, not a module system, LLM integration, or graph runner.
Your harness chooses what diagnostics to share and how to act on them. If a selected `{ code, reference }` record or your
existing logger already meets the requirement, another serializer may add little value.

# Before Using This Library

`JSON.stringify(err, Object.getOwnPropertyNames(err))` is a fine quick fix when you do not need the edge cases: it does not
follow `cause`/`errors` into nested errors with different property sets, it throws on circular references and BigInt values, and
it produces a different shape for every kind of error.

A deliberate native `Error`/`cause` projection or an existing logger may already cover your needs. CORJ is useful when a
shared report schema, nested-cause representation and configurable size limits would otherwise require repeated custom code.

`caught-object-report-json` provides these reporting contracts:

- recovers from many property-access and serialization failures, and reports those secondary failures through `onError`;
- flattens nested errors into one array you can query with JSONPath-like tools, with cycles and shared errors reported once;
- keeps the whole report under a size limit while keeping it valid JSON with a known shape;
- omits what is predictable, so a plain `Error` costs one stack array and a version tag.

Getters, proxy traps and formatting hooks can execute during reporting. Catching thrown inspection errors and limiting output
size do not isolate CPU or memory or interrupt a nonterminating hook. Raw reports can expose stack paths and enumerable secrets;
they are not automatically appropriate for public responses or model context. Measure the final wrapped content with the target
tokenizer when context fit matters.

# Installation

Package: [caught-object-report-json on npm](https://www.npmjs.com/package/caught-object-report-json).

```sh
npm install caught-object-report-json
```

# Quick start

```typescript
import { makeCorj, makeCorjArray, CorjMaker } from 'caught-object-report-json';

// One-off, default options.
const report = makeCorj(caught);

// Same report as a flat array: the root first, then every nested error.
const rows = makeCorjArray(caught);

// Configure once, reuse everywhere.
const corj = new CorjMaker({ maxReportSize: 16_000, metadata: false });
const smaller = corj.makeReportObject(caught);
const derived = corj.with({ maxDepth: 1 }); // a new maker, the original is unchanged
```

For a plain `Error` the default report is just the stack and the version:

```json
{
  "stack": [
    "Error: Something went wrong",
    "    at Object.<anonymous> (/home/user/work-dir/app.ts:2:9)",
    "    at Module._compile (node:internal/modules/cjs/loader:1120:14)"
  ],
  "v": "corj/v0.13"
}
```

# LLM harnesses and agent graphs

An LLM harness can catch failures from model clients and tools at the boundary of each agent graph node. CORJ converts the
caught value into a report; the harness decides whether to retry, take a fallback edge, or end the run.

## Uniform exception data for self-correction

Self-correction needs feedback about the previous attempt. One SDK throws an `Error`, another wraps the useful detail in
`cause`, and a tool may throw a plain object. CORJ gives your correction boundary a consistent outer format: message and
stack fields, string/JSON views, and links to nested causes. A shared reader can inspect that format across tools;
the contents of SDK-specific `as_json` payloads still need application-specific interpretation.

For example, a tool's validation failure may identify a missing input in its message or nested cause. After selecting and
redacting that information, the harness can return it alongside the tool's input schema and attempted arguments. The LLM
can propose corrected arguments; the host validates them before another call. Uniform reporting removes per-SDK outer-shape
handling from this feedback boundary—it does not infer the right arguments or determine whether retrying is safe.

Keep the correction loop explicit:

1. Capture the failure with `CorjMaker` and associate it with the tool call and attempt in your own envelope.
2. Read the documented compact-field defaults or use `restoreExpectedValues`; account for missing or truncated diagnostics.
3. Select and redact useful feedback. Treat error text as untrusted data, never as instructions or authority.
4. Validate the proposed action, permissions, and retry safety; bound attempts and use a fallback when correction fails.
5. Check the new result against the task's success criteria before declaring recovery.

CORJ supplies the exception data. Your harness supplies feedback selection, correction, execution, and outcome checks.

## A typed failure boundary

The runnable example below wraps an ordinary node function, tests successful and failed model fixtures, and keeps failure
details in a typed result. No LLM API, credentials, or graph framework is needed. Save it as `harness.ts` in a project with
`caught-object-report-json`, TypeScript, and `@types/node` installed. With TypeScript 5, compile it using
`npx tsc harness.ts --strict --skipLibCheck --types node --target ES2022 --module commonjs --outDir out`, then run
`node out/harness.js` in a CommonJS project. With TypeScript 6 or newer, add `--ignoreConfig` when compiling this standalone file.
In this repository, run the [same example](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-12-agent-harness.ts)
with `npm run ts-file ./examples/example-12-agent-harness.ts` after type checking; that runner does not check types.

```typescript
import { strict as assert } from 'node:assert';
import { CorjMaker, restoreExpectedValues } from 'caught-object-report-json';
import type { CorjReport } from 'caught-object-report-json';

type Llm = { complete(prompt: string): Promise<string> };
type NodeResult<T> = { node: string } & (
  | { ok: true; value: T }
  | { ok: false; error: CorjReport }
);

const corj = new CorjMaker({
  maxReportSize: 4096,
  reportSizeUnit: 'utf8-bytes',
  maxDepth: 2,
  maxChildren: 4,
  metadata: true,
});

async function runNode<T>(
  node: string,
  operation: () => Promise<T>,
): Promise<NodeResult<T>> {
  try {
    return { node, ok: true, value: await operation() };
  } catch (caught: unknown) {
    return { node, ok: false, error: corj.makeReportObject(caught) };
  }
}

// Graph routing is application code, based on an explicit outcome.
function nextNode(result: NodeResult<string>): 'deliver' | 'fallback' {
  return result.ok ? 'deliver' : 'fallback';
}

async function main() {
  const workingModel: Llm = { complete: async () => 'A fixture answer.' };
  const failure = Object.assign(new Error('Model request failed'), {
    cause: { code: 'MODEL_UNAVAILABLE' },
  });
  failure.stack = 'Error: Model request failed'; // Stable diagnostic fixture.
  const failingModel: Llm = {
    complete: async () => {
      throw failure;
    },
  };

  const success = await runNode('answer', () => workingModel.complete('Hello'));
  assert.equal(nextNode(success), 'deliver');
  assert.deepEqual(success, {
    node: 'answer',
    ok: true,
    value: 'A fixture answer.',
  });

  const failed = await runNode('answer', () => failingModel.complete('Hello'));
  assert.equal(nextNode(failed), 'fallback');
  if (failed.ok) throw new Error('Expected the failing fixture to fail');

  const full = restoreExpectedValues(failed.error);
  assert.equal(full.message, 'Model request failed');
  assert.equal(full.children?.[0]?.path, '$.cause');
  assert.deepEqual(full.children?.[0]?.as_json, { code: 'MODEL_UNAVAILABLE' });
  assert.equal(failed.error.v, 'corj/v0.13');
  assert.ok(failed.error.$schema?.endsWith('/corj/v0.13/report-object.json'));
  assert.ok(Buffer.byteLength(JSON.stringify(failed.error), 'utf8') <= 4096);

  const oversized = await runNode('answer', async () => {
    throw 'x'.repeat(10000);
  });
  if (oversized.ok) throw new Error('Expected the oversized fixture to fail');
  assert.equal(oversized.error.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(oversized.error), 'utf8') <= 4096);

  // Harness metadata lives outside CORJ's report and its size budget.
  const evalRecord = { runId: 'eval-1', ...failed };
  assert.equal(evalRecord.node, 'answer');
  console.log('Success, fallback, nested-cause, and report-size evals passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

The model adapters are fixtures; the assertions test the harness boundary, not LLM output quality. In a real harness, wrap
your model or tool call with `runNode` and keep graph state, retries, and execution policy in the host. CORJ's `onError` callback
reports problems encountered while building a report, not the original model or tool failure.

CORJ's flattened **error graph** describes `cause` and `errors` relationships, including shared errors and cycles. Its report
IDs and paths are not agent graph node IDs or execution traces. Keep those identifiers in the surrounding record, as above.
The `metadata` option only controls `v` and `$schema`; schemas describe report structure, not retryability or task success.
Consumers must account for omitted fields, `truncated`, and `children_omitted` rather than assume every diagnostic is present.

Before sending a report to an LLM or exposing it through an API, redact secrets and select appropriate fields. CORJ does not
redact, authorize disclosure, or make error text safe to treat as instructions. `maxReportSize` limits the report's compact
JSON bytes or code units, not model tokens, surrounding envelope fields, or processing time. Restoring omitted values or
pretty-printing also increases size. Apply your harness's context budget to the final content you actually send.

# The report

## Fields

Fields appear in this order. A field is present only when it carries information: a missing field means the expected value
listed in [Omitted expected values](#omitted-expected-values), `null` means that producing the value failed.

| Field | Type | Meaning |
| --- | --- | --- |
| `id`, `path`, `level` | `string`, `string`, `number` | Nodes of the flattened tree only (children, and every element of an array report). `path` is a JSONPath from the root such as `$.cause.errors[0]`; the root is `$` at level `0`. |
| `truncated` | `true` | Content or child reports were cut to fit `maxReportSize`. On the root it covers the whole report. |
| `instanceof_error` | `boolean` | `caught instanceof Error`. Omitted when `true`. |
| `typeof` | `string` | `typeof caught`. Omitted when `"object"`. |
| `constructor_name` | `string \| null` | `caught.constructor.name` when it is a string. Omitted when it can be parsed from the first stack line. |
| `message` | `string \| null` | `caught.message` when it is a string. Omitted when it can be parsed from the first stack line. |
| `as_string` | `string \| null` | `String(caught)`, or the result of the object's own `toCorjAsString()`. Omitted when it equals the first stack line. |
| `as_json` | JSON `\| null` | `caught` serialized with a circular-safe, BigInt-safe, length-limited serializer, without the `children_sources` properties; or the result of the object's own `toCorjAsJson()`. `null` when the value has no JSON form (`undefined`, functions, symbols) or serializing threw. Omitted when `{}`. |
| `stack` | `string[] \| string \| null` | `caught.stack` when it is a string, as an array of lines by default. |
| `children_omitted` | `"max_depth" \| "max_children" \| "max_size" \| "not_inspected" \| "redacted"` | This node has nested errors that were not reported, and what stopped them: a limit, the `inspection` mode, or the `redact` policy. |
| `children` | `object[]` | Root of an object report only. Every nested error, flattened breadth-first. |
| `child_ids` | `string[]` | Nodes of the flattened tree only. IDs of this node's direct children. |
| `children_sources` | `string[]` | Root only. The properties children were collected from. Omitted when `["cause", "errors"]`. |
| `as_string_format` | `"String" \| ".toCorjAsString" \| "derived"` | How `as_string` was produced. `"derived"` means it was rebuilt from property descriptors, see [`inspection`](#reporting-without-running-the-caught-object). Omitted when `"String"`. |
| `as_json_format` | `"safe-stable-stringify-with-length-limit" \| ".toCorjAsJson"` | How `as_json` was produced. Omitted when the default. |
| `v` | `"corj/v0.13" \| "corj/v0.13-full"` | Root only. Report version, on by default (`metadata` option). |
| `$schema` | URL | Root only. JSON Schema of this report, off by default (`metadata` option). |

An object report is the root fields plus `children`. An array report (`makeCorjArray`) is a list whose first element is the
root, with `id`, `path`, `level` and `child_ids` like every other node; `v`, `$schema` and `children_sources` stay on that first
element only.

## Omitted expected values

Most caught objects are plain `Error` instances whose report fields hold the same values every time. Since `corj/v0.11` those
fields are left out when they hold their expected value. A missing field means the expected value; `null` still means that
producing the value failed.

| Field | Omitted when it is |
| --- | --- |
| `instanceof_error` | `true` |
| `typeof` | `"object"` |
| `as_json` | `{}` (no enumerable own properties, which is what an `Error` gives) |
| `as_string` | equal to the first line of `stack` |
| `constructor_name` and `message` | together with `as_string`, when that line is exactly `constructor_name + ": " + message` (or just `constructor_name` for an empty message) |
| `as_string_format` | `"String"` |
| `as_json_format` | `"safe-stable-stringify-with-length-limit"` |
| `children_sources` | `["cause", "errors"]` |

The rules apply to every node. `constructor_name` and `message` are parsed back out of the first stack line at the first `": "`,
and are only omitted when that parse reproduces both values exactly: a subclass whose `name` still says `Error`, a multi-line
message, or a message changed after the stack was formatted keeps its fields. When a caught object has neither field but its
stack line would parse, `as_string` is kept as the signal that there is nothing to parse.

The expected values are exported as `CORJ_EXPECTED_VALUES`. Pass `omitExpectedValues: false` to keep every field, or fill them
back in on the consuming side:

```typescript
import { restoreExpectedValues } from 'caught-object-report-json';

const full = restoreExpectedValues(makeCorj(caught));
// full.instanceof_error === true, full.typeof === 'object', full.as_json is {},
// full.as_string is the first stack line, full.constructor_name and full.message are parsed from it,
// full.as_string_format, full.as_json_format and full.children_sources hold their defaults.
```

`restoreExpectedValues` accepts object and array reports, returns a copy, and produces exactly what `omitExpectedValues: false`
would have produced. It does not add `v` or `$schema`, since a missing one means metadata was disabled.

## Two report versions

| `v` | Produced by | Base fields |
| --- | --- | --- |
| `corj/v0.13` | the default, `omitExpectedValues: true` | omitted when they hold the expected value |
| `corj/v0.13-full` | `omitExpectedValues: false`, or `restoreExpectedValues` | always present |

Each version has its own JSON Schema (see [Links](#links)); `$schema` points to the matching one.

## Stack as an array of lines

`stack` is stored as `caught.stack.split('\n')`, one element per line. Lines are easier to read in pretty-printed logs and to
query in log tools than one long string with escaped newlines. The split is literal: only `\n` separates, a `\r` before it stays
on its line, empty lines are kept, an empty stack becomes `[""]`. Only a string `stack` is reported; a `stack` getter that
throws yields `null`. Pass `stackFormat: 'string'` to keep the raw string.

## Nested errors

Children are collected from the properties in `childrenSources` (`cause` and `errors` by default). An array property contributes
one child per element; holes and `undefined` values are skipped, `null` and primitives are reported. The tree is walked
breadth-first, so IDs grow with the level, and it is flattened: in an object report `children` holds every node and each node
lists its direct children in `child_ids`; in an array report the root is the first element and links the same way.

Every object is reported once. When the same error is reachable through two parents, or a `cause` chain loops back, the second
occurrence is a reference to the first node's `id` in `child_ids`, and a reference to the root uses the root's id (`"root"` by
default). See [example 11](#11-cycles-and-shared-errors).

Three limits keep the walk bounded, and each marks the node whose children it cut with `children_omitted`:

| Limit | Default | `children_omitted` |
| --- | --- | --- |
| `maxDepth` | `5` levels below the root | `"max_depth"` |
| `maxChildren` | `100` nodes per report | `"max_children"` |
| `maxReportSize` | `100000` UTF-8 bytes for the whole report | `"max_size"` |

Nodes that fit are kept in discovery order, so shallow errors win over deep ones.

## Size limit

The **entire report** is limited to **100,000 UTF-8 bytes** of compact JSON by default. All fields, metadata, escaping,
punctuation and children share that budget; for `makeCorjArray` the limit applies to the complete array.

```typescript
const corj = new CorjMaker({ maxReportSize: 64_000, reportSizeUnit: 'utf8-bytes' });
```

`maxReportSize` must be a safe integer of at least 256, or `null` to disable the limit. `reportSizeUnit` is `'utf8-bytes'`
(`Buffer.byteLength(json, 'utf8')`) or `'utf16-code-units'` (`json.length`). Invalid values throw when the maker is built.

Reports that fit are preserved exactly. Oversized reports set `truncated: true` on the root and keep valid partial content:

- Strings retain a prefix followed by `[truncated]` (`CORJ_TRUNCATED_MARKER`).
- Arrays inside `as_json` retain leading elements and append the marker; objects retain leading properties and may add
  `"...": "[truncated]"`.
- Circular references inside `as_json` become `[circular]` (`CORJ_CIRCULAR_MARKER`).
- All content fields share the budget. The limiter reserves a small amount per field, retains a prefix of complete child
  reports, and spreads the remaining room across fields. Optional metadata is dropped before content is reduced further.
- Dropped children get `children_omitted: "max_size"` on their parent, and their IDs disappear from `child_ids`.
- If even a minimal report cannot fit (custom IDs alone can exceed the budget), the result is a root-only report with
  `as_string: "[truncated]"` and `as_json: null`.

Pretty-printing and fields added later by a logger increase the final size; reserve room for those. Child discovery and custom
formatters run before the budget is allocated, so input size still affects processing time. See
[example 10](#10-report-size-limit).

## Errors while reporting

Nothing the caught object does can make `makeCorj` throw. When a getter, proxy trap, `toString`, `toCorjAsJson` or serializer
throws, the affected field becomes `null` (or the affected child is skipped) and `onError` is called with the thrown value and a
context:

```typescript
type CorjErrorContext = {
  stage: 'prop-access' | 'as_string' | 'as_json' | 'children' | 'limit' | 'redact' | 'other';
  path: string; // JSONPath of the node being processed, '$' for the root
  key?: string; // report field being produced, when known
  prop?: string; // property of the caught object being accessed, when known
};
```

The default handler prints one `console.warn` line per failure. Pass `onError: () => {}` to silence it, or your own handler to
route failures into your logs. Only your own configuration throws: unknown option names and invalid option values raise
`TypeError` or `RangeError` from the `CorjMaker` constructor, `makeCorj` and `makeCorjArray`.

# Options

Every option is optional; missing ones keep their defaults. `CORJ_DEFAULT_OPTIONS` exports the defaults.

| Option | Default | Meaning |
| --- | --- | --- |
| `maxReportSize` | `100000` | Size limit of the compact JSON of the whole report. `null` disables it. |
| `reportSizeUnit` | `'utf8-bytes'` | Unit of `maxReportSize`; also `'utf16-code-units'`. |
| `omitExpectedValues` | `true` | Leave out fields holding their expected value. |
| `stackFormat` | `'lines'` | `'lines'` stores `stack.split('\n')`, `'string'` the raw string. |
| `inspection` | `'default'` | How much of the caught object may run while it is reported. `'no-invoke'` reads property descriptors only, see [Reporting without running the caught object](#reporting-without-running-the-caught-object). |
| `redact` | `null` | Field selection and redaction applied to everything the report emits, see [Redacting what the report emits](#redacting-what-the-report-emits). |
| `metadata` | `{ v: true, $schema: false }` | Which of `v` and `$schema` to add to the root. `true` adds both, `false` neither, an object sets them individually. |
| `maxDepth` | `5` | Deepest level of nested errors to report. `1` reports `caught.cause` but not `caught.cause.cause`. |
| `maxChildren` | `100` | Most child reports in one report. |
| `childrenSources` | `['cause', 'errors']` | Properties to collect children from. They are also left out of `as_json`. |
| `makeReportId` | `'root'` / discovery index | `(context: { index, level, path, caught }) => string`, called once per node; `index` is `-1` for the root. |
| `onError` | `console.warn` | `(caught, context) => void`, see [Errors while reporting](#errors-while-reporting). |

A caught object can take over its own representation by implementing `toCorjAsString(): string` and/or
`toCorjAsJson(): unknown`. Both are called with `this` bound to the object and one argument `{ path, options }`. A method that
throws is reported through `onError` and the default format is used; a method that returns an unusable value (a non-string, or a
value without a JSON form) falls back silently. The formats used are recorded in `as_string_format` and `as_json_format`.

# Redacting what the report emits

A diagnostic representation can carry credentials: in enumerable properties, in a message, in a stack, in `as_string`, in a
nested cause, and in the text of a secondary inspection failure. The package supplies the traversal and the transformation;
which content is sensitive stays your decision.

```typescript
const maker = new CorjMaker({
  redact: {
    keys: ['password', /^authorization$/i],
    paths: ['$.cause.config.headers'],
    patterns: [/sk-live-[A-Za-z0-9]+/g],
    replacement: '[redacted]',
    transform: (value, { prop }) => (prop === 'url' ? '[url]' : value),
  },
});
```

| Part | Meaning |
| --- | --- |
| `keys` | Property names CORJ never reads. A string matches exactly and is case-sensitive; use a `RegExp` for anything else. |
| `paths` | JSONPaths CORJ never reads, e.g. `'$.cause.config.headers'`. A string matches exactly. |
| `patterns` | `RegExp`s replaced in every string the report emits. Each must carry the `g` flag, or the policy is rejected. |
| `replacement` | What an excluded value and a pattern match become, used literally (`$&` and `$1` are not expanded). Defaults to `CORJ_REDACTED_MARKER` (`'[redacted]'`). |
| `transform` | `(value, context) => unknown`, the last word on every emitted value. Returning `undefined` leaves the field out. |

`keys` and `paths` are consulted **before** the property is read, so CORJ never invokes an excluded getter. They select
*properties*, not content — and error text is duplicated across `message`, `stack` and `as_string`, so excluding one read does
not remove the text from the others:

```typescript
makeCorj(new Error('boom SECRET'), { redact: { keys: ['message'] } });
// message: '[redacted]'   stack[0]: 'Error: boom SECRET'
```

Under the default inspection the caught object's own `toString`, and V8's stack formatting, read `message` themselves; no
policy can stop code CORJ did not call. **To remove content, use `patterns` or `transform`**; combine them with
`inspection: 'no-invoke'` if you also need the getter never to run. `patterns` and `transform`
act on values that were already produced. The `transform` context is `{ stage, path, key, prop }`, where `stage` is
`'prop-access'`, `'as_string'`, `'as_json'` or `'warning'`. (`'children'` reaches only the `keys`/`paths` matchers, never
`transform`, because a children source is excluded before it is read or not at all.)

## What the policy reaches

- every report field: `message`, `stack`, `constructor_name`, `as_string`, and every value **and property name** inside
  `as_json`, at any depth;
- `id`, but only when you supply `makeReportId`, because such an id may be built from the caught object. A **default**
  id — `"root"` and the discovery index — is structural, carries nothing from the caught object and is never
  rewritten, so `child_ids` keeps linking children to their reports. Two custom ids that scrub to the same text
  collide, and `child_ids` can then no longer tell those children apart — an inherent limit of scrubbing an
  identifier;
- the output of a caught object's own `toCorjAsString()` and `toCorjAsJson()`;
- every child report, not only the root;
- the line the default `onError` prints about a failure, which is otherwise built from the caught object's own text. A
  **custom** `onError` receives the caught object unchanged and must apply its own policy.

A children source the policy excludes is not followed: the node gets `children_omitted: "redacted"` instead of a child report.
Report schema, cycle handling and the `maxReportSize` budget are unaffected — redaction runs before the size limit is applied.
Two property names that scrub to the same text collapse into one key in `as_json`.

Because `keys` matches a property *name* wherever it appears, a broad name has a broad reach: `keys: ['name']` also blanks
`constructor_name`, which is read as `constructor.name`.

## Applying the policy to your own text

A **custom** `onError` gets the caught object unchanged, and anything else you log next to a report is text CORJ never sees.
`resolveCorjRedactPolicy` and `CorjRedactor` are the same mechanism the maker uses, exported so one policy covers both.
Resolve the policy once — the resolver validates it, returns `null` for `null` and `undefined`, and accepts an
already-resolved policy — then hand it to a `CorjRedactor` and call `#text` on every string you emit yourself. `#text` always
returns a string: a `transform` that drops the value, returns a non-string or throws yields the `replacement`. Use `#apply`
only for a value that may legitimately stop being a string; it returns the `CORJ_REDACT_DROP` symbol for a dropped field,
which the caller must map. `#text` never returns it.

```typescript
import {
  CorjMaker,
  CorjRedactor,
  resolveCorjRedactPolicy,
} from 'caught-object-report-json';

const redact = { patterns: [/sk-live-[A-Za-z0-9]+/g] };
const policy = resolveCorjRedactPolicy(redact);
const redactor = policy && new CorjRedactor(policy, () => undefined);

const maker = new CorjMaker({
  redact,
  onError: (caught, { stage, path }) => {
    const line = `corj ${stage} failed at ${path}: ${String(caught)}`;
    // `stage: 'warning'` is the redaction stage for text a handler prints.
    logger.warn(
      redactor ? redactor.text(line, { stage: 'warning', path }) : line,
    );
  },
});
```

## When the policy itself fails

A throwing matcher or `transform` fails closed. The value it was asked about becomes the replacement rather than passing
through, and the failure is reported once through `onError` with `stage: 'redact'`. Reporting that failure does not consult the
same policy again, so a policy that always throws cannot recurse.

## What a policy cannot do

- It cannot discover a secret it was not told about. `keys`, `paths` and `patterns` are your configuration, not detection.
- It does not make error text trustworthy. A redacted message is still text a caught object controlled: it is diagnostic
  material to read, never instructions to follow.
- Disclosure policy stays application-owned. This package supplies the traversal; it ships no default list of sensitive names.

# Reporting without running the caught object

By default, describing a caught object runs some of its code: reading `message` calls a getter if one is defined, `as_string`
calls `toString`, `as_json` calls `toJSON`, and both `toCorjAsString` and `toCorjAsJson` are used when present. `maxReportSize`
bounds how much output that produces; it cannot interrupt a synchronous hook that never returns.

`inspection: 'no-invoke'` reads values off property descriptors and calls none of those hooks.

```typescript
let inspected = 0;
const caught = {
  get message() {
    inspected++;
    return 'failure';
  },
  plain: 'kept',
};

makeCorj(caught, { inspection: 'no-invoke' });
console.log(inspected); // 0
```

produces

```json
{
  "instanceof_error": false,
  "constructor_name": "Object",
  "message": "[not-inspected]",
  "as_string": "[object Object]",
  "as_json": { "message": "[not-inspected]", "plain": "kept" },
  "as_string_format": "derived",
  "v": "corj/v0.13"
}
```

## What the mode does

| | `'default'` | `'no-invoke'` |
| --- | --- | --- |
| a getter on `message`, `stack`, `constructor`, `cause`, `errors` | invoked | replaced with `CORJ_OMITTED_MARKER` |
| a getter reached while building `as_json` | invoked | replaced with `CORJ_OMITTED_MARKER` |
| `toJSON`, `toCorjAsJson` | used | never called |
| `toString`, `toCorjAsString` | used | never called; `as_string` is derived instead |
| a children source behind a getter | followed | left unread, the node gets `children_omitted: "not_inspected"` |

`inspection` and `redact` compose: `redact` decides what may be reported, `inspection` decides how much may run to report it.

`CORJ_OMITTED_MARKER` (`"[not-inspected]"`) marks content that exists but was not read. It is distinct from an absent field,
which means the caught object never had that property, and from `null`, which still means that producing the value threw.

`as_string` is rebuilt rather than obtained, and `as_string_format` records this as `"derived"`:

- a caught object whose `toString` is `Error.prototype.toString` — every ordinary error — is rendered as `name: message` from
  values read off descriptors. This matches the built-in whenever `name` and `message` are strings or absent; the built-in
  coerces other types (`name: 404` gives `404: …`) and this mode treats them as absent instead;
- a caught object whose `toString` is `Object.prototype.toString` is rendered as `[object Tag]`, where the tag comes from a
  `Symbol.toStringTag` data property or falls back to `Object`, `Array` or `Function`. The built-in is not called, because it
  performs a `[[Get]]` that a `Proxy` would turn into a `get` trap;
- any other `toString` belongs to the caught object, so `as_string` becomes the marker;
- primitives are stringified normally.

Native errors keep their `stack` on V8 (Node, Chromium, Bun), which exposes `stack` as an own accessor property; `no-invoke`
calls that one engine-provided getter, identified by reference, and no other accessor. Two cases withhold it instead:

- V8 formats the stack string on first read, and formatting reads `name` and `message`. If either is an accessor, calling the
  engine's getter would run the caught object's code, so `stack` becomes the marker rather than the mode breaking its promise.
- The getter is identified by reference, so an error from another realm (a `vm` context, an iframe) is not recognized and its
  `stack` and `as_string` are both the marker. On an engine that exposes `stack` as a data property, it is read normally.

`Error.prepareStackTrace` is a global application hook rather than anything the caught object owns; if your process installs
one it still runs during formatting, and no in-process option can prevent that.

Cause chains, `errors` arrays, cycle handling and the report size limit behave as they do by default.

## What the mode is not

It is not a sandbox, and `maxReportSize` is not a timeout.

- Reading a descriptor off a `Proxy` runs its `getOwnPropertyDescriptor` trap, walking the prototype chain runs its
  `getPrototypeOf` trap, and listing properties for `as_json` runs its `ownKeys` trap. A trap that never returns still hangs
  the caller, and a trap can fabricate the descriptors it returns.
- For hard CPU isolation, produce the report behind a worker or process boundary. No synchronous option can provide it.
- The mode reduces fidelity on purpose. A `Date`, `RegExp`, `URL` or typed array thrown directly carries its own `toString`,
  so its `as_string` is the marker; a `Map`, `Set` or `Promise` inherits `Object.prototype.toString` and a
  `Symbol.toStringTag` data property, so it reads `[object Map]`. Lazily computed properties are reported as the marker
  rather than as their values.

# Examples

## 1. [Syntax error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-1-syntax-error.ts)

<sub>(Run with `npm run ts-file ./examples/example-1-syntax-error.ts`)</sub>

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  caught.heh = 123n;
  caught.heh_1 = new Number(123);
  const report = makeCorj(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "as_json": {
    "heh": 123,
    "heh_1": {}
  },
  "stack": [
    "SyntaxError: \"undefined\" is not valid JSON",
    "    at JSON.parse (<anonymous>)",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-1-syntax-error.ts:6:8)",
    "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
    "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
    "    at node:internal/modules/cjs/loader:2060:10",
    "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
    "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
    "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)"
  ],
  "v": "corj/v0.13"
}
```

## 2. [Axios error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-2-axios-error.ts)

`AxiosError#toJSON` does not include response headers and response
data ([issue](https://github.com/axios/axios/issues/4836)), so you'll have to add it yourself.

<sub>(Run with `npm run ts-file ./examples/example-2-axios-error.ts`)</sub>

```typescript
const axiosClient = axios.create();

class AxiosErrorWrapper extends AxiosError {
  error: AxiosError;

  constructor(error: AxiosError) {
    super(
      error.message,
      error.code,
      error.config,
      error.request,
      error.response,
    );
    this.error = error;
  }

  override toJSON = function (this: AxiosErrorWrapper) {
    return {
      ...this.error.toJSON(),
      ...(!this.error.response
        ? {}
        : {
          response_data: this.error.response.data,
          response_headers: this.error.response.headers,
        }),
    };
  };
}

axiosClient.interceptors.response.use(undefined, (error) => {
  if (error instanceof AxiosError) {
    return Promise.reject(new AxiosErrorWrapper(error));
  }
  return Promise.reject(error);
});

(async () => {
  try {
    await axiosClient.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    const report = makeCorj(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();
```

prints

```json
{
  "constructor_name": "AxiosErrorWrapper",
  "message": "Request failed with status code 404",
  "as_json": {
    "message": "Request failed with status code 404",
    "name": "AxiosError",
    "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/user/work-dir/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/user/work-dir/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)",
    "config": {
      "transitional": {
        "silentJSONParsing": true,
        "forcedJSONParsing": true,
        "clarifyTimeoutError": false
      },
      "adapter": [
        "xhr",
        "http"
      ],
      "timeout": 0,
      "xsrfCookieName": "XSRF-TOKEN",
      "xsrfHeaderName": "X-XSRF-TOKEN",
      "maxContentLength": -1,
      "maxBodyLength": -1,
      "env": {},
      "headers": {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "axios/1.2.1",
        "Accept-Encoding": "gzip, compress, deflate, br"
      },
      "method": "get",
      "url": "https://reqres.in/api/users/23"
    },
    "code": "ERR_BAD_REQUEST",
    "status": 404,
    "response_data": {},
    "response_headers": {
      "date": "Sat, 28 Jan 2023 19:10:32 GMT",
      "content-type": "application/json; charset=utf-8",
      "content-length": "2",
      "connection": "close",
      "x-powered-by": "Express",
      "server": "cloudflare"
    }
  },
  "stack": [
    "AxiosError: Request failed with status code 404",
    "    at /home/user/work-dir/caught-object-report-json/examples/example-2-axios-error.ts:35:27",
    "    at processTicksAndRejections (node:internal/process/task_queues:95:5)"
  ],
  "v": "corj/v0.13"
}
```

## 3. [Errors while reporting](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-3-not-error-object.ts)

A caught object whose `message` getter throws. The field becomes `null`, the rest of the report is produced, and `onError`
receives the failure with its context.

<sub>(Run with `npm run ts-file ./examples/example-3-not-error-object.ts`)</sub>

```typescript
class Hostile {
  get message(): string {
    throw new Error('message getter threw');
  }
}

try {
  throw new Hostile();
} catch (caught: unknown) {
  const report = makeCorj(caught, {
    onError: (error, context) => {
      console.log('onError::', { error: String(error), context });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints from the `onError` callback

```
onError:: {
  error: 'Error: message getter threw',
  context: { stage: 'prop-access', path: '$', key: 'message', prop: 'message' }
}
```

and then prints from the catch block

```json
{
  "instanceof_error": false,
  "constructor_name": "Hostile",
  "message": null,
  "as_string": "[object Object]",
  "v": "corj/v0.13"
}
```

## 4. [Metadata fields](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-4-metadata-fields.ts)

<sub>(Run with `npm run ts-file ./examples/example-4-metadata-fields.ts`)</sub>

```typescript
try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = makeCorj(caught, {
    metadata: { $schema: true, v: false },
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "stack": [
    "Error: Hi, I'm a regular Error object.",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-4-metadata-fields.ts:4:9)",
    "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
    "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
    "    at node:internal/modules/cjs/loader:2060:10",
    "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
    "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
    "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
    "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
  ],
  "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13/report-object.json"
}
```

## 5. [Nested errors: Basic](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-5-nested-errors-1-basic.ts)

An `AggregateError` with both `errors` and `cause` set. Children carry `id`, `path` and `level`; a child that is not an
`Error` keeps the fields that say so.

<sub>(Run with `npm run ts-file ./examples/example-5-nested-errors-1-basic.ts`)</sub>

```typescript
const caught = new AggregateError(
  [
    new Error('AggregateError child 0'),
    'AggregateError child 1 (not an Error object)',
  ],
  'AggregateError message',
  { cause: new Error('Cause Error object') },
);
const report = makeCorj(caught, { metadata: false });
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "stack": [
    "AggregateError: AggregateError message",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:5:16)",
    "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
    "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
    "    at node:internal/modules/cjs/loader:2060:10",
    "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
    "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
    "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
    "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "stack": [
        "Error: Cause Error object",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:11:12)",
        "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
        "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
        "    at node:internal/modules/cjs/loader:2060:10",
        "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
        "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
        "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
        "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
        "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
        "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
      ]
    },
    {
      "id": "1",
      "path": "$.errors[0]",
      "level": 1,
      "stack": [
        "Error: AggregateError child 0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:7:5)",
        "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
        "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
        "    at node:internal/modules/cjs/loader:2060:10",
        "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
        "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
        "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
        "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
        "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
        "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
      ]
    },
    {
      "id": "2",
      "path": "$.errors[1]",
      "level": 1,
      "instanceof_error": false,
      "typeof": "string",
      "constructor_name": "String",
      "as_string": "AggregateError child 1 (not an Error object)",
      "as_json": "AggregateError child 1 (not an Error object)"
    }
  ]
}
```

## 6. [Nested errors: Nesting levels](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-6-nested-errors-2-nesting-levels.ts)

- Because of `maxDepth: 2`, "lvl 3" errors are not included, and the node that has them gets `children_omitted: "max_depth"`.
- Because `childrenSources` includes `nestedError`, that property becomes a child and is excluded from `as_json`; the
  non-default list is reported as `children_sources`.
- Nodes list their direct children in `child_ids`, since the tree is flattened.
- A value found under a child source that is an array yields one child per element.

<sub>(Run with `npm run ts-file ./examples/example-6-nested-errors-2-nesting-levels.ts`)</sub>

```typescript
const caught = new Error("lvl 0", {
  cause: new Error("lvl 1; obj 0", {
    cause: [
      new Error("lvl 2; obj 0.0", { cause: new Error("lvl 3; obj 0.0.0") }),
      new Error("lvl 2; obj 0.1")
    ]
  })
});
caught.nestedError = 'lvl 1; obj 1';
caught.extraField = 'error info';
const report = makeCorj(caught, {
  maxDepth: 2,
  childrenSources: ['cause', 'errors', 'nestedError'],
  metadata: false,
});
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "as_json": {
    "extraField": "error info"
  },
  "stack": [
    "Error: lvl 0",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:5:16)",
    "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
    "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
    "    at node:internal/modules/cjs/loader:2060:10",
    "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
    "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
    "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
    "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "stack": [
        "Error: lvl 1; obj 0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:9:5)",
        "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
        "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
        "    at node:internal/modules/cjs/loader:2060:10",
        "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
        "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
        "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
        "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
        "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
        "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
      ],
      "child_ids": [
        "2",
        "3"
      ]
    },
    {
      "id": "1",
      "path": "$.nestedError",
      "level": 1,
      "instanceof_error": false,
      "typeof": "string",
      "constructor_name": "String",
      "as_string": "lvl 1; obj 1",
      "as_json": "lvl 1; obj 1"
    },
    {
      "id": "2",
      "path": "$.cause.cause[0]",
      "level": 2,
      "stack": [
        "Error: lvl 2; obj 0.0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:13:9)",
        "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
        "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
        "    at node:internal/modules/cjs/loader:2060:10",
        "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
        "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
        "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
        "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
        "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
        "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
      ],
      "children_omitted": "max_depth"
    },
    {
      "id": "3",
      "path": "$.cause.cause[1]",
      "level": 2,
      "stack": [
        "Error: lvl 2; obj 0.1",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:16:9)",
        "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
        "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
        "    at node:internal/modules/cjs/loader:2060:10",
        "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
        "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
        "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
        "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
        "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
        "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
      ]
    }
  ],
  "children_sources": [
    "cause",
    "errors",
    "nestedError"
  ]
}
```

## 7. [Using CorjMaker instance to provide options just once](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-7-using-corj-maker-instance.ts)

<sub>(Run with `npm run ts-file ./examples/example-7-using-corj-maker-instance.ts`)</sub>

```typescript
const corj = new CorjMaker({ metadata: false });

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = corj.makeReportObject(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "stack": [
    "Error: Hi, I'm a regular Error object.",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-7-using-corj-maker-instance.ts:6:9)",
    "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
    "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
    "    at node:internal/modules/cjs/loader:2060:10",
    "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
    "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
    "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
    "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)",
    "    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)",
    "    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)"
  ]
}
```

## 8. [Flat array report with Zod error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-8-zod-error-flat-report.ts)

`ZodError` has nested errors in the `errors` prop. The array report lists the root first and links it to its children through
`child_ids`.

<sub>(Run with `npm run ts-file ./examples/example-8-zod-error-flat-report.ts`)</sub>

```typescript
const corj = new CorjMaker({ metadata: false });

const User = zod.object({
  name: zod.string(),
  age: zod.number().min(-250).max(250),
});

try {
  const validatedStallmanObject = User.parse({ name: 'Richard Stallman' });
  console.log('Hello, validated', validatedStallmanObject.name);
} catch (caught: unknown) {
  const reportArray = corj.makeReportArray(caught);
  console.log(JSON.stringify(reportArray, null, 2));
}
```

prints

```json
[
  {
    "id": "root",
    "path": "$",
    "level": 0,
    "constructor_name": "ZodError",
    "message": "[\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"number\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"age\"\n    ],\n    \"message\": \"Required\"\n  }\n]",
    "as_string": "[\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"number\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"age\"\n    ],\n    \"message\": \"Required\"\n  }\n]",
    "as_json": {
      "issues": [
        {
          "code": "invalid_type",
          "expected": "number",
          "received": "undefined",
          "path": [
            "age"
          ],
          "message": "Required"
        }
      ],
      "name": "ZodError"
    },
    "stack": [
      "ZodError: [",
      "  {",
      "    \"code\": \"invalid_type\",",
      "    \"expected\": \"number\",",
      "    \"received\": \"undefined\",",
      "    \"path\": [",
      "      \"age\"",
      "    ],",
      "    \"message\": \"Required\"",
      "  }",
      "]",
      "    at Object.get error [as error] (/home/user/work-dir/caught-object-report-json/node_modules/zod/lib/types.js:55:31)",
      "    at ZodObject.parse (/home/user/work-dir/caught-object-report-json/node_modules/zod/lib/types.js:160:22)",
      "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-8-zod-error-flat-report.ts:12:40)",
      "    at Module._compile (node:internal/modules/cjs/loader:1929:14)",
      "    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)",
      "    at node:internal/modules/cjs/loader:2060:10",
      "    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)",
      "    at Module.load (node:internal/modules/cjs/loader:1651:32)",
      "    at Module._load (node:internal/modules/cjs/loader:1443:12)",
      "    at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)"
    ],
    "child_ids": [
      "0"
    ]
  },
  {
    "id": "0",
    "path": "$.errors[0]",
    "level": 1,
    "instanceof_error": false,
    "constructor_name": "Object",
    "message": "Required",
    "as_string": "[object Object]",
    "as_json": {
      "code": "invalid_type",
      "expected": "number",
      "received": "undefined",
      "path": [
        "age"
      ],
      "message": "Required"
    }
  }
]
```

## 9. [Winston integration](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-9-winston-integration.ts)

<sub>(Run with `npm run ts-file ./examples/example-9-winston-integration.ts`)</sub>

This integration uses a feature of `winston` that allows to specify transports that will react to `uncaughtException`
event emitted by the `process` - https://www.npmjs.com/package/winston#exceptions

Integration by monkey patching the exported class is not pretty, but this is the only way I found to make it work.

This method keeps all the processing that is done by `winston` for the error object, but it replaces the `message` prop
on the resulting JSON with an extended report instead of error message + stack that `winston` uses by default. Also, winston
breaks when you `throw null` or `throw undefined`; `caught-object-report-json` saves you from this edge case.

```typescript
import { createLogger, transports, ExceptionHandler } from 'winston';

const origGetAllInfo = ExceptionHandler.prototype.getAllInfo;
ExceptionHandler.prototype.getAllInfo = function getAllInfoExtended(
  err: unknown,
): object {
  const errorInfoByWinston = origGetAllInfo.call(
    ExceptionHandler.prototype,
    err instanceof Error
      ? err
      : `I'm a hacky stub error that does not break getAllInfo method, unlike undefined or null.`,
  );
  return {
    ...errorInfoByWinston,
    error: err,
    message: makeCorj(err),
  };
};

const logger = createLogger({
  transports: [new transports.Console()],
  exceptionHandlers: [new transports.Console()],
});

logger.info({ 'just-an-info-message': 'hey' });

throw new AggregateError([new Error('cause 1'), new Error('cause 2'), null]);
```

prints an inline version of a JSON log entry whose `message` is the report:

```json
{
  "level": "error",
  "exception": true,
  "message": {
    "stack": [
      "AggregateError",
      "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-9-winston-integration.ts:30:7)",
      "    at Module._compile (node:internal/modules/cjs/loader:1267:14)"
    ],
    "children": [
      {
        "id": "0",
        "path": "$.errors[0]",
        "level": 1,
        "stack": [
          "Error: cause 1",
          "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-9-winston-integration.ts:30:27)",
          "    at Module._compile (node:internal/modules/cjs/loader:1267:14)"
        ]
      },
      {
        "id": "1",
        "path": "$.errors[1]",
        "level": 1,
        "stack": [
          "Error: cause 2",
          "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-9-winston-integration.ts:30:49)",
          "    at Module._compile (node:internal/modules/cjs/loader:1267:14)"
        ]
      },
      {
        "id": "2",
        "path": "$.errors[2]",
        "level": 1,
        "instanceof_error": false,
        "as_string": "null",
        "as_json": null
      }
    ],
    "v": "corj/v0.13"
  },
  "os": { "loadavg": [1.04, 1.3, 1.16], "uptime": 262285.15 },
  "process": { "pid": 88513, "version": "v20.1.0" }
}
```

## 10. [Report size limit](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-10-report-size-limit.ts)

<sub>(Run with `npm run ts-file ./examples/example-10-report-size-limit.ts`)</sub>

```typescript
const report = makeCorj(
  { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
  {
    maxReportSize: 256,
    reportSizeUnit: 'utf8-bytes',
    metadata: false,
  },
);

const json = JSON.stringify(report);
console.log(Buffer.byteLength(json, 'utf8')); // 252
```

The complete result, formatted for readability; its **compact serialization** is 252 bytes:

```json
{
  "truncated": true,
  "instanceof_error": false,
  "constructor_name": "Object",
  "as_string": "[object Object]",
  "as_json": {
    "code": "FETCH_FAILED",
    "attempts": [
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "[truncated]"
    ]
  }
}
```

## 11. [Cycles and shared errors](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-11-cycles-and-shared-errors.ts)

The same `shared` error is the `cause` of two siblings, and its own `cause` points back at the root. Every object is reported
once; later occurrences are references in `child_ids`.

<sub>(Run with `npm run ts-file ./examples/example-11-cycles-and-shared-errors.ts`)</sub>

```typescript
const shared = new Error('shared cause');
const first = new Error('first', { cause: shared });
const second = new Error('second', { cause: shared });
const root = new AggregateError([first, second], 'root');
shared.cause = root;

const rows = makeCorjArray(root, { metadata: false });
console.log(JSON.stringify(rows.map(({ stack, ...rest }) => rest), null, 2));
```

prints (stacks removed for brevity)

```json
[
  { "id": "root", "path": "$", "level": 0, "child_ids": ["0", "1"] },
  { "id": "0", "path": "$.errors[0]", "level": 1, "child_ids": ["2"] },
  { "id": "1", "path": "$.errors[1]", "level": 1, "child_ids": ["2"] },
  { "id": "2", "path": "$.errors[0].cause", "level": 2, "child_ids": ["root"] }
]
```

# [API](https://dany-fedorov.github.io/caught-object-report-json/modules.html)

#### `makeCorj(caught, options?): CorjReport`

`CorjMaker#makeReportObject` with default options and the given overrides.

#### `makeCorjArray(caught, options?): CorjReportChild[]`

`CorjMaker#makeReportArray` with default options and the given overrides.

#### `new CorjMaker(options?)`

Validates and freezes the options once, exposes them as `maker.options`, and produces reports with `makeReportObject(caught)`
and `makeReportArray(caught)`. `maker.with(options)` returns a new maker with the overrides applied on top.

#### `restoreExpectedValues(report)`

Fills omitted expected values back in, turning a `corj/v0.13` report into its `corj/v0.13-full` form.

#### `resolveCorjRedactPolicy(input)`

Validates a redaction policy and returns it frozen, `null` for `null` and `undefined`, and throws a `TypeError` for anything
invalid. An already-resolved policy is accepted and returned resolved.

#### `new CorjRedactor(policy, onFailure)`

Applies one resolved policy. `#text(value, context)` scrubs a string you emit yourself and always returns a string; `#apply`
may return the `CORJ_REDACT_DROP` symbol. See
[Applying the policy to your own text](#applying-the-policy-to-your-own-text).

#### Types

`CorjReport`, `CorjReportChild`, `CorjReportBase`, `CorjOptions`, `CorjOptionsInput`, `CorjErrorContext`,
`CorjErrorHandler`, `CorjChildrenOmitted`, `CorjJsonValue`, `CorjVersion`, `CorjSchemaLink`, `CorjReportSizeUnit`,
`CorjStackFormat`, `CorjMetadata`, `CorjReportIdContext`, `CorjAsStringFormat`, `CorjAsJsonFormat`, `CorjTypeof`,
`CorjInspection`, `CorjRedactPolicy`, `CorjRedactPolicyInput`, `CorjRedactContext`, `CorjRedactTransform`,
`CorjRedactStage`.
`CaughtObjectReportJson`, `CaughtObjectReportJsonChild` and `CorjMakerOptions` remain as deprecated aliases.

#### Constants

`CORJ_DEFAULT_OPTIONS`, `CORJ_EXPECTED_VALUES`, `CORJ_TRUNCATED_MARKER`, `CORJ_CIRCULAR_MARKER`, `CORJ_OMITTED_MARKER`,
`CORJ_REDACTED_MARKER`, `CORJ_VERSION`, `CORJ_VERSION_FULL`, and the four `CORJ_*_JSON_SCHEMA_LINK` constants.

# Supported runtimes

The package publishes a CommonJS build with TypeScript declarations. Every claim below is verified in CI by
`npm run test-consumers`, which builds the package, packs it with `npm pack`, installs the tarball into isolated consumer
projects and runs the same ten scenarios — ordinary errors, cause chains, `errors` arrays, primitive throws, bounded reports,
throwing inspection hooks, `inspection: 'no-invoke'`, a redaction policy, cycles and the array report shape — in each one.
No check imports workspace source.

| Consumer | Verified |
| --- | --- |
| Node, `require('caught-object-report-json')` | yes |
| Node, `import` of the CommonJS build through Node's ESM interop | yes |
| Bun, `import` | yes |
| Browser, bundled by Vite and executed in Chromium | yes |

The browser check builds with a bare Vite config — no `define`, no aliases, no polyfill plugin — and fails if `process`,
`Buffer`, `global`, `require` or `__dirname` is present in the page, so nothing may depend on a Node global reaching the
browser by accident.

## Imports

Named imports work everywhere:

```typescript
import { makeCorj, CorjMaker } from 'caught-object-report-json';
```

A default import gives you the module namespace at runtime in Node ESM, in Bun and through any bundler. For types it depends on
the resolution mode, because the package exports named bindings and no `default`:

| `moduleResolution` | named imports | `import corj from '...'` |
| --- | --- | --- |
| `node` | yes | needs `esModuleInterop` |
| `node16` | yes | yes |
| `nodenext` | yes | yes |
| `bundler` | yes | yes |

All four are checked under `--strict`, with no path mapping, against the installed artifact.

## Tested versions

CI runs the checks on Node 20 and Node 24, with the Bun, TypeScript, Vite and Playwright versions pinned in
`tests/consumers/run.mjs`; the driver prints the exact versions it used at the top of every run.

The published build targets CommonJS. There is no ESM build and no `exports` map, because the tests above show the current
layout resolves correctly in every environment listed — not because the layout was judged ideal. One consequence is that every
internal module is reachable as a deep import (`caught-object-report-json/report-size` and so on); treat those as private, as
adding an `exports` map in a future major will close them.

Not covered by these tests, and therefore not supported: Deno, Cloudflare Workers and other edge runtimes, and React Native.

# Report schema history

| Version | Change |
| --- | --- |
| `corj/v0.13` | Shipped with 10.0.0: `as_string_format` gained `"derived"`; `children_omitted` gained `"not_inspected"` and `"redacted"`. Both appear only when `inspection` or `redact` is configured. |
| `corj/v0.12` | Shipped with 9.0.0: shorter API, bounded child discovery, omitted expected values. |

Each schema pins its own `v`, so a reader that validates against a schema URL moves with the format; a reader that ignores `v`
does not have to.

# Upgrading from v9

10.0.0 is a major only because the report format moved to `corj/v0.13` (`corj/v0.13-full` for the full form). **Nothing
changes for a caller that configures neither `redact` nor `inspection`:** no option was renamed or removed, and the output of
every 9.x call is identical apart from `v`.

- A reader that validates against the `corj/v0.12` schema URL must move to the `corj/v0.13` URL. One that ignores `v` needs no
  change.
- `children_omitted` gained `"not_inspected"` (from `inspection: 'no-invoke'`) and `"redacted"` (from a `redact` policy that
  excludes a children source); `as_string_format` gained `"derived"`. All three appear only when the option that produces them
  is configured.
- In TypeScript, `CorjErrorStage` gained `'redact'` and `CorjChildrenOmitted` gained those two values, so an exhaustive
  `switch` over either needs a new arm.
- New in 10.0.0: the `redact` and `inspection` options, and the `resolveCorjRedactPolicy` and `CorjRedactor` exports that let a
  custom `onError` apply the same policy.

# Upgrading from v8

9.0.0 renamed the API and 10.0.0 kept those names, so a v8 codebase moves to 10.0.0 in one step. Reports use schema
`corj/v0.13`. The runtime rejects the old option names with a `TypeError` that lists the valid ones.

| v8 | 10.0.0 |
| --- | --- |
| `makeCaughtObjectReportJson`, `bakeCorj` | `makeCorj` |
| `makeCaughtObjectReportJsonArray`, `bakeCorjArray` | `makeCorjArray` |
| `CorjMaker.withDefaults(options)`, `new CorjMaker(fullOptions)` | `new CorjMaker(options)` |
| `maker.cloneWith(options)` | `maker.with(options)` |
| `maker.makeReportObjectEntries`, `maker.makeReportArrayEntries` | removed; `Object.entries(maker.makeReportObject(caught))` keeps the same order |
| `CORJ_MAKER_DEFAULT_OPTIONS` | `CORJ_DEFAULT_OPTIONS` |
| `maxChildrenLevel` | `maxDepth`; also new `maxChildren` (default `100`) |
| `parseStackToArray: true/false` | `stackFormat: 'lines' / 'string'` |
| `metadataFields`, `childrenMetadataFields` | `metadata: boolean \| { v?, $schema? }`, root only. `as_string_format`, `as_json_format` and `children_sources` are no longer metadata: they appear whenever they hold a non-default value |
| `asJsonFormatsToApply`, `asStringFormatsToApply`, `CORJ_AS_*_FORMAT_*` | removed; `toCorjAsJson` / `toCorjAsString` are always tried first |
| `onCaughtMaking(caught, { reason, ... })`, `printWarningsOnUnhandledErrors` | `onError(caught, { stage, path, key?, prop? })`; silence with `onError: () => {}` |
| `children` on child nodes and on the array root (ID lists) | `child_ids` |
| `children_omitted_reason` (free text), `CORJ_NESTED_OMITTED_REASONS` | `children_omitted: 'max_depth' \| 'max_children' \| 'max_size'` |
| `[caught-object-report-json: Truncated]`, `[caught-object-report-json: Circular]` | `[truncated]`, `[circular]` (`CORJ_TRUNCATED_MARKER`, `CORJ_CIRCULAR_MARKER`) |
| `null` entries allowed in `children` | never produced |
| a repeated object reported once per occurrence, cycles expanded to `maxChildrenLevel` | reported once, then referenced by `id` in `child_ids` |
| `CaughtObjectReportJson`, `CaughtObjectReportJsonChild`, `CorjMakerOptions` | `CorjReport`, `CorjReportChild`, `CorjOptions` (old names kept as deprecated aliases) |

# Links

##### GitHub

https://github.com/dany-fedorov/caught-object-report-json.git

##### Npm

https://www.npmjs.com/package/caught-object-report-json

##### Deno Land

https://deno.land/x/caught_object_report_json (mirrored, not covered by the
[consumption tests](#supported-runtimes))

##### CORJ JSON Schema - corj/v0.13

- Definitions - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13/definitions.json
- Report Object - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13/report-object.json
- Report Array - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13/report-array.json

##### CORJ JSON Schema - corj/v0.13-full

- Definitions - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13-full/definitions.json
- Report Object - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13-full/report-object.json
- Report Array - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.13-full/report-array.json
