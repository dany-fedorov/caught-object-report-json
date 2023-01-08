# Caught Object Report JSON

![Jest coverage](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/badges/coverage-jest%20coverage.svg)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Code Style by Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Strictest TypeScript Config](https://badgen.net/badge/typescript/strictest "Strictest TypeScript Config")](https://www.npmjs.com/package/@tsconfig/strictest)
[![Package License MIT](https://img.shields.io/npm/l/caught-object-report-json.svg)](https://www.npmjs.org/package/caught-object-report-json)
[![Npm Version](https://img.shields.io/npm/v/caught-object-report-json.svg)](https://www.npmjs.org/package/caught-object-report-json)

In JavaScript, you can apply `throw` statement to any object, not just to `Error` instances. For
example `throw Infinity` is valid JS code.
This library attempts to provide a useful JSON representation for any JS object thrown and caught.

Intended use cases are

- Structured logging
- Communicating thrown objects through network, e.g. REST API or GraphQL response

Please don't hesitate to open an issue if your use case for this type of library is not met.

- [Examples](#examples)
    - [1. Syntax error](#1-syntax-error)
    - [2. Axios error](#2-axios-error)
    - [3. Not an error object thrown](#3-not-an-error-object-thrown)
- [API](#api)
    - [makeCaughtObjectReportJson(caught)](#makecaughtobjectreportjsoncaught)
    - [new CorjMaker(options)](#new-corjmakeroptions)
    - [type CaughtObjectReportJson](#type-caughtobjectreportjson)
- [Links](#links)
    * [GitHub](#github)
    * [Npm](#npm)
    * [CORJ JSON Schema v0.2](#corj-json-schema-v02)

# Examples

## 1. [Syntax error](./examples/example-1-syntax-error.ts)

(Run with `npm run ts-file ./examples/example-1-syntax-error.ts`)

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "is_error_instance": true,
  "typeof": "object",
  "constructor_name": "SyntaxError",
  "message": "Unexpected token u in JSON at position 0",
  "as_string": {
    "value": "SyntaxError: Unexpected token u in JSON at position 0",
    "format": "String"
  },
  "as_json": {
    "value": {},
    "format": "safe-stable-stringify@2.4.1"
  },
  "stack": "SyntaxError: Unexpected token u in JSON at position 0\n    at JSON.parse (<anonymous>)\n    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-1.ts:6:8)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)",
  "v": "corj/v0.2"
}
```

## 2. [Axios error](./examples/example-2-axios-error.ts)

(Run with `npm run ts-file ./examples/example-2-axios-error.ts`)

```typescript
(async () => {
  try {
    await axios.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    const report = makeCaughtObjectReportJson(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();
```

prints

```json
{
  "is_error_instance": true,
  "typeof": "object",
  "constructor_name": "AxiosError",
  "message": "Request failed with status code 404",
  "as_string": {
    "value": "AxiosError: Request failed with status code 404",
    "format": "String"
  },
  "as_json": {
    "value": {
      "message": "Request failed with status code 404",
      "name": "AxiosError",
      "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
      "config": {
        "transitional": {
          "silentJSONParsing": true,
          "forcedJSONParsing": true,
          "clarifyTimeoutError": false
        },
        "adapter": [
          "xhr",
          "http"
        ],
        "transformRequest": [
          null
        ],
        "transformResponse": [
          null
        ],
        "timeout": 0,
        "xsrfCookieName": "XSRF-TOKEN",
        "xsrfHeaderName": "X-XSRF-TOKEN",
        "maxContentLength": -1,
        "maxBodyLength": -1,
        "env": {},
        "headers": {
          "Accept": "application/json, text/plain, * /*",
          "User-Agent": "axios/1.2.1",
          "Accept-Encoding": "gzip, compress, deflate, br"
        },
        "method": "get",
        "url": "https://reqres.in/api/users/23"
      },
      "code": "ERR_BAD_REQUEST",
      "status": 404
    },
    "format": "safe-stable-stringify@2.4.1"
  },
  "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
  "v": "corj/v0.2"
}
```

## 3. [Not an error object thrown](./examples/example-3-not-error-object.ts)

(Run with `npm run ts-file ./examples/example-3-not-error-object.ts`)

```typescript
const corj = new CorjMaker({
  addJsonSchemaLink: true,
  onCaughtMaking: (caught, { caughtDuring }) => {
    console.log('onCaughtMaking::', { caughtDuring });
    console.log('onCaughtMaking::', { caught });
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.make(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints form onCaughtMaking callback

```
onCaughtMaking:: { caughtDuring: 'caught-producing-as_json' }
onCaughtMaking:: {
  caught: Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.
      at makeCaughtObjectAsJsonProp (/home/df/hdd/wd/caught-object-report-json/src/CorjMaker.ts:176:19)
      at CorjMaker.make (/home/df/hdd/wd/caught-object-report-json/src/CorjMaker.ts:238:32)
      at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-3-not-error-object.ts:15:23)
      at Module._compile (node:internal/modules/cjs/loader:1120:14)
      at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)
      at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)
      at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)
      at Module.load (node:internal/modules/cjs/loader:998:32)
      at Function.Module._load (node:internal/modules/cjs/loader:839:12)
      at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12) {
    originalCaught: undefined,
    originalCaughtStringifyResult: undefined
  }
}
```

and then prints form catch block

```json
{
  "is_error_instance": false,
  "typeof": "undefined",
  "as_string": {
    "value": "undefined",
    "format": "String"
  },
  "as_json": {
    "value": null,
    "format": null
  },
  "v": "corj/v0.2",
  "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.2.json"
}
```

# [API](https://dany-fedorov.github.io/caught-object-report-json/modules.html)

#### [makeCaughtObjectReportJson(caught)](https://dany-fedorov.github.io/caught-object-report-json/functions/makeCaughtObjectReportJson.html)

A wrapper
for `CorjMaker#make` with
default options.

#### [new CorjMaker(options)](https://dany-fedorov.github.io/caught-object-report-json/classes/CorjMaker.html)

Use `CorjMaker#make` to produce `CaughtObjectReportJson`.

#### [type CaughtObjectReportJson](https://dany-fedorov.github.io/caught-object-report-json/types/CaughtObjectReportJson.html)

Report object produced by `CorjMaker#make`.
See the link for details about properties or check out a source code
of [CorjMaker#make](https://github.com/dany-fedorov/caught-object-report-json/blob/59f819b/src/CorjMaker.ts#L231), it is
straightforward.

# Links

##### GitHub

https://github.com/dany-fedorov/caught-object-report-json.git

##### Npm

https://www.npmjs.com/package/caught-object-report-json

##### CORJ JSON Schema v0.2

https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.2.json
