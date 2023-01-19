import { CorjMaker } from '../src';

const corj = new CorjMaker({
  addJsonSchemaLink: true,
  addMetadata: false,
  onCaughtMaking: (caught, { caughtDuring }) => {
    console.log('onCaughtMaking::', { caughtDuring });
    console.log('onCaughtMaking::', { caught });
  },
});

try {
  throw undefined;
} catch (caught: unknown) {
  const report = corj.make(caught);
  console.log(report);
}
