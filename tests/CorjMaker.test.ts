import { CORJ_MAKER_DEFAULT_OPTIONS_1, CorjMaker } from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('CorjMaker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": "I am a string, but I was thrown nevertheless!",
          "as_string": "I am a string, but I was thrown nevertheless!",
          "constructor_name": "String",
          "instanceof_error": false,
          "typeof": "string",
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": null,
          "as_string": "null",
          "instanceof_error": false,
          "typeof": "object",
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": 123,
          "as_string": "123",
          "constructor_name": "BigInt",
          "instanceof_error": false,
          "typeof": "bigint",
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": Array [
            1234,
            "string",
            1234,
            Object {
              "a": "b",
            },
          ],
          "as_string": "1234,string,1234,[object Object]",
          "constructor_name": "Array",
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Options', function () {
    test('addJsonSchemaLink: true', () => {
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
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/v0.4.json",
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
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
    test('addMetadata: false', () => {
      const caughtBuildingArray: unknown[] = [];
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
        addMetadata: false,
      });
      const caught = new Error('I am an error!');
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_string": "Error: I am an error!",
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "I am an error!",
          "typeof": "object",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Default onCaughtMaking', function () {
    test('undefined', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
      const caught = undefined;
      const report = corj.make(caught);
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
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": Object {},
          "as_string": null,
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": Object {},
          "as_string": null,
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": "Object",
          "instanceof_error": false,
          "message": null,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json: Caught when building key \\"message\\" for report json.",
            [Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it],
          ],
          Array [
            "caught-object-report-json: Caught when building key \\"as_json\\" for report json.",
            [Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it],
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.stack throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
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
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": null,
          "as_string": "[object Object]",
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
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

  test('CorjMaker#entries', function () {
    const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS_1);
    const entries = corj.entries(new Error(`Hey, I'm an error`));
    expect(entries?.[6]?.[0]).toBe('stack');
    expect(typeof entries?.[6]?.[1]).toBe('string');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete entries[6][1];
    expect(entries).toMatchInlineSnapshot(`
      Array [
        Array [
          "instanceof_error",
          true,
        ],
        Array [
          "typeof",
          "object",
        ],
        Array [
          "constructor_name",
          "Error",
        ],
        Array [
          "message",
          "Hey, I'm an error",
        ],
        Array [
          "as_string",
          "Error: Hey, I'm an error",
        ],
        Array [
          "as_json",
          Object {},
        ],
        Array [
          "stack",
          ,
        ],
        Array [
          "_m",
          Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
        ],
      ]
    `);
  });

  describe('Paranoid about user input', function () {
    test('accessing options throws', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => null);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const badField = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        get addJsonSchemaLink() {
          throw new Error('oh wow');
        },
      };
      const opts = { ...CORJ_MAKER_DEFAULT_OPTIONS_1 };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete opts['addJsonSchemaLink'];
      Object.setPrototypeOf(opts, badField);
      const corj = new CorjMaker(opts);
      const caught = new Error(`I'm just a regular Error`);
      const report = corj.make(caught);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "_m": Array [
            "v0.4",
            "String",
            "safe-stable-stringify@2.4.1",
          ],
          "as_json": Object {},
          "as_string": "Error: I'm just a regular Error",
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "I'm just a regular Error",
          "typeof": "object",
        }
      `);
      expect(consoleErrorSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json:",
            "Caught somewhere along the way of producing report.",
            "Resulting report JSON is not going to be complete, but will include all fields produced before error.",
            "Caught:",
            [Error: oh wow],
          ],
        ]
      `);
    });

    test('onCaughtMaking throws', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => null);
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS_1,
        onCaughtMaking() {
          throw new Error('I was supposed to handle errors not throw them ...');
        },
      });
      const caught = undefined;
      const report = corj.make(caught);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_string": "undefined",
          "instanceof_error": false,
          "typeof": "undefined",
        }
      `);
      expect(consoleErrorSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "caught-object-report-json:",
            "Caught somewhere along the way of producing report.",
            "Resulting report JSON is not going to be complete, but will include all fields produced before error.",
            "Caught:",
            [Error: I was supposed to handle errors not throw them ...],
          ],
        ]
      `);
    });
  });
});
