import { CorjBuilder, DEFAULT_CORJ_BUILDER_OPTIONS } from '../src';

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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_constructor_name": "String",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": "I am a string, but I was thrown nevertheless!",
          },
          "caught_obj_stringified": Object {
            "format": "String",
            "value": "I am a string, but I was thrown nevertheless!",
          },
          "caught_obj_typeof": "string",
          "is_error_instance": false,
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
          Object {
            "caught": [Error: Could not convert caught object to json string.],
            "options": Object {
              "caughtDuring": "caught-object-json-stringify",
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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": null,
          },
          "caught_obj_stringified": Object {
            "format": "String",
            "value": "null",
          },
          "caught_obj_typeof": "object",
          "is_error_instance": false,
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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_constructor_name": "BigInt",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": 123,
          },
          "caught_obj_stringified": Object {
            "format": "String",
            "value": "123",
          },
          "caught_obj_typeof": "bigint",
          "is_error_instance": false,
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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_constructor_name": "Array",
          "caught_obj_json": Object {
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
          "caught_obj_stringified": Object {
            "format": "String",
            "value": "1234,string,1234,[object Object]",
          },
          "caught_obj_typeof": "object",
          "is_error_instance": false,
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
        shortSchema: false,
      });
      const caught = new Error('I am an error!');
      const report = longVersionBuilder.build(caught);
      expect(typeof report.error_stack).toBe('string');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.1.json",
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
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when converting caught object to json",
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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_constructor_name": "Object",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "caught_obj_stringified": Object {
            "format": null,
            "value": null,
          },
          "caught_obj_typeof": "object",
          "is_error_instance": false,
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when converting caught object to json",
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
      expect(typeof report.error_stack).toBe('undefined');
      delete report.error_stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "v0.1",
          "caught_obj_constructor_name": "Object",
          "caught_obj_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "caught_obj_stringified": Object {
            "format": null,
            "value": null,
          },
          "caught_obj_typeof": "object",
          "is_error_instance": false,
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when converting caught object to json",
            [TypeError: Cannot convert object to primitive value],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });
  });
});
