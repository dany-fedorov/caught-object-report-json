import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import fs from 'node:fs';
import path from 'node:path';

const ajv = new Ajv();

ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(__dirname, '../../schema-versions/corj/v0.6.json'),
      ),
    ),
  ),
  'report',
);

export function getReportValidator<T = unknown>(): ValidateFunction<T> {
  const validate = ajv.getSchema<T>('report');
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}
