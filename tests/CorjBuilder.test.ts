import { CorjBuilder } from '../src';
import { getReportValidator } from './utils/getReportValidator';
import { DEFAULT_CORJ_BUILDER_OPTIONS } from '../src/makeCaughtObjectReportJson';

describe('CorjBuilder', () => {
  describe('Default options', function () {
    test('Error object', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = new Error('I am an error!');
      const report = noOptionsBuilder.build(caught);
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
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('String', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = 'I am a string, but I was thrown nevertheless!';
      const report = noOptionsBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": "I am a string, but I was thrown nevertheless!",
          },
          "as_string": Object {
            "format": "String",
            "value": "I am a string, but I was thrown nevertheless!",
          },
          "constructor_name": "String",
          "is_error_instance": false,
          "typeof": "string",
          "v": "corj/v0.1",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('undefined', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = undefined;
      const report = noOptionsBuilder.build(caught);
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
          Object {
            "caught": [Error: Could not convert caught object to json string.],
            "options": Object {
              "caughtDuring": "caught-producing-as_json",
            },
          },
        ]
      `);
    });

    test('null', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = null;
      const report = noOptionsBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": null,
          },
          "as_string": Object {
            "format": "String",
            "value": "null",
          },
          "is_error_instance": false,
          "typeof": "object",
          "v": "corj/v0.1",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('BigInt', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = 123n;
      const report = noOptionsBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": 123,
          },
          "as_string": Object {
            "format": "String",
            "value": "123",
          },
          "constructor_name": "BigInt",
          "is_error_instance": false,
          "typeof": "bigint",
          "v": "corj/v0.1",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('array', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = [1234, 'string', 1234n, { a: 'b' }];
      const report = noOptionsBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Array [
              1234,
              "string",
              1234,
              Object {
                "a": "b",
              },
            ],
          },
          "as_string": Object {
            "format": "String",
            "value": "1234,string,1234,[object Object]",
          },
          "constructor_name": "Array",
          "is_error_instance": false,
          "typeof": "object",
          "v": "corj/v0.1",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Long version', function () {
    test('Error object', () => {
      const caughtBuildingArray: unknown[] = [];
      const longVersionBuilder = new CorjBuilder({
        ...DEFAULT_CORJ_BUILDER_OPTIONS,
        onCaughtBuilding: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
        addJsonSchemaLink: true,
      });
      const caught = new Error('I am an error!');
      const report = longVersionBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('string');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json",
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
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Default onCaughtBuilding', function () {
    test('undefined', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const longVersionBuilder = new CorjBuilder(DEFAULT_CORJ_BUILDER_OPTIONS);
      const caught = undefined;
      const report = longVersionBuilder.build(caught);
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
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: caught-producing-as_json: Caught when building report json.",
            [Error: Could not convert caught object to json string.],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const longVersionBuilder = new CorjBuilder(DEFAULT_CORJ_BUILDER_OPTIONS);
      const caught = {
        toString: () => {
          throw new Error('I am a nasty error!');
        },
      };
      const report = longVersionBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "as_string": Object {
            "format": null,
            "value": null,
          },
          "constructor_name": "Object",
          "is_error_instance": false,
          "typeof": "object",
          "v": "corj/v0.1",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: caught-producing-as_string: Caught when building report json.",
            [Error: I am a nasty error!],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString returns not string', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const longVersionBuilder = new CorjBuilder(DEFAULT_CORJ_BUILDER_OPTIONS);
      const caught = {
        toString: () => {
          return {
            message: 'Person who wrote this method is simply a piece of shit',
          };
        },
      };
      const report = longVersionBuilder.build(caught);
      expect(getReportValidator()(report)).toMatchInlineSnapshot(`true`);
      expect(typeof report.stack_prop).toBe('undefined');
      delete report.stack_prop;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "as_string": Object {
            "format": null,
            "value": null,
          },
          "constructor_name": "Object",
          "is_error_instance": false,
          "typeof": "object",
          "v": "corj/v0.1",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: caught-producing-as_string: Caught when building report json.",
            [TypeError: Cannot convert object to primitive value],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });
  });
});
