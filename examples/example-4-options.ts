import { makeCaughtObjectReportJson } from '../src';

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    addMetadata: false,
    addJsonSchemaLink: true,
  });
  console.log(report);
}
