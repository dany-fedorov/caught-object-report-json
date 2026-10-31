# Servers: report every error to your logs

One page per server. Each page is self-contained: a complete, verified file that logs every failure as a CORJ report and answers failed requests with a `500` carrying the report's `occurrence_id`. Open only the page for your server; they all follow the same shape, so there is nothing to read across pages.

| Server | Runtime | Request errors are caught by | Page |
| --- | --- | --- | --- |
| Express | Node.js | four-argument error middleware | [`express.md`](./express.md) |
| Fastify | Node.js | `setErrorHandler`, plus a pino `err` serializer | [`fastify.md`](./fastify.md) |
| NestJS | Node.js | global `@Catch()` exception filter | [`nestjs.md`](./nestjs.md) |
| Koa | Node.js | first middleware with `try { await next() }` | [`koa.md`](./koa.md) |
| hapi | Node.js | `onPreResponse` extension | [`hapi.md`](./hapi.md) |
| Node.js native http | Node.js | `try/catch` in the `createServer` callback | [`node-http.md`](./node-http.md) |
| Bun native (Bun.serve) | Bun | `Bun.serve({ error })` | [`bun-native.md`](./bun-native.md) |
| Elysia | Bun | `.onError`, plus `.listen({ error })` fallback | [`elysia.md`](./elysia.md) |
| Hono | Node.js, Bun, Deno | `app.onError` plus a catch-all middleware | [`hono.md`](./hono.md) |
| Deno native (Deno.serve) | Deno | `Deno.serve({ onError })` | [`deno-native.md`](./deno-native.md) |
| Oak | Deno | first middleware with `try { await next() }` | [`oak.md`](./oak.md) |

## What every page shares

- **Three hooks.** A request-level hook for errors thrown while handling a request; the runtime's process-level hooks (`uncaughtException` / `unhandledRejection` on Node and Bun, the `error` / `unhandledrejection` events on Deno) for everything else; and, where the framework has one, its own channel for errors it cannot route back to a request.
- **One log line per failure**, `{"level":"error","where":…,"error":<report>}` on stderr through `console.error`. Replace `console.error` with your logger; the report is plain JSON.
- **The same four routes** (`/ok`, `/fail`, `/fail-null`, `/reject`) so you can compare frameworks on the value they handle worst, a thrown `null`.
- **A 500 body that quotes `occurrence_id`**, so the client and the log line name the same failure.

## Verification

Every file was run as shown on 2026-10-31, each route was requested with `curl`, and the printed log lines were checked for the three failures. Versions are stated at the top of each page. Deno is not among this package's tested runtimes; its two pages say so.

## For agents

Fetch exactly one page: `https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/docs/servers/<slug>.md` where `<slug>` is one of `express`, `fastify`, `nestjs`, `koa`, `hapi`, `node-http`, `bun-native`, `elysia`, `hono`, `deno-native`, `oak`. The page contains the complete file, the install and run commands, the expected output, and the framework-specific caveats. The library's own API is in [docs/api.md](../api.md).
