# Caught Object Report JSON

[![Npm Version](https://img.shields.io/npm/v/caught-object-report-json.svg)](https://www.npmjs.org/package/caught-object-report-json)
[![Package License](https://img.shields.io/npm/l/caught-object-report-json.svg)](https://www.npmjs.org/package/caught-object-report-json)
![Jest coverage](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/badges/coverage-jest%20coverage.svg)

Convert object from catch block to json - useful to report exceptions to json logs.

> **Warning**
> Please use fixed version (remove ^ from package.json).

# Table of Contents

<!-- TOC -->

* [API](#api)
* [Examples](#examples)
    * [1. Syntax Error](#1-syntax-error)
    * [2. Axios Error](#2-axios-error)
    * [3. Not an error object thrown](#3-not-an-error-object-thrown)
* [Links](#links)

<!-- TOC -->

# [API](https://dany-fedorov.github.io/caught-object-report-json/modules.html)

- [makeCaughtObjectReportJson](https://dany-fedorov.github.io/caught-object-report-json/functions/makeCaughtObjectReportJson.html)
- [CorjBuilder.build](https://dany-fedorov.github.io/caught-object-report-json/classes/CorjBuilder.html)

# Examples

## 1. [Syntax Error](./examples/example-1-syntax-error.ts)

(Run with `npm run tsfile ./examples/example-1-syntax-error.ts`)

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught);
  console.log(JSON.stringify(report, null, 2));
}
/**
 * {
 *   "is_error_instance": true,
 *   "typeof": "object",
 *   "constructor_name": "SyntaxError",
 *   "message_prop": "Unexpected token u in JSON at position 0",
 *   "as_string": {
 *     "value": "SyntaxError: Unexpected token u in JSON at position 0",
 *     "format": "String"
 *   },
 *   "as_json": {
 *     "value": {},
 *     "format": "safe-stable-stringify@2.4.1"
 *   },
 *   "stack_prop": "SyntaxError: Unexpected token u in JSON at position 0\n    at JSON.parse (<anonymous>)\n    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-1.ts:6:8)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)",
 *   "v": "corj/v0.1"
 * }
 */
```

## 2. [Axios Error](./examples/example-2-axios-error.ts)

(Run with `npm run tsfile ./examples/example-2-axios-error.ts`)

```typescript
(async () => {
  try {
    await axios.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    const report = makeCaughtObjectReportJson(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();
/**
 * {
 *   "is_error_instance": true,
 *   "typeof": "object",
 *   "constructor_name": "AxiosError",
 *   "message_prop": "Request failed with status code 404",
 *   "as_string": {
 *     "value": "AxiosError: Request failed with status code 404",
 *     "format": "String"
 *   },
 *   "as_json": {
 *     "value": {
 *       "message": "Request failed with status code 404",
 *       "name": "AxiosError",
 *       "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
 *       "config": {
 *         "transitional": {
 *            "silentJSONParsing": true,
 *            "forcedJSONParsing": true,
 *            "clarifyTimeoutError": false
 *         },
 *         "adapter": [
 *           "xhr",
 *           "http"
 *         ],
 *         "transformRequest": [
 *           null
 *         ],
 *         "transformResponse": [
 *           null
 *         ],
 *         "timeout": 0,
 *         "xsrfCookieName": "XSRF-TOKEN",
 *         "xsrfHeaderName": "X-XSRF-TOKEN",
 *         "maxContentLength": -1,
 *         "maxBodyLength": -1,
 *         "env": {},
 *         "headers": {
 *           "Accept": "application/json, text/plain, * /*",
 *           "User-Agent": "axios/1.2.1",
 *           "Accept-Encoding": "gzip, compress, deflate, br"
 *         },
 *         "method": "get",
 *         "url": "https://reqres.in/api/users/23"
 *       },
 *       "code": "ERR_BAD_REQUEST",
 *       "status": 404
 *     },
 *     "format": "safe-stable-stringify@2.4.1"
 *   },
 *   "stack_prop": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
 *   "v": "corj/v0.1"
 * }
 */
```

## 3. [Not an error object thrown](./examples/example-3-not-error-object.ts)

(Run with `npm run tsfile ./examples/example-3-not-error-object.ts`)

```typescript
const corj = new CorjBuilder({
  addJsonSchemaLink: true,
  onCaughtBuilding: (caught, {caughtDuring}) => {
    console.log('onCaughtBuilding::', {caughtDuring});
    console.log('onCaughtBuilding::', {caught});
    console.log('---');
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.build(caught);
  console.log(JSON.stringify(report, null, 2));
}
/**
 * onCaughtBuilding:: { caughtDuring: 'caught-producing-as_json' }
 * onCaughtBuilding:: {
 *   caught: Error: Could not convert caught object to json string.
 *       at makeErrorJson (/home/df/hdd/wd/caught-object-report-json/src/index.ts:77:19)
 *       at CorjBuilder.build (/home/df/hdd/wd/caught-object-report-json/src/index.ts:121:23)
 *       at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-3-not-error-object.ts:15:35)
 *       at Module._compile (node:internal/modules/cjs/loader:1120:14)
 *       at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)
 *       at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)
 *       at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)
 *       at Module.load (node:internal/modules/cjs/loader:998:32)
 *       at Function.Module._load (node:internal/modules/cjs/loader:839:12)
 *       at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12) {
 *     caught: undefined,
 *     stringifiedResult: undefined
 *   }
 * }
 * ---
 *
 * {
 *   "is_error_instance": false,
 *   "typeof": "undefined",
 *   "as_string": {
 *     "value": "undefined",
 *     "format": "String"
 *   },
 *   "as_json": {
 *     "value": null,
 *     "format": null
 *   },
 *   "v": "corj/v0.1",
 *   "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json"
 * }

 */
```

# Links

- GitHub - https://github.com/dany-fedorov/caught-object-report-json.git
- Npm - https://www.npmjs.com/package/caught-object-report-json
