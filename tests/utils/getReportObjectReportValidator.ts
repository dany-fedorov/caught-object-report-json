import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import fs from 'node:fs';
import path from 'node:path';

const ajv = new Ajv();

ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(__dirname, '../../schema-versions/corj/v0.7-definitions.json'),
      ),
    ),
  ),
  'defs',
);
ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(__dirname, '../../schema-versions/corj/v0.7-array.json'),
      ),
    ),
  ),
  'array',
);
ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(__dirname, '../../schema-versions/corj/v0.7-report-object.json'),
      ),
    ),
  ),
  'object',
);

export function getReportObjectReportValidator<T = unknown>(): ValidateFunction<T> {
  const validate = ajv.getSchema<T>('object');
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}
