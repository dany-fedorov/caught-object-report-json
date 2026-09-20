// Node, ESM: the CommonJS package is consumed through Node's interop.
import corj from 'caught-object-report-json';
import { Corj, CorjMaker } from 'caught-object-report-json';
import { runScenarios } from './scenarios.mjs';

if (typeof Corj?.makeReport !== 'function' || typeof CorjMaker !== 'function') {
  throw new Error('named exports are not available through the ESM interop');
}

const outcome = runScenarios(corj);
console.log(JSON.stringify(outcome));
if (!outcome.ok) process.exitCode = 1;
