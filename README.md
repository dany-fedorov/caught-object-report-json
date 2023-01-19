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
    * [CORJ JSON Schema v0.4](#corj-json-schema-v04)

# Examples

## 1. [Syntax error](./examples/example-1-syntax-error.ts)

<sub>(Run with `npm run ts-file ./examples/example-1-syntax-error.ts`)</sub>

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught);
  console.log(report);
}
```

prints

```text
{
  instanceof_error: true,
  typeof: 'object',
  constructor_name: 'SyntaxError',
  message: 'Unexpected token u in JSON at position 0',
  as_string: 'SyntaxError: Unexpected token u in JSON at position 0',
  as_json: {},
  stack: 'SyntaxError: Unexpected token u in JSON at position 0\n' +
  '    at JSON.parse (<anonymous>)\n' +
  '    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-1-syntax-error.ts:6:8)'
  _m: [ 'v0.4', 'String', 'safe-stable-stringify@2.4.1' ]
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

  override toJSON = function(this: AxiosErrorWrapper) {
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
    console.log(report);
  }
})();
```

prints

```text
{
  instanceof_error: true,
  typeof: 'object',
  constructor_name: 'AxiosErrorWrapper',
  message: 'Request failed with status code 404',
  as_string: 'AxiosError: Request failed with status code 404',
  as_json: {
    message: 'Request failed with status code 404',
    name: 'AxiosError',
    stack: 'AxiosError: Request failed with status code 404\n' +
      '    at settle (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n' +
      '    at IncomingMessage.handleStreamEnd (/home/df/hdd/wd/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)'
    config: {
      transitional: [Object],
      adapter: [Array],
      transformRequest: [Array],
      transformResponse: [Array],
      timeout: 0,
      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',
      maxContentLength: -1      maxBodyLength: -1,
      env: {},
      headers: [Object],
      method: 'get',
      url: 'https://reqres.in/api/users/23'
    },
    code: 'ERR_BAD_REQUEST',
    status: 404,
    response_data: {},
    response_headers: {
      date: 'Thu, 19 Jan 2023 21:58:32 GMT',
      'content-type': 'application/json; charset=utf-8',
      'content-length': '2',
      connection: 'close',
      'x-powered-by': 'Express',
      'access-control-allow-origin': '*',
      etag: 'W/"2-vyGp6PvFo4RvsFtPoIWeCReyIC8"',
      via: '1.1 vegur',
      'cache-control': 'max-age=14400',
      'cf-cache-status': 'EXPIRED',
      'report-to': '{"endpoints":[{"url":"https:\\/\\/a.nel.cloudflare.com\\/report\\/v3?s=pki0zzsIm2JvJtBg%2B6%2BSk%2Bd7LYg4%2BVSVxN%2BvCeDIgIjqqjhD9NUgC2VzHNJPqk8Tw7eNgHF0KDfiKSJCh7e%2BTGnM0YekBhiShXQVb9IlKWashaw9PwiNl3i8Bw%3D%3D"}],"group":"cf-nel","max_age":604800}',
      nel: '{"success_fraction":0,"report_to":"cf-nel","max_age":604800}',
      vary: 'Accept-Encoding',
      server: 'cloudflare',
      'cf-ray': '78c2d513fffa2be5-FRA'
    }
  },
  stack: 'AxiosError: Request failed with status code 404\n' +
    '    at /home/df/hdd/wd/caught-object-report-json/examples/example-2-axios-error.ts:35:27\n' +
    '    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
  _m: [ 'v0.4', 'String', 'safe-stable-stringify@2.4.1' ]
}
```

## 3. [Not an error object thrown](./examples/example-3-not-error-object.ts)

If you do not provide `onCaughtMaking` callback, then any errors are muffled.

<sub>(Run with `npm run ts-file ./examples/example-3-not-error-object.ts`)</sub>

```typescript
try {
  throw undefined;
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    onCaughtMaking: (caught, { caughtDuring }) => {
      console.log("onCaughtMaking::", { caughtDuring });
      console.log("onCaughtMaking::", { caught });
    }
  });
  console.log(report);
}
```

prints form `onCaughtMaking` callback

```
onCaughtMaking:: { caughtDuring: { key: 'as_json' } }
onCaughtMaking:: {
  caught: Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.
      at makeProp_as_json (/home/df/hdd/wd/caught-object-report-json/src/index.ts:273:19)
      at CorjMaker.entries (/home/df/hdd/wd/caught-object-report-json/src/index.ts:370:20)
  }
}
```

and then prints form catch block

```text
{
  instanceof_error: false,
  typeof: 'undefined',
  as_string: 'undefined',
  as_json: null,
  _m: [ 'v0.4', 'String', 'safe-stable-stringify@2.4.1' ]
}
```

## 4. [Options](./examples/example-4-options.ts)

Apart from using the `onCaughtMaking` callback from the previous example to listen for exceptions thrown during the
making of report, you can also use `addJsonSchemaLink` and `addMetadata` options to control adding `$schema` and `_m`
properties to report JSON. By default `addJsonSchemaLink` is `false` and `addMetadata` is `true`. Read about `_m`
property
in [report object docs](https://dany-fedorov.github.io/caught-object-report-json/types/CaughtObjectReportJson.html).

<sub>(Run with `npm run ts-file ./examples/example-4-options.ts`)</sub>

```typescript
try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    addMetadata: false,
    addJsonSchemaLink: true,
  });
  console.log(report);
}
```

prints

```text
{
  instanceof_error: true,
  typeof: 'object',
  constructor_name: 'Error',
  message: "Hi, I'm a regular Error object.",
  as_string: "Error: Hi, I'm a regular Error object.",
  as_json: {},
  stack: "Error: Hi, I'm a regular Error object.\n" +
    '    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-4-options.ts:4:9)\n' +
    '    at Module._compile (node:internal/modules/cjs/loader:1120:14)'
  '$schema': 'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.4.json'
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

##### CORJ JSON Schema v0.4

https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.4.json
