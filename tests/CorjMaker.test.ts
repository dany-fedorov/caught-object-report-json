import { CORJ_MAKER_DEFAULT_OPTIONS_1, CorjMaker } from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('CorjMaker', () => {
  describe('Default options', function () {
    test('Error object', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = new Error('I am an error!');
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
          "instanceof_error": true,
          "message": "I am an error!",
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('String', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = 'I am a string, but I was thrown nevertheless!';
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "string",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('undefined', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = undefined;
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
          "instanceof_error": false,
          "typeof": "undefined",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`
        Array [
          Object {
            "caught": [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
            "options": Object {
              "caughtDuring": Object {
                "key": "as_json",
              },
            },
          },
        ]
      `);
    });

    test('null', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = null;
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('BigInt', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = BigInt(123);
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "bigint",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('array', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
      });
      const caught = [1234, 'string', BigInt(1234), { a: 'b' }];
      const report = noOptionsBuilder.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Long version', function () {
    test('Error object', () => {
      const caughtBuildingArray: unknown[] = [];
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
        addJsonSchemaLink: true,
      });
      const caught = new Error('I am an error!');
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.4.json",
          "as_json": Object {
            "format": "safe-stable-stringify@2.4.1",
            "value": Object {},
          },
          "as_string": Object {
            "format": "String",
            "value": "Error: I am an error!",
          },
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "I am an error!",
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Default onCaughtDuring', function () {
    test('undefined', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = undefined;
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
          "instanceof_error": false,
          "typeof": "undefined",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        toString: () => {
          throw new Error('I am a nasty error!');
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"as_string\\" for report json.",
            [Error: I am a nasty error!],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString returns not string and it causes applying String() to throw', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        toString: () => {
          return {
            message: 'Person who wrote this method is simply a piece of shit',
          };
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
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
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"as_string\\" for report json.",
            [TypeError: Cannot convert object to primitive value],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.constructor throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        get constructor() {
          throw new Error(
            `(in .constructor) Yes, I'm a piece of shit for throwing here and I know it`,
          );
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
            "value": "[object Object]",
          },
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"constructor_name\\" for report json.",
            [Error: (in .constructor) Yes, I'm a piece of shit for throwing here and I know it],
          ],
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: (in .constructor) Yes, I'm a piece of shit for throwing here and I know it],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.constructor.name throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        constructor: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          get name() {
            throw new Error(
              `(in .constructor.name) Yes, I'm a piece of shit for throwing here and I know it`,
            );
          },
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
            "value": "[object Object]",
          },
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"constructor_name\\" for report json.",
            [Error: (in .constructor.name) Yes, I'm a piece of shit for throwing here and I know it],
          ],
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: (in .constructor.name) Yes, I'm a piece of shit for throwing here and I know it],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.message throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        get message() {
          throw new Error(
            `(in .message) Yes, I'm a piece of shit for throwing here and I know it`,
          );
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
            "value": "[object Object]",
          },
          "constructor_name": "Object",
          "instanceof_error": false,
          "message": null,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it],
          ],
          Array [
            "caught-object-report-json: Caught when building key \\"message\\" for report json.",
            [Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.stack throws', () => {
      const warnSpy = jest.spyOn(console, 'warn');
      warnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        get stack() {
          throw new Error(
            `(in .stack) Yes, I'm a piece of shit for throwing here and I know it`,
          );
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(report.stack).toBe(null);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {
            "format": null,
            "value": null,
          },
          "as_string": Object {
            "format": "String",
            "value": "[object Object]",
          },
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.4",
        }
      `);
      expect(warnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: (in .stack) Yes, I'm a piece of shit for throwing here and I know it],
          ],
          Array [
            "caught-object-report-json: Caught when building key \\"stack\\" for report json.",
            [Error: (in .stack) Yes, I'm a piece of shit for throwing here and I know it],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });
  });
});
