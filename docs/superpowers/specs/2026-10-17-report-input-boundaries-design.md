# Report input boundaries design

The user approved these fixes for issues #217, #221 (N1/N4), #216, and #218 and requested Astra high planning, Sol medium implementation, and Astra high final review. Keep changes local on `fix/report-input-boundaries`. No additional approval or commit is needed. Interrupted code/tests are starting material, not acceptance criteria.

## Source paths and occurrence IDs

The containing value determines paths: array indices use `$.items[0]`; numeric ordinary-object properties use `$.map.0`. Numeric and string source segments address the same property and policy path. Use existing dotted object paths everywhere, including snapshots.

Exclusions precede reads. If any segment of an occurrence-ID source is excluded, return the literal exported `CORJ_REDACTED_MARKER` (`[redacted]`) and stop the source chain. Ignore custom replacement and transforms for this marker; it is an existing valid printable-ASCII token. Document that it loses uniqueness and correlation information. Missing, unreadable, invalid, and no-invoke omitted sources retain fallback behavior. An explicit call occurrenceId still wins.

## Hostile values

Guard child-source Array.isArray as well as enumeration and reads. If classifying an available child throws, record a children error at the child source path and retain that value as an opaque child. Preserve the original root message. Neither root nor child revoked proxies may escape report production. Cover both inspection modes and report shapes, cause/errors sources, and nested JSON.

## Safe transform inputs by default

There is no sanitizeTransformInput option. Every redact.transform receives primitives or a detached policy-sanitized plain-data snapshot, with no raw nested object references. Other application callbacks retain their contracts. Sanitization protects configured keys/paths/patterns; it cannot discover arbitrary unknown secrets.

- Enumerate with Reflect.ownKeys, then process a bounded prefix of string keys. Apply keys/paths before consulting the property's descriptor. Object.keys is unsuitable for snapshot enumeration because it consults proxy descriptors before exclusion.
- Copy own enumerable data only, into null-prototype objects and arrays with executable inherited behavior removed while retaining Array.isArray. Ignore symbols/nonenumerable properties. Never invoke accessors, toJSON, toString, toCorjAsJson, or other hooks during preparation. Check existing lazy-stack safety before inspecting stack descriptors.
- Use actual markers: `[not-inspected]` for withheld accessors/functions/symbols/BigInts, `[circular]` for ancestor cycles, `[truncated]` for input limits, configured replacement for exclusions/inspection failures. Copy shared nonancestor references independently so path-specific rules work.
- Apply patterns to nested strings AND keys before calling transform. Snapshot preparation does not recursively run transforms. Keep source contexts keyed by original paths/names after scrubbing/suffixing.
- Sanitize callback-produced containers before passing their members to later callbacks or emitting them. Identity transforms must not reapply non-idempotent patterns. Changed returned strings still require scrubbing.
- Store provenance in a WeakMap keyed by actual prepared parents, containing emitted key, original key/path, and prepared value. Skip repeat pattern work only when the current own data descriptor still holds that value. Mutations, new properties/objects, later reports, and reentrant operations are fresh input. Do not cache by path/value or retain provenance across calls.
- Restore scopes in finally. Preparation failures expose safe markers and sanitized diagnostics, never raw exception objects/text as transform arguments. Do not rebuild already-prepared complete subtrees at every nested callback.

## Input work limits

Keep public options and schema enums unchanged. Document internal safety ceilings, enabled even with maxReportSize/maxSize null:

| Work | Ceiling | Scope |
| --- | ---: | --- |
| JSON candidate entries | 10,000 | Per serialization; charge before reads, omissions, transforms, and key mapping |
| Container depth | 128 | JSON/snapshot traversal; stop before descending/enumerating |
| Child-source candidates | 10,000 | Across graph discovery; repeats, omitted entries, and scanned non-index keys consume budget |
| Decimal BigInt magnitude | 16,384 digits | Before library-controlled decimal conversion |
| Text subject/intermediate | 1,000,000 UTF-16 units | Before policy/text work, after patterns/hooks/transforms |
| Aggregate prepared text | 1,000,000 UTF-16 units | Per snapshot scope, including keys and values |
| Stack display lines | 10,000 | Plus at most one truncation marker; bounded newline scan |
| Prototype lookup steps | 128 | Descriptor/prototype traversal, including lazy-stack helpers |

Snapshot and serializer counters are independent. Graph discovery shares one counter across nodes. Candidate limits count dropped/undefined/sparse/repeated values, not just emitted output. Budget exhaustion uses safe partial JSON and truncated markers, not call-stack failure or whole-object null. Discovery exhaustion uses existing max_children omission reason and a limit error.

Test BigInts against cached positive/negative thresholds constructed from a bounded constant decimal string. Do not format the input or convert all its bits to determine its size. Guard root as_string in both inspection modes, fingerprint source/function values, and diagnostic formatting. Preserve supported BigInt JSON-number behavior where decimal formatting is unnecessary.

Withhold oversized text whole before patterns/callbacks: truncating raw text first could expose a secret crossing the cut. Check intermediate replacements and callback/hook outputs too. Bound cumulative policy text work within traversals and snapshot text retention. Oversized keys are not emitted as raw prefixes. Use constant safe limit messages.

Native enumeration cannot be interrupted, but processing and sorting after enumeration can be bounded. Do not sort an arbitrarily large full key list for fingerprints: detect an over-budget key set before sorting and withhold that fingerprint. Ordinary output preserves insertion order. Use sets/per-base counters for key suffix allocation.

Keep low-level serializer input-limit defaults unbounded for compatibility; maker serializers enable finite limits explicitly. Measurement and size fitting of already-generated reports disable input guards so measurement cannot undercount. Output-size limits remain in force.

These are library-controlled work bounds, not deadlines. Native enumeration/allocation, proxy traps, default-mode hooks/getters, a single pathological regex or overridden regex method, and arbitrary application callbacks cannot be interrupted synchronously. Replacement expansion can allocate before returning; check its result before further work. Document these limits without promising bounded wall time.

## Reporting and fingerprints

Input truncation sets report/view truncated. Report errors use existing limit stage and affected reportKey; ordinary JSON-view traversal truncation may use its existing truncated channel without inventing inspection errors. Avoid one error per skipped tail entry and avoid recursion while describing failures.

Keep fp1 recipe and golden hashes for supported canonical inputs. New graph/input limits, withheld fingerprint values, unsafe fallback as_string, lossy snapshot preparation affecting a fingerprint, and key collisions invalidate computed fingerprints: omit them and record a fingerprint reporting error. Propagate failure through inner catches; hashing null in place of unsafe data is insufficient.

Use keyCollision:'throw' for fingerprint serialization, including snapshot collision detection before suffixing hides it. Use suffix mode for ordinary JSON. If snapshot preparation removes data legacy hashing would include, mark that contribution unsupported rather than running raw callbacks to reconstruct it. Supported plain-data/scalar transforms remain supported. Privacy fixes to previously bypassed paths/callback data are documented behavioral corrections.

The legacy fp1 16,384-byte JSON output cut and 16,384-code-unit string cut remain supported. Distinguish new input limits from those old output caps. Stack display-line truncation can retain a fingerprint over the complete supported redacted rawStack. JSON-only truncation must not poison a complete independent fingerprint. Explicit per-call fingerprints remain authoritative.

## Key collisions

Allocate base name first, then `name (2)`, `name (3)`, etc., skipping already-emitted names. Only surviving emitted members reserve names. Natural suffix-like keys cannot overwrite earlier members; allocation follows traversal order. Apply recursively to JSON objects/strings, snapshots, context views, and nested objects. Use null-prototype/safe property definition for __proto__ and constructor. Charge full escaped suffixed keys against budgets; policy paths remain original.

## Completion

No runtime dependencies, public option churn, target changes, or schema-enum changes. Preserve existing markers and API names sourceProperty/onReportingError/makeReport. Tests use BigInt('1' + '0'.repeat(16384)), not exponentiation unsupported by the target. Verify work with counters/sentinels, not elapsed-time assertions. Build, full tests, applicable consumer checks, existing 100% coverage gates, and Astra high final review are required. Do not weaken coverage or discard unrelated existing edits.
