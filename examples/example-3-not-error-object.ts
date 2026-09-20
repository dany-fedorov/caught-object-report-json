import { makeReport } from '../src';

class Hostile {
  get message(): string {
    throw new Error('message getter threw');
  }
}

try {
  throw new Hostile();
} catch (caught: unknown) {
  const report = makeReport(caught, {
    onReportingError: (error, context) => {
      console.log('onReportingError::', { error: String(error), context });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
