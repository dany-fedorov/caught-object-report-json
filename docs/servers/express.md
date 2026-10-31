# Express: report every error with CORJ

**Runtime:** Node.js. **Verified with:** Express 5.3.0 on Node 24.20.0.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** the four-argument error middleware `app.use((caught, req, res, next) => …)`, registered after every route. Express 5 forwards rejected promises from `async` handlers to it; Express 4 needs `express-async-errors` or a manual `.catch(next)`.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
npm install express caught-object-report-json
```

## The file: `server.mjs`

```javascript
import express from 'express';
import * as Corj from 'caught-object-report-json';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

/** One JSON log line per failure. Swap console.error for your logger. */
function logError(where, caught, context) {
  const report = maker.makeReport(caught, { context });
  console.error(JSON.stringify({ level: 'error', where, error: report }));
  return report;
}

// Failures outside any request: a throw in a timer, a promise nobody awaited.
process.on('uncaughtException', (caught) => {
  logError('uncaughtException', caught);
  process.exit(1); // the process state is unknown after this; let the supervisor restart it
});
process.on('unhandledRejection', (caught) => {
  logError('unhandledRejection', caught);
});

const app = express();

app.get('/ok', (req, res) => res.json({ ok: true }));
app.get('/fail', () => {
  throw new Error('checkout failed', {
    cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
  });
});
app.get('/fail-null', async () => {
  throw null; // Express 5 forwards rejected promises to the error handler
});
app.get('/reject', (req, res) => {
  Promise.reject(new Error('background job failed')); // nobody awaits this
  res.status(202).json({ accepted: true });
});

// Express recognizes an error handler by its four parameters. Register it last.
app.use((caught, req, res, next) => {
  const report = logError('request', caught, { method: req.method, url: req.originalUrl });
  if (res.headersSent) return next(caught);
  res.status(500).json({ error: 'Internal Server Error', occurrence_id: report.occurrence_id });
});

app.listen(3000, () => console.log('express listening on 3000'));
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

Log lines on stderr, trimmed. Note the second one: Express 5 replaced the rejected `null` with its own `Error: Rejected promise`.

```json
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_ES40ABE0MD1QH7G78ZF006VNQK","fingerprint":"fp1_18340711b17aac356f4faef1b1189346","stack":["Error: checkout failed","    at file:///srv/app/server.mjs:26:9","    at Layer.handleRequest (/srv/app/node_modules/router/lib/layer.js:152:17)","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"method":"GET","url":"/fail"},"v":"corj/v0.15"}}
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_J9J0F7RQYG2SFDDJMBRQBHP8P3","fingerprint":"fp1_ef4b04a1fdc80ccf18807c9825092fce","stack":["Error: Rejected promise","    at /srv/app/node_modules/router/lib/layer.js:161:23","    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)"],"context":{"method":"GET","url":"/fail-null"},"v":"corj/v0.15"}}
{"level":"error","where":"unhandledRejection","error":{"occurrence_id":"CORJ_N6Z7QF3WSYHB8APQXE5WBF0VWV","fingerprint":"fp1_6a227c0cacab20557cc703042d404f1b","stack":["Error: background job failed","    at file:///srv/app/server.mjs:34:18","    at …"],"v":"corj/v0.15"}}
```

## Notes for this server

- A rejected promise whose reason is `null` or `undefined` reaches the error middleware as `Error: Rejected promise`, created by Express's router, so the report describes that wrapper rather than the original `null`. A synchronous `throw null` arrives unchanged.
- If headers were already sent, the handler delegates to Express's default handler with `next(caught)`, which closes the connection.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
