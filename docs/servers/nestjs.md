# NestJS: report every error with CORJ

**Runtime:** Node.js. **Verified with:** NestJS 12.3.2 (Express platform) on Node 24.20.0, compiled with TypeScript 7.0.2.

Every server page in this folder has the same shape: one complete file that boots the server, logs **every** failure as a CORJ report on one JSON line, and answers failed requests with a `500` that quotes the report's `occurrence_id` so a client can cite it. The file is verified: it was run as shown and the output below is what it printed.

## Where errors are caught

- **Request errors:** a global `ExceptionFilter` decorated with `@Catch()` and no argument, so it receives every exception, `HttpException` or not. Registered with `app.useGlobalFilters(...)`; in a larger app provide it as `APP_FILTER` so it can take injected dependencies.
- **Outside a request:** `process.on("uncaughtException")` and `process.on("unhandledRejection")`.

## Install

```sh
npm install @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs caught-object-report-json
npm install --save-dev typescript @types/node @types/express
```

## The file: `src/main.ts`

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Module,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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

// @Catch() with no argument catches everything, HttpException or not.
@Catch()
class CorjExceptionFilter implements ExceptionFilter {
  catch(caught: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status = caught instanceof HttpException ? caught.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status < 500) {
      // 4xx are expected outcomes: keep Nest's own body, no report.
      res.status(status).json(caught instanceof HttpException ? caught.getResponse() : { statusCode: status });
      return;
    }
    const report = logError('request', caught, { method: req.method, url: req.originalUrl });
    res.status(status).json({ statusCode: status, error: 'Internal Server Error', occurrence_id: report.occurrence_id });
  }
}

@Controller()
class AppController {
  @Get('ok')
  ok() {
    return { ok: true };
  }
  @Get('fail')
  fail() {
    throw new Error('checkout failed', {
      cause: Object.assign(new TypeError('card declined'), { code: 'CARD_DECLINED' }),
    });
  }
  @Get('fail-null')
  failNull() {
    throw null;
  }
  @Get('reject')
  @HttpCode(202)
  reject() {
    Promise.reject(new Error('background job failed'));
    return { accepted: true };
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  app.useGlobalFilters(new CorjExceptionFilter()); // or provide it as APP_FILTER in a module
  await app.listen(3000);
  console.log('nest listening on 3000');
}
void bootstrap();
```

And `tsconfig.json`:

```json
{ "compilerOptions": { "module": "commonjs", "target": "ES2022", "experimentalDecorators": true, "emitDecoratorMetadata": true, "strict": true, "esModuleInterop": true, "skipLibCheck": true, "types": ["node"] } }
```

## Run

```sh
npx tsc -p tsconfig.json --outDir dist && node dist/main.js
# or, in a Nest CLI project: nest start
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

- The filter keeps Nest's own body for 4xx `HttpException`s (a `NotFoundException`, a validation failure) and does not report them: they are expected outcomes, not failures.
- The standalone compile needs `experimentalDecorators` and `emitDecoratorMetadata` in `tsconfig.json`; a Nest CLI project already has both.
- The example is a single file for readability. In a real project the filter lives in its own file and the controller in a module.

## Adapting it

- Keep one `CorjMaker` per process and reuse it; it validates options once at startup.
- Put request identifiers in `context`, not in the report: `corj.makeReport(caught, { context: { requestId } })`.
- Tune `maxReportSize` to what one log line may cost you; the whole report, children included, stays under it.
- Add `redact: { keys: [...], patterns: [...] }` before the logs leave the machine; see [Redacting what the report emits](../guide.md#redacting-what-the-report-emits).
- The 500 body quotes `occurrence_id` so a client or a support ticket can name the exact log line. `fingerprint` groups repeats of the same failure; see [Fingerprint](../guide.md#fingerprint).

Other servers: [index](./README.md). API: [docs/api.md](../api.md).
