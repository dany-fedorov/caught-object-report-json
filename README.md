# Caught Object Report JSON

![Jest coverage](./badges/coverage-jest%20coverage.svg)

Convert object from catch block to json - useful to report exceptions to json logs.

> **Warning**
> Please use fixed version (remove ^ from package.json).

# Examples

## Example 1

(Run with `npm run tsfile ./examples/example-1.ts`)

```typescript
try {
  JSON.parse(undefined);
} catch (caught: unknown) {
  console.log(JSON.stringify(makeCaughtObjectReportJson(caught), null, 2));
}
/**
 *
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
