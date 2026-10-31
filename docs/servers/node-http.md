# Node.js native http: report every error with CORJ

**Runtime:** Node.js. **Verified with:** Node 24.20.0, no framework.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** one `try/catch` around an `async` route function inside the `createServer` callback. Every framework on this page list is built on this.
- **Malformed requests:** `server.on("clientError")`, which fires with a socket and no request object for bad HTTP that never reaches the handler.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
npm install caught-object-report-json
```

## The file: `server.mjs`

```javascript
import http from 'node:http';
import * as Corj from 'caught-object-report-json';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000, maxDepth: 3 });

function logError(where, caught, context) {
  const report = maker.makeReport(caught, { context });
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

async function route(req, res) {
  switch (req.url) {
    case '/ok':
      return send(res, 200, { ok: true });
    case '/fail':
      throw new Error('checkout failed', {
        cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
      });
    case '/fail-null':
      throw null;
    case '/reject':
      Promise.reject(new Error('background job failed'));
      return send(res, 202, { accepted: true });
    default:
      return send(res, 404, { error: 'Not Found' });
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

// The one try/catch every framework above is built on.
const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (caught) {
    const report = logError('request', caught, { method: req.method, url: req.url });
    if (res.headersSent) return res.destroy();
    send(res, 500, { error: 'Internal Server Error', occurrence_id: report.occurrence_id });
  }
});

// Malformed requests never reach the handler; they arrive here with a socket.
server.on('clientError', (caught, socket) => {
  logError('clientError', caught);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(3000, () => console.log('http listening on 3000'));
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

- If headers were already sent when the throw happens, the example destroys the socket instead of writing a second status line.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
