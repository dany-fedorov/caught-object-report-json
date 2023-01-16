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
    * [CORJ JSON Schema v0.3](#corj-json-schema-v02)

# Examples

## 1. [Syntax error](./examples/example-1-syntax-error.ts)

<sub>(Run with `npm run ts-file ./examples/example-1-syntax-error.ts`)</sub>

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
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "SyntaxError",
  "message": "Unexpected token u in JSON at position 0",
  "as_string": {
    "format": "String",
    "value": "SyntaxError: Unexpected token u in JSON at position 0"
  },
  "as_json": {
    "format": "safe-stable-stringify@2.4.1",
    "value": {}
  },
  "stack": "SyntaxError: Unexpected token u in JSON at position 0\n    at JSON.parse (<anonymous>)\n    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-1.ts:6:8)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)",
  "v": "corj/v0.3"
}
```

## 2. [Axios error](./examples/example-2-axios-error.ts)

`AxiosError#toJSON` does not include response headers and response
data ([issue](https://github.com/axios/axios/issues/4836)), so you'll have to add it yourself.

<sub>(Run with `npm run ts-file ./examples/example-2-axios-error.ts`)</sub>

```typescript
const axiosClient = axios.create();

class AxiosErrorWrapper extends AxiosError {
  error: AxiosError;

  constructor(error: AxiosError) {
    super(
      error.message,
      error.code,
      error.config,
      error.request,
      error.response,
    );
    this.error = error;
  }

  override toJSON = function (this: AxiosErrorWrapper) {
    return {
      ...this.error.toJSON(),
      ...(!this.error.response
        ? {}
        : {
          response_data: this.error.response.data,
          response_headers: this.error.response.headers,
        }),
    };
  };
}

axiosClient.interceptors.response.use(undefined, (error) => {
  if (error instanceof AxiosError) {
    return Promise.reject(new AxiosErrorWrapper(error));
  }
  return Promise.reject(error);
});

(async () => {
  try {
    await axiosClient.get('https://reqres.in/api/users/23');
  } catch (caught: unknown) {
    const report = makeCaughtObjectReportJson(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();
```

prints

```json
{
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "AxiosErrorWrapper",
  "message": "Request failed with status code 404",
  "as_string": {
    "format": "String",
    "value": "AxiosError: Request failed with status code 404"
  },
  "as_json": {
    "format": "safe-stable-stringify@2.4.1",
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
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "axios/1.2.1",
          "Accept-Encoding": "gzip, compress, deflate, br"
        },
        "method": "get",
        "url": "https://reqres.in/api/users/23"
      },
      "code": "ERR_BAD_REQUEST",
      "status": 404,
      "response_data": {},
      "response_headers": {
        "date": "Mon, 16 Jan 2023 09:16:58 GMT",
        "content-type": "application/json; charset=utf-8",
        "content-length": "2",
        "connection": "close",
        "x-powered-by": "Express",
        "access-control-allow-origin": "*",
        "etag": "W/\"2-vyGp6PvFo4RvsFtPoIWeCReyIC8\"",
        "via": "1.1 vegur",
        "cache-control": "max-age=14400",
        "cf-cache-status": "EXPIRED",
        "report-to": "{\"endpoints\":[{\"url\":\"https:\\/\\/a.nel.cloudflare.com\\/report\\/v3?s=r5GuTAr5x2kDEeEXtRdQr1Gj9zAhFDACLdWDImSbxnTSIwdTHH%2BKngfXfZoudJmK4%2FfsHHxBb1yWfmp0iAv%2BFTfiFBQTidK4HeeaXRiztPWHQDqxUegtm9pI2A%3D%3D\"}],\"group\":\"cf-nel\",\"max_age\":604800}",
        "nel": "{\"success_fraction\":0,\"report_to\":\"cf-nel\",\"max_age\":604800}",
        "vary": "Accept-Encoding",
        "server": "cloudflare",
        "cf-ray": "78a5c160adc82bea-FRA"
      }
    }
  },
  "stack": "AxiosError: Request failed with status code 404\n    at /home/df/hdd/wd/caught-object-report-json/examples/example-2-axios-error.ts:32:27\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
  "v": "corj/v0.3"
}
```

## 3. [Not an error object thrown](./examples/example-3-not-error-object.ts)

If you do not provide `onCaughtMaking` callback, then any errors are muffled. 

<sub>(Run with `npm run ts-file ./examples/example-3-not-error-object.ts`)</sub>

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
    originalCaught: undefined,
    originalCaughtStringifyResult: undefined
  }
}
```

and then prints form catch block

```json
{
  "instanceof_error": false,
  "typeof": "undefined",
  "as_string": {
    "format": "String",
    "value": "undefined"
  },
  "as_json": {
    "format": null,
    "value": null
  },
  "v": "corj/v0.3",
  "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.3.json"
}
```

# [API](https://dany-fedorov.github.io/caught-object-report-json/modules.html)

#### [makeCaughtObjectReportJson(caught)](https://dany-fedorov.github.io/caught-object-report-json/functions/makeCaughtObjectReportJson.html)

A wrapper for `CorjMaker#make` with default options.

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

##### CORJ JSON Schema v0.3

https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.3.json
