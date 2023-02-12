import { z as zod } from 'zod';
import { CorjMaker } from '../src';

const corj = CorjMaker.withDefaults({
  metadataFields: false,
});

const User = zod.object({
  name: zod.string(),
  age: zod.number().min(-250).max(250),
});

try {
  const validatedStallmanObject = User.parse({ name: 'Richard Stallman' });
  console.log('Hello, validated', validatedStallmanObject.name);
} catch (caught: unknown) {
  const reportArray = corj.makeReportArray(caught);
  console.log(JSON.stringify(reportArray, null, 2));
}
