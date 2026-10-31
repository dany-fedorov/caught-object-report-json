# Elysia: report every error with CORJ

**Runtime:** Bun. **Verified with:** Elysia 1.4.30 on Bun 1.4.4.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** `.onError(({ code, error, request }) => …)`. `code` is Elysia's class of failure (`NOT_FOUND`, `VALIDATION`, `PARSE`, `UNKNOWN`, …) or, for a thrown plain object, that object's own `code` property. The example skips the expected 4xx codes and reports the rest.
- **What Elysia cannot route:** the `error(caught)` option passed to `.listen({ port, error })`, which is `Bun.serve`'s own handler.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
bun add elysia caught-object-report-json
```

## The file: `server.ts`

```typescript
import { Elysia } from 'elysia';
import { CorjMaker } from 'caught-object-report-json';

const corj = new CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where: string, caught: unknown, context?: unknown) {
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

function failed(where: string, caught: unknown, context?: unknown) {
  const report = logError(where, caught, context);
  return Response.json({ error: 'Internal Server Error', occurrence_id: report.occurrence_id }, { status: 500 });
}

const app = new Elysia()
  // Every error Elysia can route: a thrown Error, string or object. `code` is
  // Elysia's class of failure, or the thrown object's own `code` property.
  .onError(({ code, error, request }) => {
    if (code === 'NOT_FOUND' || code === 'VALIDATION' || code === 'PARSE') return; // expected 4xx, Elysia's body
    return failed('request', error, { code, method: request.method, url: new URL(request.url).pathname });
  })
  .get('/ok', () => ({ ok: true }))
  .get('/fail', () => {
    throw new Error('checkout failed', {
      cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
    });
  })
  .get('/fail-null', () => {
    throw null;
  })
  .get('/reject', ({ set }) => {
    Promise.reject(new Error('background job failed'));
    set.status = 202;
    return { accepted: true };
  })
  .listen({
    port: 3000,
    // What Elysia cannot route reaches Bun.serve. As of Elysia 1.4 a thrown null or
    // undefined crashes Elysia's own error path, so this receives Elysia's TypeError
    // rather than the original value; without it Bun returns its default error page.
    error(caught) {
      return failed('serve', caught);
    },
  });

console.log('elysia listening on 3000');
```

## Run

```sh
bun run server.ts
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

Log lines on stderr, trimmed. The second line came from the `listen` `error` handler (`where: "serve"`) and describes Elysia's own `TypeError`, not the thrown `null`.

```json
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_82PR91Y2E1R86X62N1RR535Q26","fingerprint":"fp1_806d484ea42dbc9e4af4c9ff31819d97","stack":["Error: checkout failed","    at <anonymous> (/srv/app/server.ts:34:15)","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"code":"UNKNOWN","method":"GET","url":"/fail"},"v":"corj/v0.15"}}
{"level":"error","where":"serve","error":{"occurrence_id":"CORJ_V66T11D4MPF4QBWDKC84BSWT05","fingerprint":"fp1_5c4e1663659f6529210d82029e1ceb23","stack":["TypeError: null is not an object (evaluating 'error.code')","    at <anonymous> (file:///srv/app/node_modules/elysia/dist/compose.mjs:11:13)","    at …"],"v":"corj/v0.15"}}
{"level":"error","where":"unhandledRejection","error":{"occurrence_id":"CORJ_839NF718Z1PKZ8P142XH44JSPH","fingerprint":"fp1_6a5e78975bf44cb081ecdf06b6eeb51f","stack":["Error: background job failed","    at <anonymous> (/srv/app/server.ts:42:24)","    at …"],"v":"corj/v0.15"}}
```

## Notes for this server

- As of Elysia 1.4 a thrown `null` or `undefined` crashes Elysia's own error path (`TypeError: null is not an object (evaluating 'error.code')`). It never reaches `onError`; the `listen` `error` handler receives Elysia's `TypeError`, so the report describes that rather than the original value. Without the handler Bun returns its default error page. A thrown string or object does reach `onError`.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `corj.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
