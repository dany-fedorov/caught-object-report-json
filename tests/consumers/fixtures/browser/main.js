// Built by Vite and executed in Chromium. Nothing here may depend on a Node
// global: the check below fails the run if a polyfill was supplied by accident.
import corj from 'caught-object-report-json';
import { runScenarios } from './scenarios.mjs';

const nodeGlobals = ['process', 'Buffer', 'global', 'require', '__dirname'];
const leaked = nodeGlobals.filter((name) => name in globalThis);

const outcome = leaked.length
  ? {
      ok: false,
      results: [
        {
          name: 'no Node globals',
          ok: false,
          error: `present: ${leaked.join(', ')}`,
        },
      ],
    }
  : runScenarios(corj);

globalThis.__corjResult = outcome;
document.getElementById('output').textContent = JSON.stringify(outcome);
