# Fastify: report every error with CORJ

**Runtime:** Node.js. **Verified with:** Fastify 5.12.7 on Node 24.20.0.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** `app.setErrorHandler((caught, request, reply) => …)`, which receives everything a route throws or passes to `reply.send(err)`.
- **Logging:** Fastify logs through pino. The example replaces pino's `err` serializer with `maker.makeReport`, so any `log.error({ err })` anywhere in the app carries a report, including the two process-level hooks.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`, logged through `app.log.error({ err })`.

## Install

```sh
npm install fastify caught-object-report-json
```

## The file: `server.mjs`

```javascript
import Fastify from 'fastify';
import * as Corj from 'caught-object-report-json';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

// Fastify logs through pino. Replace pino's `err` serializer so every
// `log.error({ err })` line carries a report instead of pino's Error dump.
const app = Fastify({
  logger: {
    level: 'info',
    serializers: { err: (caught) => maker.makeReport(caught) },
  },
});

process.on('uncaughtException', (caught) => {
  app.log.error({ err: caught, where: 'uncaughtException' });
  process.exit(1);
});
process.on('unhandledRejection', (caught) => {
  app.log.error({ err: caught, where: 'unhandledRejection' });
});

app.get('/ok', async () => ({ ok: true }));
app.get('/fail', async () => {
  throw new Error('checkout failed', {
    cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
  });
});
app.get('/fail-null', async () => {
  throw null;
});
app.get('/reject', async (request, reply) => {
  Promise.reject(new Error('background job failed'));
  reply.code(202);
  return { accepted: true };
});

// Every error thrown or passed to reply.send(err) in a route ends here.
app.setErrorHandler((caught, request, reply) => {
  const report = maker.makeReport(caught, { context: { method: request.method, url: request.url } });
  request.log.error({ report, where: 'request' }); // `report`, not `err`: the serializer would report it twice
  const status = typeof caught?.statusCode === 'number' && caught.statusCode >= 400 ? caught.statusCode : 500;
  reply.code(status).send({ error: status === 500 ? 'Internal Server Error' : caught.message, occurrence_id: report.occurrence_id });
});

await app.listen({ port: 3000 });
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

Pino lines on stdout (`"level":50` is pino's `error`), trimmed:

```json
{"level":50,"time":1793470513172,"pid":1575053,"hostname":"pop-os","reqId":"req-1","report":{"occurrence_id":"CORJ_2Q7P3EHQGCK0TMC07XFA1V9ZF5","fingerprint":"fp1_0256c12d2173152354908c06daeebbdd","stack":["Error: checkout failed","    at Object.<anonymous> (file:///srv/app/server.mjs:25:9)","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"method":"GET","url":"/fail"},"v":"corj/v0.15"},"where":"request"}
{"level":50,"time":1793470513186,"pid":1575053,"hostname":"pop-os","reqId":"req-2","report":{"occurrence_id":"CORJ_CEPP4169WTR3NXQ82CDBK4WN7K","fingerprint":"fp1_09ade704908a45474729cd10c5110e4e","instanceof_error":false,"as_string":"null","as_json":null,"context":{"method":"GET","url":"/fail-null"},"v":"corj/v0.15"},"where":"request"}
{"level":50,"time":1793470513196,"pid":1575053,"hostname":"pop-os","err":{"occurrence_id":"CORJ_3XK8ZYYGRB2GT91C63SATYYPJA","fingerprint":"fp1_39343752149299ee6fbd7bde2ccea6d8","stack":["Error: background job failed","    at …"],"v":"corj/v0.15"},"where":"unhandledRejection"}
```

## Notes for this server

- Inside `setErrorHandler` the example logs `{ report }` rather than `{ err: caught }`: the `err` serializer would build a second report with a different `occurrence_id` from the one sent to the client.
- Fastify's own `statusCode` on errors such as `FST_ERR_*` is respected: a 4xx error keeps its status and message, anything else becomes a 500.
- Output goes to stdout as pino JSON (`"level":50`), not to stderr.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
