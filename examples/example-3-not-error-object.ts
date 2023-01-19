import { makeCaughtObjectReportJson } from '../src';

try {
  throw undefined;
} catch (caught: unknown) {
  const report = makeCaughtObjectReportJson(caught, {
    onCaughtMaking: (caught, { caughtDuring }) => {
      console.log('onCaughtMaking::', { caughtDuring });
      console.log('onCaughtMaking::', { caught });
    },
  });
  console.log(report);
}
