import {
  CORJ_JSON_SCHEMA_LINK,
  CORJ_VERSION,
  CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
  CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
  bakeCorj,
  makeCaughtObjectReportJson,
  DEFAULT_CORJ_BUILDER_OPTIONS,
} from '../src';

describe('Assertions about package exports', function () {
  test('constants', () => {
    expect({
      CORJ_JSON_SCHEMA_LINK,
      CORJ_VERSION,
      CORJ_SAFE_STABLE_STRINGIFY_VERSION: CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
      CORJ_STRINGIFY_VERSION: CORJ_AS_STRING_FORMAT_STRING_CONSTRUCTOR,
    }).toMatchInlineSnapshot(`
      Object {
        "CORJ_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json",
        "CORJ_SAFE_STABLE_STRINGIFY_VERSION": "safe-stable-stringify@2.4.1",
        "CORJ_STRINGIFY_VERSION": "String",
        "CORJ_VERSION": "corj/v0.1",
      }
    `);
  });

  test('bakeCorj is alias of makeCaughtObjectReportJson', () => {
    expect(bakeCorj).toBe(makeCaughtObjectReportJson);
  });

  test('DEFAULT_CORJ_BUILDER_OPTIONS', () => {
    expect(DEFAULT_CORJ_BUILDER_OPTIONS).toMatchInlineSnapshot(`
      Object {
        "addJsonSchemaLink": false,
        "onCaughtBuilding": [Function],
      }
    `);
  });
});
