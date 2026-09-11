import { makeCorj } from '../src';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const caught = new AggregateError(
  [
    new Error('AggregateError child 0'),
    'AggregateError child 1 (not an Error object)',
  ],
  'AggregateError message',
  { cause: new Error('Cause Error object') },
);
const report = makeCorj(caught, { metadata: false });
console.log(JSON.stringify(report, null, 2));
