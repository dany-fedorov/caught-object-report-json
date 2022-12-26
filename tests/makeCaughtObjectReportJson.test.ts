import { makeCaughtObjectReportJson } from '../src';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(typeof report.error_stack).toBe('string');
    delete report.error_stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "$schema": "v0.1",
        "caught_obj_constructor_name": "Error",
        "caught_obj_json": Object {
          "format": "safe-stable-stringify@2.4.1",
          "value": Object {},
        },
        "caught_obj_stringified": Object {
          "format": "String",
          "value": "Error: I am an error!",
        },
        "caught_obj_typeof": "object",
        "error_message": "I am an error!",
        "is_error_instance": true,
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
    expect(typeof report.error_stack).toBe('undefined');
    delete report.error_stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "$schema": "v0.1",
        "caught_obj_json": Object {
          "format": null,
          "value": null,
        },
        "caught_obj_stringified": Object {
          "format": "String",
          "value": "undefined",
        },
        "caught_obj_typeof": "undefined",
        "is_error_instance": false,
      }
    `);
    expect(caughtBuildingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string.],
      ]
    `);
  });
});
