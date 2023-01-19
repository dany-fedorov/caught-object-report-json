import { makeCaughtObjectReportJson } from '../src';

try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  JSON.parse(undefined);
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught);
  console.log(JSON.stringify(report, null, 2));
}
