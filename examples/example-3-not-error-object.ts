import { makeCorj } from '../src';

class Hostile {
  get message(): string {
    throw new Error('message getter threw');
  }
}

try {
  throw new Hostile();
} catch (caught: unknown) {
  const report = makeCorj(caught, {
    onError: (error, context) => {
      console.log('onError::', { error: String(error), context });
    },
  });
  console.log(JSON.stringify(report, null, 2));
}
