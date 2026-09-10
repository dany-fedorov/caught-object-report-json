import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import fs from 'node:fs';
import path from 'node:path';

const ajv = new Ajv();

const VERSIONS = { compact: 'v0.11', full: 'v0.11-full' } as const;
export type SchemaKind = keyof typeof VERSIONS;

for (const [kind, version] of Object.entries(VERSIONS)) {
  for (const name of ['definitions', 'report-array', 'report-object']) {
    ajv.addSchema(
      JSON.parse(
        String(
          fs.readFileSync(
            path.join(
              __dirname,
              `../../schema-versions/corj/${version}/${name}.json`,
            ),
          ),
        ),
      ),
      `${kind}/${name}`,
    );
  }
}

export function getReportObjectReportValidator<T = unknown>(
  kind: SchemaKind = 'compact',
): ValidateFunction<T> {
  const validate = ajv.getSchema<T>(`${kind}/report-object`);
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}

export function getReportArrayReportValidator<T = unknown>(
  kind: SchemaKind = 'compact',
): ValidateFunction<T> {
  const validate = ajv.getSchema<T>(`${kind}/report-array`);
  if (!validate) {
    throw new Error('Did not find report validator');
  }
  return validate;
}
