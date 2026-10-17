# Report Input Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. The user chose Sol medium implementation and Astra high final review. No further workflow approval is needed.

**Goal:** Fix approved reporting boundaries with safe transform inputs, bounded input work, preserved JSON members, and supported fp1 compatibility.

**Architecture:** Bound work at inspection/conversion sites separately from output fitting. Prepare detached transform snapshots with call-scoped parent provenance. Preserve source paths and omit computed fingerprints when safety handling makes their old canonical input unavailable.

**Tech Stack:** TypeScript, bundled CommonJS JavaScript, Jest/ts-jest, existing schema/consumer checks; no runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-17-report-input-boundaries-design.md`

## Global Constraints

- Default-safe transform inputs; no sanitizeTransformInput option.
- Excluded occurrence-ID source returns literal `[redacted]` and stops fallback.
- Limits: 10,000 candidates; 128 nesting/prototype steps; 16,384 decimal BigInt digits; 1,000,000 text units; 10,000 display stack lines.
- Preserve existing schema enums, marker spellings, public options, target, and supported fp1 recipe.
- Keep work local on fix/report-input-boundaries; no commits/publication.
- Existing 100% statements/branches/functions/lines coverage thresholds remain required.

## Starting state and coordinated ownership

Baseline: 1,511 tests/32 suites passed; parent's evidence is /tmp/corj-baseline-tests.log. Dirty README, partial serializer, and draft input/snapshot/serializer tests must be reviewed rather than overwritten. Draft opt-in, fallback-after-exclusion, #2 suffixes, bracket numeric-object paths, and invented marker expectations are obsolete.

Task 1 owns src/safe-stable-stringify.js, new src/input-limits.js, serializer-boundaries tests, and ONLY Stringify type in src/report-size.ts. Task 2 owns src/redaction.ts, optional focused src/redaction-snapshot.ts, and snapshot/redaction tests. Task 3 owns src/index.ts, report-size integration, lazy-stack helper, and report/fingerprint tests. Task 4 integrates docs/verification. Tasks 1–3 may start independently after agreeing the following interfaces; do not concurrently edit index.ts. Integrator resolves shared-file changes after workers finish.

## Shared internal interfaces

Create CommonJS src/input-limits.js, importable from TypeScript/JS:

```ts
export const INPUT_MAX_VISITS = 10_000;
export const INPUT_MAX_DEPTH = 128;
export const INPUT_MAX_TEXT_LENGTH = 1_000_000;
export const INPUT_MAX_BIGINT_DIGITS = 16_384;
export const INPUT_MAX_STACK_LINES = 10_000;
export function bigintExceedsInputLimit(value: bigint): boolean;
```

Threshold implementation uses BigInt('1' + '0'.repeat(INPUT_MAX_BIGINT_DIGITS)) and positive/negative comparisons, never input formatting.

Extend serializer configure/per-call contracts and Stringify type consistently:

```ts
type InputOptions = {
  maximumVisits?: number; // nonnegative safe integer or Infinity, default Infinity
  inputDepthLimit?: number; // same validation/default
  maximumTextLength?: number; // same validation/default
  keyCollision?: 'suffix' | 'throw'; // default suffix
  onInputLimit?: (reason: 'visits' | 'depth' | 'text') => void;
};
type RedactProperty = (key: string, path: string, read: () => unknown, parent: object) => unknown;
type MapPropertyKey = (key: string, path: string, parent: object) => string;
```

Retain onTruncate for both output/input truncation; onInputLimit specifically distinguishes new safety guards from fp1's supported legacy output truncation. Keep lengthLimit/basePath/replacer behavior. Parent-aware callbacks accept old callbacks with fewer arguments.

Recommended internal Redactor integration methods (not public exports):

```ts
withScope<T>(produce: () => T): T;
apply(value: unknown, context: CorjContext, origin?: { parent: object; key: string }): unknown;
key(key: string, context: CorjContext, parent: object): string;
sourceContext(parent: object, key: string, fallback: CorjContext): CorjContext;
```

withScope stacks/restores WeakMap provenance and preparation counters in finally. Standalone apply uses a temporary scope. sourceContext returns original names/paths for prepared members. key skips repeat patterns on prepared names while retaining the normal key-transform opportunity. Snapshot creation applies patterns, not transforms. Task 2 must send integrator exact optional constructor callbacks for limit/fingerprint-incompatibility notification before consumers are wired. Routine private helper naming may be refined with coordinated notification; public behavior is fixed by the spec.

### Task 1: Serializer limits and key preservation

**Files:** src/safe-stable-stringify.js; Stringify type in src/report-size.ts; new src/input-limits.js; tests/serializer-boundaries.test.ts; existing serializer coverage tests.
**Consumes:** Shared interface/spec and partial serializer diff.
**Produces:** Independent bounded serializer, input-specific notification, parent callbacks, suffix/throw collisions, limit constants/BigInt guard.

- [x] Inspect interrupted implementation and add failing tests for configured/per-call zero/exact/exceeded/Infinity limits, invalid values, omitted properties, sparse arrays, repeats, deep containers, and restored state after reentry/throw.

```ts
let reads = 0;
const input = { a: undefined, b: undefined, c: undefined };
const json = configure({ maximumVisits: 2 })(input, (_k: string, v: unknown) => { reads++; return v; });
expect(reads).toBe(3); // root + two candidates
expect(JSON.parse(json!)).toEqual({ '...': '[truncated]' });
```

- [x] Run `npm test -- --runInBand --silent tests/serializer-boundaries.test.ts` and confirm intended failures.
- [x] Charge candidates before reads/mapKey/replacer; depth before enumeration; text before escaping. Notify each input-limit category once, independently from output truncation. Bound processing/sorting after native enumeration; reject unsafe over-wide sorted fingerprint input.
- [x] Complete collision allocation using emitted-name Set and next-suffix Map. Omitted values do not reserve names or fail throw mode. Original source paths survive. Test natural suffix keys before/after collisions, recursive names, __proto__, multibyte keys, and tight budgets.

```ts
expect(configure({ deterministic: false })({ a: 1, b: 2, c: 3 }, null, {
  mapKey: (key: string) => key === 'a' ? 'hidden (2)' : 'hidden',
})).toBe('{"hidden (2)":1,"hidden":2,"hidden (3)":3}');
```

- [x] Test BigInt threshold just below/at both signed boundaries, using string-built values. Keep low-level defaults unbounded; override Infinity only affects the current call.
- [x] Run serializer-boundaries, safe-stable-stringify, serializer-coverage, and json-length-limit test files. Send completed contracts/results to integrator; do not commit.

### Task 2: Default-safe transform snapshots

**Files:** src/redaction.ts; optional src/redaction-snapshot.ts; tests/sanitized-transform.test.ts; tests/redaction.test.ts.
**Consumes:** Shared constants, parent-aware serializer contract, lazy-stack helper, existing marker spellings.
**Produces:** Safe snapshots, provenance methods, bounded policy work, limit/incompatibility notifications.

- [x] Replace obsolete opt-in tests and fix draft markers/paths/suffixes. Test default detached null-prototype snapshots, own data only, unmodified source, withheld hooks/functions/accessors/BigInts, arrays, ancestor cycles, independent repeated references.

```ts
let seen: unknown;
const raw = { nested: { token: 'SECRET', value: 'ok' } };
const r = new Redactor(resolveRedactPolicy({ keys: ['token'], transform(v) { seen = v; return v; } })!, () => undefined);
r.apply(raw, { stage: 'as_json', path: '$', reportKey: 'as_json' });
expect(seen).toEqual({ nested: { token: '[redacted]', value: 'ok' } });
expect(seen).not.toBe(raw);
expect(Object.getPrototypeOf(seen)).toBeNull();
expect(raw.nested.token).toBe('SECRET');
```

- [x] Run snapshot tests and confirm raw-container exposure fails.
- [x] Implement Reflect.ownKeys → candidate budget → original-path exclusion → lazy-stack safety → descriptor → enumerable own-data copy. Never invoke transforms recursively during preparation. Define safe own properties; allocate suffixed keys; record original context/provenance.
- [x] Add proxy tests proving excluded descriptors are never queried; no inherited hooks/prototype data reach callbacks; nested patterns scrub keys/values before invocation; suffixing does not bypass source paths; hostile inspection errors stay safe.
- [x] Implement scope methods and identity-aware unchanged-result handling. Prepared descriptor identity permits skipping repeated patterns only while value is unchanged. Fresh/mutated callback output is sanitized before later callbacks/serialization. Scope restoration survives throws/reentry and maker reuse.
- [x] Test non-idempotent `/x/g`, replacement `xx`, identity transforms, changed strings, callback-produced containers, same-path later reports, retained snapshots reused later, and nested reports inside a callback. Identity output must be `xx`, not `xxxx`.
- [x] Bound input/intermediate/output text and aggregate snapshot content. Oversized subjects skip patterns/transforms; replacement expansion stops later policy work. Limit failures never format raw secrets.
- [x] Run snapshot and redaction test files; communicate exact integration methods and constructor notification parameters; do not commit.

### Task 3: Report integration and fingerprint compatibility

**Files:** src/index.ts; report-size integration in src/report-size.ts; src/lazy-stack.js; tests/input-boundaries.test.ts; occurrence-id/fingerprint/no-invoke/report-size tests.
**Consumes:** Tasks 1/2 contracts; complete spec.
**Produces:** Public maker methods obey source/proxy/work/privacy rules and preserve or safely withhold fingerprints.

- [x] Repair draft BigInt test compilation using BigInt('1' + '0'.repeat(16384)). Update excluded ID expectations; prove fixed marker and no fallback even with custom non-token replacement.

```ts
const later = jest.fn(() => 'public');
const maker = new CorjMaker({ redact: { paths: ['$.map.0'], replacement: 'not a token' },
  occurrenceIdSources: [{ path: ['map', 0] }, later], onReportingError: () => undefined });
expect(maker.makeReport({ map: { 0: 'SECRET' } }).occurrence_id).toBe('[redacted]');
expect(later).not.toHaveBeenCalled();
```

- [x] Run source/proxy regression tests. Fix container-based segmentPath; handle child Array.isArray throws while retaining opaque child and correct source-path diagnostics.
- [x] Add operation-local input state restored with ctx.errors in collecting/finally: discovery visits, field truncation, fingerprint invalidation. Nest redactor scopes for independent JSON/fingerprint surfaces; public reentry gets fresh state. Do not let JSON-only limits poison fingerprints.
- [x] Configure bounded maker/sorted/unlimited-output serializers. Disable input guards only for generated-report measurement/fitting. Test maxReportSize/maxSize null and report size invariants.
- [x] Integrate parent-aware redaction: derive fallback context, recover sourceContext, apply exclusions before read, call apply with origin, and map keys with key. Preserve omitted child-source handling and named $context roots.
- [x] Bound graph candidate work across nodes, including repeated references, omitted values, and non-index keys. Emit existing max_children omission plus limit diagnostics. Test next-call budget reset.
- [x] Guard decimal BigInt conversion in both root as_string modes, fingerprint parts/functions, and diagnostics. Guard raw text before policy/escaping/concatenation and hook outputs after return. Withhold entire oversized values safely.
- [x] Replace display stack split with bounded scanning; retain supported rawStack for fingerprinting. Bound prototype walks and detect repeating prototypes in accessNoInvoke/lazy-stack helpers, returning safe omission/failure.
- [x] Propagate fingerprint incompatibility through nested catches. Use keyCollision:'throw' plus onInputLimit; receive snapshot collision/loss notifications before suffixing. Retain legacy 16,384-byte output truncation and explicit call fingerprint precedence.
- [x] Capture supported baseline hash literals from existing fixtures or an isolated clean temporary copy; assert unchanged Error stack, primitive, supported BigInt, selected nested object, insertion-order invariance, and ordinary scalar transform hashes. Unsupported cases assert missing fingerprint plus fingerprint error, never updated silent hashes.

```ts
const huge = BigInt('1' + '0'.repeat(16384));
const maker = new CorjMaker({ fingerprintParts: [{ sourceProperty: 'large' }], onReportingError: () => undefined });
expect(maker.makeFingerprint({ large: huge })).toBeUndefined();
expect(maker.makeReport({ large: huge }).fingerprint).toBeUndefined();
expect(maker.makeFingerprint({ large: BigInt(42) })).toMatch(/^fp1_/);
```

- [x] Run input-boundaries, fingerprint, occurrence-id, no-invoke-inspection, report-size-invariants, and sanitized-transform tests, then npm run build. Resolve actual failures before broad testing.

### Task 4: Documentation, gates, and final Astra review

**Files:** README.md; relevant exported JSDoc; focused uncovered-branch tests; plan progress.
**Consumes:** Integrated implementation/evidence.
**Produces:** Accurate public contract, passing required checks, reviewed final diff.

- [x] Replace raw-container README guidance with default safe snapshots. Explain configured-secret scope, key suffixes, fixed input ceilings even without output caps, nonunique ID marker, fingerprint omission, and synchronous operations that cannot be interrupted. Distinguish transform from other trusted application callbacks.
- [x] Run git diff --check; audit for obsolete opt-in references, marker/path mistakes, unsafe formatting, unintended API/recipe changes, and discarded existing edits.
- [x] Run npm run build and npm test -- --runInBand --silent. Change legacy tests only for documented intentional contract corrections.
- [x] Run npm test -- --runInBand --silent --coverage. Reach existing 100% gates with meaningful branch tests, without ignore comments or threshold changes. Run npm run test-consumers; report environment failures accurately.
- [x] Request authorized Astra high final review of full diff/spec: exclusions before descriptors, provenance mutation/reentry, callback outputs, numeric paths, expensive conversions, fingerprint failure propagation, key preservation, generated-report measurement, types/coverage.
- [x] Fix concrete findings using Sol medium, rerun affected checks and required gates, obtain final Astra confirmation, and report behavior/tests/limits/local status.

## Self-review

Every approved requirement maps to Tasks 1–3; docs, hashes, schema/size compatibility, coverage, and requested model review map to Tasks 3–4. No unresolved user decisions. Workers may refine private helper names with coordinated notification while retaining the specified behavior.


## Final progress (2026-10-17)

All four tasks are complete. The requested model workflow was followed: Astra high planning, Sol medium implementation and corrections, then Astra high final review and re-review.

- Serializer guards and shared input limits are implemented in `src/safe-stable-stringify.js` and `src/input-limits.js`; safe detached snapshots, provenance, policy work limits, callback-output preparation, and compatibility notifications are implemented in `src/redaction.ts`.
- Report integration is implemented in `src/index.ts`, `src/report-size.ts`, and `src/lazy-stack.js`. Operation state restores during reentry, excluded occurrence-ID sources stop at the fixed marker, actual containers determine source paths, revoked child sources remain opaque children, and generated-report measurement disables input guards.
- Regression coverage includes the initial 14 failures reproduced before implementation, supported baseline fp1 hashes, input and snapshot limits, key preservation, callback mutation/reentry, prototype exhaustion, arbitrary thrown revoked proxies, and sparse-array compatibility. Consumer scenarios independently exercise the built distribution, including ES5 error branding.
- All Astra findings are resolved, including snapshot view truncation, safe reads of prepared callback outputs, sparse arrays/custom prototypes, aggregate matcher work, scalar/nested fingerprint compatibility, trap-free WeakSet branding of actual constructed errors, and excluded sparse-array length notification without reading its descriptor.
- README and exported JSDoc document safe snapshots, configured-secret scope, sensitive original callback metadata, key suffixes, fixed input ceilings, trusted application callbacks, source paths, the nonunique ID marker, fingerprint omission, and synchronous operations outside interruptible library work.
- Final build passed. Prettier checks and `git diff --check` passed.
- Final full test and coverage gate passed: **35 suites, 1,620 tests, 25 snapshots; 100% statements, branches, functions, and lines**. Evidence: `/tmp/corj-brand-sparse-final-coverage.log`. No thresholds were weakened.
- Final packed consumer gate passed all six checks: Node CommonJS, Node ESM, Bun ESM, export encapsulation, TypeScript declaration resolution, and Chromium browser execution. Evidence: `/tmp/corj-consumers-final.log`.
- Astra high re-review approved the final corrections with no remaining correctness, security, or availability blocker in scope. Evidence: `/tmp/corj-astra-rereview.md`. The parent's subsequent TypeScript and Chromium checks completed the final consumer gate.

Work remains local on `fix/report-input-boundaries`. No commits or publication were performed.
