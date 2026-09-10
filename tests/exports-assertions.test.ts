import {
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
  CORJ_EXPECTED_VALUES,
  CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT,
  CORJ_AS_STRING_FORMAT_STRING_COERCION,
  bakeCorj,
  makeCaughtObjectReportJson,
  CORJ_MAKER_DEFAULT_OPTIONS,
} from '../src';

describe('Assertions about package exports', function () {
  test('constants', () => {
    expect({
      CORJ_JSON_SCHEMA_LINK: CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
      CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
      CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
      CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
      CORJ_VERSION,
      CORJ_VERSION_FULL,
      CORJ_EXPECTED_VALUES,
      CORJ_SAFE_STABLE_STRINGIFY_VERSION:
        CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_WITH_LENGTH_LIMIT,
      CORJ_STRINGIFY_VERSION: CORJ_AS_STRING_FORMAT_STRING_COERCION,
    }).toMatchInlineSnapshot(`
      Object {
        "CORJ_EXPECTED_VALUES": Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify-with-length-limit",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "instanceof_error": true,
          "typeof": "object",
        },
        "CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.11-full/report-array.json",
        "CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.11-full/report-object.json",
        "CORJ_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.11/report-object.json",
        "CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.11/report-array.json",
        "CORJ_SAFE_STABLE_STRINGIFY_VERSION": "safe-stable-stringify-with-length-limit",
        "CORJ_STRINGIFY_VERSION": "String",
        "CORJ_VERSION": "corj/v0.11",
        "CORJ_VERSION_FULL": "corj/v0.11-full",
      }
    `);
  });

  test('bakeCorj is alias of makeCaughtObjectReportJson', () => {
    expect(bakeCorj).toBe(makeCaughtObjectReportJson);
  });

  test('DEFAULT_CORJ_MAKER_OPTIONS', () => {
    expect(CORJ_MAKER_DEFAULT_OPTIONS).toMatchInlineSnapshot(`
      Object {
        "asJsonFormatsToApply": Array [
          ".toCorjAsJson",
          "safe-stable-stringify-with-length-limit",
        ],
        "asStringFormatsToApply": Array [
          ".toCorjAsString",
          "String",
        ],
        "childrenMetadataFields": Object {
          "$schema": false,
          "as_json_format": false,
          "as_string_format": false,
          "children_sources": false,
          "v": false,
        },
        "childrenSources": Array [
          "cause",
          "errors",
        ],
        "makeReportId": [Function],
        "maxChildrenLevel": 5,
        "maxReportSize": 100000,
        "metadataFields": Object {
          "$schema": false,
          "as_json_format": true,
          "as_string_format": true,
          "children_sources": true,
          "v": true,
        },
        "omitExpectedValues": true,
        "onCaughtMaking": [Function],
        "parseStackToArray": true,
        "printWarningsOnUnhandledErrors": true,
        "reportSizeUnit": "utf8-bytes",
      }
    `);
  });
});
