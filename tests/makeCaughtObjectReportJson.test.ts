import { makeCaughtObjectReportJson } from '../src';
import { getReportObjectReportValidator } from './utils/getReportObjectReportValidator';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(typeof report.stack).toBe('string');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": Object {},
        "as_json_format": "safe-stable-stringify@2.4.1",
        "as_string": "Error: I am an error!",
        "as_string_format": "String",
        "children_sources": Array [
          "cause",
          "errors",
        ],
        "constructor_name": "Error",
        "instanceof_error": true,
        "message": "I am an error!",
        "typeof": "object",
        "v": "corj/v0.7",
      }
    `);
  });

  test('onCaughtMaking', () => {
    const onCaughtMakingArray: unknown[] = [];
    const report = makeCaughtObjectReportJson(undefined, {
      onCaughtMaking: (caught) => {
        onCaughtMakingArray.push(caught);
      },
    });
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(typeof report.stack).toBe('undefined');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": null,
        "as_json_format": "safe-stable-stringify@2.4.1",
        "as_string": "undefined",
        "as_string_format": "String",
        "children_sources": Array [
          "cause",
          "errors",
        ],
        "instanceof_error": false,
        "typeof": "undefined",
        "v": "corj/v0.7",
      }
    `);
    expect(onCaughtMakingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
      ]
    `);
  });
});
