import { makeCaughtObjectReportJson } from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
    expect(typeof report.stack_prop).toBe('string');
    delete report.stack_prop;
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
        "message_prop": "I am an error!",
        "typeof": "object",
        "v": "corj/v0.1",
      }
    `);
  });

  test('oncaughtBuildingArray', () => {
    const caughtBuildingArray: unknown[] = [];
    const report = makeCaughtObjectReportJson(undefined, {
      onCaughtBuilding: (caught) => {
        caughtBuildingArray.push(caught);
      },
    });
    expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
    expect(typeof report.stack_prop).toBe('undefined');
    delete report.stack_prop;
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
        "v": "corj/v0.1",
      }
    `);
    expect(caughtBuildingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string.],
      ]
    `);
  });
});
