# Oak: report every error with CORJ

**Runtime:** Deno. **Verified with:** @oak/oak 17.2.0 on Deno 2.9.6.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** a first middleware that wraps `await next()` in `try/catch`, exactly as in Koa, which Oak is modelled on. The thrown value arrives unchanged, `null` included.
- **Errors Oak cannot route:** `app.addEventListener("error", (event) => …)`.
- **Outside a request:** `globalThis.addEventListener("error")` and `("unhandledrejection")` with `event.preventDefault()`.

## Install

```sh
# nothing to install: the jsr: and npm: specifiers resolve on first run
```

## The file: `server.ts`

```typescript
import { Application } from 'jsr:@oak/oak@17';
import * as Corj from 'npm:caught-object-report-json@15';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where: string, caught: unknown, context?: unknown) {
  const report = maker.makeReport(caught, { context });
  console.error(JSON.stringify({ level: 'error', where, error: report }));
  return report;
}

globalThis.addEventListener('error', (event) => {
  event.preventDefault();
  logError('uncaughtError', event.error);
});
globalThis.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  logError('unhandledRejection', event.reason);
});

const app = new Application();

// First middleware: everything downstream that throws lands here.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (caught) {
    const report = logError('request', caught, { method: ctx.request.method, url: ctx.request.url.pathname });
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error', occurrence_id: report.occurrence_id };
  }
});

// Errors Oak cannot route back to a request.
app.addEventListener('error', (event) => {
  logError('app', event.error);
});

app.use((ctx) => {
  switch (ctx.request.url.pathname) {
    case '/ok':
      ctx.response.body = { ok: true };
      return;
    case '/fail':
      throw new Error('checkout failed', {
        cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
      });
    case '/fail-null':
      throw null;
    case '/reject':
      Promise.reject(new Error('background job failed'));
      ctx.response.status = 202;
      ctx.response.body = { accepted: true };
      return;
    default:
      ctx.response.status = 404;
      ctx.response.body = { error: 'Not Found' };
  }
});

console.log('oak listening on 3000');
await app.listen({ port: 3000 });
```

## Run

```sh
deno run --allow-net server.ts
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

- Deno is not covered by this package's consumer tests; see the note on the Deno native page.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
