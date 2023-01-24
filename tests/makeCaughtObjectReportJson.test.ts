import { makeCaughtObjectReportJson } from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(getReportValidator()(report)).toBe(true);
    expect(typeof report.stack).toBe('string');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": Object {},
        "as_json_format": "safe-stable-stringify@2.4.1",
        "as_string": "Error: I am an error!",
        "as_string_format": "String",
        "constructor_name": "Error",
        "instanceof_error": true,
        "message": "I am an error!",
        "typeof": "object",
        "v": "corj/v0.5",
      }
    `);
  });

  test('oncaughtBuildingArray', () => {
    const caughtBuildingArray: unknown[] = [];
    const report = makeCaughtObjectReportJson(undefined, {
      onCaughtMaking: (caught) => {
        caughtBuildingArray.push(caught);
      },
    });
    expect(getReportValidator()(report)).toBe(true);
    expect(typeof report.stack).toBe('undefined');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": null,
        "as_json_format": "safe-stable-stringify@2.4.1",
        "as_string": "undefined",
        "as_string_format": "String",
        "instanceof_error": false,
        "typeof": "undefined",
        "v": "corj/v0.5",
      }
    `);
    expect(caughtBuildingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
      ]
    `);
  });
});
