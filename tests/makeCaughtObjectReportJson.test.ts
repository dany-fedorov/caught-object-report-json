import { makeCaughtObjectReportJson } from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(getReportValidator()(report)).toMatchInlineSnapshot(`false`);
    expect(typeof report.stack).toBe('string');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": Object {
          "format": "safe-stable-stringify@2.4.1",
          "value": Object {},
        },
        "as_string": Object {
          "format": "String",
          "value": "Error: I am an error!",
        },
        "constructor_name": "Error",
        "is_error_instance": true,
        "message": "I am an error!",
        "typeof": "object",
        "v": "corj/v0.2",
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
    expect(getReportValidator()(report)).toMatchInlineSnapshot(`false`);
    expect(typeof report.stack).toBe('undefined');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": Object {
          "format": null,
          "value": null,
        },
        "as_string": Object {
          "format": "String",
          "value": "undefined",
        },
        "is_error_instance": false,
        "typeof": "undefined",
        "v": "corj/v0.2",
      }
    `);
    expect(caughtBuildingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
      ]
    `);
  });
});
