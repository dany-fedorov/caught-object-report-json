# API review: brevity, LLM-friendliness, scalability

> **Status (2026-09-11):** everything below was applied in v9 (schema `corj/v0.12`) except `maxStackLines` (section 2.1),
> which was deliberately dropped: the size limit already bounds the stack, and stack lines are not something to lose by
> accident. The three defects are fixed and covered by tests. The rest of this document is the review as written, kept for
> the reasoning behind the changes; the README's "Upgrading from v8" table lists the resulting API.


Reviewed at v8.0.0 / `corj/v0.11` (commit 456fe28), 2026-09-10. Breaking changes are on the table.

Numbers below come from `ts-node` probes against `src/` on this machine (Node, default options unless stated). They are order-of-magnitude, not benchmarks.

## Summary

| Area | Verdict |
| --- | --- |
| Brevity | 32 exports and 14 options for a library whose whole job is `caught -> JSON`. About half can go: aliases, `*Entries` methods, format-list options, dual metadata configs, dual error-handling knobs. |
| LLM-friendliness | The report shape is good (flat children, JSONPath `path`, stack as lines, omitted defaults). The biggest token sink is untouched: the stack is 97% of a plain-`Error` report and there is no way to cap or filter frames. Free-text `children_omitted_reason` and the 38-char truncation marker are the other costs. |
| Scalability | Per-report cost is fine (~15 µs). Child discovery has no visited-set and no node cap, so a self-referencing `AggregateError` with 16 entries takes 14.5 s and 3.8 GB. That is the one real problem. |

Three defects found on the way are listed at the end. Two of them break the "slap it on anything" guarantee.

## 1. Brevity of the API

### 1.1 Entry points: five ways to do two things

| Today | Proposal |
| --- | --- |
| `makeCaughtObjectReportJson`, `bakeCorj` | `makeCorj(caught, options?)` |
| `makeCaughtObjectReportJsonArray`, `bakeCorjArray` | `makeCorjArray(caught, options?)` |
| `new CorjMaker(fullOptions)`, `CorjMaker.withDefaults(partial)` | `new CorjMaker(partial?)` merges with defaults |
| `maker.cloneWith(partial)` | `maker.with(partial)` |
| `makeReportObject`, `makeReportArray` | keep, or shorten to `object` / `array` |
| `makeReportObjectEntries`, `makeReportArrayEntries` | remove |

Reasons:

- The `Entries` methods exist "to produce entries in dependable order", but `Object.fromEntries` already preserves that order, and every caller immediately converts back. They drag in two exported types (`CaughtObjectReportJsonEntries`, `CaughtObjectReportJsonNestedEntries`) and double the size of the `CorjMaker` surface.
- The constructor taking the full `CorjMakerOptions` (all fields required) is a footgun. Nothing in the README calls it directly. Making the constructor accept a partial removes `withDefaults` and the `DeepPartialOptions` type gymnastics.
- Two aliases for each function means two names for an LLM or a reader to reconcile. Pick the short one.
- `maker.options` is public and mutable, and the README has a paragraph about what happens when you mutate it. Make it `readonly` and drop that paragraph.

### 1.2 Options: 14 can become 8

| Option | Proposal | Why |
| --- | --- | --- |
| `maxReportSize`, `reportSizeUnit` | keep | Core feature. |
| `omitExpectedValues` | keep | Core feature. |
| `parseStackToArray` | keep, but see 2.1 for `maxStackLines` | Name says "parse", behaviour is "split". `stack: 'lines' \| 'string'` reads better. |
| `metadataFields`, `childrenMetadataFields` | one `metadata: boolean \| { v, $schema }` | With `omitExpectedValues`, the three format/source metadata fields are already dropped whenever they hold the default. That leaves `v` and `$schema` as the only metadata a caller controls. Per-child metadata is already forced off in object mode and forced on in array mode, so the second option mostly configures nothing. |
| `asJsonFormatsToApply`, `asStringFormatsToApply` | remove | Each is a 1-or-2 element list from a 2-value enum. The only meaningful setting is "honour `.toCorjAsJson` / `.toCorjAsString` or not", and there is no reason not to. Always try the method, fall back to the default. `as_json_format` / `as_string_format` then only appear when the method was used, which the omission rule already does. |
| `maxChildrenLevel`, `childrenSources` | rename to `maxDepth`; add `maxChildren` | See 3.1. |
| `makeReportId` | keep | |
| `onCaughtMaking`, `printWarningsOnUnhandledErrors` | one `onError: (err, ctx) => void`, default `console.warn` | Today `onCaughtMaking: null` plus `printWarnings: true` prints "Muffling error". Two knobs to express three states. Silence is `onError: () => {}`. |

Dropping the format lists also deletes `CORJ_AS_JSON_FORMAT_*`, `CORJ_AS_STRING_FORMAT_*`, `CorjAsJsonFormat`, `CorjAsStringFormat`, `CaughtObjectAsJsonReport`, `CaughtObjectAsStringReport` from the public surface (the last two are not used by any exported signature today). `CorjMakerOnCaughtMakingReason` has a value `'error-converting-caught-to-json'` that is also emitted for string conversion (see Defects), so the reason enum is not currently trustworthy anyway.

### 1.3 Naming

Types mix two prefixes: `CaughtObjectReportJson*` and `Corj*`. The package already calls itself CORJ everywhere in values (`CORJ_VERSION`, `CorjMaker`). Suggest `CorjReport`, `CorjReportChild`, `CorjOptions`, `CorjJson`. The long forms can stay as deprecated aliases for one major.

### 1.4 The `children` field means two things

In an object report, root `children` is `Child[]`. In each child, and in the array root, `children` is `string[]` of IDs. That is why `CaughtObjectReportJsonChild` has to override the field type. Rename the ID list to `child_ids` so the override disappears and a reader never has to check which shape they hold.

## 2. LLM-friendliness

What already works well and should stay:

- Flat `children` with `id`, `level` and a JSONPath-style `path` (`$.cause.errors[0]`). Models know JSONPath.
- `stack` as an array of lines. No `\n` escapes, and a consumer can slice the first N frames.
- Omitting expected values. A plain `Error` becomes `{"stack": [...], "v": "corj/v0.11"}`. The first stack line still reads as `Error: boom`, so nothing a model needs is lost.
- A published JSON Schema per version. Useful for structured output and validation.

### 2.1 Stack frames dominate token cost and cannot be capped

A plain `Error` report is 970 characters, 97% of which is the stack. Most frames are `node:internal` or `node_modules` noise. There is no option to keep only the first N lines or to drop frames by pattern.

Proposal: `maxStackLines?: number` (keep the header line plus N frames, append a count of dropped frames as the last line) and optionally `stackFilter?: (line) => boolean`. This is the single largest token win available, and it stays inside the existing `stack: string[]` shape. The size limiter already re-derives header fields from `stack[0]`, so it composes cleanly.

### 2.2 `children_omitted_reason` is free text

Values are `"Reached max depth - 5"` and `"Reached max report size - 100000 utf8-bytes"`. A consumer has to regex a sentence to learn which limit hit. Replace with a code: `children_omitted: "max_depth" | "max_size"`. The numbers are already known to the producer and not useful to the reader. This also removes `CORJ_NESTED_OMITTED_REASONS` from the public surface.

### 2.3 Truncation marker is long and repeated

`[caught-object-report-json: Truncated]` is 38 characters and can appear once per truncated string, array and object, inside `as_json` at every level. At a 256-byte budget the marker alone is 15% of the report. A short form such as `"…[truncated]"` (or an empty-string marker plus the existing `truncated: true` flag) keeps the signal and saves the bytes. Keep it a single constant exported for readers.

### 2.4 Docs for a model reading them

The type-level JSDoc is thorough but front-loads MDN links and code that shows how a field is computed. What a model (or a person) needs first is the report shape in one screen: field, type, when present, example. The README's "Omitted expected values" table is that. Consider moving it to the top of the API section and trimming the per-field JSDoc to one line plus the omission rule. Also: `asJsonFormatsToApply` and `asStringFormatsToApply` have empty doc comments today.

## 3. Scalability and performance

### 3.1 Child discovery is unbounded

`makeChildrenEntries` walks `cause` / `errors` with a depth limit only. There is no visited-set and no cap on node count, and every node gets its `as_json` serialized with the full `maxReportSize` budget before the limiter runs. The limiter then throws almost all of it away.

| Input (`AggregateError` whose `errors` is N copies of itself, default depth 5) | Nodes visited | Time | RSS |
| --- | --- | --- | --- |
| N = 8 | 37,448 | 0.6 s | 0.4 GB |
| N = 12 | 271,452 | 3.0 s | 1.1 GB |
| N = 16 | 1,118,480 | 14.5 s | 3.8 GB |

The kept output in all three cases is about 320 children, and the report is 100 KB. Any code path that reports errors built from untrusted data is exposed to this. Fixes, in order of value:

1. Visited-set on the object identity (a `WeakSet` or `Map<object, id>`). A repeated object gets a child entry that references the first ID instead of being expanded again. This alone turns the table above into 1 node.
2. `maxChildren` (total node cap, default a few hundred). Set `children_omitted: "max_children"` on the parent where the cap hit.
3. Stop discovery early when the size budget is already exhausted by the nodes collected so far. The limiter today keeps at most a prefix of children anyway, so discovering beyond that prefix is wasted work.

### 3.2 Per-report overhead

| Path | Time per plain `Error` |
| --- | --- |
| `JSON.stringify(e, Object.getOwnPropertyNames(e))` | 1 µs |
| `maker.makeReportObject(e)`, `maxReportSize: null` | 6 µs |
| `maker.makeReportObject(e)`, default limit | 15 µs |
| `makeCaughtObjectReportJson(e)` (convenience) | 20 µs |

Fine for logging. Two cheap wins if wanted:

- `configureJsonStringify(...)` is called on every `makeProp_as_json` (once per node) and again in `limitReportSize` and each `candidate`. Options are immutable once the maker exists, so the configured stringifiers can be built once per maker. That is most of the gap between 6 µs and 15 µs.
- The convenience function re-screens and re-merges options on every call. Cache the default maker for the no-options case.

### 3.3 The size limiter is fine

Two nested binary searches, each re-serializing the report, sounds expensive but the stringifier stops at the first overflow, so each probe is O(`maxReportSize`). Five chained causes carrying 500 KB payloads each reported in 93 ms, and most of that is the pre-limit `as_json` work from 3.1, not the search. No change needed.

### 3.4 Defensive code that only the API shape requires

`screenOptionsForAccessorErrors` touches every option to catch throwing getters, and `mergeOptions` wraps everything in try/catch. Options come from the developer, not from the caught object. If the constructor takes a partial and spreads it once, both functions go away, and with them the "falling back to default options" console warning.

## Defects found during the review

These are bugs at the current API, independent of the proposals above.

1. **Custom `childrenSources` never yields children.** `getNestedObjectsOfCaught` returns early unless the object has a `cause` or `errors` key, before it looks at `options.childrenSources`. `makeCaughtObjectReportJson(err, { childrenSources: ['rootCause'] })` reports zero children for an error whose `rootCause` is set. `src/index.ts:650-655`.
2. **A throwing `has` trap escapes the library.** The same function uses `'errors' in caught` outside `safeAccessProp`, and `makeChildrenEntries` is not inside the try/catch in `makeReportObjectEntries`. `makeReportObject(new Proxy({}, { has() { throw ... } }))` throws instead of reporting. `src/index.ts:653,659`.
3. **Wrong context passed to `onCaughtMaking`.** String conversion failure reports `reason: 'error-converting-caught-to-json'` (`src/index.ts:835`), and the `toCorjAsJson` lookup passes report key `'as_string'` (`src/index.ts:962`).

## Suggested order

1. Fix the three defects (patch release, no API change).
2. Visited-set and `maxChildren` in child discovery (minor release, additive option).
3. `maxStackLines` (minor release, additive option).
4. The breaking cleanup in sections 1 and 2.2 to 2.3 as one major, with a new schema version.
