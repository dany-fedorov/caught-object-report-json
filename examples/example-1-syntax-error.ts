import { makeCaughtObjectReportJson } from '../src';

try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  JSON.parse(undefined);
} catch (caught: unknown) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  caught.heh = 123n;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  caught.heh_1 = new Number(123);
  const report = makeCaughtObjectReportJson(caught);
  console.log(JSON.stringify(report, null, 2));
}

try {
  // ...
} catch (err: unknown) {
  if (canHandle(err)) {
    handle(err);
  } else {
    Logger.error(
      JSON.stringify({
        message: 'Unhandled exception',
        data: makeCaughtObjectReportJson(err),
      }),
    );
  }
}
