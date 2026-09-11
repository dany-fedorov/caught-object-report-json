/** Version of reports that omit expected values (the default). */
export const CORJ_VERSION = 'corj/v0.12';
/** Version of complete reports, produced with `omitExpectedValues: false` or by `restoreExpectedValues`. */
export const CORJ_VERSION_FULL = 'corj/v0.12-full';

const SCHEMA_BASE =
  'https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions';

export const CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK = `${SCHEMA_BASE}/${CORJ_VERSION}/report-object.json`;
export const CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK = `${SCHEMA_BASE}/${CORJ_VERSION}/report-array.json`;
export const CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK = `${SCHEMA_BASE}/${CORJ_VERSION_FULL}/report-object.json`;
export const CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK = `${SCHEMA_BASE}/${CORJ_VERSION_FULL}/report-array.json`;

export type CorjVersion = typeof CORJ_VERSION | typeof CORJ_VERSION_FULL;
export type CorjSchemaLink =
  | typeof CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK
  | typeof CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK
  | typeof CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK
  | typeof CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK;
