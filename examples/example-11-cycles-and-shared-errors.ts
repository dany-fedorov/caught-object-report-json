import { makeCorjArray } from '../src';

// The same error object reachable through two parents, and a cycle back to the root.
const shared = new Error('shared cause');
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const first = new Error('first', { cause: shared });
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const second = new Error('second', { cause: shared });
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const root = new AggregateError([first, second], 'root');
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
shared.cause = root;

const rows = makeCorjArray(root, { metadata: false });
console.log(
  JSON.stringify(
    rows.map(({ stack, ...rest }) => rest),
    null,
    2,
  ),
);
