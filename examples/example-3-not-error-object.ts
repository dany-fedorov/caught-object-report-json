import { CorjBuilder } from '../src';

const corj = new CorjBuilder({
  shortVersion: false,
  onCaughtBuilding: (caught, { caughtDuring }) => {
    console.log('onCaughtBuilding::', { caughtDuring });
    console.log('onCaughtBuilding::', { caught });
    console.log('---');
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.build(caught);
  console.log(JSON.stringify(report, null, 2));
}
