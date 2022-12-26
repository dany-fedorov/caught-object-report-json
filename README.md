# Caught Object Report JSON

![Jest coverage](./badges/coverage-jest%20coverage.svg)

This library aims to make JS exceptions suitable for structured logging.

> **Warning**
> Please use fixed version (remove ^ from package.json).

# Examples

## Example 1: Syntax Error

(Run with `npm run tsfile ./examples/example-1-syntax-error.ts`)

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  console.log(JSON.stringify(makeCaughtObjectReportJson(caught), null, 2));
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

## Example 2: Axios Error

(Run with `npm run tsfile ./examples/example-2-axios-error.ts`)

```typescript
(async () => {
  try {
    await axios.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    console.log(JSON.stringify(makeCaughtObjectReportJson(caught), null, 2));
  }
})();
/**
 * {
 *   "is_error_instance": true,
 *   "typeof": "object",
 *   "constructor_name": "AxiosError",
 *   "message_prop": "Request failed with status code 404",
 *   "as_string": {
 *   "value": "AxiosError: Request failed with status code 404",
 *     "format": "String"
 * },
 *   "as_json": {
 *   "value": {
 *     "message": "Request failed with status code 404",
 *       "name": "AxiosError",
 *       "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
 *       "config": {
 *       "transitional": {
 *         "silentJSONParsing": true,
 *           "forcedJSONParsing": true,
 *           "clarifyTimeoutError": false
 *       },
 *       "adapter": [
 *         "xhr",
 *         "http"
 *       ],
 *         "transformRequest": [
 *         null
 *       ],
 *         "transformResponse": [
 *         null
 *       ],
 *         "timeout": 0,
 *         "xsrfCookieName": "XSRF-TOKEN",
 *         "xsrfHeaderName": "X-XSRF-TOKEN",
 *         "maxContentLength": -1,
 *         "maxBodyLength": -1,
 *         "env": {},
 *       "headers": {
 *         "Accept": "application/json, text/plain, * /*",
 *         "User-Agent": "axios/1.2.1",
 *         "Accept-Encoding": "gzip, compress, deflate, br"
 *       },
 *       "method": "get",
 *         "url": "https://reqres.in/api/users/23"
 *     },
 *     "code": "ERR_BAD_REQUEST",
 *       "status": 404
 *   },
 *   "format": "safe-stable-stringify@2.4.1"
 * },
 *   "stack_prop": "AxiosError: Request failed with status code 404\n    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
 *   "v": "corj/v0.1"
 * }
 */
```

## Example 3: Not an error object thrown

(Run with `npm run tsfile ./examples/example-3-not-error-object.ts`)

```typescript
const corj = new CorjBuilder({
  shortVersion: false,
  onCaughtBuilding: (caught, {caughtDuring}) => {
    console.log('onCaughtBuilding::', {caughtDuring});
    console.log('onCaughtBuilding::', {caught});
    console.log('---');
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  console.log(JSON.stringify(corj.build(caught), null, 2));
}
/**
 * onCaughtBuilding:: { caughtDuring: 'caught-object-json-stringify' }
 * onCaughtBuilding:: {
 *   caught: Error: Could not convert caught object to json string.
 *   at makeErrorJson (/home/df/hdd/wd/caught-object-report-json/src/index.ts:77:19)
 * at CorjBuilder.build (/home/df/hdd/wd/caught-object-report-json/src/index.ts:121:23)
 * at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-3-not-error-object.ts:15:35)
 * at Module._compile (node:internal/modules/cjs/loader:1120:14)
 * at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)
 * at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)
 * at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)
 * at Module.load (node:internal/modules/cjs/loader:998:32)
 * at Function.Module._load (node:internal/modules/cjs/loader:839:12)
 * at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12) {
 *   caught: undefined,
 *     stringifiedResult: undefined
 * }
 * }
 * ---
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
 *   "v": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json"
 * }
 */
```
