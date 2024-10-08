# Caught Object Report JSON 

![Jest coverage](https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/badges/coverage-jest%20coverage.svg "Jest coverage")
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release "semantic-release: angular")](https://github.com/semantic-release/semantic-release)
[![Code Style by Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg "Code Style by Prettier")](https://github.com/prettier/prettier)
[![Strictest TypeScript Config](https://img.shields.io/badge/typescript-strictest-blue "Strictest TypeScript Config")](https://www.npmjs.com/package/@tsconfig/strictest)
[![Package License MIT](https://img.shields.io/npm/l/caught-object-report-json.svg "Package License MIT")](https://www.npmjs.org/package/caught-object-report-json)
[![Npm Version](https://img.shields.io/npm/v/caught-object-report-json.svg "Npm Version")](https://www.npmjs.org/package/caught-object-report-json)

<img src="https://github.com/dany-fedorov/caught-object-report-json/raw/main/banner.png">

# Table Of Contents

* [Motivation](#motivation)
* [Before Using This Library](#before-using-this-library)
* [Examples](#examples)
    * [1. Syntax error](#1-syntax-error)
    * [2. Axios error](#2-axios-error)
    * [3. Not an error object thrown](#3-not-an-error-object-thrown)
    * [4. Metadata fields](#4-metadata-fields)
    * [5. Nested errors: Basic](#5-nested-errors-basic)
    * [6. Nested errors: Nesting levels](#6-nested-errors-nesting-levels)
    * [7. Using CorjMaker instance to provide options just once](#7-using-corjmaker-instance-to-provide-options-just-once)
    * [8. Flat array report with Zod error](#8-flat-array-report-with-zod-error)
    * [9. Winston integration](#9-winston-integration)
* [API](#api)
    * [makeCaughtObjectReportJson(caught)](#makecaughtobjectreportjsoncaught)
    * [makeCaughtObjectReportJsonArray(caught)](#makecaughtobjectreportjsonarraycaught)
    * [new CorjMaker(options)](#new-corjmakeroptions)
    * [type CaughtObjectReportJson](#type-caughtobjectreportjson)
    * [type CaughtObjectReportJsonChild](#type-caughtobjectreportjsonchild)
* [Links](#links)
    * [GitHub](#github)
    * [Npm](#npm)
    * [Deno Land](#deno-land)
    * [CORJ JSON Schema - corj/v0.8](#corj-json-schema---corjv08)

# Motivation

- JavaScript does not have a default way to represent `Error` object as JSON.
- No standard way to extend error object with custom properties. It is natural to augment thrown error with details, but
  everybody is going to do it
  their own way. There is no standard `details` field.
- `Error` object can have nested errors,
  see [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)
  and [`cause` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause#specifications).
  This can be a custom property of course like `rootCauses`. This means that occasionally an error you catch can be a
  deeply nested tree.
- Even worse, in JavaScript, you can apply `throw` statement to any object, not just to `Error` instances. For
  example `throw Infinity` is valid JS code.
- TypeScript does not attempt to make throwing errors type-safe. Every time you catch, the best you can say about caught
  object is that it is `unknown`.

All these things make serializing caught object to JSON a non-trivial problem.

This library attempts to provide a useful JSON representation for any JS object thrown and caught.

Intended use cases are

- Structured logging
- REST API or GraphQL response
- Front-end sending an error report

> Please don't hesitate to open an issue if your use case for this type of library is not met.

# Before Using This Library

Consider

- `JSON.stringify(err, Object.getOwnPropertyNames(err))` is good enough if you don't necessarily want all edge cases
  covered.
- `JSON.stringify` can throw, so make sure to wrap it in `try catch` or use `safe-stable-stringify` to avoid common
  errors of converting to JSON like circular references or converting BigInt value.

Compared to the method above, `caught-object-report-json` gives you the following benefits

- Handles weird edge cases like `throw null` or when accessing a property on the error throws. Just
  slap `caught-object-report-json` on anything.
- Logs errors that happen when producing JSON report (configurable). This means that even
  when `caught-object-report-json` fails to produce complete report, it will tell you why.
- Handles nested errors
    1. Replacer array obtained by `Object.getOwnPropertyNames` will apply to nested errors, but they can have a
       different set of property names, and you can miss on something important.
       `caught-object-report-json` does not have this problem.
    2. `caught-object-report-json` flattens nested errors. Array is more suitable for processing than
       nested object. For example, you can write a pseudocode search condition like this with JSONPath
       query - `$.children[:].constructor_name == "SyntaxError"`. It will search through all children in flattened array
       no matter how deeply nested. Same is not easily attainable for nested objects.
- `caught-object-report-json` guarantees a JSON format which is
    1. Same for any object processed.
    2. Has metadata fields that hint into how it was produced (configurable).
    3. Has JSON Schema as a source of truth.

# Examples

## 1. [Syntax error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-1-syntax-error.ts)

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
  "as_string": "SyntaxError: Unexpected token u in JSON at position 0",
  "as_json": {},
  "stack": "SyntaxError: Unexpected token u in JSON at position 0\n    at JSON.parse (<anonymous>)\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-1-syntax-error.ts:6:8)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)",
  "children_sources": [
    "cause",
    "errors"
  ],
  "as_string_format": "String",
  "as_json_format": "safe-stable-stringify@2.4.1",
  "v": "corj/v0.6"
}
```

## 2. [Axios error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-2-axios-error.ts)

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
  "as_string": "AxiosError: Request failed with status code 404",
  "as_json": {
    "message": "Request failed with status code 404",
    "name": "AxiosError",
    "stack": "AxiosError: Request failed with status code 404\n    at settle (/home/user/work-dir/caught-object-report-json/node_modules/axios/lib/core/settle.js:19:12)\n    at IncomingMessage.handleStreamEnd (/home/user/work-dir/caught-object-report-json/node_modules/axios/lib/adapters/http.js:505:11)\n    at IncomingMessage.emit (node:events:525:35)\n    at IncomingMessage.emit (node:domain:489:12)\n    at endReadableNT (node:internal/streams/readable:1359:12)\n    at processTicksAndRejections (node:internal/process/task_queues:82:21)",
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
      "date": "Sat, 28 Jan 2023 19:10:32 GMT",
      "content-type": "application/json; charset=utf-8",
      "content-length": "2",
      "connection": "close",
      "x-powered-by": "Express",
      "access-control-allow-origin": "*",
      "etag": "W/\"2-vyGp6PvFo4RvsFtPoIWeCReyIC8\"",
      "via": "1.1 vegur",
      "cache-control": "max-age=14400",
      "cf-cache-status": "EXPIRED",
      "report-to": "{\"endpoints\":[{\"url\":\"https:\\/\\/a.nel.cloudflare.com\\/report\\/v3?s=1L5F50uGk8AGGDKIk2WHHM8L2xV13XnA%2FJbD9EVofkAK0nW9uVfqOZOtPTg2amWpxM17WWe2IM%2BYRBE6Vyr49Z6nELCdbyEuEHkOVpz%2F8U5Stl3BQK93EgFNhw%3D%3D\"}],\"group\":\"cf-nel\",\"max_age\":604800}",
      "nel": "{\"success_fraction\":0,\"report_to\":\"cf-nel\",\"max_age\":604800}",
      "vary": "Accept-Encoding",
      "server": "cloudflare",
      "cf-ray": "790c075efba977b0-KBP"
    }
  },
  "stack": "AxiosError: Request failed with status code 404\n    at /home/user/work-dir/caught-object-report-json/examples/example-2-axios-error.ts:35:27\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)",
  "children_sources": [
    "cause",
    "errors"
  ],
  "as_string_format": "String",
  "as_json_format": "safe-stable-stringify@2.4.1",
  "v": "corj/v0.6"
}
```

## 3. [Not an error object thrown](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-3-not-error-object.ts)

If you do not provide `onCaughtMaking` callback, then errors are reported by default reporter using `console.warn`
function. Provide `onCaughtMaking: null` to opt out of it.

<sub>(Run with `npm run ts-file ./examples/example-3-not-error-object.ts`)</sub>

```typescript
try {
  throw undefined;
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    onCaughtMaking: (caught, context) => {
      console.log("onCaughtMaking::", { context });
      console.log("onCaughtMaking::", { caught });
    }
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints form `onCaughtMaking` callback

```
onCaughtMaking:: {
  context: {
    reason: 'error-converting-caught-to-json',
    caughtObjectNestingInfo: null,
    caughtWhenProcessingReportKey: 'as_json'
  }
}
onCaughtMaking:: {
  caught: Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.
      at makeProp_as_json (/home/user/work-dir/caught-object-report-json/src/index.ts:546:19)
      at makeEntriesWithoutNested (/home/user/work-dir/caught-object-report-json/src/index.ts:903:20)
      at CorjMaker.entries (/home/user/work-dir/caught-object-report-json/src/index.ts:951:46)
      at CorjMaker.makeReportObject (/home/user/work-dir/caught-object-report-json/src/index.ts:965:36)
      at makeCaughtObjectReportJson (/home/user/work-dir/caught-object-report-json/src/index.ts:353:42)
}
```

and then prints form catch block

```json
{
  "instanceof_error": false,
  "typeof": "undefined",
  "as_string": "undefined",
  "as_json": null,
  "children_sources": [
    "cause",
    "errors"
  ],
  "as_string_format": "String",
  "as_json_format": "safe-stable-stringify@2.4.1",
  "v": "corj/v0.6"
}
```

## 4. [Metadata fields](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-4-metadata-fields.ts)

Use `metadataFields` option to control what metadata to add to report. There is a similar
option `childrenMetadataFields` that controls metadata fields for children reports. By default metadata is not set for
children reports.

<sub>(Run with `npm run ts-file ./examples/example-4-metadata-fields.ts`)</sub>

```typescript
try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    metadataFields: {
      $schema: true,
      as_json_format: false,
      as_string_format: false,
      children_sources: false,
      v: false
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "Error",
  "message": "Hi, I'm a regular Error object.",
  "as_string": "Error: Hi, I'm a regular Error object.",
  "as_json": {},
  "stack": "Error: Hi, I'm a regular Error object.\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-4-metadata-fields.ts:4:9)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
  "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.7-report-object.json"
}
```

## 5. [Nested errors: Basic](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-5-nested-errors-1-basic.ts)

JS has two standard ways to represent nested/children
errors.

1. [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)
   has nested errors accessible in `errors` property
2. [`cause` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause#specifications)
   of `Error` class.

Caught Object Report JSON abstracts this into `children` property.

In the following example `AggregateError` has both `errors` and `cause` properties set.

On a JSON report `children_sources` metadata field tells which property names were used to obtain `children` array.

Children in array have three additional fields - `child_id`, `child_path` and `child_level`.

- `child_id` is an integer id assigned to a nested `error` object, starts from `0`
- `child_path` is a JSONPath from root caught object to this object.
- `child_level` shows a level of this object in a tree of nested error objects.

<sub>(Run with `npm run ts-file ./examples/example-5-nested-errors-1-basic.ts`)</sub>

```typescript
const caught = new AggregateError(
  [
    new Error('AggregateError child 0'),
    'AggregateError child 1 (not an Error object)',
  ],
  'AggregateError message',
  { cause: new Error('Cause Error object') },
);
const report = makeCaughtObjectReportJson(caught, {
  metadataFields: {
    $schema: false,
    as_json_format: false,
    as_string_format: false,
    v: false,
    children_sources: true,
  },
});
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "AggregateError",
  "message": "AggregateError message",
  "as_string": "AggregateError: AggregateError message",
  "as_json": {},
  "stack": "AggregateError: AggregateError message\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:7:16)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "instanceof_error": true,
      "typeof": "object",
      "constructor_name": "Error",
      "message": "Cause Error object",
      "as_string": "Error: Cause Error object",
      "as_json": {},
      "stack": "Error: Cause Error object\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:13:12)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)"
    },
    {
      "id": "1",
      "path": "$.errors[0]",
      "level": 1,
      "instanceof_error": true,
      "typeof": "object",
      "constructor_name": "Error",
      "message": "AggregateError child 0",
      "as_string": "Error: AggregateError child 0",
      "as_json": {},
      "stack": "Error: AggregateError child 0\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-nested-errors-1-basic.ts:9:5)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)"
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
  ],
  "children_sources": [
    "cause",
    "errors"
  ]
}
```

## 6. [Nested errors: Nesting levels](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-6-nested-errors-2-nesting-levels.ts)

The following example showcases some nuances of processing nested errors.

- Because of `maxChildrenLevel` option set to `2`, "lvl 3" errors are not included
- When there are nested error object detected, but level is greater than `maxChildrenLevel`
  setting, `children_omitted_reason`
  field is added
- Because `childrenSources` option includes `nestedError` field, it is included in `children` array
- Because `childrenSources` option includes `nestedError` field, it is excluded from `as_json` field
- Because nested objects are flattened, `children` prop for nested objects includes list of `child_id`s and not objects
- If a value found by a property from `childrenSources` is an array, then report is made for each element and not for an
  array as a whole.

<sub>(Run with `npm run ts-file ./examples/example-6-nested-errors-2-nesting-levels.ts`)</sub>

```typescript
const caught = new Error("lvl 0", {
  cause: new Error("lvl 1; obj 0", {
    cause: [
      new Error("lvl 2; obj 0.0", { cause: new Error("lvl 3; obj 0.0.0") }),
      new Error("lvl 2; obj 0.1")
    ]
  })
});
caught.nestedErrors = 'lvl 1; obj 1';
caught.extraField = 'error info';
const report = makeCaughtObjectReportJson(caught, {
  maxChildrenLevel: 2,
  childrenSources: ['cause', 'errors', 'nestedErrors'],
  metadataFields: {
    $schema: false,
    as_json_format: false,
    as_string_format: false,
    v: false,
    children_sources: true
  }
});
console.log(JSON.stringify(report, null, 2));
```

prints

```json
{
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "Error",
  "message": "lvl 0",
  "as_string": "Error: lvl 0",
  "as_json": {
    "extraField": "error info"
  },
  "stack": "Error: lvl 0\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:5:16)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
  "children": [
    {
      "id": "0",
      "path": "$.cause",
      "level": 1,
      "instanceof_error": true,
      "typeof": "object",
      "constructor_name": "Error",
      "message": "lvl 1; obj 0",
      "as_string": "Error: lvl 1; obj 0",
      "as_json": {},
      "stack": "Error: lvl 1; obj 0\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:9:5)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
      "children": [
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
      "instanceof_error": true,
      "typeof": "object",
      "constructor_name": "Error",
      "message": "lvl 2; obj 0.0",
      "as_string": "Error: lvl 2; obj 0.0",
      "as_json": {},
      "stack": "Error: lvl 2; obj 0.0\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:13:9)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
      "children_omitted_reason": "Reached max depth - 2"
    },
    {
      "id": "3",
      "path": "$.cause.cause[1]",
      "level": 2,
      "instanceof_error": true,
      "typeof": "object",
      "constructor_name": "Error",
      "message": "lvl 2; obj 0.1",
      "as_string": "Error: lvl 2; obj 0.1",
      "as_json": {},
      "stack": "Error: lvl 2; obj 0.1\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-6-nested-errors-2-nesting-levels.ts:16:9)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)"
    }
  ],
  "children_sources": [
    "cause",
    "errors",
    "nestedError"
  ]
}
```

## 7. [Using CorjMaker instance to provide options just once](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-7-using-corj-maker-instance.ts)

<sub>(Run with `npm run ts-file ./examples/example-7-using-corj-maker-instance.ts`)</sub>

```typescript
const corj = CorjMaker.withDefaults({
  metadataFields: false
});

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = corj.makeReportObject(caught);
  console.log(JSON.stringify(report, null, 2));
}
```

prints

```json
{
  "instanceof_error": true,
  "typeof": "object",
  "constructor_name": "Error",
  "message": "Hi, I'm a regular Error object.",
  "as_string": "Error: Hi, I'm a regular Error object.",
  "as_json": {},
  "stack": "Error: Hi, I'm a regular Error object.\n    at Object.<anonymous> (/home/user/work-dir/caught-object-report-json/examples/example-5-using-corj-maker-instance.ts:8:9)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:81:12)\n    at phase4 (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/user/work-dir/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)"
}
```

# 8. [Flat array report with Zod error](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-8-zod-error-flat-report.ts)

ZodError has nested errors in the `errors` prop. `caught-object-report-json` logs both top-level and nested error.

<sub>(Run with `npm run ts-file ./examples/example-8-zod-error-flat-report.ts`)</sub>

```typescript
const corj = CorjMaker.withDefaults({
  metadataFields: false,
});

const User = zod.object({
  name: zod.string(),
  age: zod.number().min(-250).max(250),
});

try {
  const validatedStallmanObject = User.parse({ name: 'Richard Stallman' });
  console.log('Hello, validated', validatedStallmanObject.name);
} catch (caught: unknown) {
  const reportArray = corj.makeReportArray(caught);
  console.log(JSON.stringify(reportArray, null, 2));
}
```

prints

```json
[
  {
    "id": "root",
    "path": "$",
    "level": 0,
    "instanceof_error": true,
    "typeof": "object",
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
    "stack": "ZodError: [\n  {\n    \"code\": \"invalid_type\",\n    \"expected\": \"number\",\n    \"received\": \"undefined\",\n    \"path\": [\n      \"age\"\n    ],\n    \"message\": \"Required\"\n  }\n]\n    at handleResult (/home/df/hdd/wd/caught-object-report-json/node_modules/zod/lib/types.js:29:23)\n    at ZodObject.safeParse (/home/df/hdd/wd/caught-object-report-json/node_modules/zod/lib/types.js:142:16)\n    at ZodObject.parse (/home/df/hdd/wd/caught-object-report-json/node_modules/zod/lib/types.js:122:29)\n    at Object.<anonymous> (/home/df/hdd/wd/caught-object-report-json/examples/example-8-zod-error-flat-report.ts:14:40)\n    at Module._compile (node:internal/modules/cjs/loader:1120:14)\n    at Module.m._compile (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1174:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/hdd/wd/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:998:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:839:12)",
    "children": [
      "0"
    ],
    "children_sources": [
      "cause",
      "errors"
    ],
    "as_string_format": "String",
    "as_json_format": "safe-stable-stringify@2.4.1",
    "v": "corj/v0.8"
  },
  {
    "id": "0",
    "path": "$.errors[0]",
    "level": 1,
    "instanceof_error": false,
    "typeof": "object",
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

# 9. [Winston integration](https://github.com/dany-fedorov/caught-object-report-json/blob/main/examples/example-9-winston-integration.ts)

<sub>(Run with `npm run ts-file ./examples/example-9-winston-integration.ts`)</sub>

This integration uses a feature of `winston` that allows to specify transports that will react to `uncaughtException`
event emitted by the `process` - https://www.npmjs.com/package/winston#exceptions

Integration by monkey patching the exported class is not pretty, but this is the only way I found to make it work.

This method keeps all the processing that is done by `winston` for the error object, but it replaces the `message` prop
on the resulting JSON with an extended report instead of error message + stack that `winston` uses by default.

This is the string that `winston` gives by default for this example.

```
"AggregateError\n    at Object.<anonymous> (/home/df/wd/personal/caught-object-report-json/examples/example-9-logging-uncaught-exceptions-and-rejections-with-winston.ts:33:7)\n    at Module._compile (node:internal/modules/cjs/loader:1267:14)\n    at Module.m._compile (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1321:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:1125:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:965:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:83:12)\n    at phase4 (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)"
```

`caught-object-report-json` does not loose any info, see the final JSON message below the code snippet.

Also, winston breaks when you `throw null` or `throw undefined`. `caught-object-report-json` saves you from this edge case.

```typescript
import { createLogger, transports, ExceptionHandler } from 'winston';

const origGetAllInfo = ExceptionHandler.prototype.getAllInfo;
ExceptionHandler.prototype.getAllInfo = function getAllInfoExtended(
  err: unknown,
): object {
  const errorInfoByWinston = origGetAllInfo.call(
    ExceptionHandler.prototype,
    err instanceof Error
      ? err
      : `I'm a hacky stub error that does not break getAllInfo method, unlike undefined or null.`,
  );
  return {
    ...errorInfoByWinston,
    error: err,
    message: makeCaughtObjectReportJson(err),
  };
};

const logger = createLogger({
  transports: [new transports.Console()],
  exceptionHandlers: [new transports.Console()],
});

logger.info({ 'just-an-info-message': 'hey' });

throw new AggregateError([new Error('cause 1'), new Error('cause 2'), null]);
```

prints an inline version of the following JSON

```json
{
  "date": "Wed May 24 2023 01:17:44 GMT+0300 (Eastern European Summer Time)",
  "error": {},
  "exception": true,
  "level": "error",
  "message": {
    "as_json": {},
    "as_json_format": "safe-stable-stringify@2.4.1",
    "as_string": "AggregateError",
    "as_string_format": "String",
    "children": [
      {
        "as_json": {},
        "as_string": "Error: cause 1",
        "constructor_name": "Error",
        "id": "0",
        "instanceof_error": true,
        "level": 1,
        "message": "cause 1",
        "path": "$.errors[0]",
        "stack": "Error: cause 1\n    at Object.<anonymous> (/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts:30:27)\n    at Module._compile (node:internal/modules/cjs/loader:1267:14)\n    at Module.m._compile (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1321:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:1125:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:965:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:83:12)\n    at phase4 (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
        "typeof": "object"
      },
      {
        "as_json": {},
        "as_string": "Error: cause 2",
        "constructor_name": "Error",
        "id": "1",
        "instanceof_error": true,
        "level": 1,
        "message": "cause 2",
        "path": "$.errors[1]",
        "stack": "Error: cause 2\n    at Object.<anonymous> (/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts:30:49)\n    at Module._compile (node:internal/modules/cjs/loader:1267:14)\n    at Module.m._compile (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1321:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:1125:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:965:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:83:12)\n    at phase4 (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
        "typeof": "object"
      },
      {
        "as_json": null,
        "as_string": "null",
        "id": "2",
        "instanceof_error": false,
        "level": 1,
        "path": "$.errors[2]",
        "typeof": "object"
      }
    ],
    "children_sources": [
      "cause",
      "errors"
    ],
    "constructor_name": "AggregateError",
    "instanceof_error": true,
    "message": "",
    "stack": "AggregateError\n    at Object.<anonymous> (/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts:30:7)\n    at Module._compile (node:internal/modules/cjs/loader:1267:14)\n    at Module.m._compile (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1321:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:1125:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:965:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:83:12)\n    at phase4 (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
    "typeof": "object",
    "v": "corj/v0.8"
  },
  "os": {
    "loadavg": [
      1.04,
      1.3,
      1.16
    ],
    "uptime": 262285.15
  },
  "process": {
    "argv": [
      "/home/df/wd/personal/caught-object-report-json/node_modules/.bin/ts-node",
      "/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts"
    ],
    "cwd": "/home/df/wd/personal/caught-object-report-json",
    "execPath": "/home/df/.volta/tools/image/node/20.1.0/bin/node",
    "gid": 1000,
    "memoryUsage": {
      "arrayBuffers": 3595822,
      "external": 5796716,
      "heapTotal": 100966400,
      "heapUsed": 69475360,
      "rss": 146800640
    },
    "pid": 88513,
    "uid": 1000,
    "version": "v20.1.0"
  },
  "stack": "AggregateError\n    at Object.<anonymous> (/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts:30:7)\n    at Module._compile (node:internal/modules/cjs/loader:1267:14)\n    at Module.m._compile (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1618:23)\n    at Module._extensions..js (node:internal/modules/cjs/loader:1321:10)\n    at Object.require.extensions.<computed> [as .ts] (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts:1621:12)\n    at Module.load (node:internal/modules/cjs/loader:1125:32)\n    at Function.Module._load (node:internal/modules/cjs/loader:965:12)\n    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:83:12)\n    at phase4 (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:649:14)\n    at bootstrap (/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts:95:10)",
  "trace": [
    {
      "column": 7,
      "file": "/home/df/wd/personal/caught-object-report-json/examples/example-9-winston-integration.ts",
      "function": null,
      "line": 30,
      "method": null,
      "native": false
    },
    {
      "column": 14,
      "file": "node:internal/modules/cjs/loader",
      "function": "Module._compile",
      "line": 1267,
      "method": "_compile",
      "native": false
    },
    {
      "column": 23,
      "file": "/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts",
      "function": "Module.m._compile",
      "line": 1618,
      "method": "_compile",
      "native": false
    },
    {
      "column": 10,
      "file": "node:internal/modules/cjs/loader",
      "function": "Module._extensions..js",
      "line": 1321,
      "method": ".js",
      "native": false
    },
    {
      "column": 12,
      "file": "/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/index.ts",
      "function": "Object.require.extensions.<computed> [as .ts]",
      "line": 1621,
      "method": "ts]",
      "native": false
    },
    {
      "column": 32,
      "file": "node:internal/modules/cjs/loader",
      "function": "Module.load",
      "line": 1125,
      "method": "load",
      "native": false
    },
    {
      "column": 12,
      "file": "node:internal/modules/cjs/loader",
      "function": "Module._load",
      "line": 965,
      "method": "_load",
      "native": false
    },
    {
      "column": 12,
      "file": "node:internal/modules/run_main",
      "function": "Function.executeUserEntryPoint [as runMain]",
      "line": 83,
      "method": "executeUserEntryPoint [as runMain]",
      "native": false
    },
    {
      "column": 14,
      "file": "/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts",
      "function": "phase4",
      "line": 649,
      "method": null,
      "native": false
    },
    {
      "column": 10,
      "file": "/home/df/wd/personal/caught-object-report-json/node_modules/ts-node/src/bin.ts",
      "function": "bootstrap",
      "line": 95,
      "method": null,
      "native": false
    }
  ]
}
```

# [API](https://dany-fedorov.github.io/caught-object-report-json/modules.html)

#### [makeCaughtObjectReportJson(caught)](https://dany-fedorov.github.io/caught-object-report-json/functions/makeCaughtObjectReportJson.html)

A wrapper for `CorjMaker#makeReportObject` with default options.

#### [makeCaughtObjectReportJsonArray(caught)](https://dany-fedorov.github.io/caught-object-report-json/functions/makeCaughtObjectReportJson.html)

A wrapper for `CorjMaker#makeCaughtObjectReportJsonArray` with default options.

#### [new CorjMaker(options)](https://dany-fedorov.github.io/caught-object-report-json/classes/CorjMaker.html)

Use `CorjMaker.withDefaults` static method to construct a `CorjMaker` with default options.<br>
Use `CorjMaker#makeReportObject` instance method to produce `CaughtObjectReportJson`.<br>
Use `CorjMaker#makeReportArray` instance method to produce `CaughtObjectReportJsonChild[]`.

#### [type CaughtObjectReportJson](https://dany-fedorov.github.io/caught-object-report-json/types/CaughtObjectReportJson.html)

Report object produced by `CorjMaker#makeReportObject`.

#### [type CaughtObjectReportJsonChild](https://dany-fedorov.github.io/caught-object-report-json/types/CaughtObjectReportJsonChild.html)

Report object produced in array by `CorjMaker#makeReportArray`, or in top-level `children` property
on `CaughtObjectReportJson`.

# Links

##### GitHub

https://github.com/dany-fedorov/caught-object-report-json.git

##### Npm

https://www.npmjs.com/package/caught-object-report-json

##### Deno Land

https://deno.land/x/caught_object_report_json

##### CORJ JSON Schema - corj/v0.8

-

Definitions - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.8/definitions.json

- Report
  Object - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.8/report-object.json
- Report
  Array - https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.8/report-array.json
