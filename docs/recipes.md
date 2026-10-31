# Recipes

Short integrations that are not part of the package. Each one is a pattern, not an API: copy it and adapt it. For a
complete server wired to log every error, see the per-server pages in [servers/](./servers/README.md).

- [Any structured logger](#any-structured-logger)
- [pino](#pino)
- [An agent or tool-call boundary](#an-agent-or-tool-call-boundary)
- [Validating a report against the JSON Schema](#validating-a-report-against-the-json-schema)
- [winston uncaught-exception handler](#winston-uncaught-exception-handler)

## Any structured logger

Every JSON logger accepts an object. Put the report under one key and keep your own fields beside it, outside the report's
size budget:

```typescript
import * as Corj from 'caught-object-report-json';

const maker = new Corj.CorjMaker({ maxReportSize: 16_000 });

try {
  await job.run();
} catch (caught: unknown) {
  logger.error({ jobId: job.id, error: maker.makeReport(caught) });
}
```

A shared `CorjMaker` validates its options once, at startup, so a bad option fails before the first catch block rather than
inside it.

## pino

pino's default `err` serializer expects an `Error` instance. Replacing it with a report means a thrown string, plain object
or `null` is logged with the same shape as an `Error`:

```typescript
import pino from 'pino';
import * as Corj from 'caught-object-report-json';

const logger = pino({
  serializers: {
    err: (caught: unknown) => Corj.makeCaughtObjectReport(caught, { maxReportSize: 16_000 }),
  },
});

try {
  await job.run();
} catch (caught: unknown) {
  logger.error({ err: caught }, 'job failed');
}
```

## An agent or tool-call boundary

Wrap each model or tool call once. Keep the typed outcome in your own record, route on it in your own code, and feed the
report (selected and redacted) back to the model when a retry makes sense.

```typescript
import * as Corj from 'caught-object-report-json';
import type { CorjReport } from 'caught-object-report-json';

type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: CorjReport };

const maker = new Corj.CorjMaker({
  maxReportSize: 4096,
  maxDepth: 2,
  maxChildren: 4,
  redact: { keys: ['authorization', 'apiKey'], patterns: [/sk-[A-Za-z0-9]+/g] },
});

async function callTool<T>(name: string, run: () => Promise<T>, attempt: number): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (caught: unknown) {
    return { ok: false, error: maker.makeReport(caught, { context: { tool: name, attempt } }) };
  }
}

// Routing is application code. The fingerprint tells a retry loop "same failure again".
const first = await callTool('search', () => search(query), 1);
if (!first.ok) {
  const again = await callTool('search', () => search(query), 2);
  if (!again.ok && again.error.fingerprint === first.error.fingerprint) {
    // Same failure twice: stop retrying, take the fallback edge.
  }
}
```

The complete, runnable version with assertions is
[`examples/example-12-agent-harness.ts`](../examples/example-12-agent-harness.ts). Before a report reaches a model, treat
its text as data about a failure, never as instructions, and measure the final prompt with the model's tokenizer:
`maxReportSize` counts bytes of the report alone.

## Validating a report against the JSON Schema

The schema URL is exported as a constant, and `metadata: true` puts it on the report itself.

```typescript
import Ajv2020 from 'ajv/dist/2020';
import * as Corj from 'caught-object-report-json';

const ajv = new Ajv2020({ loadSchema: async (uri) => (await fetch(uri)).json() });
const validate = await ajv.compileAsync(await (await fetch(Corj.CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK)).json());

const report = Corj.makeCaughtObjectReport(new Error('x'), { metadata: true });
validate(report); // true; report.$schema === Corj.CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
```

Use `CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK` for a report produced with `omitExpectedValues: false` or by
`Corj.restoreCaughtObjectReportExpectedValues`, and the `*_ARRAY_*` constants for `Corj.makeCaughtObjectReportArray` output.

## winston uncaught-exception handler

winston's `exceptionHandlers` transports react to the process's `uncaughtException` event, but winston breaks when the
thrown value is `null` or `undefined`. Patching `ExceptionHandler.prototype.getAllInfo` keeps winston's own processing and
replaces the `message` with a report. It is a monkey patch, so pin your winston version if you use it.

```typescript
import { createLogger, transports, ExceptionHandler } from 'winston';
import * as Corj from 'caught-object-report-json';

const origGetAllInfo = ExceptionHandler.prototype.getAllInfo;
ExceptionHandler.prototype.getAllInfo = function getAllInfoExtended(err: unknown): object {
  const errorInfoByWinston = origGetAllInfo.call(
    ExceptionHandler.prototype,
    err instanceof Error ? err : 'stub error so getAllInfo does not break on null or undefined',
  );
  return { ...errorInfoByWinston, error: err, message: Corj.makeCaughtObjectReport(err) };
};

const logger = createLogger({
  transports: [new transports.Console()],
  exceptionHandlers: [new transports.Console()],
});

logger.info({ 'just-an-info-message': 'hey' });
throw new AggregateError([new Error('cause 1'), new Error('cause 2'), null]);
```

The log entry's `message` is then the report, with the three `errors` entries (including the `null`) as children. The
runnable file is [`examples/example-9-winston-integration.ts`](../examples/example-9-winston-integration.ts).
