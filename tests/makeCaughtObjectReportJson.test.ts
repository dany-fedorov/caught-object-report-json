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
        "_m": Array [
          "v0.4",
          "String",
          "safe-stable-stringify@2.4.1",
        ],
        "as_json": Object {},
        "as_string": "Error: I am an error!",
        "constructor_name": "Error",
        "instanceof_error": true,
        "message": "I am an error!",
        "typeof": "object",
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
        "_m": Array [
          "v0.4",
          "String",
          "safe-stable-stringify@2.4.1",
        ],
        "as_json": null,
        "as_string": "undefined",
        "instanceof_error": false,
        "typeof": "undefined",
      }
    `);
    expect(caughtBuildingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
      ]
    `);
  });
});
