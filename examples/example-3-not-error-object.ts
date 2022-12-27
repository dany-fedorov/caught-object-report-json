import { CorjBuilder } from '../src';

const corj = new CorjBuilder({
  addJsonSchemaLink: true,
  onCaughtBuilding: (caught, { caughtDuring }) => {
    console.log('onCaughtBuilding::', { caughtDuring });
    console.log('onCaughtBuilding::', { caught });
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.build(caught);
  console.log(JSON.stringify(report, null, 2));
}
