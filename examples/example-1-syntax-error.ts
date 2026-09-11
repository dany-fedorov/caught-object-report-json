import { makeCorj } from '../src';

try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  JSON.parse(undefined);
} catch (caught: unknown) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  caught.heh = 123n;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  caught.heh_1 = new Number(123);
  const report = makeCorj(caught);
  console.log(JSON.stringify(report, null, 2));
}
