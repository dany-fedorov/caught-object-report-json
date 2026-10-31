# The CORJ report, in depth

This guide explains what a Caught Object Report JSON (CORJ) report contains and why, option by option. It is the long
version. For the short one read the [README](../README.md); for signatures and runnable snippets read the
[API reference](./api.md).

Everything here describes report format `corj/v0.15`, produced by package version 15.

- [The report](#the-report)
  - [Fields](#fields)
  - [Omitted expected values](#omitted-expected-values)
  - [Two report versions](#two-report-versions)
  - [Stack as an array of lines](#stack-as-an-array-of-lines)
  - [Nested errors](#nested-errors)
  - [Occurrence id](#occurrence-id)
  - [Fingerprint](#fingerprint)
  - [Context](#context)
  - [A JSON view of any value](#a-json-view-of-any-value)
  - [Size limit](#size-limit)
  - [Errors while reporting](#errors-while-reporting)
- [Options](#options)
  - [Letting an object describe itself](#letting-an-object-describe-itself)
- [Redacting what the report emits](#redacting-what-the-report-emits)
  - [What the policy reaches](#what-the-policy-reaches)
  - [Applying the policy to your own text](#applying-the-policy-to-your-own-text)
  - [When the policy itself fails](#when-the-policy-itself-fails)
  - [What a policy cannot do](#what-a-policy-cannot-do)
- [Reporting without running the caught object](#reporting-without-running-the-caught-object)
  - [What the mode does](#what-the-mode-does)
  - [What the mode is not](#what-the-mode-is-not)
- [Limits and non-goals](#limits-and-non-goals)
- [Supported runtimes](#supported-runtimes)
- [Report schema history](#report-schema-history)
- [Appendix: engine notes for `no-invoke`](#appendix-engine-notes-for-no-invoke)

# The report

## Fields

Fields appear in this order. A field is present only when it carries information: a missing field means the expected value
listed in [Omitted expected values](#omitted-expected-values), `null` means that producing the value failed.

| Field | Type | Meaning |
| --- | --- | --- |
| `occurrence_id` | `string` | Root only. Identifies this occurrence, see [Occurrence id](#occurrence-id). On by default. |
| `fingerprint` | `string` | Root only. Equal for failures of the same kind from the same place, see [Fingerprint](#fingerprint). On by default. |
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
| `context` | JSON `\| null` | Root only. The call's `context` rendered as JSON, see [Context](#context). Absent when the call passed none. |
| `context_omitted` | `"max_size"` | Root only. The context was dropped to fit `maxReportSize`. |
| `reporting_errors` | `object[]` | Root only. Failures met while this report was produced, at most 8, see [Errors while reporting](#errors-while-reporting). Absent when there were none. |
| `reporting_errors_omitted` | `"max_size"` | Root only. The reporting errors were dropped to fit `maxReportSize`. |
| `children_sources` | `string[]` | Root only. The properties children were collected from. Omitted when `["cause", "errors"]`. |
| `as_string_format` | `"String" \| ".toCorjAsString" \| "derived"` | How `as_string` was produced. `"derived"` means it was rebuilt from property descriptors, see [`inspection`](#reporting-without-running-the-caught-object). Omitted when `"String"`. |
| `as_json_format` | `"safe-stable-stringify-with-length-limit" \| ".toCorjAsJson"` | How `as_json` was produced. Omitted when the default. |
| `v` | `"corj/v0.15" \| "corj/v0.15-full"` | Root only. Report version, on by default (`metadata` option). |
| `$schema` | URL | Root only. JSON Schema of this report, off by default (`metadata` option). |

On the root the order is `occurrence_id`, `fingerprint`, then the fields above, then `context` and `reporting_errors`, then
`children_sources` and the metadata fields. An object report is the root fields plus `children`. An array report
(`Corj.makeCaughtObjectReportArray`) is a list whose first element is the root, with `id`, `path`, `level` and `child_ids` like every other node;
the root-only fields (`occurrence_id`, `fingerprint`, `context`, `reporting_errors`, `children_sources`, `v` and `$schema`)
stay on that first element only.

The same table, with types, is in the published [JSON Schema](../schema-versions/corj/v0.15/definitions.json), and the
TypeScript types `CorjReport` and `CorjReportNode` carry it as JSDoc.

## Omitted expected values

Most caught objects are plain `Error` instances whose report fields hold the same values every time. Those fields are left
out when they hold their expected value. A missing field means the expected value; `null` still means that producing the
value failed.

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
import * as Corj from 'caught-object-report-json';

const full = Corj.restoreCaughtObjectReportExpectedValues(Corj.makeCaughtObjectReport(caught));
// full.instanceof_error === true, full.typeof === 'object', full.as_json is {},
// full.as_string is the first stack line, full.constructor_name and full.message are parsed from it,
// full.as_string_format, full.as_json_format and full.children_sources hold their defaults.
```

`Corj.restoreCaughtObjectReportExpectedValues` accepts object and array reports, returns a copy, and produces exactly what `omitExpectedValues: false`
would have produced. It does not add `v` or `$schema`, since a missing one means metadata was disabled.

## Two report versions

| `v` | Produced by | Base fields |
| --- | --- | --- |
| `corj/v0.15` | the default, `omitExpectedValues: true` | omitted when they hold the expected value |
| `corj/v0.15-full` | `omitExpectedValues: false`, or `Corj.restoreCaughtObjectReportExpectedValues` | always present |

Each version has its own JSON Schema (see [Links](../README.md#links) in the README); `$schema` points to the matching one.

## Stack as an array of lines

`stack` is stored as an array, one element per line, capped at 10,000 lines plus a `[truncated]` marker. Lines are easier to
read in pretty-printed logs and to query in log tools than one long string with escaped newlines. The split is literal: only
`\n` separates, a `\r` before it stays on its line, empty lines are kept, an empty stack becomes `[""]`. Only a string `stack`
is reported; a `stack` getter that throws yields `null`. Pass `stackFormat: 'string'` to keep the raw string.

## Nested errors

Children are collected from the properties in `childrenSources` (`cause` and `errors` by default). An array property contributes
one child per element; holes and `undefined` values are skipped, `null` and primitives are reported. The tree is walked
breadth-first, so IDs grow with the level, and it is flattened: in an object report `children` holds every node and each node
lists its direct children in `child_ids`; in an array report the root is the first element and links the same way.

Every object is reported once. When the same error is reachable through two parents, or a `cause` chain loops back, the second
occurrence is a reference to the first node's `id` in `child_ids`, and a reference to the root uses the root's id (`"root"` by
default). See [example 11](./examples.md#11-cycles-and-shared-errors).

Three limits keep the walk bounded, and each marks the node whose children it cut with `children_omitted`:

| Limit | Default | `children_omitted` |
| --- | --- | --- |
| `maxDepth` | `5` levels below the root | `"max_depth"` |
| `maxChildren` | `100` nodes per report | `"max_children"` |
| `maxReportSize` | `100000` UTF-8 bytes for the whole report | `"max_size"` |

Nodes that fit are kept in discovery order, so shallow errors win over deep ones.

## Occurrence id

`occurrence_id` names one occurrence of one failure, so a report can be quoted back by id from a log line, a ticket or an
agent's next turn. It is a root field, on by default.

The value is resolved in this order, and the first valid one wins:

1. the call's `occurrenceId`: `Corj.makeCaughtObjectReport(caught, { ...options, occurrenceId: 'req-42' })`;
2. each entry of `occurrenceIdSources`, in order;
3. nothing, and the field is left out.

A valid id is 1 to 128 printable ASCII characters without spaces (`/^[\x21-\x7e]{1,128}$/`). A source that yields anything
else is passed over in silence: a missing id is not a reporting failure.

The call's own `occurrenceId` is checked the same way. It is per-occurrence runtime data, a request id off the wire, so a
value that is not a valid id does **not** throw: it is recorded as a reporting error (`stage: 'other'`,
`reportKey: 'occurrence_id'`, never quoting the value) and resolution continues with the sources. Only the *shape* of a call
input is your own configuration and still throws: something that is not an object, or an unknown key.

`occurrenceIdSources` takes four kinds of entry:

```typescript
const maker = new Corj.CorjMaker({
  occurrenceIdSources: [
    { sourceProperty: 'requestId' }, // one property of the caught object
    { path: ['response', 'headers', 'x-request-id'] }, // a path of 1 to 16 segments from it
    ({ caught }) => (caught as { id?: string }).id, // a function, given { index: -1, level: 0, path: '$', caught }
    { auto: 'random' }, // a generated id; this one always succeeds
  ],
});
```

- The default is `[{ auto: 'random' }]`. `null` or `[]` turns the field off.
- `{ sourceProperty }` and `{ path }` read the **root** caught value only, through the same access the report uses, so `redact` skip
  rules apply and [`inspection`](#reporting-without-running-the-caught-object) decides whether a getter runs, at **every**
  segment of a path, not only the last. An entry may carry its own `inspection`; `inspection: 'default'` on an entry under a
  global `no-invoke` runs caught code for that read. An element of an array is addressed as `$.ids[0]` whether you write the
  segment as `0` or as `'0'`, so one `paths` rule covers both spellings. Numeric ordinary-object properties use dotted paths
  such as `$.map.0`; only array indices use brackets.
- An excluded source immediately produces the literal `[redacted]`, regardless of the configured replacement, and stops
  the source chain. This marker loses uniqueness and correlation information. An explicit call `occurrenceId` still wins.
- A function entry that throws is recorded as a reporting error (`stage: 'other'`, `reportKey: 'occurrence_id'`) and resolution
  continues with the next entry.
- `{ auto: 'random' }` yields `CORJ_` plus 26 Crockford base32 characters, from `globalThis.crypto.getRandomValues` when it
  is available and `Math.random` otherwise. Because it always produces an id, an entry after it can never be reached and is
  rejected when the maker is built. The id is memoized per object, so one error object reported twice keeps one id; a thrown
  primitive gets a new one each time.
- The id is **never** passed through the `redact` policy: a scrubbed id would correlate with nothing. That is why it is a
  bounded ASCII token rather than free text, and why the bound is part of the [size floor](#size-limit).
- It is a correlation handle, not a secret. It authorizes nothing and proves nothing.

## Fingerprint

`fingerprint` is equal for failures of the same kind from the same place, and different otherwise. An agent in a retry loop
compares two strings to learn "this is the same failure again"; a log tool groups by it. It is a root field, on by default,
hashed from a list of parts rather than from the report text.

```typescript
const maker = new Corj.CorjMaker({ fingerprintParts: ['constructor_name', 'stack'] }); // the default
const sameFailureAgain = maker.makeFingerprint(caught) === previous;
```

### The recipe

**Every part contributes.** `fingerprintParts` is an all-of list, unlike `occurrenceIdSources`, which is first-wins. The
order you write them in does not matter: named parts are sorted by label, and function parts keep their relative order after
them.

| Part | What it contributes for a node |
| --- | --- |
| `'constructor_name'`, `'message'`, `'as_string'`, `'typeof'` | that report field of the node |
| `'stack'` | the node's stack without its own header (see below) |
| `{ sourceProperty }`, `{ path }` | a value read from the node, with an optional per-entry `inspection` |
| a function | `(context: { index, level, path, caught }) => unknown`, called once per node |

`{ path: ['a'] }` is the one-segment case of `{ sourceProperty: 'a' }`: the same read, the same label, the same hash, and listing
both is rejected as a repeated part.

`as_json` is deliberately not a part: it carries timestamps and per-occurrence ids, which would make every occurrence a new
kind of failure. Name a stable property with `{ sourceProperty }` instead. A whole-report hash was rejected for the same reason, and
because every format bump would then change every fingerprint.

Parts apply to **every node**, root and children, in discovery order, and each node's values are hashed together with its
`path`, so the same error nested one level deeper fingerprints differently.

The `'stack'` part excludes the node's own header, so `'message'` and `'stack'` do not hash the same text twice: when the
stack starts with the node's `as_string` **and that prefix ends the line** (or the whole stack), that prefix is cut;
otherwise, when the stack has a V8 frame line (`\n    at `), everything before the first one is cut; otherwise the stack is
used whole, which is what Firefox and Safari stacks need. The line-boundary condition matters for a short
`.toCorjAsString()`: `'E'` is a prefix of `Error: <message>`, and cutting there would leave the message in the hash.

The output is `fp1_` plus the first 32 hex characters of a SHA-256 digest, computed by a bundled pure-JavaScript
implementation because the web platform has no synchronous digest and this package has no dependencies. The `fp1` prefix
names the recipe: if it ever changes, fingerprints from the two versions are not comparable, and the prefix is how a reader
can tell.

### What moves the fingerprint

Values are taken **after redaction and before omission and size limiting**:

| Moves the fingerprint | Does not move it |
| --- | --- |
| `maxDepth`, `maxChildren`, `childrenSources` | `maxReportSize`, `reportSizeUnit`, `maxContextSize` |
| the `redact` policy | `stackFormat` |
| `inspection` | `omitExpectedValues` and the rest of the omission pass |
| a new build, because stacks carry line numbers | the report format version, and `metadata` |

A nested value (an object or an array) goes through a key-sorted JSON view with a fixed 16,384-byte cap, so property
assignment order and the report budget cannot move the hash. Every **string** value is likewise cut to 16,384 UTF-16 code
units, after redaction, so the hash input stays bounded whatever the caught object carries: two strings that differ only
past the cap share a fingerprint by design. A `bigint` contributes `<digits>n` and a non-finite number its `String()` form
(`NaN`, `Infinity`, `-Infinity`); a function, a symbol, a missing property or a value the policy dropped contributes
nothing.

A root without a string `stack` (a thrown primitive or a plain object), or whose part values are all empty, also hashes its
`typeof` and `as_string`, so thrown primitives do not all share one fingerprint: a thrown string has
`constructor_name: "String"`, and an emptiness rule alone would not catch it.

Numeric and string path segments read the same property and policy path but remain distinct labels in the fingerprint
recipe. Function parts are labeled by the node path; CORJ does not infer a source path from application code.

### When no fingerprint is produced

Hashing cannot fail a report. When the hash input cannot be built faithfully (an input safety ceiling was hit while reading a
part, a redaction snapshot was lossy, or scrubbed object keys collided), the field is left out and a reporting error with
`reportKey: 'fingerprint'` says so. A limit hit inside an unrelated `makeJsonView` call does not affect it. An explicit call
`fingerprint` always wins over the computed one.

### `makeFingerprint` and `requireStack`

`maker.makeFingerprint(caught)` computes the value alone: discovery and node fields, without `as_json`, the context or the
limiter. It returns `undefined` when `fingerprintParts` is `null` or `[]`.

`makeFingerprint(caught, { requireStack: true })` returns a value only when the hash is backed by the root's own stack frames:
`'stack'` is one of the parts, **and** the root's stack, as the part hashes it (after redaction, after the header is cut),
still carries at least one frame line. A frame line is one that names a place (`at fn (/app/a.js:1:1)`,
`at async Promise.all (index 0)`, `fn@/app/a.js:1:1`), so prose that merely says "at", or an address with a port, is not one.

Everything else is `undefined`: a thrown primitive, a plain object, an error with no stack, a stack that carries no frames
because a caller assigned a sentence to it, a stack a `redact` skip rule replaced, a stack `inspection: 'no-invoke'`
withheld, a recipe that does not name `'stack'`, and **an error the runtime created without frames**, such as a Node `fs`
callback error (`ENOENT`) or the `AggregateError` from `Promise.any`: their stack is the header line and nothing else, so
there is no place to hash and `undefined` is the rule working, not the option failing. The option is the caller's alone: it
never moves the `fingerprint` a report carries.

A call argument outranks the parts: `Corj.makeCaughtObjectReport(caught, { ...options, fingerprint: 'checkout-timeout' })`, 1 to 64
printable ASCII characters without spaces. Like `occurrenceId`, a call `fingerprint` that is not such a token is recorded
(`stage: 'other'`, `reportKey: 'fingerprint'`) rather than thrown, and the parts are hashed instead.

### Showing a fingerprint to an untrusted audience

Anyone who can guess the hashed values can compute the hash and confirm the guess, so what the hash input contains is what
the published fingerprint discloses. A value with no stack is hashed from its own text, and that text is often guessable: a
reviewer recovered a `"PIN 4921 rejected for alice@example.com"` message from such a fingerprint in ten milliseconds. Keep
`'stack'` in the recipe when the fingerprint is published, and compute it with
`maker.makeFingerprint(caught, { requireStack: true })`, which returns nothing at all rather than a hash a reader could
confirm.

What that leaves is a hash of real stack frames, and of **every other part in the recipe**: add `'message'` and the message
is in the hash input beside the frames, as confirmable as it ever was. Frames themselves are unguessable only to a reader
who does not know your deployed source and paths; a reader who has the bundle can enumerate call sites. The option removes
the case where the text *is* the hash; it does not make a fingerprint a secret.

## Context

A call may carry data of the caller's own beside the caught object: a request id, a run id, the tool that failed.

```typescript
const report = Corj.makeCaughtObjectReport(caught, {
  context: { runId: 'run-1', tool: 'search', attempt: 2 },
});
// report.context: { runId: 'run-1', tool: 'search', attempt: 2 }
```

- `context` is a root field, rendered with the same bounded, cycle-safe, redacted JSON view the report uses for `as_json`,
  in a document of its own rooted at `$context`. A `redact` `paths` rule written for the caught value does not match inside
  it, and one written for it does not match inside the caught value; `keys`, `patterns` and `transform` see both.
- `maxContextSize` caps it on its own (`16384` by default, `null` for no separate cap), inside `maxReportSize`.
- It is counted in `maxReportSize`, and it is the first thing dropped when the report does not fit; see
  [Size limit](#size-limit).
- It is a call argument rather than a maker option, so one shared maker still serves every call.

## A JSON view of any value

The pipeline behind `as_json` is available on its own, under the maker's `inspection` and `redact` options:

```typescript
const maker = new Corj.CorjMaker({ redact: { keys: ['password'] } });

const view = maker.makeJsonView(payload, { root: '$request', maxSize: 4096 });
// { value: <JSON or null>, truncated: boolean, errors: CorjReportingError[] }

const line = maker.scrubText(`login failed for ${user}`, { path: '$audit' });
```

- `makeJsonView(value, { root?, maxSize? })` returns `{ value, truncated, errors }`. `value` is `null` when the value has no
  JSON form or producing it threw; `errors` holds up to 8 failures met on the way, and never touches a report's own list.
- `root` is `'$'` (the default) or a named document root matching `/^\$[A-Za-z_][A-Za-z0-9_]*$/`, such as `'$context'` or
  `'$request'`. A property path always continues with `.` or `[`, so a named root can never collide with a path into the
  caught value. Anything else throws a `TypeError`.
- `maxSize` defaults to the maker's `maxReportSize`; it is a safe integer of at least 256, or `null` for no bound. The floor
  is below the report's 512 because a single value has no minimal report to fit, only itself.
- Unlike a report node's `as_json`, a view does not hide the `childrenSources` properties: a view has no children.
- `scrubText(text, { path?, reportKey?, sourceProperty? })` applies the policy's scrub rules to one string CORJ never sees, with
  `stage: 'warning'`. Without a policy it returns the text unchanged.

## Size limit

The **entire report** is limited to **100,000 UTF-8 bytes** of compact JSON by default. All fields, metadata, escaping,
punctuation and children share that budget; for `Corj.makeCaughtObjectReportArray` the limit applies to the complete array.

```typescript
const maker = new Corj.CorjMaker({ maxReportSize: 64_000, reportSizeUnit: 'utf8-bytes' });
```

`maxReportSize` must be a safe integer of at least **512**, or `null` to disable the limit. `reportSizeUnit` is
`'utf8-bytes'` (`Buffer.byteLength(json, 'utf8')`) or `'utf16-code-units'` (`json.length`). Invalid values throw when the
maker is built. The floor is 512 because that is the smallest budget the worst case of a minimal report is guaranteed to
fit: a 128-character `occurrence_id`, a 64-character `fingerprint`, both omission flags, and the array form.

### What is trimmed, in what order

Reports that fit are preserved exactly. Oversized reports set `truncated: true` on the root. Optional root parts go first,
each whole and each leaving a flag behind, and only then is error content reduced:

1. `context` is dropped **whole**, however small it is, and `context_omitted: "max_size"` takes its place.
2. `reporting_errors` is dropped next, and `reporting_errors_omitted: "max_size"` takes its place. Without that flag a
   reader of a trimmed report would conclude that inspection had been clean.
3. Only then is error content trimmed, as below.

`occurrence_id`, `fingerprint` and `v` are never trimmed. They are counted into the budget and survive into the minimal
report, so even a report cut to the floor can still be quoted back by id and grouped by fingerprint.

What trimming content keeps valid:

- Strings retain a prefix followed by `[truncated]` (`CORJ_TRUNCATED_MARKER`).
- Arrays inside `as_json` retain leading elements and append the marker; objects retain leading properties and may add
  `"...": "[truncated]"`.
- Circular references inside `as_json` become `[circular]` (`CORJ_CIRCULAR_MARKER`).
- All content fields share the budget. The limiter reserves a small amount per field, retains a prefix of complete child
  reports, and spreads the remaining room across fields. Optional metadata is dropped before content is reduced further.
- Dropped children get `children_omitted: "max_size"` on their parent, and their IDs disappear from `child_ids`.
- If even a minimal report cannot fit (custom IDs alone can exceed the budget), the result is a root-only report with
  `as_string: "[truncated]"` and `as_json: null`, keeping `occurrence_id`, `fingerprint`, `v` and any omission flags.

Pretty-printing and fields added later by a logger increase the final size; reserve room for those. Child discovery and custom
formatters run before the budget is allocated, so input size still affects processing time. See
[example 10](./examples.md#10-report-size-limit).

### Input safety ceilings

These apply even with `maxReportSize: null` or a view's `maxSize: null`: 10,000 JSON candidate entries per
serialization, depth 128, 10,000 child-source candidates across graph discovery, 16,384 decimal BigInt digits before decimal
conversion, 1,000,000 UTF-16 units per text subject and in aggregate per serialization or prepared snapshot,
10,000 display stack lines, and 128 prototype lookup steps. Dropped values and repeated children still consume candidate
budgets. Oversized text is withheld whole before patterns or transforms, since cutting it first could split a secret. Input
exhaustion sets `truncated` and retains safe partial output with existing markers. Display stack truncation may still
fingerprint the full supported raw stack.

These bound library-controlled work, not elapsed time. Native enumeration and allocation, proxy traps, default-mode hooks and
getters, individual regular expressions (including overridden methods), and application callbacks cannot be interrupted
synchronously. A replacement may allocate before CORJ can check its result.

## Errors while reporting

Nothing the caught object does can make `Corj.makeCaughtObjectReport` throw. When a getter, proxy trap, `toString`, `toCorjAsJson` or the
serializer throws, the affected field becomes `null` (or the affected child is skipped) and CORJ records what happened:

```typescript
type CorjContext = {
  stage:
    | 'prop-access'
    | 'as_string'
    | 'as_json'
    | 'children'
    | 'limit'
    | 'redact'
    | 'warning'
    | 'other';
  path: string; // JSONPath of the value; '$' is the caught root, '$context' the call's context
  reportKey?: CorjReportKey; // report field being produced, when known
  sourceProperty?: string; // property of the caught object being read, when known
};
type CorjReportingError = CorjContext & { error: string };
type CorjErrorHandler = (reportingFailure: unknown, record: CorjReportingError) => void;
```

Every record goes to two places:

- the root field **`reporting_errors`**, so the report explains its own gaps: a reader who sees `message: null` finds the
  reason in the same JSON, without access to the process's stderr. At most 8 rows are kept; later failures still reach the
  handler.
- **`onReportingError(reportingFailure, record)`**, which gets the raw value thrown while reporting, for sinks such as Sentry. The handler receives a
  shallow **copy** of the record, so a handler that rewrites its argument cannot rewrite the report's row. The default
  handler prints one `console.warn` line per failure; pass `onReportingError: () => {}` to silence it, or your own handler to route
  failures into your logs.

Records are collected **per call**, not per maker, so a getter that re-enters the same shared maker does not mix its
failures into the outer report.

`record.error` is the thrown value as text, **scrubbed by the `redact` policy before it is cut** to 256 characters, so a
secret straddling the cut cannot survive the cut. `path` and `sourceProperty` go through the policy as well. A `stage: 'redact'`
record (the policy itself threw) carries the policy's `replacement` as its `error` instead of the thrown message, which
could quote the very content the policy was protecting; its `path` may be the replacement too, because a policy that has
just failed is not consulted again.

Failures in the finishing pass (`stage: 'limit'`, and `stage: 'other'` from the omission pass) happen after the report
body is assembled and the budget is spent, so they reach the **handler only** and never appear in `reporting_errors`.

Only your own configuration throws: unknown option names, invalid option values and a call input of the wrong shape (not an
object, or an unknown key) raise `TypeError` or `RangeError` from the `CorjMaker` constructor, `Corj.makeCaughtObjectReport`, `Corj.makeCaughtObjectReportArray`
and the maker's own methods. The call's `occurrenceId` and `fingerprint` are runtime data rather than configuration: a value
that fails its token pattern is recorded as a reporting error and passed over, so reporting one error never throws a second
one inside the catch block that was reporting the first.

# Options

Every option is optional; missing ones keep their defaults. `CORJ_DEFAULT_OPTIONS` exports the defaults. Invalid values
throw from the `CorjMaker` constructor (and from `Corj.makeCaughtObjectReport`, which builds a maker), never from inside a report.

| Option | Type | Default | Meaning | Throws when |
| --- | --- | --- | --- | --- |
| `maxReportSize` | `number \| null` | `100000` | Size limit of the compact JSON of the whole report. `null` disables it. See [Size limit](#size-limit). | not a safe integer `>= 512` and not `null` (`RangeError`) |
| `reportSizeUnit` | `'utf8-bytes' \| 'utf16-code-units'` | `'utf8-bytes'` | Unit of `maxReportSize`. | any other value (`TypeError`) |
| `maxContextSize` | `number \| null` | `16384` | Own size cap of the call's `context`, inside `maxReportSize`. `null` leaves only the report budget. See [Context](#context). | not a safe integer `>= 256` and not `null` (`RangeError`) |
| `omitExpectedValues` | `boolean` | `true` | Leave out fields holding their expected value. See [Omitted expected values](#omitted-expected-values). | not a boolean (`TypeError`) |
| `stackFormat` | `'lines' \| 'string'` | `'lines'` | `'lines'` stores at most 10,000 stack lines plus a truncation marker, `'string'` the raw string. See [Stack as an array of lines](#stack-as-an-array-of-lines). | any other value (`TypeError`) |
| `inspection` | `'default' \| 'no-invoke'` | `'default'` | How much of the caught object may run while it is reported. See [Reporting without running the caught object](#reporting-without-running-the-caught-object). | any other value (`TypeError`) |
| `redact` | `CorjRedactPolicyInput \| null` | `null` | Field selection and redaction applied to everything the report emits. See [Redacting what the report emits](#redacting-what-the-report-emits). | a malformed policy, a non-global pattern, a `replacement` over 128 characters (`TypeError`) |
| `metadata` | `boolean \| { v?: boolean; $schema?: boolean }` | `{ v: true, $schema: false }` | Which of `v` and `$schema` to add to the root. `true` adds both, `false` neither. | any other shape (`TypeError`) |
| `maxDepth` | `number` | `5` | Deepest level of nested errors to report. `1` reports `caught.cause` but not `caught.cause.cause`. See [Nested errors](#nested-errors). | not an integer `>= 0` (`RangeError`) |
| `maxChildren` | `number` | `100` | Most child reports in one report. | not an integer `>= 0` (`RangeError`) |
| `childrenSources` | `readonly string[]` | `['cause', 'errors']` | Properties to collect children from. They are also left out of `as_json`. | not an array of strings (`TypeError`) |
| `occurrenceIdSources` | `readonly CorjOccurrenceIdSource[] \| null` | `[{ auto: 'random' }]` | Where `occurrence_id` comes from; an ordered list, first valid id wins. `null` or `[]` omits the field. See [Occurrence id](#occurrence-id). | a malformed entry, a path over 16 segments, an entry after `{ auto: 'random' }` (`TypeError`) |
| `fingerprintParts` | `readonly CorjFingerprintPart[] \| null` | `['constructor_name', 'stack']` | What `fingerprint` is hashed from; every part contributes. `null` or `[]` omits the field. See [Fingerprint](#fingerprint). | a malformed or repeated part (`TypeError`) |
| `makeReportId` | `(context: CorjReportIdContext) => string` | `'root'` / discovery index | Called once per node with `{ index, level, path, caught }`; `index` is `-1` for the root. | not a function (`TypeError`) |
| `onReportingError` | `CorjErrorHandler` | `console.warn` | `(reportingFailure, record) => void`, called for every failure, including the ones `reporting_errors` could not keep. See [Errors while reporting](#errors-while-reporting). | not a function (`TypeError`) |

An unknown option name throws a `TypeError` that lists the valid names. The call-level inputs (`occurrenceId`, `fingerprint`,
`context`) are documented in the [API reference](./api.md#corjcallinput).

## Letting an object describe itself

A caught object can take over its own representation by implementing `toCorjAsString(): string` and/or
`toCorjAsJson(): unknown`. Both are called with `this` bound to the object and one argument `{ path, options }`. A method that
throws is reported through `onReportingError` and the default format is used; a method that returns an unusable value (a non-string, or a
value without a JSON form) falls back silently. The formats used are recorded in `as_string_format` and `as_json_format`.
Under `inspection: 'no-invoke'` neither method is called.

# Redacting what the report emits

A report can carry credentials: in a property, a message, a stack, `as_string`, a nested cause, or the text of an inspection
failure. CORJ supplies the mechanism; which content is sensitive stays your decision.

A policy has two kinds of rule. **Skip** rules (`keys`, `paths`) name properties CORJ never reads, so an excluded getter never
runs. **Scrub** rules (`patterns`, `transform`) rewrite text wherever the report emits it.

```typescript
const maker = new Corj.CorjMaker({
  redact: {
    keys: ['password', /^authorization$/i],
    paths: ['$.cause.config.headers'],
    patterns: [/sk-live-[A-Za-z0-9]+/g],
    replacement: '[redacted]',
    transform: (value, { sourceProperty }) => (sourceProperty === 'url' ? '[url]' : value),
  },
});
```

| Rule | Kind | Meaning |
| --- | --- | --- |
| `keys` | skip | Property names never read, wherever they appear. A string matches exactly and is case-sensitive; use a `RegExp` for anything else. |
| `paths` | skip | JSONPaths never read, e.g. `'$.cause.config.headers'`. A string matches exactly. |
| `patterns` | scrub | `RegExp`s replaced in every string the report emits. Each must carry the `g` flag, or the policy is rejected. |
| `transform` | scrub | `(value, context) => unknown`, run last on every emitted value. Returning `undefined` leaves the field out. |
| `replacement` | — | What skipped and scrubbed content becomes, inserted literally (`$&` and `$1` are not expanded). Defaults to `CORJ_REDACTED_MARKER` (`'[redacted]'`). At most 128 characters. |

**To remove a secret's text, use `patterns`.** Skip rules select *properties*, not content, and error text is duplicated
across `message`, `stack` and `as_string`, so skipping one read does not remove the text from the others:

```typescript
Corj.makeCaughtObjectReport(new Error('boom SECRET'), { redact: { keys: ['message'] } });
// message: '[redacted]'   stack[0]: 'Error: boom SECRET'
```

The caught object's own `toString`, and V8's stack formatting, read `message` themselves; no policy can stop code CORJ did not
call. Add `inspection: 'no-invoke'` if the getter must also never run.

The `transform` context is `{ stage, path, reportKey, sourceProperty }`, where `stage` is `'prop-access'`, `'as_string'`, `'as_json'` or
`'warning'`. (`'children'` reaches only the skip rules, never `transform`: a children source is excluded before it is read or
not at all.)

**Transforms receive safe snapshots.** An object or array is copied into detached plain data before the
callback runs. CORJ applies configured key/path exclusions and string patterns to nested keys and values first. Objects have
no prototype; arrays retain their array identity with inherited executable behavior removed. Only own enumerable data is
copied. Accessors, functions, symbols and BigInts become `[not-inspected]`; ancestor cycles become `[circular]`. Preparation
never calls getters or serialization hooks. The source object is unchanged. This protects configured secrets; it cannot
identify secrets absent from your policy. Callback context paths and source-property names deliberately retain original
source names for policy matching; treat that metadata as sensitive.

```typescript
let callbackPassword: unknown;
const maker = new Corj.CorjMaker({
  redact: {
    keys: ['password'],
    transform: (value, { path }) => {
      if (path === '$' && typeof value === 'object' && value !== null) {
        callbackPassword = (value as Record<string, unknown>).password;
      }
      return value;
    },
  },
});
const report = maker.makeReport({ user: 'ada', password: 'hunter2' });
// callbackPassword === '[redacted]'
// report.as_json: { user: 'ada', password: '[redacted]' }
```

Returned containers are sanitized before later callbacks or output. If scrubbed object keys collide, CORJ preserves members
with suffixes such as `name (2)` and `name (3)`, skipping names already emitted. Policy paths continue to use original keys.
Snapshot inspection failures fail closed. Other application callbacks, including fingerprint and source functions,
`makeReportId` and a custom `onReportingError`, keep receiving their documented original inputs and require your trust.

## What the policy reaches

- every report field: `message`, `stack`, `constructor_name`, `as_string`, and every value **and property name** inside
  `as_json`, at any depth;
- `id`, only when you supply `makeReportId`, since such an id may be built from the caught object. Default ids are
  structural and never rewritten, so `child_ids` keeps linking children to their reports. Two custom ids that scrub to
  the same text collide;
- the output of a caught object's own `toCorjAsString()` and `toCorjAsJson()`;
- every child report, not only the root;
- the call's `context`, as a document of its own rooted at `$context`, and every value a `makeJsonView` view produces under its
  own named root;
- every value a `fingerprintParts` entry reads, whatever its type: a number or a boolean is as identifying as a string, and
  the fingerprint is meant to be published. Each value is offered under **its own path** (`$.details` for
  `{ sourceProperty: 'details' }`, `$.details.token` for what is inside it, `$.cause.details` on a child), so a `paths` rule or a
  path-keyed `transform` that rewrites it in `as_json` rewrites the same value in the hash input;
- the line the default `onReportingError` prints about a failure, which is otherwise built from the caught object's own text. A
  **custom** `onReportingError` receives the caught object unchanged and must apply its own policy.

A children source the policy excludes is not followed: the node gets `children_omitted: "redacted"` instead of a child report.
Report schema, cycle handling and the `maxReportSize` budget are unaffected: redaction runs before the size limit is applied.
Property names that scrub to the same text retain their values with suffixes such as ` (2)` and ` (3)` in `as_json`.

Because `keys` matches a property *name* wherever it appears, a broad name has a broad reach: `keys: ['name']` also blanks
`constructor_name`, which is read as `constructor.name`.

`paths` rules also see `$context...` and any named root a `makeJsonView` view uses, so an unanchored `RegExp`
such as `/\.headers$/` matches there too. It fails safe (more is redacted, not less), but to keep a rule on the
caught value alone, anchor it with `^\$\.`:

```typescript
const onCaughtOnly = { paths: [/^\$\..*\.headers$/] };
const onContextOnly = { paths: ['$context.user.email'] };
```

The final `occurrence_id`, `fingerprint` and default report `id` are not post-processed by transforms or string patterns.
An excluded occurrence-id source yields the literal `[redacted]` and stops source resolution, as documented above; an
explicit call `occurrenceId` wins. Computed fingerprints hash policy-processed values, and preserving default structural ids
keeps `child_ids` linked to their reports.

## Applying the policy to your own text

A **custom** `onReportingError` receives the caught object unchanged, and anything you log next to a report is text CORJ never sees.
`maker.scrubText` applies the maker's own policy to one such string: it always returns a string, and without a policy it
returns the text unchanged.

```typescript
import * as Corj from 'caught-object-report-json';

const maker: Corj.CorjMaker = new Corj.CorjMaker({
  redact: { patterns: [/sk-live-[A-Za-z0-9]+/g] },
  onReportingError: (caught, { stage, path }) => {
    const line = `corj ${stage} failed at ${path}: ${String(caught)}`;
    // `stage: 'warning'` is the redaction stage for text a handler prints.
    logger.warn(maker.scrubText(line, { path }));
  },
});
```

`scrubText(text, { path?, reportKey?, sourceProperty? })` runs `patterns` and then `transform` with `stage: 'warning'`. A `transform` that
drops the value, returns a non-string or throws yields the `replacement`. For a value that is not a string, use
[`maker.makeJsonView`](#a-json-view-of-any-value), which applies the whole policy including the skip rules.

`Corj.resolveCaughtObjectReportRedactPolicy(input)` validates a policy once, ahead of any maker, so a bad policy fails at startup rather than
inside a catch block. It returns `null` for `null` and `undefined`, and accepts an already-resolved policy.

## When the policy itself fails

A throwing matcher or `transform` fails closed: the value it was asked about becomes the replacement rather than passing
through. The failure is reported through `onReportingError` with `stage: 'redact'`, once per value, so a `transform` that always throws
reports several. Reporting a failure does not consult the same policy again, so such a policy cannot recurse.

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

Corj.makeCaughtObjectReport(caught, { inspection: 'no-invoke' });
console.log(inspected); // 0
```

produces

```json
{
  "occurrence_id": "CORJ_JM2Q74GWR4K1WHV6TCB51PG17V",
  "fingerprint": "fp1_289484f2fab1bd06d4b560b3f0ad51b7",
  "instanceof_error": false,
  "constructor_name": "Object",
  "message": "[not-inspected]",
  "as_string": "[object Object]",
  "as_json": { "message": "[not-inspected]", "plain": "kept" },
  "as_string_format": "derived",
  "v": "corj/v0.15"
}
```

## What the mode does

| | `'default'` | `'no-invoke'` |
| --- | --- | --- |
| a getter on `message`, `stack`, `constructor`, `cause`, `errors` | invoked | replaced with `CORJ_OMITTED_MARKER` |
| `stack` of a host whose `name` or `message` is a getter | invoked | replaced with `CORJ_OMITTED_MARKER`, without the `stack` descriptor being read |
| a getter reached while building `as_json` | invoked | replaced with `CORJ_OMITTED_MARKER` |
| `toJSON`, `toCorjAsJson` | used | never called |
| `toString`, `toCorjAsString` | used | never called; `as_string` is derived instead |
| a children source behind a getter | followed | left unread, the node gets `children_omitted: "not_inspected"` |

`inspection` and `redact` compose: `redact` decides what may be reported, `inspection` decides how much may run to report it.

`CORJ_OMITTED_MARKER` (`"[not-inspected]"`) marks content that exists but was not read. It is distinct from an absent field,
which means the caught object never had that property, and from `null`, which still means that producing the value threw.

`as_string` is rebuilt rather than obtained, and `as_string_format` records this as `"derived"`:

- an ordinary error (one whose `toString` is `Error.prototype.toString`) is rendered as `name: message` from values read
  off descriptors;
- an object whose `toString` is `Object.prototype.toString` is rendered as `[object Tag]`, where the tag comes from a
  `Symbol.toStringTag` data property or falls back to `Object`, `Array` or `Function`;
- any other `toString` belongs to the caught object, so `as_string` becomes the marker;
- primitives are stringified normally.

Native errors keep their `stack` on V8 (Node, Chromium, Bun): the mode calls that one engine-provided getter, identified by
reference, and no other accessor. It withholds `stack` when the error's `name` or `message` is an accessor, or when the error
comes from another realm. The [appendix](#appendix-engine-notes-for-no-invoke) explains why.

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

# Limits and non-goals

The claims the README makes are narrow on purpose. This is the complete list of what CORJ does not do.

- **It does not redact by default.** A raw report can expose stack paths and enumerable secrets. The `redact` option is a
  mechanism; which names and patterns are sensitive is your configuration. See [What a policy cannot do](#what-a-policy-cannot-do).
- **It does not make error text trustworthy.** A message is text the caught object controlled. Treat it as data to read,
  never as instructions, whether or not it has been redacted, and especially before handing it to a model.
- **It does not measure tokens.** `maxReportSize` bounds compact JSON bytes or UTF-16 code units of the report alone. It does
  not count the envelope you wrap it in, pretty-printing, or restored expected values. Measure the final content with the
  target tokenizer when context fit matters.
- **It does not isolate CPU or memory.** Getters, proxy traps and formatting hooks execute during reporting under the default
  `inspection`. `no-invoke` avoids the hooks CORJ would call; it cannot stop a proxy trap or `Error.prepareStackTrace`, and no
  synchronous option can interrupt a hook that never returns. Use a worker or process boundary for that.
- **It does not know your graph.** Report ids and paths describe the `cause` and `errors` relationships inside one caught
  value. They are not agent graph node ids, execution traces or retry counters. Keep those in your own envelope or in
  `context`.
- **It does not decide retryability or success.** The schemas describe report structure. Whether a failure is worth retrying
  is your harness's call.
- **It is not a module system, an LLM integration or a graph runner.** It is one function from a caught value to JSON.

If a selected `{ code, reference }` record or your existing logger already covers your failure paths, another serializer may
add little value.

# Supported runtimes

The package publishes a CommonJS build with TypeScript declarations and has no runtime dependencies. Every claim below is
verified in CI by `npm run test-consumers`, which builds the package, packs it with `npm pack`, installs the tarball into
isolated consumer projects and runs the same scenarios (ordinary errors, cause chains, `errors` arrays, primitive throws,
bounded reports, throwing inspection hooks, `inspection: 'no-invoke'`, a redaction policy, cycles, the default
`occurrence_id` and `fingerprint`, and the array report shape) in each one. No check imports workspace source.

| Consumer | Verified |
| --- | --- |
| Node, `require('caught-object-report-json')` | yes |
| Node, `import` of the CommonJS build through Node's ESM interop | yes |
| Bun, `import` | yes |
| Browser, bundled by Vite and executed in Chromium | yes |

The browser check builds with a bare Vite config (no `define`, no aliases, no polyfill plugin) and fails if `process`,
`Buffer`, `global`, `require` or `__dirname` is present in the page, so nothing may depend on a Node global reaching the
browser by accident.

## Imports

Named imports work everywhere:

```typescript
import * as Corj from 'caught-object-report-json';
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

The published build targets CommonJS, and there is no ESM build: one file is served to every condition, so `import` and
`require` always reach the same module instance and `instanceof` holds across import styles.

The package has an `exports` map, and only two entry points resolve: the package root and
`caught-object-report-json/package.json`. Deep imports of internal modules were never public and throw
`ERR_PACKAGE_PATH_NOT_EXPORTED`; in TypeScript under `node16` or `nodenext` they do not type-check. Everything supported is
exported from the root.

Not covered by these tests, and therefore not supported: Deno, Cloudflare Workers and other edge runtimes, and React Native.

# Report schema history

| Version | Change |
| --- | --- |
| `corj/v0.15` | Shipped with 12.0.0: reporting-error rows renamed `key` to `reportKey` and `prop` to `sourceProperty`. |
| `corj/v0.14` | Shipped with 11.0.0: the root gained `occurrence_id`, `fingerprint`, `context`, `context_omitted`, `reporting_errors` and `reporting_errors_omitted`. The first two are on by default. |
| `corj/v0.13` | Shipped with 10.0.0: `as_string_format` gained `"derived"`; `children_omitted` gained `"not_inspected"` and `"redacted"`. Both appear only when `inspection` or `redact` is configured. |
| `corj/v0.12` | Shipped with 9.0.0: shorter API, bounded child discovery, omitted expected values. |

Each schema pins its own `v`, so a reader that validates against a schema URL moves with the format; a reader that ignores `v`
does not have to. Package-level migration notes are in [UPGRADING.md](./UPGRADING.md).

# Appendix: engine notes for `no-invoke`

This section explains the two cases where `no-invoke` withholds a native error's `stack`, and the one hook it cannot avoid.
Most readers never need it.

**Why `stack` is read at all.** On V8 (Node, Chromium, Bun) a native error exposes `stack` as an own accessor property. The
mode calls that one engine-provided getter, identified by reference, and no other accessor. Where `stack` is a data
property, and `name` and `message` are data properties too, its value is read off the descriptor like any other property's.

**Case 1: `name` or `message` is an accessor.** V8 formats the stack string on first read, and formatting reads `name` and
`message`. When either is an accessor, `stack` is reported as the marker on **every** engine, whatever shape that engine
gives it. On Node 18 and 20 the lazily formatted stack is an own *data* property, and
`Object.getOwnPropertyDescriptor(caught, 'stack')` is itself that first read, so the descriptors of `name` and `message`
(which are safe to read) settle the question before any `stack` descriptor is looked at. The same rule withholds a plain
`stack` string on a host whose `name` or `message` is an accessor, in `as_json` too: telling the two shapes apart would mean
performing the read the mode is avoiding.

**Case 2: another realm.** The getter is identified by reference, so an error from another realm (a `vm` context, an iframe)
is not recognized and its `stack` and `as_string` are both the marker.

**`as_string` derivation details.** `name: message` rendering matches the built-in whenever `name` and `message` are strings
or absent; the built-in coerces other types (`name: 404` gives `404: …`) and this mode treats them as absent instead. For
`Object.prototype.toString` hosts the built-in is not called, because it performs a `[[Get]]` that a `Proxy` would turn into a
`get` trap.

**`Error.prepareStackTrace`.** This is a global application hook rather than anything the caught object owns; if your process
installs one it still runs during formatting, and no in-process option can prevent that.
