# Upgrading

Migration notes for each major version of `caught-object-report-json`. The newest is first. The runtime rejects removed
option names with a `TypeError` that lists the valid ones, so a stale call site fails at the first report rather than
silently. Release-by-release detail is in the [CHANGELOG](../CHANGELOG.md).

- [Upgrading from v14](#upgrading-from-v14)
- [Upgrading from v13](#upgrading-from-v13)
- [Upgrading from v12](#upgrading-from-v12)
- [Upgrading from v11](#upgrading-from-v11)
- [Upgrading from v10](#upgrading-from-v10)
- [Upgrading from v9](#upgrading-from-v9)
- [Upgrading from v8](#upgrading-from-v8)

# Upgrading from v14

15.0.0 removes the frozen `Corj` object and exports its four functions from the package root under longer, self-describing
names. `CorjMaker`, every constant, every type, the maker's methods (`maker.makeReport`, `maker.makeReportArray`, …) and the
report formats `corj/v0.15` / `corj/v0.15-full` are unchanged.

| 14.x | 15.0.0 |
| --- | --- |
| `Corj.makeReport(caught, input?)` | `makeCaughtObjectReport(caught, input?)` |
| `Corj.makeReportArray(caught, input?)` | `makeCaughtObjectReportArray(caught, input?)` |
| `Corj.restoreExpectedValues(report)` | `restoreCaughtObjectReportExpectedValues(report)` |
| `Corj.resolveRedactPolicy(input)` | `resolveCaughtObjectReportRedactPolicy(input)` |
| `import { Corj } from '...'` | `import * as Corj from '...'` (the convention every example now uses) |

With the namespace import, a call site changes only in the member name:

```typescript
// 14.x
import { Corj, CorjMaker } from 'caught-object-report-json';
const report = Corj.makeReport(caught);
const maker = new CorjMaker({ maxDepth: 2 });

// 15.x
import * as Corj from 'caught-object-report-json';
const report = Corj.makeCaughtObjectReport(caught);
const maker = new Corj.CorjMaker({ maxDepth: 2 });
```

Named imports work as well, and read fine because the names carry their subject:

```typescript
import { makeCaughtObjectReport, CorjMaker } from 'caught-object-report-json';
```

A find-and-replace that covers most codebases, in order:

1. `Corj.makeReportArray(` → `Corj.makeCaughtObjectReportArray(`
2. `Corj.makeReport(` → `Corj.makeCaughtObjectReport(`
3. `Corj.restoreExpectedValues(` → `Corj.restoreCaughtObjectReportExpectedValues(`
4. `Corj.resolveRedactPolicy(` → `Corj.resolveCaughtObjectReportRedactPolicy(`
5. `import { Corj } from` → `import * as Corj from`; where `CorjMaker` was imported beside `Corj`, either keep it as a named
   import or write `new Corj.CorjMaker(...)`.

In TypeScript, a leftover `import { Corj }` fails with "Module has no exported member 'Corj'", and an assignment to a
namespace member fails with "Cannot assign to '…' because it is a read-only property", so nothing slips through silently.

# Upgrading from v13

14.0.0 hardens reporting against hostile inputs. No option was renamed or removed, and report formats stay `corj/v0.15` and
`corj/v0.15-full`. The breaks are behavioral:

| Change | What to do |
| --- | --- |
| `redact.transform` receives a detached, policy-sanitized snapshot instead of the raw container. Accessors, functions, symbols and BigInts appear as `[not-inspected]`; ancestor cycles as `[circular]`. | Nothing, unless a transform relied on reading a getter or calling a method on the value. Read the snapshot as plain data. |
| Input work and text ceilings apply even with `maxReportSize: null` or `maxSize: null`. | Nothing. Extremely large inputs now set `truncated` where they previously ran unbounded. |
| A computed fingerprint is omitted, with a reporting error, when a safety ceiling or a lossy snapshot prevents the `fp1_` input from being rebuilt faithfully. | Treat `fingerprint` as optional on the consuming side, which the schema always allowed. An explicit call `fingerprint` still wins. |
| An excluded `occurrenceIdSources` entry yields the literal `[redacted]` and stops the chain, regardless of a custom `replacement`. | Put `{ auto: 'random' }` before any source a policy might exclude if you need a usable id, or pass the call's `occurrenceId`. |
| Colliding redacted object keys are kept with suffixes such as `name (2)` instead of overwriting. | Nothing, unless a reader assumed a scrubbed object had fewer keys. |

# Upgrading from v12

13.0.0 groups the four stateless utilities under the frozen `Corj` object. `CorjMaker`, constants, and types remain named
exports, and report formats stay `corj/v0.15` and `corj/v0.15-full`.

Replace the utility imports and calls:

```typescript
// 12.x
import {
  makeReport,
  makeReportArray,
  resolveCorjRedactPolicy,
  restoreExpectedValues,
} from 'caught-object-report-json';

const report = makeReport(caught);
const rows = makeReportArray(caught);
const full = restoreExpectedValues(report);
const policy = resolveCorjRedactPolicy(input);
```

```typescript
// 13.x
import { Corj } from 'caught-object-report-json';

const report = Corj.makeReport(caught);
const rows = Corj.makeReportArray(caught);
const full = Corj.restoreExpectedValues(report);
const policy = Corj.resolveRedactPolicy(input);
```

A module namespace import needs the additional `Corj` property:

```typescript
// 12.x
import * as corj from 'caught-object-report-json';
corj.makeReport(caught);

// 13.x
import * as corj from 'caught-object-report-json';
corj.Corj.makeReport(caught);
```

Migration checklist:

* replace root `makeReport` with `Corj.makeReport`;
* replace root `makeReportArray` with `Corj.makeReportArray`;
* replace root `restoreExpectedValues` with `Corj.restoreExpectedValues`;
* replace root `resolveCorjRedactPolicy` with `Corj.resolveRedactPolicy`;
* keep importing `CorjMaker`, constants, and types by name;
* remove assignments to `Corj` members; the namespace is frozen and its members are readonly.

# Upgrading from v11

12.0.0 uses descriptive API names and moves reports to `corj/v0.15` (`corj/v0.15-full` for the full form). Replace
`makeCorj` / `makeCorjArray` with `makeReport` / `makeReportArray`; replace maker methods `makeReportObject`, `makeJson`, and
`with` with `makeReport`, `makeJsonView`, and `withOptions`. Free calls now accept one merged `CorjReportInput` bag:
`makeReport(caught, { maxDepth: 2, context })`. The third positional argument is rejected.

Rename `CorjReportChild` to `CorjReportNode`, `onError` to `onReportingError`, token source `{ field }` to
`{ sourceProperty }`, and callback/reporting-error fields `key` / `prop` to `reportKey` / `sourceProperty`. The old names and
deprecated context aliases are no longer exported. Fingerprints retain their `fp1_` meaning across the source-entry rename.

# Upgrading from v10

11.0.0 moves the report format to `corj/v0.14` (`corj/v0.14-full` for the full form) and turns two new root fields on by
default. A reader that validates against the `corj/v0.13` schema URL must move to the `corj/v0.14` URL; one that ignores `v`
and tolerates unknown fields needs no change.

| Change | What to do |
| --- | --- |
| Report format is `corj/v0.14` / `corj/v0.14-full` | Move schema URLs; `CORJ_VERSION` and the four `CORJ_*_JSON_SCHEMA_LINK` constants follow automatically. |
| `occurrence_id` and `fingerprint` are on by default | Nothing, or `occurrenceIdSources: null` and `fingerprintParts: null` to turn them off. |
| New root fields `context`, `context_omitted`, `reporting_errors`, `reporting_errors_omitted` | `context` and `reporting_errors` appear only when there is something to report. |
| `onError` is `(caught, record)` | The second argument is now a `CorjReportingError`: the old context plus `error`, the failure as scrubbed, bounded text. Existing handlers that read `stage`, `path`, `key` and `prop` keep working. |
| `CorjRedactor` is removed | Use `maker.scrubText(text, where?)` for a string, or `maker.makeJson(value, options?)` for a value. `resolveCorjRedactPolicy` stays. |
| `maxReportSize` floor is 512 | A budget between 256 and 511 now throws a `RangeError`. `maxContextSize` and `makeJson`'s `maxSize` keep a floor of 256. |
| `v` is never dropped by the limiter | A tiny budget used to drop it with the rest of the metadata; now it is a fixed field. |
| `redact.replacement` is capped at 128 characters | A longer one throws a `TypeError` when the policy is resolved. |
| `CaughtObjectReportJson`, `CaughtObjectReportJsonChild` and `CorjMakerOptions` are removed | Use `CorjReport`, `CorjReportChild` and `CorjOptions`. They have been deprecated since 9.0.0. |
| `redact.paths` now also sees `$context...` and named `makeJson` roots | An unanchored `RegExp` such as `/\.headers$/` starts matching there. It fails safe; anchor with `^\$\.` to keep a rule on the caught value alone. |

Two breaks are type-level only, from merging the redaction and error-handling context types into one `CorjContext` and one
`CorjStage`:

- `CorjErrorStage` gained `'warning'`, and `CorjRedactStage` gained `'limit'`, `'redact'` and `'other'`. Both are now
  aliases of `CorjStage`, so an exhaustive `switch` over either no longer compiles without the new arms.
- `CorjRedactContext.key` narrowed from `string` to `CorjReportKey`, the union of report field names.

`CorjErrorStage`, `CorjRedactStage`, `CorjErrorContext` and `CorjRedactContext` remain as deprecated aliases for one major.

# Upgrading from v9

10.0.0 was a major only because the report format moved to `corj/v0.13` (`corj/v0.13-full` for the full form). **Nothing
changes for a caller that configures neither `redact` nor `inspection`:** no option was renamed or removed, and the output of
every 9.x call is identical apart from `v`.

- A reader that validates against the `corj/v0.12` schema URL must move on; the current URL is `corj/v0.15`. One that ignores
  `v` needs no change.
- `children_omitted` gained `"not_inspected"` (from `inspection: 'no-invoke'`) and `"redacted"` (from a `redact` policy that
  excludes a children source); `as_string_format` gained `"derived"`. All three appear only when the option that produces them
  is configured.
- In TypeScript, `CorjErrorStage` gained `'redact'` and `CorjChildrenOmitted` gained those two values, so an exhaustive
  `switch` over either needs a new arm.
- Deep imports such as `caught-object-report-json/report-size` no longer resolve; import from the package root. The package
  now has an `exports` map, and only the root and `./package.json` are exported.
- A default report id (`"root"` and the discovery index) is no longer rewritten by a `redact` policy, so `child_ids` keeps
  linking children to their reports under a policy such as `patterns: [/\d/g]`. An id from a custom `makeReportId` is still
  scrubbed.
- New in 10.0.0: the `redact` and `inspection` options, and `resolveCorjRedactPolicy` for validating a policy ahead of a
  maker. (10.0.0 also exported a `CorjRedactor` class for applying a policy to your own text; 11.0.0 removed it in favour of
  `maker.scrubText`.)

# Upgrading from v8

The API has changed since v8, so a v8 codebase moves to the current major in one step. Reports use schema `corj/v0.15`; read
[Upgrading from v10](#upgrading-from-v10) and [Upgrading from v11](#upgrading-from-v11) as well. The runtime rejects old names
with a `TypeError` that lists the valid ones.

| v8 | 12.0.0 and later |
| --- | --- |
| `makeCaughtObjectReportJson`, `bakeCorj` | `makeReport` (`Corj.makeReport` since 13.0.0) |
| `makeCaughtObjectReportJsonArray`, `bakeCorjArray` | `makeReportArray` (`Corj.makeReportArray` since 13.0.0) |
| `CorjMaker.withDefaults(options)`, `new CorjMaker(fullOptions)` | `new CorjMaker(options)` |
| `maker.cloneWith(options)` | `maker.withOptions(options)` |
| `maker.makeReportEntries`, `maker.makeReportArrayEntries` | removed; `Object.entries(maker.makeReport(caught))` keeps the same order |
| `CORJ_MAKER_DEFAULT_OPTIONS` | `CORJ_DEFAULT_OPTIONS` |
| `maxChildrenLevel` | `maxDepth`; also new `maxChildren` (default `100`) |
| `parseStackToArray: true/false` | `stackFormat: 'lines' / 'string'` |
| `metadataFields`, `childrenMetadataFields` | `metadata: boolean \| { v?, $schema? }`, root only. `as_string_format`, `as_json_format` and `children_sources` are no longer metadata: they appear whenever they hold a non-default value |
| `asJsonFormatsToApply`, `asStringFormatsToApply`, `CORJ_AS_*_FORMAT_*` | removed; `toCorjAsJson` / `toCorjAsString` are always tried first |
| `onCaughtMaking(caught, { reason, ... })`, `printWarningsOnUnhandledErrors` | `onReportingError(reportingFailure, { stage, path, reportKey?, sourceProperty?, error })`, and the same rows in `reporting_errors`; silence with `onReportingError: () => {}` |
| `children` on child nodes and on the array root (ID lists) | `child_ids` |
| `children_omitted_reason` (free text), `CORJ_NESTED_OMITTED_REASONS` | `children_omitted: 'max_depth' \| 'max_children' \| 'max_size'` |
| `[caught-object-report-json: Truncated]`, `[caught-object-report-json: Circular]` | `[truncated]`, `[circular]` (`CORJ_TRUNCATED_MARKER`, `CORJ_CIRCULAR_MARKER`) |
| `null` entries allowed in `children` | never produced |
| a repeated object reported once per occurrence, cycles expanded to `maxChildrenLevel` | reported once, then referenced by `id` in `child_ids` |
| the v8 type names for the report, a child report and the options | `CorjReport`, `CorjReportNode`, `CorjOptions`; the v8 aliases were removed in 11.0.0 |
