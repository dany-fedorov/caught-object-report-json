import * as Corj from '../src';

const maker = new Corj.CorjMaker({ metadata: false });

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = maker.makeReport(caught);
  console.log(JSON.stringify(report, null, 2));
}
