# Caught Object Report JSON (CORJ)

One JSON shape for every JavaScript error. Zero dependencies. Never throws.

![Jest coverage](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/badges/coverage-jest%20coverage.svg "Jest coverage")
[![Npm Version](https://img.shields.io/npm/v/caught-object-report-json.svg "Npm Version")](https://www.npmjs.org/package/caught-object-report-json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen "Zero runtime dependencies")](https://www.npmjs.com/package/caught-object-report-json?activeTab=dependencies)
[![Package License MIT](https://img.shields.io/npm/l/caught-object-report-json.svg "Package License MIT")](https://www.npmjs.org/package/caught-object-report-json)
[![Strictest TypeScript Config](https://img.shields.io/badge/typescript-strictest-blue "Strictest TypeScript Config")](https://www.npmjs.com/package/@tsconfig/strictest)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release "semantic-release: angular")](https://github.com/semantic-release/semantic-release)

```javascript
JSON.stringify(new Error('x'));
// '{}'
```

That is what your logger gets today. `Error` has no JSON form, `throw` accepts any value, errors nest through `cause` and
`errors`, and a caught object's getters can throw while you look at it. CORJ turns whatever `catch` receives into one JSON
report with a published schema:

```typescript
import { Corj } from 'caught-object-report-json';

try {
  await fetchUser(id);
} catch (caught: unknown) {
  logger.error({ error: Corj.makeReport(caught) });
}
```

```json
{
  "occurrence_id": "CORJ_W19ZMA331ZQZY6NQNH4N9QYKG6",
  "fingerprint": "fp1_fdb8849bed1f1ac81225109c3724afc0",
  "stack": [
    "Error: user 42 not found",
    "    at fetchUser (/srv/app/users.js:2:32)",
    "    at Object.<anonymous> (/srv/app/users.js:3:7)"
  ],
  "v": "corj/v0.15"
}
```

Four keys for a plain `Error` (real output; Node's own frames cut from the stack). Nested causes, thrown strings, hostile objects and oversized payloads get the same shape.

- **Never throws.** Whatever the caught value does (throwing getters, revoked proxies, cycles, BigInts), `makeReport`
  returns a report and records what went wrong inside it. Fuzz-tested.
- **One shape for every error.** An Axios error, a Zod error, a `fetch` failure and `throw null` all produce the same outer
  fields, so one reader handles all of them.
- **Nested errors flattened.** `cause` chains and `AggregateError.errors` become a flat `children` list with JSONPaths,
  cycles and shared errors included once.
- **Bounded.** Every report fits a byte budget (100 kB by default) and stays valid JSON when cut.
- **Correlatable.** An `occurrence_id` to quote one failure back, and a `fingerprint` that is equal for the same failure
  from the same place.
- **Zero runtime dependencies.** CommonJS build with TypeScript declarations; verified in CI on Node 20 and 24, Bun, and
  Chromium through Vite.

# Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Step by step](#step-by-step)
  - [1. Any thrown value](#1-any-thrown-value)
  - [2. Nested errors become children](#2-nested-errors-become-children)
  - [3. Hostile objects do not break the report](#3-hostile-objects-do-not-break-the-report)
  - [4. Reports stay under a size](#4-reports-stay-under-a-size)
  - [5. Redact before anyone reads it](#5-redact-before-anyone-reads-it)
  - [6. Configure once](#6-configure-once)
  - [7. Same failure again?](#7-same-failure-again)
- [Report every error from your server](#report-every-error-from-your-server)
- [LLM harnesses and agent graphs](#llm-harnesses-and-agent-graphs)
- [For AI agents reading this](#for-ai-agents-reading-this)
- [When not to use CORJ](#when-not-to-use-corj)
- [Limits](#limits)
- [Documentation](#documentation)
- [API at a glance](#api-at-a-glance)
- [Supported runtimes](#supported-runtimes)
- [Upgrading](#upgrading)
- [Links](#links)

# Install

```sh
npm install caught-object-report-json
```

# Quick start

```typescript
import { Corj } from 'caught-object-report-json';

try {
  throw new Error('checkout failed', {
    cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
  });
} catch (caught: unknown) {
  console.log(JSON.stringify(Corj.makeReport(caught), null, 2));
}
```

```json
{
  "occurrence_id": "CORJ_3ZXNV4KVDGW98B4KK4W8JAHE4S",
  "fingerprint": "fp1_85947d3cc4e6bfe95d39ee994023028c",
  "stack": [
    "Error: checkout failed",
    "    at Object.<anonymous> (/srv/app/checkout.js:3:9)"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "as_json": { "code": "CARD_DECLINED" },
      "stack": [
        "TypeError: card declined",
        "    at Object.<anonymous> (/srv/app/checkout.js:4:26)"
      ]
    }
  ],
  "v": "corj/v0.15"
}
```

Real output, with Node's own frames cut from the stacks. The cause is a child with a JSONPath. Its extra property landed in `as_json`. `message` and `constructor_name` are not
repeated because the first stack line already carries them; a reader that wants every field present calls
`Corj.restoreExpectedValues(report)`.

# Step by step

Each step adds one capability. Outputs are real, with ids elided.

## 1. Any thrown value

`throw` accepts anything, and TypeScript types `caught` as `unknown`. CORJ reports what it got:

```typescript
Corj.makeReport('boom');
// { instanceof_error: false, typeof: 'string', constructor_name: 'String', as_string: 'boom', as_json: 'boom', ... }

Corj.makeReport(null);
// { instanceof_error: false, as_string: 'null', as_json: null, ... }

Corj.makeReport({ code: 'E_FAIL', retryable: true });
// { instanceof_error: false, constructor_name: 'Object', as_string: '[object Object]', as_json: { code: 'E_FAIL', retryable: true }, ... }
```

The same keys mean the same thing for every value, so a reader checks `instanceof_error`, then `message`, `stack` or
`as_json`, without knowing in advance which library threw.

## 2. Nested errors become children

`cause` and `errors` are followed, breadth-first, up to `maxDepth` (5) levels and `maxChildren` (100) nodes. Every node
has an `id`, a JSONPath `path` and its direct `child_ids`; an error reachable twice is reported once and referenced after.

```typescript
const shared = new Error('shared cause');
const root = new AggregateError([new Error('first', { cause: shared }), new Error('second', { cause: shared })], 'root');
shared.cause = root; // a cycle

Corj.makeReportArray(root).map(({ id, path, child_ids }) => ({ id, path, child_ids }));
// [ { id: 'root', path: '$',               child_ids: ['0', '1'] },
//   { id: '0',    path: '$.errors[0]',     child_ids: ['2'] },
//   { id: '1',    path: '$.errors[1]',     child_ids: ['2'] },
//   { id: '2',    path: '$.errors[0].cause', child_ids: ['root'] } ]
```

`makeReportArray` gives the same nodes as a flat list, root first, for log stores that index rows. A node whose children
were cut by a limit says so with `children_omitted: "max_depth" | "max_children" | "max_size"`.

## 3. Hostile objects do not break the report

A getter that throws, a `toString` that throws, a revoked `Proxy`: the affected field becomes `null` and the reason is
recorded in the report itself.

```typescript
const hostile = { code: 'E_FAIL', get message() { throw new Error('getter exploded'); } };

const report = Corj.makeReport(hostile, { onReportingError: () => {} }); // default handler prints a console.warn line
report.message;             // null
report.reporting_errors[0]; // { stage: 'prop-access', path: '$', reportKey: 'message', sourceProperty: 'message', error: 'Error: getter exploded' }
```

`Corj.makeReport` throws only for invalid configuration, and then at the call site, never inside the report. If you would
rather the caught object's code did not run at all, `inspection: 'no-invoke'` reads property descriptors and calls no
getter, `toString` or `toJSON`; content that would need code to produce becomes `"[not-inspected]"`.

## 4. Reports stay under a size

The whole report, children included, is limited to `maxReportSize` bytes of compact JSON. Content is trimmed, never
broken: strings end with `[truncated]`, arrays and objects keep a prefix, and the root gets `truncated: true`.

```typescript
const report = Corj.makeReport(
  { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
  { maxReportSize: 512, metadata: false },
);
Buffer.byteLength(JSON.stringify(report)); // 505
report.truncated;                          // true
report.as_json.attempts.at(-1);            // '[truncated]'
```

`occurrence_id`, `fingerprint` and `v` are never trimmed, so even a report cut to the 512-byte floor can be quoted and
grouped. The budget counts the report's own bytes, not your logger's envelope or model tokens.

## 5. Redact before anyone reads it

Error text is duplicated across `message`, `stack` and `as_string`. A `patterns` rule rewrites it everywhere it appears;
`keys` and `paths` stop a property from being read at all.

```typescript
Corj.makeReport(new Error('refused key sk-live-4f9a2c'), {
  redact: { keys: ['password', /^authorization$/i], patterns: [/sk-live-[A-Za-z0-9]+/g] },
}).stack[0];
// 'Error: refused key [redacted]'
```

The policy reaches every field, every child, the call's `context`, and the text of recorded reporting errors. It is a
mechanism, not detection: it removes what you name.

## 6. Configure once

A `CorjMaker` validates its options at construction, so a typo fails at startup rather than inside a catch block, and is
reused for every report.

```typescript
import { CorjMaker } from 'caught-object-report-json';

const corj = new CorjMaker({
  maxReportSize: 16_000,
  maxDepth: 2,
  redact: { patterns: [/sk-live-[A-Za-z0-9]+/g] },
});

const report = corj.makeReport(caught, { context: { requestId, route: '/checkout' } });
const smaller = corj.withOptions({ maxReportSize: 4096 }); // a new maker; `corj` is unchanged

new CorjMaker({ maxReportSize: 100 });
// RangeError: maxReportSize must be a safe integer >= 512, or null to disable the limit
```

`context` is anything of your own, reported at the root beside the error and redacted by the same policy.

## 7. Same failure again?

`fingerprint` is a hash of the error's constructor name and stack frames (by default), so two occurrences of the same
failure from the same place compare equal while `occurrence_id` tells them apart.

```typescript
const corj = new CorjMaker();
corj.makeFingerprint(err) === corj.makeFingerprint(err); // true, 'fp1_…'
corj.makeReport(err).occurrence_id;                      // 'CORJ_…', new per occurrence
```

Pass your own id for correlation with the request that failed: `corj.makeReport(caught, { occurrenceId: requestId })`.

# Report every error from your server

One page per server, each a complete verified file that logs every failure as a report and answers failed requests with a
`500` quoting the report's `occurrence_id`. Open only the page for your server; they all have the same shape.

| Runtime | Servers |
| --- | --- |
| Node.js | [Express](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/express.md), [Fastify](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/fastify.md), [NestJS](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/nestjs.md), [Koa](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/koa.md), [hapi](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/hapi.md), [native `http`](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/node-http.md) |
| Bun | [`Bun.serve`](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/bun-native.md), [Elysia](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/elysia.md) |
| Deno | [`Deno.serve`](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/deno-native.md), [Oak](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/oak.md) |
| All three | [Hono](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/hono.md) |

Each page covers the request-level hook, the process-level hooks (`uncaughtException` / `unhandledRejection`, or Deno's
events), and the framework's own quirks, such as what it does to a thrown `null`. Index with a one-line summary per
server: [docs/servers](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/README.md).

# LLM harnesses and agent graphs

An LLM harness catches failures from model clients and tools at the boundary of each graph node. CORJ gives that boundary a
constant shape to inspect, and your code decides whether to retry, take a fallback edge, or stop.

```typescript
type Outcome<T> = { ok: true; value: T } | { ok: false; error: CorjReport };

async function callTool<T>(name: string, run: () => Promise<T>, attempt: number): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (caught: unknown) {
    return { ok: false, error: corj.makeReport(caught, { context: { tool: name, attempt } }) };
  }
}
```

Keep the correction loop explicit and in your code:

1. Capture the failure once, with a shared `CorjMaker` sized for the model's context.
2. Select and redact what the model should see. Treat error text as data about a failure, never as instructions.
3. Compare `fingerprint` across attempts to detect "the same failure again" and bound retries.
4. Validate any proposed correction before executing it, and check the new result against the task's own success criteria.

The full runnable harness with assertions is
[`examples/example-12-agent-harness.ts`](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-12-agent-harness.ts);
the pattern is written up in [Recipes](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/recipes.md#an-agent-or-tool-call-boundary).
CORJ supplies the diagnostic representation. Graph state, retry policy and token budgeting stay in the host.

# For AI agents reading this

If you are an agent integrating or consuming this package, this is the shortest reliable path.

- **Entry points.** `Corj.makeReport(caught, input?)` returns one object; `Corj.makeReportArray(caught, input?)` returns
  the same nodes as a flat array, root first. `new CorjMaker(options)` holds options for reuse and exposes `makeReport`,
  `makeReportArray`, `withOptions`, `makeFingerprint`, `makeJsonView` and `scrubText`.
- **Invariants.** Never throws because of the caught value. Compact JSON is at most `maxReportSize` bytes (default
  100000). A missing field means its documented expected value; `null` means producing it threw, see `reporting_errors`.
- **Report fields.** `occurrence_id`, `fingerprint`, `truncated`, `instanceof_error`, `typeof`, `constructor_name`,
  `message`, `as_string`, `as_json`, `stack`, `children_omitted`, `children` (object form) or `id`/`path`/`level`/`child_ids`
  (every node), `context`, `reporting_errors`, `v`, `$schema`. Types and omission rules:
  [Fields](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/guide.md#fields).
- **Wiring a server.** Fetch exactly one page from `docs/servers/<slug>.md` (slugs: `express`, `fastify`, `nestjs`, `koa`, `hapi`, `node-http`, `bun-native`, `elysia`, `hono`, `deno-native`, `oak`). Each holds a complete verified file, install and run commands, expected output and caveats.
- **Complete reference.** [docs/api.md](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/api.md)
  has every export with signature, parameters, what throws, and a verified example. The shipped `index.d.ts` carries the
  same JSDoc.
- **Machine-readable.** JSON Schema at
  `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/report-object.json`
  (also exported as `CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK`; `metadata: true` puts it on the report as `$schema`). An
  [`llms.txt`](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/llms.txt) indexes everything above.

# When not to use CORJ

`JSON.stringify(err, Object.getOwnPropertyNames(err))` is a fine quick fix when you do not need the edge cases. It does not
follow `cause` or `errors`, it throws on circular references and BigInts, and it produces a different shape for every kind
of error, but for a single service logging its own `Error` subclasses that may be enough.

If a selected `{ code, reference }` record or your existing logger's error serializer already covers your failure paths,
another serializer adds little. CORJ earns its place when a shared report schema, nested-cause representation, hostile
inputs and a size limit would otherwise mean repeated custom code.

# Limits

CORJ is one function from a caught value to JSON. It does not redact by default, does not make error text trustworthy,
does not count tokens, does not isolate CPU or memory from a hostile getter or proxy trap, and does not know your agent
graph or decide retryability. The complete list with reasoning is
[Limits and non-goals](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/guide.md#limits-and-non-goals).

# Documentation

| Document | Read it for |
| --- | --- |
| [Guide](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/guide.md) | Every report field and why it is there; nested errors, occurrence id, fingerprint, context, size limit, reporting errors; the options table with types and constraints; redaction; `no-invoke` inspection; runtimes. |
| [API reference](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/api.md) | Every export with signature, parameters, throws and a verified example. |
| [Examples](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/examples.md) | Twelve runnable examples with printed output. |
| [Servers](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/servers/README.md) | One verified page per server: Express, Fastify, NestJS, Koa, hapi, native http, Bun.serve, Elysia, Hono, Deno.serve, Oak. |
| [Recipes](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/recipes.md) | Structured loggers, pino, an agent tool-call boundary, schema validation, winston. |
| [Upgrading](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/UPGRADING.md) | Migration notes for every major since v8. |
| [TypeDoc](https://dany-fedorov.github.io/caught-object-report-json/modules.html) | Generated reference with source links. |
| [CHANGELOG](https://github.com/dany-fedorov/caught-object-report-json/blob/main/CHANGELOG.md) | Release-by-release changes. |

# API at a glance

| Call | Returns | One line |
| --- | --- | --- |
| `Corj.makeReport(caught, input?)` | `CorjReport` | The report as one object, with defaults plus `input` (options and per-call values). |
| `Corj.makeReportArray(caught, input?)` | `CorjReportNode[]` | The same nodes as a flat array, root first. |
| `Corj.restoreExpectedValues(report)` | a copy | Fills omitted expected values back in (`corj/v0.15` to `corj/v0.15-full`). |
| `Corj.resolveRedactPolicy(input)` | `CorjRedactPolicy \| null` | Validates a redaction policy ahead of time; throws `TypeError` if invalid. |
| `new CorjMaker(options?)` | `CorjMaker` | Validates and freezes options once; throws `TypeError` / `RangeError` for bad ones. |
| `maker.makeReport(caught, call?)` | `CorjReport` | `call` is `{ occurrenceId?, fingerprint?, context? }`. |
| `maker.makeReportArray(caught, call?)` | `CorjReportNode[]` | Flat form under the maker's options. |
| `maker.withOptions(options)` | `CorjMaker` | A new maker with overrides; the original is unchanged. |
| `maker.makeFingerprint(caught, { requireStack? })` | `string \| undefined` | The fingerprint alone; `requireStack: true` refuses to hash guessable text. |
| `maker.makeJsonView(value, { root?, maxSize? })` | `{ value, truncated, errors }` | The bounded, redacted JSON view of any value. |
| `maker.scrubText(text, where?)` | `string` | The maker's redaction applied to a string of your own. |

Full signatures, parameter tables, errors and examples:
[API reference](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/api.md). Options with types,
defaults and constraints: [Options](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/guide.md#options).

# Supported runtimes

CommonJS build with TypeScript declarations, no runtime dependencies. CI packs the artifact and runs the same scenarios in
each consumer:

| Consumer | Verified |
| --- | --- |
| Node 20 and 24, `require` | yes |
| Node, `import` through ESM interop | yes |
| Bun, `import` | yes |
| Browser, bundled by Vite, executed in Chromium | yes |

Not tested, so not supported: Deno, Cloudflare Workers and other edge runtimes, React Native. Import matrix and details:
[Supported runtimes](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/guide.md#supported-runtimes).

# Upgrading

14.0.0 hardens reporting against hostile inputs without renaming or removing any option; the report format stays
`corj/v0.15`. Redaction transforms now receive detached snapshots, input ceilings apply even with `maxReportSize: null`, and
a fingerprint that cannot be rebuilt faithfully is omitted with a reporting error. Details for this and every earlier major
are in [UPGRADING.md](https://github.com/dany-fedorov/caught-object-report-json/blob/main/docs/UPGRADING.md).

# Links

- GitHub: https://github.com/dany-fedorov/caught-object-report-json
- npm: https://www.npmjs.com/package/caught-object-report-json
- Deno Land mirror (not covered by the consumer tests): https://deno.land/x/caught_object_report_json
- JSON Schema `corj/v0.15`:
  [definitions](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/definitions.json),
  [report object](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/report-object.json),
  [report array](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/report-array.json)
- JSON Schema `corj/v0.15-full`:
  [definitions](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15-full/definitions.json),
  [report object](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15-full/report-object.json),
  [report array](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15-full/report-array.json)
- Earlier schemas (`corj/v0.14` and before): [schema-versions/corj](https://github.com/dany-fedorov/caught-object-report-json/tree/main/schema-versions/corj)
