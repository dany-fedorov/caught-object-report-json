import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import fs from 'node:fs';
import path from 'node:path';

const ajv = new Ajv();

const V = 'v0.9';

ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(
          __dirname,
          `../../schema-versions/corj/${V}/definitions.json`,
        ),
      ),
    ),
  ),
  'definitions',
);
ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(
          __dirname,
          `../../schema-versions/corj/${V}/report-array.json`,
        ),
      ),
    ),
  ),
  'report-array',
);
ajv.addSchema(
  JSON.parse(
    String(
      fs.readFileSync(
        path.join(
          __dirname,
          `../../schema-versions/corj/${V}/report-object.json`,
        ),
      ),
    ),
  ),
  'report-object',
);

export function getReportObjectReportValidator<
  T = unknown,
>(): ValidateFunction<T> {
  const validate = ajv.getSchema<T>('report-object');
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}

export function getReportArrayReportValidator<
  T = unknown,
>(): ValidateFunction<T> {
  const validate = ajv.getSchema<T>('report-array');
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}
