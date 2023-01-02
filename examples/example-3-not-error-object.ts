import { CorjMaker } from '../src';

const corj = new CorjMaker({
  addJsonSchemaLink: true,
  onCaughtMaking: (caught, { caughtDuring }) => {
    console.log('onCaughtMaking::', { caughtDuring });
    console.log('onCaughtMaking::', { caught });
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.make(caught);
  console.log(JSON.stringify(report, null, 2));
}