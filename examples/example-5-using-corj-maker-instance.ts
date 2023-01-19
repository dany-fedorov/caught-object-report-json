import { CorjMaker } from '../src';

const corj = CorjMaker.withDefaults({
  addMetadata: false,
});

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = corj.make(caught);
  console.log(JSON.stringify(report, null, 2));
}
