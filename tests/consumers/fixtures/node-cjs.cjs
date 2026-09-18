// Node, CommonJS: the package is `require`d exactly as `main` declares it.
const corj = require('caught-object-report-json');

import('./scenarios.mjs').then(({ runScenarios }) => {
  const outcome = runScenarios(corj);
  console.log(JSON.stringify(outcome));
  if (!outcome.ok) process.exitCode = 1;
});
