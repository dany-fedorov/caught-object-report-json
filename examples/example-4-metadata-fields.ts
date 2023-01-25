import { makeCaughtObjectReportJson } from '../src';

try {
  throw new Error(`Hi, I'm a regular Error object.`);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    metadataFields: {
      $schema: true,
      as_json_format: false,
      as_string_format: false,
      children_sources: false,
      v: false
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
