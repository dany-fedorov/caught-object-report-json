import {
  CORJ_MAKER_DEFAULT_OPTIONS,
  CorjMaker,
  makeCaughtObjectReportJson,
} from '../src';
import { getReportValidator } from './utils/getReportValidator';

describe('CorjMaker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Default options', function () {
    test('Error object', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('String', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "as_json": "I am a string, but I was thrown nevertheless!",
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "I am a string, but I was thrown nevertheless!",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "String",
          "instanceof_error": false,
          "typeof": "string",
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('undefined', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`
        Array [
          Object {
            "caught": [Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.],
            "options": Object {
              "caughtObjectNestingInfo": null,
              "caughtWhenProcessingReportKey": "as_json",
              "reason": "error-converting-caught-to-json",
            },
          },
        ]
      `);
    });

    test('null', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "as_json": null,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "null",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('BigInt', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "as_json": 123,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "123",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "BigInt",
          "instanceof_error": false,
          "typeof": "bigint",
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });

    test('array', () => {
      const caughtBuildingArray: unknown[] = [];
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
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
          "as_json": Array [
            1234,
            "string",
            1234,
            Object {
              "a": "b",
            },
          ],
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "1234,string,1234,[object Object]",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Array",
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
  });

  describe('Options', function () {
    test('metadataFields: $schema: true', () => {
      const caughtBuildingArray: unknown[] = [];
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
        metadataFields: {
          ...CORJ_MAKER_DEFAULT_OPTIONS.metadataFields,
          $schema: true,
        },
      });
      const caught = new Error('I am an error!');
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.5.json",
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
          "v": "corj/v0.6",
        }
      `);
      expect(caughtBuildingArray).toMatchInlineSnapshot(`Array []`);
    });
    test('metadataFields: false', () => {
      const caughtBuildingArray: unknown[] = [];
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
        onCaughtMaking: (caught, options) => {
          caughtBuildingArray.push({ caught, options });
        },
        metadataFields: false,
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
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
      const caught = undefined;
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: Could not convert caught object to json string using safe-stable-stringify@2.4.1.
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_json
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": null,
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: I am a nasty error!
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_string
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.toString returns not string and it causes applying String() to throw', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
      const caught = {
        toString: () => {
          return {
            returningObjectAndNotAStringOnPurpose:
              'Person who wrote this method is simply a piece of shit',
          };
        },
      };
      const report = corj.make(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('undefined');
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": null,
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - TypeError: Cannot convert object to primitive value
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_string
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.constructor throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "as_json": null,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "[object Object]",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - prop-access
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .constructor) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Prop Host - caught
        [caught-object-report-json] [Default Error Handler] Prop Name - constructor
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - constructor_name
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .constructor) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_json
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.constructor.name throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "as_json": null,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "[object Object]",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": null,
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - prop-access
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .constructor.name) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Prop Host - caught.constructor
        [caught-object-report-json] [Default Error Handler] Prop Name - name
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - constructor_name
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .constructor.name) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_json
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.message throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "as_json": null,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "[object Object]",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Object",
          "instanceof_error": false,
          "message": null,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - prop-access
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Prop Host - caught
        [caught-object-report-json] [Default Error Handler] Prop Name - message
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - message
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .message) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_json
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });

    test('.stack throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "as_json": null,
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "[object Object]",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Object",
          "instanceof_error": false,
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - prop-access
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .stack) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Prop Host - caught
        [caught-object-report-json] [Default Error Handler] Prop Name - stack
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - stack
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
          Array [
            "[caught-object-report-json] [Default Error Handler] Reason - error-converting-caught-to-json
        [caught-object-report-json] [Default Error Handler] Caught Object - Error: (in .stack) Yes, I'm a piece of shit for throwing here and I know it
        [caught-object-report-json] [Default Error Handler] Caught when processing Report Key - as_json
        [caught-object-report-json] [Default Error Handler] Level - Caught processing toplevel caught object",
          ],
        ]
      `);
      jest.restoreAllMocks();
    });
  });

  test('CorjMaker#entries', function () {
    const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
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
          "children_sources",
          Array [
            "cause",
            "errors",
          ],
        ],
        Array [
          "as_string_format",
          "String",
        ],
        Array [
          "as_json_format",
          "safe-stable-stringify@2.4.1",
        ],
        Array [
          "v",
          "corj/v0.6",
        ],
      ]
    `);
  });

  describe('Paranoid about user input', function () {
    test('accessing options throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const badField = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        get metadataFields() {
          throw new Error('oh wow');
        },
      };
      const opts = { ...CORJ_MAKER_DEFAULT_OPTIONS };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete opts['metadataFields'];
      Object.setPrototypeOf(opts, badField);
      const corj = new CorjMaker(opts);
      const caught = new Error(`I'm just a regular Error`);
      const report = corj.make(caught);
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: I'm just a regular Error",
          "as_string_format": "String",
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "I'm just a regular Error",
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] Accessing one of properties on options object threw an error, falling back to default options",
          ],
        ]
      `);
    });

    test('onCaughtMaking throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
        onCaughtMaking() {
          throw new Error('I was supposed to handle errors not throw them ...');
        },
      });
      const caught = undefined;
      const report = corj.make(caught);
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
          "v": "corj/v0.6",
        }
      `);
      expect(consoleWarnSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "[caught-object-report-json] \`onCaughtMaking\` callback threw!",
          ],
        ]
      `);
    });
  });

  describe('Nested', function () {
    test('Single object', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', { cause: new Error('lvl 1') });
      const report = makeCaughtObjectReportJson(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const childReport of report.children) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(typeof childReport.stack).toBe('string');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete childReport.stack;
      }
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: lvl 0",
          "as_string_format": "String",
          "children": Array [
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1",
              "as_string_format": "String",
              "child_id": 0,
              "child_level": 1,
              "child_path": "$.cause",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
          ],
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "lvl 0",
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
    });

    test('Array object', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', {
        cause: [new Error('lvl 1; obj 0'), new Error('lvl 1; obj 1')],
      });
      const report = makeCaughtObjectReportJson(caught);
      expect(getReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const childReport of report.children) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(typeof childReport.stack).toBe('string');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete childReport.stack;
      }
      expect(report).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: lvl 0",
          "as_string_format": "String",
          "children": Array [
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 0",
              "as_string_format": "String",
              "child_id": 0,
              "child_level": 1,
              "child_path": "$.cause[0]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 1",
              "as_string_format": "String",
              "child_id": 1,
              "child_level": 1,
              "child_path": "$.cause[1]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
          ],
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "lvl 0",
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
    });

    test('Max levels setting', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', {
        cause: [
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          new Error('lvl 1; obj 0', {
            cause: [
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              new Error('lvl 2; obj 0.0', {
                cause: [
                  new Error('lvl 3; obj 0.0.0'),
                  new Error('lvl 3; obj 0.0.1'),
                ],
              }),
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              new Error('lvl 2; obj 0.1', {
                cause: [
                  new Error('lvl 3; obj 0.1.0'),
                  new Error('lvl 3; obj 0.1.1'),
                ],
              }),
            ],
          }),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          new Error('lvl 1; obj 1', {
            cause: [new Error('lvl 2; obj 1.0'), new Error('lvl 2; obj 1.1')],
          }),
        ],
      });
      const reportCheck = makeCaughtObjectReportJson(caught);
      expect(getReportValidator()(reportCheck)).toBe(true);
      expect(typeof reportCheck.stack).toBe('string');
      delete reportCheck.stack;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const childReport of reportCheck.children) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(typeof childReport.stack).toBe('string');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete childReport.stack;
      }
      expect(reportCheck).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: lvl 0",
          "as_string_format": "String",
          "children": Array [
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 0",
              "as_string_format": "String",
              "child_id": 0,
              "child_level": 1,
              "child_path": "$.cause[0]",
              "children": Array [
                4,
                5,
              ],
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 1",
              "as_string_format": "String",
              "child_id": 1,
              "child_level": 1,
              "child_path": "$.cause[1]",
              "children": Array [
                2,
                3,
              ],
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 2; obj 1.0",
              "as_string_format": "String",
              "child_id": 2,
              "child_level": 2,
              "child_path": "$.cause[1].cause[0]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 2; obj 1.0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 2; obj 1.1",
              "as_string_format": "String",
              "child_id": 3,
              "child_level": 2,
              "child_path": "$.cause[1].cause[1]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 2; obj 1.1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 2; obj 0.0",
              "as_string_format": "String",
              "child_id": 4,
              "child_level": 2,
              "child_path": "$.cause[0].cause[0]",
              "children": Array [
                8,
                9,
              ],
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 2; obj 0.0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 2; obj 0.1",
              "as_string_format": "String",
              "child_id": 5,
              "child_level": 2,
              "child_path": "$.cause[0].cause[1]",
              "children": Array [
                6,
                7,
              ],
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 2; obj 0.1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 3; obj 0.1.0",
              "as_string_format": "String",
              "child_id": 6,
              "child_level": 3,
              "child_path": "$.cause[0].cause[1].cause[0]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 3; obj 0.1.0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 3; obj 0.1.1",
              "as_string_format": "String",
              "child_id": 7,
              "child_level": 3,
              "child_path": "$.cause[0].cause[1].cause[1]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 3; obj 0.1.1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 3; obj 0.0.0",
              "as_string_format": "String",
              "child_id": 8,
              "child_level": 3,
              "child_path": "$.cause[0].cause[0].cause[0]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 3; obj 0.0.0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 3; obj 0.0.1",
              "as_string_format": "String",
              "child_id": 9,
              "child_level": 3,
              "child_path": "$.cause[0].cause[0].cause[1]",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 3; obj 0.0.1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
          ],
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "lvl 0",
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);

      const reportCapped = makeCaughtObjectReportJson(caught, {
        maxChildrenLevel: 1,
      });
      expect(getReportValidator()(reportCapped)).toBe(true);
      expect(typeof reportCapped.stack).toBe('string');
      delete reportCapped.stack;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      for (const childReport of reportCapped.children) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        expect(typeof childReport.stack).toBe('string');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete childReport.stack;
      }
      expect(reportCapped).toMatchInlineSnapshot(`
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: lvl 0",
          "as_string_format": "String",
          "children": Array [
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 0",
              "as_string_format": "String",
              "child_id": 0,
              "child_level": 1,
              "child_path": "$.cause[0]",
              "children_omitted_reason": "Reached max depth - 1",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 0",
              "typeof": "object",
              "v": "corj/v0.6",
            },
            Object {
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1; obj 1",
              "as_string_format": "String",
              "child_id": 1,
              "child_level": 1,
              "child_path": "$.cause[1]",
              "children_omitted_reason": "Reached max depth - 1",
              "constructor_name": "Error",
              "instanceof_error": true,
              "message": "lvl 1; obj 1",
              "typeof": "object",
              "v": "corj/v0.6",
            },
          ],
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "instanceof_error": true,
          "message": "lvl 0",
          "typeof": "object",
          "v": "corj/v0.6",
        }
      `);
    });
  });
});
