import { makeCaughtObjectReportJson } from '../src';

try {
  throw undefined;
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    onCaughtMaking: (caught, context) => {
      console.log('onCaughtMaking::', { context });
      console.log('onCaughtMaking::', { caught });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
