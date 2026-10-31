import * as Corj from '../src';

class Hostile {
  get message(): string {
    throw new Error('message getter threw');
  }
}

try {
  throw new Hostile();
} catch (caught: unknown) {
  const report = Corj.makeCaughtObjectReport(caught, {
    onReportingError: (error, record) => {
      console.log('onReportingError::', { error: String(error), record });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
