# CORJ in an LLM harness

CORJ represents heterogeneous caught values as bounded diagnostic JSON. In
agentic development, that representation can sit at a tool or agent graph node's
catch boundary. The host creates the boundary, executes the operation, records
its outcome and selects the next action.

This rationale was audited on **2026-09-12**, against package `9.0.0`, runtime
commit `f74c3fa21ad3f8fd24a684b06b83f5ea7e0b4ab5`. The harness-facing README and
fixture example were working-tree additions during the audit. The
[full source/test evidence](https://github.com/dany-fedorov/di-bag/blob/main/docs/research/2026-09-12-error-boundary-harness-evidence.md)
contains claim ledgers, limitations and a reproducible integration probe. The
[shared harness engineering analysis](https://github.com/dany-fedorov/di-bag/blob/main/docs/research/2026-09-12-harness-engineering-claim-audit.md)
explains the broader host responsibilities.

## The useful causal chain

A provider or tool throws an Error, an aggregate, a plain object, or another
value. A host catch passes it to `makeCorj` or a configured `CorjMaker`. CORJ
captures available message, stack, string and JSON views, then follows configured
child sources, by default `cause` and `errors`. Repeated objects reuse the first
discovered ID. A flat array report includes the root and direct child links.

The host can store this diagnostic with its run ID, node ID, operation and
attempt number. Consumers then inspect one documented representation instead of
handling each SDK's thrown shape independently. Fixture tests can assert which
facts survived, whether truncation was reported, and whether the schema is valid.
This supports failure-path testing without a model call; the host's fixture and
assertions provide that test, while CORJ provides the diagnostic contract.

The host separately decides whether to retry, fall back or stop. Report schemas
do not encode retry safety or authorization. Messages are untrusted explanatory
data, and provider fields do not become trusted policy simply through serialization.
Operation validation, idempotency, retry budgets, side effects and persistence
remain application responsibilities.

CORJ IDs and paths describe caught-object relationships. They are not tool-call
IDs, execution timestamps or scheduling edges. A report cannot replay a run:
it lacks the prompts, tool results, state transitions and external effects needed
for that purpose. Preserve execution metadata in the surrounding record.

## Bounds, inspection and disclosure

The default size cap is 100,000 UTF-8 bytes of the compact report JSON, including
children. The minimum configurable cap is 256; `null` disables it. Depth and
child-count limits bound discovered child reports. The limiter can shorten
fields, remove later children or metadata, and produce a minimal report. These
operations preserve tested structural invariants, not every diagnostically useful
fact. Expected-value restoration fills format defaults; it cannot recover
truncated content or reconstruct a live Error.

The integration probe's 256-byte report grew to 399 bytes after restoration and
577 bytes when wrapped with a run ID. Prompt wrappers, accumulated reports and
pretty printing similarly consume additional space. Apply a tokenizer to the
final content when an LLM token budget matters; bytes do not express relevance.

Property getters, proxy traps, custom formatters, string conversion and `toJSON`
can execute during reporting. Tests demonstrate recovery from many thrown
inspection failures. They do not establish safety for every executable object:
hooks can fail to terminate or allocate heavily, and key enumeration can be
expensive before output limits help. A size cap is not CPU or memory isolation.
`onError` receives these secondary reporting failures, not notification of the
original failed tool call.

Raw reports include stacks and enumerable fields that may expose credentials,
request data or source locations. CORJ has no built-in redaction/public projection
boundary. Select and redact appropriate fields before model or API exposure.
JSON and schema conformance neither remove secrets nor make embedded instructions
safe to follow. JSON conversion also loses some value semantics, including
potential BigInt precision and executable object behavior.

When serializing Application Exception directly, CORJ preserves ordinary details
and native causes but bypasses its diagnostic redaction: the audit retained a
`details.token` that Application Exception's `toDiagnosticReport` redacts. CORJ
also includes stacks by default and loses internal renderer-failure metadata.
Combining the packages therefore requires an explicit reporting adapter and
disclosure decision, not just passing the raw exception through both APIs.

## Baseline and evidence strength

A fair native baseline uses `Error(message, { cause })`, `AggregateError`, a
deliberate selected record and the application's logger. The weakness of naïve
`JSON.stringify(Error)` does not prove that baseline inadequate. CORJ is useful
when heterogeneous inputs, shared causes, a common schema and output caps would
otherwise need repeated custom handling. A small harness needing only a stable
code and reference, or an adequate existing serializer, may gain little.

The audit passed 1,054 runtime tests and 25 snapshots. A ts-jest compatibility
warning about the installed TypeScript version remains documented in the full
audit. Tests support the exercised conversion, size and graph contracts; they
do not measure improved model task success, development speed or token efficiency.
Compare required-fact retention, disclosure, final tokens and operational costs
against the deliberate native baseline before making those stronger claims.
