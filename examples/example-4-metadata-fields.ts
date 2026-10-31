import * as Corj from '../src';

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = Corj.makeCaughtObjectReport(caught, {
    metadata: { $schema: true, v: false },
  });
  console.log(JSON.stringify(report, null, 2));
}
