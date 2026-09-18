// Bun, ESM: the same import shape a Bun application would write.
import corj from 'caught-object-report-json';
import { makeCorj } from 'caught-object-report-json';
import { runScenarios } from './scenarios.mjs';

if (typeof makeCorj !== 'function') {
  throw new Error('named exports are not available to Bun');
}

const outcome = runScenarios(corj);
console.log(JSON.stringify(outcome));
if (!outcome.ok) process.exitCode = 1;
