# Koa: report every error with CORJ

**Runtime:** Node.js. **Verified with:** Koa 3.2.1 on Node 24.20.0.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** a first middleware that wraps `await next()` in `try/catch`. Everything downstream, sync or async, lands there with the thrown value unchanged, `null` included.
- **After the response started:** `app.on("error", (caught, ctx) => …)`, which Koa emits for errors it cannot route back to a request, for example while writing the body.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
npm install koa caught-object-report-json
```

## The file: `server.mjs`

```javascript
import Koa from 'koa';
import { CorjMaker } from 'caught-object-report-json';

const corj = new CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where, caught, context) {
  const report = corj.makeReport(caught, { context });
  console.error(JSON.stringify({ level: 'error', where, error: report }));
  return report;
}

process.on('uncaughtException', (caught) => {
  logError('uncaughtException', caught);
  process.exit(1);
});
process.on('unhandledRejection', (caught) => {
  logError('unhandledRejection', caught);
});

const app = new Koa();

// First middleware: everything downstream that throws lands here.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (caught) {
    const report = logError('request', caught, { method: ctx.method, url: ctx.url });
    ctx.status = typeof caught?.status === 'number' && caught.status >= 400 ? caught.status : 500;
    ctx.body = { error: ctx.status === 500 ? 'Internal Server Error' : caught.message, occurrence_id: report.occurrence_id };
  }
});

// Errors Koa cannot route back to a request (for example while writing the response).
app.on('error', (caught, ctx) => {
  logError('app', caught, ctx ? { method: ctx.method, url: ctx.url } : undefined);
});

app.use(async (ctx) => {
  switch (ctx.path) {
    case '/ok':
      ctx.body = { ok: true };
      return;
    case '/fail':
      throw new Error('checkout failed', {
        cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
      });
    case '/fail-null':
      throw null;
    case '/reject':
      Promise.reject(new Error('background job failed'));
      ctx.status = 202;
      ctx.body = { accepted: true };
      return;
    default:
      ctx.status = 404;
      ctx.body = { error: 'Not Found' };
  }
});

app.listen(3000, () => console.log('koa listening on 3000'));
```

## Run

```sh
node server.mjs
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

- Koa's own `ctx.throw(404)` errors carry a `status`; the middleware keeps a 4xx status and message and reports only 5xx.
- The example routes by hand on `ctx.path`. With `@koa/router` the error middleware is unchanged; register it before `router.routes()`.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `corj.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
