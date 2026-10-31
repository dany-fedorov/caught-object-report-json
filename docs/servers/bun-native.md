# Bun native (Bun.serve): report every error with CORJ

**Runtime:** Bun. **Verified with:** Bun 1.4.4.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** the `error(caught)` option of `Bun.serve`, which receives anything `fetch` throws or rejects with, unchanged, `null` included.
- **Outside a request:** Bun implements Node's `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
bun add caught-object-report-json
```

## The file: `server.ts`

```typescript
import { CorjMaker } from 'caught-object-report-json';

const corj = new CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where: string, caught: unknown, context?: unknown) {
  const report = corj.makeReport(caught, { context });
  console.error(JSON.stringify({ level: 'error', where, error: report }));
  return report;
}

// Bun implements Node's process events.
process.on('uncaughtException', (caught) => {
  logError('uncaughtException', caught);
  process.exit(1);
});
process.on('unhandledRejection', (caught) => {
  logError('unhandledRejection', caught);
});

Bun.serve({
  port: 3000,
  fetch(req) {
    const { pathname } = new URL(req.url);
    switch (pathname) {
      case '/ok':
        return Response.json({ ok: true });
      case '/fail':
        throw new Error('checkout failed', {
          cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
        });
      case '/fail-null':
        throw null;
      case '/reject':
        Promise.reject(new Error('background job failed'));
        return Response.json({ accepted: true }, { status: 202 });
      default:
        return Response.json({ error: 'Not Found' }, { status: 404 });
    }
  },
  // Anything `fetch` throws or rejects with.
  error(caught) {
    const report = logError('request', caught);
    return Response.json({ error: 'Internal Server Error', occurrence_id: report.occurrence_id }, { status: 500 });
  },
});
console.log('bun listening on 3000');
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

Each failure is one line on stderr (swap `console.error` for your logger):

```json
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","stack":["Error: checkout failed","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"method":"GET","url":"/fail"},"v":"corj/v0.15"}}
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","instanceof_error":false,"as_string":"null","as_json":null,"context":{"method":"GET","url":"/fail-null"},"v":"corj/v0.15"}}
{"level":"error","where":"unhandledRejection","error":{"occurrence_id":"CORJ_…","fingerprint":"fp1_…","stack":["Error: background job failed","    at …"],"v":"corj/v0.15"}}
```

`where` says which hook caught it: `request` for a route, `unhandledRejection` / `uncaughtException` for failures outside any
request. The `context` is whatever the hook knew; process-level hooks know nothing, so they carry none.

## Notes for this server

- Without an `error` handler Bun answers with its own HTML error page in development and a bare 500 in production.
- The `error` handler does not receive the request, so the report's `context` is empty here; add it in `fetch` with a `try/catch` if you need the URL on the log line.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `corj.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
