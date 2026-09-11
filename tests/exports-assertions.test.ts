import * as corj from '../src';
import {
  CORJ_CIRCULAR_MARKER,
  CORJ_DEFAULT_OPTIONS,
  CORJ_EXPECTED_VALUES,
  CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
  CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
  CORJ_TRUNCATED_MARKER,
  CORJ_VERSION,
  CORJ_VERSION_FULL,
} from '../src';
import { TRUNCATED_MARKER } from '../src/safe-stable-stringify';

describe('Assertions about package exports', function () {
  test('constants', () => {
    expect({
      CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK,
      CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK,
      CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK,
      CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK,
      CORJ_VERSION,
      CORJ_VERSION_FULL,
      CORJ_EXPECTED_VALUES,
      CORJ_TRUNCATED_MARKER,
      CORJ_CIRCULAR_MARKER,
    }).toMatchInlineSnapshot(`
      Object {
        "CORJ_CIRCULAR_MARKER": "[circular]",
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
        "CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12-full/report-array.json",
        "CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12-full/report-object.json",
        "CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12/report-array.json",
        "CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.12/report-object.json",
        "CORJ_TRUNCATED_MARKER": "[truncated]",
        "CORJ_VERSION": "corj/v0.12",
        "CORJ_VERSION_FULL": "corj/v0.12-full",
      }
    `);
  });

  test('the exported truncation marker is the one the serializer writes', () => {
    expect(CORJ_TRUNCATED_MARKER).toBe(TRUNCATED_MARKER);
  });

  test('CORJ_DEFAULT_OPTIONS', () => {
    expect(CORJ_DEFAULT_OPTIONS).toMatchInlineSnapshot(`
      Object {
        "childrenSources": Array [
          "cause",
          "errors",
        ],
        "makeReportId": [Function],
        "maxChildren": 100,
        "maxDepth": 5,
        "maxReportSize": 100000,
        "metadata": Object {
          "$schema": false,
          "v": true,
        },
        "omitExpectedValues": true,
        "onError": [Function],
        "reportSizeUnit": "utf8-bytes",
        "stackFormat": "lines",
      }
    `);
    expect(
      CORJ_DEFAULT_OPTIONS.makeReportId({
        index: -1,
        level: 0,
        path: '$',
        caught: 1,
      }),
    ).toBe('root');
    expect(
      CORJ_DEFAULT_OPTIONS.makeReportId({
        index: 7,
        level: 2,
        path: '$.cause',
        caught: 1,
      }),
    ).toBe('7');
  });

  test('the runtime export surface is exactly this', () => {
    expect(Object.keys(corj).sort()).toMatchInlineSnapshot(`
      Array [
        "CORJ_CIRCULAR_MARKER",
        "CORJ_DEFAULT_OPTIONS",
        "CORJ_EXPECTED_VALUES",
        "CORJ_FULL_REPORT_ARRAY_JSON_SCHEMA_LINK",
        "CORJ_FULL_REPORT_OBJECT_JSON_SCHEMA_LINK",
        "CORJ_REPORT_ARRAY_JSON_SCHEMA_LINK",
        "CORJ_REPORT_OBJECT_JSON_SCHEMA_LINK",
        "CORJ_TRUNCATED_MARKER",
        "CORJ_VERSION",
        "CORJ_VERSION_FULL",
        "CorjMaker",
        "makeCorj",
        "makeCorjArray",
        "restoreExpectedValues",
      ]
    `);
  });
});
