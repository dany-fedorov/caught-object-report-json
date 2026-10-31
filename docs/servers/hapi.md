# hapi: report every error with CORJ

**Runtime:** Node.js. **Verified with:** @hapi/hapi 21.4.12 on Node 24.20.0.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** the `onPreResponse` extension point. hapi turns every thrown value into a Boom error before this runs; a thrown `Error` is boomified in place, so `request.response` is still the original object with its `cause` and stack.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
npm install @hapi/hapi caught-object-report-json
```

## The file: `server.mjs`

```javascript
import Hapi from '@hapi/hapi';
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

const server = Hapi.server({ port: 3000 });

server.route({ method: 'GET', path: '/ok', handler: () => ({ ok: true }) });
server.route({
  method: 'GET',
  path: '/fail',
  handler: () => {
    throw new Error('checkout failed', {
      cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
    });
  },
});
server.route({
  method: 'GET',
  path: '/fail-null',
  handler: () => {
    throw null;
  },
});
server.route({
  method: 'GET',
  path: '/reject',
  handler: (request, h) => {
    Promise.reject(new Error('background job failed'));
    return h.response({ accepted: true }).code(202);
  },
});

// hapi turns every thrown value into a Boom error. A thrown Error is boomified in
// place, so `response` is still the original object with its `cause`.
server.ext('onPreResponse', (request, h) => {
  const response = request.response;
  if (!response.isBoom || response.output.statusCode < 500) return h.continue;
  const report = logError('request', response, { method: request.method, url: request.path });
  return h.response({ error: 'Internal Server Error', occurrence_id: report.occurrence_id }).code(500);
});

await server.start();
console.log('hapi listening on 3000');
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

Log lines on stderr, trimmed. The reported object is the boomified error, so `as_json` carries Boom's fields; the second line shows hapi's replacement for a thrown `null`.

```json
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_21PQKNC8X94A9ZCHDRBVNWDN5J","fingerprint":"fp1_6fe6283f438845d7609b480ab7630c1d","as_json":{"isBoom":true,"isServer":true,"data":null,"output":{"statusCode":500,"payload":{"statusCode":500,"error":"Internal Server Error","message":"An internal server error occurred"},"headers":{}}},"stack":["Error: checkout failed","    at handler (file:///srv/app/server.mjs:27:11)","    at …"],"children":[{"id":"0","path":"$.cause","level":1,"as_json":{"code":"CARD_DECLINED"},"stack":["TypeError: card declined","    at …"]}],"context":{"method":"GET","url":"/fail"},"v":"corj/v0.15"}}
{"level":"error","where":"request","error":{"occurrence_id":"CORJ_SE09BZBDV5X11HVD5AV68KBKBQ","fingerprint":"fp1_db642e386ad777f48938a7847989f9f6","as_json":{"data":null,"isBoom":true,"isServer":true,"output":{"statusCode":500,"payload":{"statusCode":500,"error":"Internal Server Error","message":"An internal server error occurred"},"headers":{}},"isDeveloperError":true},"stack":["Error: Cannot throw non-error object","    at exports.Manager.execute (/srv/app/node_modules/@hapi/hapi/lib/toolkit.js:…)","    at …"],"context":{"method":"GET","url":"/fail-null"},"v":"corj/v0.15"}}
{"level":"error","where":"unhandledRejection","error":{"occurrence_id":"CORJ_5JTCZW0FKFHRFQS49MKY3HRFAE","fingerprint":"fp1_2ec5e35ad17f87dac1dde1eff283568f","stack":["Error: background job failed","    at handler (file:///srv/app/server.mjs:43:20)","    at …"],"v":"corj/v0.15"}}
```

## Notes for this server

- A thrown non-Error (`null`, a string) does not survive: hapi replaces it with its own `Error: Cannot throw non-error object` marked `isDeveloperError`, and that is what the report describes.
- Because the reported object is the boomified error, `as_json` carries Boom's `isBoom`, `isServer`, `data` and `output` beside your own properties. Add `redact: { keys: ["output"] }` to the maker if that is noise in your logs.
- Boom errors below 500 (a `Boom.notFound()`, a validation failure) pass through untouched and unreported.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `maker.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
