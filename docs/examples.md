# Examples

Each example is a file under [`examples/`](../examples) and runs with `npm run ts-file ./examples/<file>` from a clone of
the repository. The printed output is reproduced below with `occurrence_id` and `fingerprint` elided and stacks cut to
two frames (the real output has the full stack).

1. [Plain Error](#1-plain-error)
2. [fetch failure with a cause](#2-fetch-failure-with-a-cause)
3. [Errors while reporting](#3-errors-while-reporting)
4. [Metadata fields](#4-metadata-fields)
5. [Nested errors: basic](#5-nested-errors-basic)
6. [Nested errors: nesting levels](#6-nested-errors-nesting-levels)
7. [A CorjMaker instance to provide options once](#7-a-corjmaker-instance-to-provide-options-once)
8. [Flat array report with a Zod error](#8-flat-array-report-with-a-zod-error)
9. [winston integration](#9-winston-integration)
10. [Report size limit](#10-report-size-limit)
11. [Cycles and shared errors](#11-cycles-and-shared-errors)
12. [Agent harness boundary](#12-agent-harness-boundary)

## 1. [Plain Error](../examples/example-1-syntax-error.ts)

A `SyntaxError` from `JSON.parse`, with two extra properties attached: a BigInt and a boxed `Number`. Both would make
`JSON.stringify` throw or lose information; here they land in `as_json`.

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  caught.heh = 123n;
  caught.heh_1 = new Number(123);
  const report = Corj.makeCaughtObjectReport(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "as_json": {
    "heh": 123,
    "heh_1": {}
  },
  "stack": [
    "SyntaxError: \"undefined\" is not valid JSON",
    "    at JSON.parse (<anonymous>)",
    "…"
  ],
  "v": "corj/v0.15"
}
```

`message` and `constructor_name` are absent because the first stack line carries both; see
[Omitted expected values](./guide.md#omitted-expected-values).

## 2. [fetch failure with a cause](../examples/example-2-fetch-error-with-cause.ts)

Node's `fetch` wraps the network error in `cause`. The outer `TypeError` says almost nothing; the useful part is one level
down, and the report brings it up as a child with its own `as_json`.

```typescript
try {
  await fetch('http://127.0.0.1:65530/users/23'); // nothing listens here
} catch (caught: unknown) {
  const report = Corj.makeCaughtObjectReport(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "stack": [
    "TypeError: fetch failed",
    "    at Object.processResponse (node:internal/deps/undici/undici:13033:20)",
    "…"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "as_json": {
        "errno": -111,
        "code": "ECONNREFUSED",
        "syscall": "connect",
        "address": "127.0.0.1",
        "port": 65530
      },
      "stack": [
        "Error: connect ECONNREFUSED 127.0.0.1:65530",
        "    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:2017:16)"
      ]
    }
  ],
  "v": "corj/v0.15"
}
```

## 3. [Errors while reporting](../examples/example-3-not-error-object.ts)

A caught object whose `message` getter throws. The field becomes `null`, the rest of the report is produced, the failure is
kept in `reporting_errors`, and `onReportingError` receives the same record.

```typescript
class Hostile {
  get message(): string {
    throw new Error('message getter threw');
  }
}

try {
  throw new Hostile();
} catch (caught: unknown) {
  const report = Corj.makeCaughtObjectReport(caught, {
    onReportingError: (error, record) => {
      console.log('onReportingError::', { error: String(error), record });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints from the `onReportingError` callback

```
onReportingError:: {
  error: 'Error: message getter threw',
  record: {
    stage: 'prop-access',
    path: '$',
    reportKey: 'message',
    sourceProperty: 'message',
    error: 'Error: message getter threw'
  }
}
```

and then prints from the catch block

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "instanceof_error": false,
  "constructor_name": "Hostile",
  "message": null,
  "as_string": "[object Object]",
  "reporting_errors": [
    {
      "stage": "prop-access",
      "path": "$",
      "reportKey": "message",
      "sourceProperty": "message",
      "error": "Error: message getter threw"
    }
  ],
  "v": "corj/v0.15"
}
```

## 4. [Metadata fields](../examples/example-4-metadata-fields.ts)

`metadata` chooses which of `v` and `$schema` the root carries.

```typescript
try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = Corj.makeCaughtObjectReport(caught, {
    metadata: { $schema: true, v: false },
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "stack": [
    "Error: Hi, I'm a regular Error object.",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-4-metadata-fields.ts:4:9)",
    "…"
  ],
  "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.15/report-object.json"
}
```

## 5. [Nested errors: basic](../examples/example-5-nested-errors-1-basic.ts)

An `AggregateError` with both `errors` and `cause` set. Children carry `id`, `path` and `level`; a child that is not an
`Error` keeps the fields that say so.

```typescript
const caught = new AggregateError(
  [
    new Error('AggregateError child 0'),
    'AggregateError child 1 (not an Error object)',
  ],
  'AggregateError message',
  { cause: new Error('Cause Error object') },
);
const report = Corj.makeCaughtObjectReport(caught, { metadata: false });
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "stack": [
    "AggregateError: AggregateError message",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:5:16)",
    "…"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "stack": [
        "Error: Cause Error object",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:11:12)",
        "…"
      ]
    },
    {
      "id": "1",
      "path": "$.errors[0]",
      "level": 1,
      "stack": [
        "Error: AggregateError child 0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:7:5)",
        "…"
      ]
    },
    {
      "id": "2",
      "path": "$.errors[1]",
      "level": 1,
      "instanceof_error": false,
      "typeof": "string",
      "constructor_name": "String",
      "as_string": "AggregateError child 1 (not an Error object)",
      "as_json": "AggregateError child 1 (not an Error object)"
    }
  ]
}
```

## 6. [Nested errors: nesting levels](../examples/example-6-nested-errors-2-nesting-levels.ts)

- Because of `maxDepth: 2`, "lvl 3" errors are not included, and the node that has them gets `children_omitted: "max_depth"`.
- Because `childrenSources` includes `nestedError`, that property becomes a child and is excluded from `as_json`; the
  non-default list is reported as `children_sources`.
- Nodes list their direct children in `child_ids`, since the tree is flattened.
- A value found under a child source that is an array yields one child per element.

```typescript
const caught = new Error("lvl 0", {
  cause: new Error("lvl 1; obj 0", {
    cause: [
      new Error("lvl 2; obj 0.0", { cause: new Error("lvl 3; obj 0.0.0") }),
      new Error("lvl 2; obj 0.1")
    ]
  })
});
caught.nestedError = 'lvl 1; obj 1';
caught.extraField = 'error info';
const report = Corj.makeCaughtObjectReport(caught, {
  maxDepth: 2,
  childrenSources: ['cause', 'errors', 'nestedError'],
  metadata: false,
});
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "as_json": {
    "extraField": "error info"
  },
  "stack": [
    "Error: lvl 0",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:5:16)",
    "…"
  ],
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "stack": [
        "Error: lvl 1; obj 0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:9:5)",
        "…"
      ],
      "child_ids": [
        "2",
        "3"
      ]
    },
    {
      "id": "1",
      "path": "$.nestedError",
      "level": 1,
      "instanceof_error": false,
      "typeof": "string",
      "constructor_name": "String",
      "as_string": "lvl 1; obj 1",
      "as_json": "lvl 1; obj 1"
    },
    {
      "id": "2",
      "path": "$.cause.cause[0]",
      "level": 2,
      "stack": [
        "Error: lvl 2; obj 0.0",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:13:9)",
        "…"
      ],
      "children_omitted": "max_depth"
    },
    {
      "id": "3",
      "path": "$.cause.cause[1]",
      "level": 2,
      "stack": [
        "Error: lvl 2; obj 0.1",
        "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:16:9)",
        "…"
      ]
    }
  ],
  "children_sources": [
    "cause",
    "errors",
    "nestedError"
  ]
}
```

## 7. [A CorjMaker instance to provide options once](../examples/example-7-using-corj-maker-instance.ts)

```typescript
const maker = new Corj.CorjMaker({ metadata: false });

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = maker.makeReport(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "stack": [
    "Error: Hi, I'm a regular Error object.",
    "    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-7-using-corj-maker-instance.ts:6:9)",
    "…"
  ]
}
```

## 8. [Flat array report with a Zod error](../examples/example-8-zod-error-flat-report.ts)

`ZodError` has nested errors in the `errors` prop. The array report lists the root first and links it to its children through
`child_ids`.

```typescript
const maker = new Corj.CorjMaker({ metadata: false });

const User = zod.object({
  name: zod.string(),
  age: zod.number().min(-250).max(250),
});

try {
  const validatedStallmanObject = User.parse({ name: 'Richard Stallman' });
  console.log('Hello, validated', validatedStallmanObject.name);
} catch (caught: unknown) {
  const reportArray = maker.makeReportArray(caught);
  console.log(JSON.stringify(reportArray, null, 2));
}
```

prints

```json
[
  {
    "occurrence_id": "CORJ_…",
    "fingerprint": "fp1_…",
    "id": "root",
    "path": "$",
    "level": 0,
    "constructor_name": "ZodError",
    "message": "[\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"number\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"age\"\n    ],\n    \"message\": \"Required\"\n  }\n]",
    "as_string": "[\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"number\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"age\"\n    ],\n    \"message\": \"Required\"\n  }\n]",
    "as_json": {
      "issues": [
        {
          "code": "invalid_type",
          "expected": "number",
          "received": "undefined",
          "path": [
            "age"
          ],
          "message": "Required"
        }
      ],
      "name": "ZodError"
    },
    "stack": [
      "ZodError: [",
      "  {",
      "    \"code\": \"invalid_type\",",
      "    \"expected\": \"number\",",
      "    \"received\": \"undefined\",",
      "    \"path\": [",
      "      \"age\"",
      "    ],",
      "    \"message\": \"Required\"",
      "  }",
      "]",
      "    at Object.get error [as error] (/home/user/work-dir/caught-object-report-json/node_modules/zod/lib/types.js:55:31)",
      "…"
    ],
    "child_ids": [
      "0"
    ]
  },
  {
    "id": "0",
    "path": "$.errors[0]",
    "level": 1,
    "instanceof_error": false,
    "constructor_name": "Object",
    "message": "Required",
    "as_string": "[object Object]",
    "as_json": {
      "code": "invalid_type",
      "expected": "number",
      "received": "undefined",
      "path": [
        "age"
      ],
      "message": "Required"
    }
  }
]
```

`message` and `constructor_name` are kept here because the multi-line message cannot be parsed back out of the first stack
line.

## 9. [winston integration](../examples/example-9-winston-integration.ts)

A monkey patch of winston's `ExceptionHandler` so that uncaught exceptions, including `throw null`, are logged as reports.
The code and the output are in [Recipes](./recipes.md#winston-uncaught-exception-handler).

## 10. [Report size limit](../examples/example-10-report-size-limit.ts)

```typescript
const report = Corj.makeCaughtObjectReport(
  { code: 'FETCH_FAILED', attempts: Array(100).fill('timeout') },
  {
    maxReportSize: 512,
    reportSizeUnit: 'utf8-bytes',
    metadata: false,
  },
);

const json = JSON.stringify(report);
console.log(Buffer.byteLength(json, 'utf8')); // 505
```

The complete result, formatted for readability; its **compact serialization** is 505 bytes. The `occurrence_id` and
`fingerprint` values are elided below, but the byte count is of the real ones: both are fixed-width, so any occurrence
measures the same.

```json
{
  "occurrence_id": "CORJ_…",
  "fingerprint": "fp1_…",
  "truncated": true,
  "instanceof_error": false,
  "constructor_name": "Object",
  "as_string": "[object Object]",
  "as_json": {
    "code": "FETCH_FAILED",
    "attempts": [
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "timeout",
      "[truncated]"
    ]
  }
}
```

## 11. [Cycles and shared errors](../examples/example-11-cycles-and-shared-errors.ts)

The same `shared` error is the `cause` of two siblings, and its own `cause` points back at the root. Every object is reported
once; later occurrences are references in `child_ids`.

```typescript
const shared = new Error('shared cause');
const first = new Error('first', { cause: shared });
const second = new Error('second', { cause: shared });
const root = new AggregateError([first, second], 'root');
shared.cause = root;

const rows = Corj.makeCaughtObjectReportArray(root, { metadata: false });
console.log(JSON.stringify(rows.map(({ stack, ...rest }) => rest), null, 2));
```

prints (stacks removed for brevity)

```json
[
  {
    "occurrence_id": "CORJ_…",
    "fingerprint": "fp1_…",
    "id": "root",
    "path": "$",
    "level": 0,
    "child_ids": ["0", "1"]
  },
  { "id": "0", "path": "$.errors[0]", "level": 1, "child_ids": ["2"] },
  { "id": "1", "path": "$.errors[1]", "level": 1, "child_ids": ["2"] },
  { "id": "2", "path": "$.errors[0].cause", "level": 2, "child_ids": ["root"] }
]
```

## 12. [Agent harness boundary](../examples/example-12-agent-harness.ts)

A runnable harness that wraps a node function, tests a working and a failing model fixture, keeps the failure in a typed
result, restores omitted values, checks the schema link, and asserts the report stays under its byte budget. No LLM API,
credentials or graph framework is needed; the model adapters are fixtures and the assertions test the boundary, not model
output.

The core of it:

```typescript
type NodeResult<T> = { node: string } & (
  | { ok: true; value: T }
  | { ok: false; error: CorjReport }
);

const maker = new Corj.CorjMaker({ maxReportSize: 4096, maxDepth: 2, maxChildren: 4, metadata: true });

async function runNode<T>(node: string, operation: () => Promise<T>): Promise<NodeResult<T>> {
  try {
    return { node, ok: true, value: await operation() };
  } catch (caught: unknown) {
    return { node, ok: false, error: maker.makeReport(caught) };
  }
}
```

Run it from a clone with `npm run ts-file ./examples/example-12-agent-harness.ts`. Standalone, save it as `harness.ts` in
a project with `caught-object-report-json`, TypeScript and `@types/node` installed and compile with
`npx tsc harness.ts --strict --skipLibCheck --types node --target ES2022 --module commonjs --outDir out` (add
`--ignoreConfig` on TypeScript 6 or newer), then `node out/harness.js`. It prints
`Success, fallback, nested-cause, and report-size evals passed.`
