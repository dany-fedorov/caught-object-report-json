# API reference

Every public export of `caught-object-report-json`, with its signature, what it accepts, what it throws, and a runnable
example. The snippets are plain Node and were run against version 15; ids and hashes in the printed output vary per run and
are shortened to `…`; stacks are cut to one frame.

Generated TypeDoc for the same surface, with source links, is at
<https://dany-fedorov.github.io/caught-object-report-json/modules.html>. The JSDoc in the shipped `index.d.ts` carries the
same information for an editor or an agent reading `node_modules`.

- [Imports](#imports)
- [Root functions](#root-functions) (stateless utilities)
  - [`Corj.makeCaughtObjectReport`](#corjmakecaughtobjectreportcaught-input)
  - [`Corj.makeCaughtObjectReportArray`](#corjmakecaughtobjectreportarraycaught-input)
  - [`Corj.restoreCaughtObjectReportExpectedValues`](#corjrestorecaughtobjectreportexpectedvaluesreport)
  - [`Corj.resolveCaughtObjectReportRedactPolicy`](#corjresolvecaughtobjectreportredactpolicyinput)
- [`CorjMaker`](#corjmaker) (configure once, reuse)
  - [`new CorjMaker`](#new-corjcorjmakeroptions)
  - [`maker.options`](#makeroptions)
  - [`maker.makeReport`](#makermakereportcaught-call)
  - [`maker.makeReportArray`](#makermakereportarraycaught-call)
  - [`maker.withOptions`](#makerwithoptionsoptions)
  - [`maker.makeFingerprint`](#makermakefingerprintcaught-options)
  - [`maker.makeJsonView`](#makermakejsonviewvalue-options)
  - [`maker.scrubText`](#makerscrubtexttext-where)
- [The caught object's side: `toCorjAsString` and `toCorjAsJson`](#the-caught-objects-side-tocorjasstring-and-tocorjasjson)
- [Inputs](#inputs)
  - [`CorjOptionsInput`](#corjoptionsinput)
  - [`CorjCallInput`](#corjcallinput)
  - [`CorjReportInput`](#corjreportinput)
  - [`CorjRedactPolicyInput`](#corjredactpolicyinput)
- [Outputs](#outputs)
  - [`CorjReport`](#corjreport)
  - [`CorjReportNode`](#corjreportnode)
  - [`CorjReportingError` and `CorjContext`](#corjreportingerror-and-corjcontext)
  - [`CorjJsonView`](#corjjsonview)
- [All exported types](#all-exported-types)
- [Constants](#constants)
- [What throws](#what-throws)

## Imports

The convention used in every example in this repository is a namespace import named `Corj`:

```typescript
import * as Corj from 'caught-object-report-json';
import type { CorjReport, CorjReportNode, CorjOptionsInput } from 'caught-object-report-json';

const report = Corj.makeCaughtObjectReport(caught);
const maker = new Corj.CorjMaker({ maxDepth: 2 });
```

```javascript
const Corj = require('caught-object-report-json');
```

Named imports work too (`import { makeCaughtObjectReport, CorjMaker } from '...'`); the function names are long enough to
stand alone. The package is one CommonJS module with declarations. Named imports work in Node (CommonJS and ESM), Bun and
bundlers; see [Supported runtimes](./guide.md#supported-runtimes) for the default-import matrix.

# Root functions

Four stateless functions exported from the package root. Each `makeCaughtObjectReport*` call builds a `CorjMaker` from the
options in its input, so for a hot path construct a [`CorjMaker`](#corjmaker) once instead.

## `Corj.makeCaughtObjectReport(caught, input?)`

```typescript
Corj.makeCaughtObjectReport(caught: unknown, input?: CorjReportInput): CorjReport
```

Describes any caught value as one JSON object. Nested errors reachable through `cause` and `errors` are flattened into
`children`.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `caught` | `unknown` | Anything `catch` can receive: an `Error`, a plain object, a string, `null`, `undefined`, a `Proxy`. |
| `input` | [`CorjReportInput`](#corjreportinput) | Optional. Maker options and per-call values (`occurrenceId`, `fingerprint`, `context`) in one object. |

Returns a [`CorjReport`](#corjreport). Never throws because of `caught`; throws `TypeError` or `RangeError` only for an
invalid `input` (an unknown key, a wrong type, or a third positional argument).

```javascript
const Corj = require('caught-object-report-json');

const outer = new Error('outer', { cause: Object.assign(new TypeError('inner'), { code: 'E_X' }) });

console.log(JSON.stringify(Corj.makeCaughtObjectReport(outer, { context: { tool: 'search' } }), null, 2));
```

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "stack": [
    "Error: outer",
    "    at main (/app/index.js:3:9)"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "as_json": { "code": "E_X" },
      "stack": [
        "TypeError: inner",
        "    at parse (/app/parse.js:10:5)"
      ]
    }
  ],
  "context": { "tool": "search" },
  "v": "corj/v0.15"
}
```

`message` and `constructor_name` are absent because they are recoverable from the first stack line; see
[Omitted expected values](./guide.md#omitted-expected-values).

## `Corj.makeCaughtObjectReportArray(caught, input?)`

```typescript
Corj.makeCaughtObjectReportArray(caught: unknown, input?: CorjReportInput): CorjReportNode[]
```

The same report as a flat list: the root first, then every nested error, each with `id`, `path`, `level` and `child_ids`.
Root-only fields (`occurrence_id`, `fingerprint`, `context`, `reporting_errors`, `v`, `$schema`) stay on the first element.
Same parameters and throwing rules as `Corj.makeCaughtObjectReport`.

```javascript
const rows = Corj.makeCaughtObjectReportArray(outer, { metadata: false });
console.log(JSON.stringify(rows.map(({ stack, ...rest }) => rest), null, 2));
```

```json
[
  { "occurrence_id": "CORJ_…", "fingerprint": "fp1_…", "id": "root", "path": "$", "level": 0, "child_ids": ["0"] },
  { "id": "0", "path": "$.cause", "level": 1, "as_json": { "code": "E_X" } }
]
```

Use the array form when rows go into a table or a log store that indexes by `path` or `id`.

## `Corj.restoreCaughtObjectReportExpectedValues(report)`

```typescript
Corj.restoreCaughtObjectReportExpectedValues(report: CorjReport): CorjReport
Corj.restoreCaughtObjectReportExpectedValues(report: CorjReportNode[]): CorjReportNode[]
```

Returns a copy of an object or array report with every omitted expected value filled back in, turning a `corj/v0.15` report
into its `corj/v0.15-full` form. The result is exactly what `omitExpectedValues: false` would have produced. It does not add
`v` or `$schema`.

```javascript
const compact = Corj.makeCaughtObjectReport(new Error('x'));
const full = Corj.restoreCaughtObjectReportExpectedValues(compact);

console.log(Object.keys(compact)); // [ 'occurrence_id', 'fingerprint', 'stack', 'v' ]
console.log(full.instanceof_error, full.typeof, full.message, full.constructor_name, full.v);
// true 'object' 'x' 'Error' 'corj/v0.15-full'
```

Use it on the consuming side when a reader wants every field present, for example before validating against the `-full`
schema.

## `Corj.resolveCaughtObjectReportRedactPolicy(input)`

```typescript
Corj.resolveCaughtObjectReportRedactPolicy(input: CorjRedactPolicyInput | CorjRedactPolicy | null | undefined): CorjRedactPolicy | null
```

Validates a redaction policy and returns it frozen with every field present. Returns `null` for `null` and `undefined`.
Accepts an already-resolved policy and returns it as is. Throws `TypeError` for anything invalid.

```javascript
console.log(Corj.resolveCaughtObjectReportRedactPolicy({ keys: ['password'] }));
// { keys: [ 'password' ], paths: [], patterns: [], replacement: '[redacted]', transform: null }

try {
  Corj.resolveCaughtObjectReportRedactPolicy({ patterns: [/sk-\w+/] }); // missing the g flag
} catch (e) {
  console.log(e.message);
  // redact.patterns must all be global; /sk-\w+/ would replace only its first match
}
```

Call it at startup so a bad policy fails before the first catch block that would have used it.

# `CorjMaker`

Validates and freezes one set of options, then produces reports with them. Construct once, reuse for every caught object.

## `new Corj.CorjMaker(options?)`

```typescript
new Corj.CorjMaker(options?: CorjOptionsInput)
```

| Parameter | Type | Meaning |
| --- | --- | --- |
| `options` | [`CorjOptionsInput`](#corjoptionsinput) | Optional. Any subset of the options; missing ones keep their defaults. |

Throws `TypeError` for an unknown option name (the message lists the valid ones) or a wrongly typed value, and `RangeError`
for a number out of range. Nothing about a caught object is involved yet, so a bad configuration fails here, once.

```javascript
const Corj = require('caught-object-report-json');

const maker = new Corj.CorjMaker({
  maxReportSize: 16_000,
  maxDepth: 2,
  metadata: false,
  redact: { keys: ['password', /^authorization$/i], patterns: [/sk-live-[A-Za-z0-9]+/g] },
});

try {
  new Corj.CorjMaker({ maxReportSize: 100 });
} catch (e) {
  console.log(e.message); // maxReportSize must be a safe integer >= 512, or null to disable the limit
}
```

## `maker.options`

```typescript
readonly options: CorjOptions
```

The resolved, frozen options, every field present.

```javascript
console.log(new Corj.CorjMaker({ maxDepth: 2 }).options.maxDepth); // 2
console.log(new Corj.CorjMaker().options.fingerprintParts); // [ 'constructor_name', 'stack' ]
```

## `maker.makeReport(caught, call?)`

```typescript
maker.makeReport(caught: unknown, call?: CorjCallInput): CorjReport
```

| Parameter | Type | Meaning |
| --- | --- | --- |
| `caught` | `unknown` | The caught value. |
| `call` | [`CorjCallInput`](#corjcallinput) | Optional. `occurrenceId`, `fingerprint` and `context` for this occurrence only. |

Unlike `Corj.makeCaughtObjectReport`, the second argument accepts call-level values only: passing an option such as `maxDepth` here throws
`TypeError: Unknown call input "maxDepth". Known call inputs: occurrenceId, fingerprint, context`. Never throws because of
`caught`.

```javascript
const report = maker.makeReport(caught, {
  occurrenceId: requestId, // a token off the wire; an invalid one is recorded, not thrown
  context: { route: '/checkout', attempt: 2 },
});
```

## `maker.makeReportArray(caught, call?)`

```typescript
maker.makeReportArray(caught: unknown, call?: CorjCallInput): CorjReportNode[]
```

The flat form under this maker's options; see [`Corj.makeCaughtObjectReportArray`](#corjmakecaughtobjectreportarraycaught-input).

## `maker.withOptions(options)`

```typescript
maker.withOptions(options: CorjOptionsInput): CorjMaker
```

Returns a new maker with `options` applied on top of this maker's options. The original is unchanged. Validation is the same
as the constructor's.

```javascript
const base = new Corj.CorjMaker({ maxReportSize: 16_000, redact: { keys: ['password'] } });
const forModel = base.withOptions({ maxReportSize: 4096, maxDepth: 1, metadata: false });

console.log(base.options.maxReportSize, forModel.options.maxReportSize); // 16000 4096
console.log(forModel.options.redact.keys); // [ 'password' ]  (inherited)
```

## `maker.makeFingerprint(caught, options?)`

```typescript
maker.makeFingerprint(caught: unknown, options?: { requireStack?: boolean }): string | undefined
```

The [fingerprint](./guide.md#fingerprint) alone, without building `as_json`, a context or running the size limiter.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `caught` | `unknown` | The caught value. |
| `options.requireStack` | `boolean` | Default `false`. When `true`, a value comes back only if `'stack'` is one of the `fingerprintParts` and the root's stack still carries at least one frame line after redaction. |

Returns `undefined` when `fingerprintParts` is `null` or `[]`, when hashing failed, or when `requireStack` is not satisfied
(a thrown primitive, a plain object, an error without frames, a redacted or withheld stack). Throws `TypeError` for an
options object with any other key.

```javascript
const maker = new Corj.CorjMaker();
const err = new Error('timeout');

const a = maker.makeFingerprint(err);
const b = maker.makeFingerprint(err);
console.log(a === b, a.startsWith('fp1_')); // true true

console.log(maker.makeFingerprint('boom')); // 'fp1_…'  (hash of the string's own text)
console.log(maker.makeFingerprint('boom', { requireStack: true })); // undefined  (nothing frame-backed to hash)
```

Use `requireStack: true` when the fingerprint will be shown to an audience that could guess the error text.

## `maker.makeJsonView(value, options?)`

```typescript
maker.makeJsonView(value: unknown, options?: { root?: string; maxSize?: number | null }): CorjJsonView
```

The bounded, cycle-safe, redacted [JSON view](./guide.md#a-json-view-of-any-value) of any value, under this maker's
`inspection` and `redact` options.

| Parameter | Type | Meaning |
| --- | --- | --- |
| `value` | `unknown` | Any value. |
| `options.root` | `string` | Default `'$'`. A named document root such as `'$request'` (`$` followed by an identifier) so `paths` rules written for the caught value do not reach it. |
| `options.maxSize` | `number \| null` | Default: the maker's `maxReportSize`. A safe integer of at least 256, or `null` for no bound. |

Returns `{ value, truncated, errors }`. Throws `TypeError` for an invalid `root` and `RangeError` for an invalid `maxSize`.

```javascript
const maker = new Corj.CorjMaker({ redact: { keys: ['password'], patterns: [/sk-[a-z0-9]+/g] } });

console.log(maker.makeJsonView({ user: 'ada', password: 'p', note: 'key sk-abc' }, { root: '$req', maxSize: 512 }));
// { value: { user: 'ada', password: '[redacted]', note: 'key [redacted]' }, truncated: false, errors: [] }
```

## `maker.scrubText(text, where?)`

```typescript
maker.scrubText(text: string, where?: { path?: string; reportKey?: CorjReportKey; sourceProperty?: string }): string
```

This maker's `redact` scrub rules (`patterns`, then `transform` with `stage: 'warning'`) applied to one string of your own,
such as a log line written next to a report. Always returns a string; without a policy, returns `text` unchanged. A
`transform` that drops the value, returns a non-string or throws yields the policy's `replacement`.

```javascript
console.log(maker.scrubText('token sk-123 used', { path: '$audit' })); // token [redacted] used
```

# The caught object's side: `toCorjAsString` and `toCorjAsJson`

A caught object can take over its own `as_string` and `as_json` by implementing either method. Both are called with `this`
bound to the object and one argument `{ path, options }`, where `options` is the maker's resolved `CorjOptions`.

```javascript
class PaymentError extends Error {
  constructor(message, decline) {
    super(message);
    this.decline = decline;
  }
  toCorjAsString() {
    return `PaymentError(${this.decline.code})`;
  }
  toCorjAsJson({ path }) {
    return { decline: this.decline.code, path };
  }
}

const report = Corj.makeCaughtObjectReport(new PaymentError('declined', { code: 'insufficient_funds', raw: '…' }), { metadata: false });
console.log(report.as_string, report.as_json, report.as_string_format, report.as_json_format);
// PaymentError(insufficient_funds) { decline: 'insufficient_funds', path: '$' } .toCorjAsString .toCorjAsJson
```

A method that throws is recorded in `reporting_errors` and the default format is used. A method that returns an unusable
value (a non-string, or something without a JSON form) falls back silently. Under `inspection: 'no-invoke'` neither is called.

# Inputs

## `CorjOptionsInput`

Every maker option, each optional. Accepted by `new CorjMaker`, `maker.withOptions`, and (merged with call values) by
`Corj.makeCaughtObjectReport` and `Corj.makeCaughtObjectReportArray`. The full table with defaults, constraints and what each one throws is
[Options](./guide.md#options) in the guide.

```typescript
type CorjOptionsInput = {
  maxReportSize?: number | null;            // 100000; safe integer >= 512, or null
  reportSizeUnit?: 'utf8-bytes' | 'utf16-code-units'; // 'utf8-bytes'
  maxContextSize?: number | null;           // 16384; safe integer >= 256, or null
  omitExpectedValues?: boolean;             // true
  stackFormat?: 'lines' | 'string';         // 'lines'
  inspection?: 'default' | 'no-invoke';     // 'default'
  redact?: CorjRedactPolicyInput | null;    // null
  metadata?: boolean | { v?: boolean; $schema?: boolean }; // { v: true, $schema: false }
  maxDepth?: number;                        // 5; integer >= 0
  maxChildren?: number;                     // 100; integer >= 0
  childrenSources?: readonly string[];      // ['cause', 'errors']
  occurrenceIdSources?: readonly CorjOccurrenceIdSource[] | null; // [{ auto: 'random' }]
  fingerprintParts?: readonly CorjFingerprintPart[] | null;       // ['constructor_name', 'stack']
  makeReportId?: (context: CorjReportIdContext) => string;        // 'root' / discovery index
  onReportingError?: (reportingFailure: unknown, record: CorjReportingError) => void; // console.warn
};
```

## `CorjCallInput`

What one call knows that its maker does not. Accepted by `maker.makeReport` and `maker.makeReportArray`, and as part of
[`CorjReportInput`](#corjreportinput).

```typescript
type CorjCallInput = {
  occurrenceId?: string; // 1 to 128 printable ASCII characters without spaces; wins over occurrenceIdSources
  fingerprint?: string;  // 1 to 64 printable ASCII characters without spaces; wins over fingerprintParts
  context?: unknown;     // anything; reported at the root under `context`, rooted at `$context` for redaction
};
```

An `occurrenceId` or `fingerprint` that is not a valid token does **not** throw. It is runtime data, so it is recorded as a
reporting error (`stage: 'other'`) and the configured sources are used instead. An unknown key or a non-object does throw,
because that is a shape error in your code.

## `CorjReportInput`

```typescript
type CorjReportInput = CorjOptionsInput & CorjCallInput;
```

The single input object of `Corj.makeCaughtObjectReport` and `Corj.makeCaughtObjectReportArray`: options and call values together.

```javascript
Corj.makeCaughtObjectReport(caught, { maxDepth: 1, metadata: false, occurrenceId: 'req-42', context: { tool: 'search' } });
```

## `CorjRedactPolicyInput`

```typescript
type CorjRedactPolicyInput = {
  keys?: readonly (string | RegExp)[];     // property names never read; a string matches exactly
  paths?: readonly (string | RegExp)[];    // JSONPaths never read, e.g. '$.cause.config.headers'
  patterns?: readonly RegExp[];            // replaced in every emitted string; each needs the g flag
  replacement?: string;                    // '[redacted]'; at most 128 characters, inserted literally
  transform?: ((value: unknown, context: CorjContext) => unknown) | null; // runs last; undefined drops the field
};
```

`keys` and `paths` skip reads, so an excluded getter never runs. `patterns` and `transform` rewrite text wherever it is
emitted. To remove a secret's text everywhere it is duplicated (`message`, `stack`, `as_string`), use `patterns`. Full
semantics: [Redacting what the report emits](./guide.md#redacting-what-the-report-emits).

# Outputs

## `CorjReport`

The object report. Every field is optional except that the root always carries at least `v` when metadata is on. The
complete field table with types and omission rules is [Fields](./guide.md#fields).

```typescript
type CorjReport = {
  occurrence_id?: string;
  fingerprint?: string;
  truncated?: true;
  instanceof_error?: boolean;        // omitted when true
  typeof?: CorjTypeof;               // omitted when 'object'
  constructor_name?: string | null;  // omitted when parseable from stack[0]
  message?: string | null;           // omitted when parseable from stack[0]
  as_string?: string | null;         // omitted when equal to stack[0]
  as_json?: CorjJsonValue | null;    // omitted when {}
  stack?: string[] | string | null;
  children_omitted?: 'max_depth' | 'max_children' | 'max_size' | 'not_inspected' | 'redacted';
  children?: CorjReportNode[];
  context?: CorjJsonValue | null;
  context_omitted?: 'max_size';
  reporting_errors?: CorjReportingError[];
  reporting_errors_omitted?: 'max_size';
  children_sources?: string[];       // omitted when ['cause', 'errors']
  as_string_format?: 'String' | '.toCorjAsString' | 'derived'; // omitted when 'String'
  as_json_format?: 'safe-stable-stringify-with-length-limit' | '.toCorjAsJson'; // omitted when the default
  v?: 'corj/v0.15' | 'corj/v0.15-full';
  $schema?: string;
};
```

Reading rule: a **missing** field holds its expected value, **`null`** means producing it threw (look in `reporting_errors`),
and `"[not-inspected]"` means `inspection: 'no-invoke'` declined to run code to get it.

## `CorjReportNode`

One element of `children`, or of a `Corj.makeCaughtObjectReportArray` result. All of `CorjReport`'s base fields plus:

```typescript
type CorjReportNode = CorjReportBase & {
  id: string;           // 'root' for the root, the discovery index otherwise (or your makeReportId)
  path: string;         // JSONPath from the caught root, e.g. '$.cause.errors[0]'
  level: number;        // 0 for the root
  child_ids?: string[]; // direct children; an object seen before is referenced by its first id
};
```

## `CorjReportingError` and `CorjContext`

```typescript
type CorjStage = 'prop-access' | 'as_string' | 'as_json' | 'children' | 'limit' | 'redact' | 'warning' | 'other';

type CorjContext = {
  stage: CorjStage;
  path: string;                 // '$' is the caught root, '$context' the call's context
  reportKey?: CorjReportKey;    // report field being produced, when known
  sourceProperty?: string;      // property of the caught object being read, when known
};

type CorjReportingError = CorjContext & { error: string }; // error: scrubbed, cut to 256 characters
```

Rows appear in the report's `reporting_errors` (at most 8) and are passed as the second argument of `onReportingError`.

```javascript
const hostile = { code: 'E_FAIL', get message() { throw new Error('getter exploded'); } };
const report = Corj.makeCaughtObjectReport(hostile, { onReportingError: () => {}, metadata: false });
console.log(report.message, report.reporting_errors[0]);
// null { stage: 'prop-access', path: '$', reportKey: 'message', sourceProperty: 'message', error: 'Error: getter exploded' }
```

## `CorjJsonView`

```typescript
type CorjJsonView = {
  value: CorjJsonValue | null;    // null when the value has no JSON form or producing it threw
  truncated: boolean;
  errors: CorjReportingError[];   // up to 8
};
```

# All exported types

| Type | What it is |
| --- | --- |
| `CorjReport`, `CorjReportNode`, `CorjReportBase` | The object report, one flattened node, and the fields they share. |
| `CorjOptions`, `CorjOptionsInput` | Resolved options (every field present, as `maker.options`) and the partial input. |
| `CorjCallInput`, `CorjReportInput` | Per-call values, and options plus per-call values merged. |
| `CorjRedactPolicy`, `CorjRedactPolicyInput`, `CorjRedactTransform` | Resolved and input redaction policies, and the transform callback type. |
| `CorjContext`, `CorjStage`, `CorjReportKey` | Where a value sits while it is produced; the stage union; the union of report field names. |
| `CorjReportingError`, `CorjErrorHandler` | One recorded reporting failure, and the `onReportingError` signature. |
| `CorjJsonView` | What `maker.makeJsonView` returns. |
| `CorjSourceEntry`, `CorjEntryFunction`, `CorjOccurrenceIdSource`, `CorjFingerprintPart` | Entries of `occurrenceIdSources` and `fingerprintParts`. |
| `CorjReportIdContext` | `{ index, level, path, caught }` given to `makeReportId` and to function entries. |
| `CorjChildrenOmitted`, `CorjAsStringFormat`, `CorjAsJsonFormat`, `CorjTypeof` | Enumerations of the report's own marker fields. |
| `CorjInspection`, `CorjStackFormat`, `CorjMetadata`, `CorjReportSizeUnit` | Option value unions. |
| `CorjJsonValue`, `CorjJsonPrimitive`, `CorjJsonObject`, `CorjJsonArray` | Plain JSON. |
| `CorjVersion`, `CorjSchemaLink` | The `v` union and the `$schema` URL union. |

# Constants

| Constant | Value |
| --- | --- |
| `CORJ_VERSION` | `"corj/v0.15"` |
| `CORJ_VERSION_FULL` | `"corj/v0.15-full"` |
| `CORJ_DEFAULT_OPTIONS` | The resolved defaults, frozen; see [`CorjOptionsInput`](#corjoptionsinput) for the values. |
| `CORJ_EXPECTED_VALUES` | `{ instanceof_error: true, typeof: 'object', as_json: {}, as_string_format: 'String', as_json_format: 'safe-stable-stringify-with-length-limit', children_sources: ['cause', 'errors'] }` |
| `CORJ_TRUNCATED_MARKER` | `"[truncated]"` |
| `CORJ_CIRCULAR_MARKER` | `"[circular]"` |
| `CORJ_OMITTED_MARKER` | `"[not-inspected]"` |
| `CORJ_REDACTED_MARKER` | `"[redacted]"` |
| `CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK` | `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/report-object.json` |
| `CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK` | `…/corj/v0.15/report-array.json` |
| `CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK` | `…/corj/v0.15-full/report-object.json` |
| `CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK` | `…/corj/v0.15-full/report-array.json` |

# What throws

| Situation | Result |
| --- | --- |
| Anything the caught object does: a throwing getter, a hostile `toString`, a revoked `Proxy`, a cycle, a BigInt | Never throws. The affected field is `null` or marked, and a row is added to `reporting_errors`. |
| Unknown option name, wrong option type | `TypeError` from the constructor, `withOptions`, or `Corj.makeCaughtObjectReport*` |
| Option out of range (`maxReportSize < 512`, negative `maxDepth`, …) | `RangeError`, same places |
| Non-global `redact.patterns` entry, `replacement` over 128 characters, malformed matcher list | `TypeError` from `Corj.resolveCaughtObjectReportRedactPolicy` or the constructor |
| `occurrenceIdSources` entry after `{ auto: 'random' }`, path over 16 segments, repeated `fingerprintParts` entry | `TypeError` from the constructor |
| Call input that is not an object, has an unknown key, or a third positional argument | `TypeError` from the report method |
| Call `occurrenceId` or `fingerprint` that is not a valid token | Does **not** throw: recorded as a reporting error, sources used instead |
| `makeJsonView` with a bad `root` / `maxSize` | `TypeError` / `RangeError` |
| `makeFingerprint` with an unknown option key | `TypeError` |

All configuration errors surface where you configure, never inside the catch block that is reporting a failure.
