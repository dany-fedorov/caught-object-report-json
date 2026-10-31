# Hono: report every error with CORJ

**Runtime:** Node.js, Bun, Deno. **Verified with:** Hono 4.13.14 with @hono/node-server 2.1.5 on Node 24.20.0.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors, Error instances:** `app.onError((caught, c) => …)`, Hono's idiomatic hook.
- **Request errors, anything else:** a first `app.use` middleware that wraps `await next()` in `try/catch`. Hono's `onError` only receives `Error` instances; a thrown string, object or `null` bypasses it and would become a bare 500. Both paths call the same `failed()` function.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")` on Node and Bun; on Deno use `globalThis.addEventListener("error" | "unhandledrejection", …)` as in the Deno pages.

## Install

```sh
npm install hono @hono/node-server caught-object-report-json
# Bun: bun add hono caught-object-report-json (no adapter needed)
```

## The file: `server.mjs`

```javascript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import * as Corj from 'caught-object-report-json';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where, caught, context) {
  const report = maker.makeReport(caught, { context });
  console.error(JSON.stringify({ level: 'error', where, error: report }));
  return report;
}

// Node and Bun. On Deno use globalThis.addEventListener('error' | 'unhandledrejection', ...).
process.on('uncaughtException', (caught) => {
  logError('uncaughtException', caught);
  process.exit(1);
});
process.on('unhandledRejection', (caught) => {
  logError('unhandledRejection', caught);
});

const app = new Hono();

// Hono routes a thrown Error to app.onError. A thrown non-Error (a string, an
// object, null) bypasses onError, so a first middleware catches those. Both
// paths report the same way.
function failed(caught, c) {
  const report = logError('request', caught, { method: c.req.method, url: c.req.path });
  const status = typeof caught?.status === 'number' && caught.status >= 400 ? caught.status : 500;
  return c.json({ error: status === 500 ? 'Internal Server Error' : caught.message, occurrence_id: report.occurrence_id }, status);
}
app.onError(failed);
app.use(async (c, next) => {
  try {
    await next();
  } catch (caught) {
    return failed(caught, c);
  }
});

app.get('/ok', (c) => c.json({ ok: true }));
app.get('/fail', () => {
  throw new Error('checkout failed', {
    cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
  });
});
app.get('/fail-null', () => {
  throw null;
});
app.get('/reject', (c) => {
  Promise.reject(new Error('background job failed'));
  return c.json({ accepted: true }, 202);
});

// Node. On Bun: `export default app`. On Deno: `Deno.serve(app.fetch)`.
serve({ fetch: app.fetch, port: 3000 }, () => console.log('hono listening on 3000'));
```

## Run

```sh
node server.mjs
# Bun: replace the last line with `export default app` and run `bun run server.mjs`
# Deno: replace it with `Deno.serve(app.fetch)` and run `deno run --allow-net server.mjs`
```

## What it does

The file exposes four routes, the same in every page:

| Route | What it does | Response |
| --- | --- | --- |
| `GET /ok` | Succeeds. | `200 {"ok":true}` |
| `GET /fail` | Throws an `Error` whose `cause` is a `TypeError` with a `code`. | `500 {"error":"Internal Server Error","occurrence_id":"CORJ_…"}` |
| `GET /fail-null` | Throws `null`, the value frameworks handle worst. | `500` with an `occurrence_id` |
| `GET /reject` | Rejects a promise nobody awaits, then answers `202`. | `202 {"accepted":true}` and one `unhandledRejection` log line |

## What you will see

Each failure is one line on stderr (swap `console.error` for your logger):

```json
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","stack":["Error: checkout failed","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"method":"GET","url":"/fail"},"v":"corj/v0.15"}}
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","instanceof_error":false,"as_string":"null","as_json":null,"context":{"method":"GET","url":"/fail-null"},"v":"corj/v0.15"}}
{"level":"error","where":"unhandledRejection","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","stack":["Error: background job failed","    at …"],"v":"corj/v0.15"}}
```

`where` says which hook caught it: `request` for a route, `unhandledRejection` / `uncaughtException` for failures outside any
request. The `context` is whatever the hook knew; process-level hooks know nothing, so they carry none.

## Notes for this server

- An `HTTPException` from `hono/http-exception` carries a `status`; the handler keeps a 4xx status and message and reports only 5xx.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
