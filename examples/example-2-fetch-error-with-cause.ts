import { Corj } from '../src';

// Node's fetch wraps the network failure in `cause`. Nothing is listening on
// port 65530, so this fails locally and deterministically.
(async () => {
  try {
    await fetch('http://127.0.0.1:65530/users/23');
  } catch (caught: unknown) {
    const report = Corj.makeReport(caught);
    console.log(JSON.stringify(report, null, 2));
  }
})();
