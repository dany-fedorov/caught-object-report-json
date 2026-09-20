// The published entry points, from the consumer's side: only the package root
// and `./package.json` resolve, and `import` and `require` reach one instance.
import { createRequire } from 'node:module';
import * as namespace from 'caught-object-report-json';
import { Corj, CorjMaker } from 'caught-object-report-json';

const require = createRequire(import.meta.url);
const results = [];

function check(name, fn) {
  try {
    const error = fn();
    results.push(
      error === undefined
        ? { name, ok: true }
        : { name, ok: false, error: String(error) },
    );
  } catch (caught) {
    results.push({ name, ok: false, error: String(caught?.stack ?? caught) });
  }
}

/** A deep import must be refused by Node's resolver, not merely missing. */
function notExported(load) {
  try {
    load();
  } catch (caught) {
    return caught?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
      ? undefined
      : `expected ERR_PACKAGE_PATH_NOT_EXPORTED, got ${caught?.code}: ${caught?.message}`;
  }
  return 'the deep import resolved';
}

check('require of a deep path is not exported', () =>
  notExported(() => require('caught-object-report-json/redaction')),
);

const deepEsm = await import('caught-object-report-json/report-size').then(
  () => 'the deep import resolved',
  (caught) =>
    caught?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED'
      ? undefined
      : `expected ERR_PACKAGE_PATH_NOT_EXPORTED, got ${caught?.code}: ${caught?.message}`,
);
check('ESM import of a deep path is not exported', () => deepEsm);

check('./package.json still resolves', () => {
  const pkg = require('caught-object-report-json/package.json');
  return pkg.name === 'caught-object-report-json'
    ? undefined
    : `unexpected package.json: ${JSON.stringify(pkg.name)}`;
});

check('named ESM imports from the root still work', () =>
  typeof Corj?.makeReport === 'function' && typeof CorjMaker === 'function'
    ? undefined
    : 'the root does not expose its named bindings through the ESM interop',
);

check('Corj is the exact frozen utility namespace', () => {
  const keys = Object.keys(Corj).sort();
  const expected = [
    'makeReport',
    'makeReportArray',
    'resolveRedactPolicy',
    'restoreExpectedValues',
  ];
  return Object.isFrozen(Corj) &&
    JSON.stringify(keys) === JSON.stringify(expected)
    ? undefined
    : `unexpected Corj namespace: frozen=${Object.isFrozen(
        Corj,
      )} keys=${JSON.stringify(keys)}`;
});

check('legacy utility exports are absent from ESM and CommonJS', () => {
  const required = require('caught-object-report-json');
  const legacy = [
    'makeReport',
    'makeReportArray',
    'resolveCorjRedactPolicy',
    'restoreExpectedValues',
  ];
  const present = legacy.filter(
    (name) => name in namespace || name in required,
  );
  return present.length === 0
    ? undefined
    : `legacy root exports remain: ${present.join(', ')}`;
});

check('import and require reach one module instance', () => {
  const required = require('caught-object-report-json');
  return namespace.default === required &&
    namespace.CorjMaker === required.CorjMaker
    ? undefined
    : 'the ESM and CommonJS views are different objects';
});

const outcome = { ok: results.every((r) => r.ok), results };
console.log(JSON.stringify(outcome));
if (!outcome.ok) process.exitCode = 1;
