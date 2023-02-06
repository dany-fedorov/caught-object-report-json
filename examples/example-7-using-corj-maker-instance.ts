import { CorjMaker } from '../src';

const corj = CorjMaker.withDefaults({
  metadataFields: false,
});

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = corj.makeReportObject(caught);
  console.log(JSON.stringify(report, null, 2));
}
