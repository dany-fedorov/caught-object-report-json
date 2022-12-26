import { makeCaughtObjectReportJson } from '../src';

try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  JSON.parse(undefined);
} catch (caught: unknown) {
  console.log(JSON.stringify(makeCaughtObjectReportJson(caught), null, 2));
}
