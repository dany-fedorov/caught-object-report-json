import {
  CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
  CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
  CORJ_AS_STRING_FORMAT_STRING_COERCION,
  CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
  CORJ_MAKER_DEFAULT_OPTIONS,
  CorjMaker,
  makeCaughtObjectReportJson,
  makeCaughtObjectReportJsonArray,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

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
      const report = noOptionsBuilder.makeReportObject(caught);
      const validator = getReportObjectReportValidator();
      const isValid = validator(report);
      expect(isValid).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(typeof report.stack).toBe('string');
      delete report.stack;
      expect(report).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.9/report-object.json",
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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

    test('onCaughtMaking: null', () => {
      const noOptionsBuilder = new CorjMaker({
        ...CORJ_MAKER_DEFAULT_OPTIONS,
        onCaughtMaking: null,
      });
      const caught = new Error('I am an error!');
      const report = noOptionsBuilder.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
        }
      `);
    });
  });

  describe('Default onCaughtMaking', function () {
    test('undefined', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      consoleWarnSpy.mockImplementation(() => null);
      const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
      const caught = undefined;
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
          "v": "corj/v0.9",
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

  test('CorjMaker#makeReportObjectEntries', function () {
    const corj = new CorjMaker(CORJ_MAKER_DEFAULT_OPTIONS);
    const entries = corj.makeReportObjectEntries(
      new Error(`Hey, I'm an error`),
    );
    expect(entries?.[2]?.[0]).toBe('stack');
    expect(typeof entries?.[2]?.[1]).toBe('string');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete entries[2][1];
    expect(entries).toMatchInlineSnapshot(`
      Array [
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
          "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
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
          "v": "corj/v0.9",
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
      const report = corj.makeReportObject(caught);
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
          "v": "corj/v0.9",
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
      const validator = getReportObjectReportValidator();
      const isValid = validator(report);
      expect(isValid).toBe(true);
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
              "as_string": "Error: lvl 1",
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1",
              "path": "$.cause",
              "typeof": "object",
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
          "v": "corj/v0.9",
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
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
              "as_string": "Error: lvl 1; obj 0",
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 0",
              "path": "$.cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 1; obj 1",
              "constructor_name": "Error",
              "id": "1",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 1",
              "path": "$.cause[1]",
              "typeof": "object",
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
          "v": "corj/v0.9",
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
      expect(getReportObjectReportValidator()(reportCheck)).toBe(true);
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
              "as_string": "Error: lvl 1; obj 0",
              "children": Array [
                "4",
                "5",
              ],
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 0",
              "path": "$.cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 1; obj 1",
              "children": Array [
                "2",
                "3",
              ],
              "constructor_name": "Error",
              "id": "1",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 1",
              "path": "$.cause[1]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 2; obj 1.0",
              "constructor_name": "Error",
              "id": "2",
              "instanceof_error": true,
              "level": 2,
              "message": "lvl 2; obj 1.0",
              "path": "$.cause[1].cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 2; obj 1.1",
              "constructor_name": "Error",
              "id": "3",
              "instanceof_error": true,
              "level": 2,
              "message": "lvl 2; obj 1.1",
              "path": "$.cause[1].cause[1]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 2; obj 0.0",
              "children": Array [
                "8",
                "9",
              ],
              "constructor_name": "Error",
              "id": "4",
              "instanceof_error": true,
              "level": 2,
              "message": "lvl 2; obj 0.0",
              "path": "$.cause[0].cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 2; obj 0.1",
              "children": Array [
                "6",
                "7",
              ],
              "constructor_name": "Error",
              "id": "5",
              "instanceof_error": true,
              "level": 2,
              "message": "lvl 2; obj 0.1",
              "path": "$.cause[0].cause[1]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 3; obj 0.1.0",
              "constructor_name": "Error",
              "id": "6",
              "instanceof_error": true,
              "level": 3,
              "message": "lvl 3; obj 0.1.0",
              "path": "$.cause[0].cause[1].cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 3; obj 0.1.1",
              "constructor_name": "Error",
              "id": "7",
              "instanceof_error": true,
              "level": 3,
              "message": "lvl 3; obj 0.1.1",
              "path": "$.cause[0].cause[1].cause[1]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 3; obj 0.0.0",
              "constructor_name": "Error",
              "id": "8",
              "instanceof_error": true,
              "level": 3,
              "message": "lvl 3; obj 0.0.0",
              "path": "$.cause[0].cause[0].cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 3; obj 0.0.1",
              "constructor_name": "Error",
              "id": "9",
              "instanceof_error": true,
              "level": 3,
              "message": "lvl 3; obj 0.0.1",
              "path": "$.cause[0].cause[0].cause[1]",
              "typeof": "object",
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
          "v": "corj/v0.9",
        }
      `);

      const reportCapped = makeCaughtObjectReportJson(caught, {
        maxChildrenLevel: 1,
      });
      expect(getReportObjectReportValidator()(reportCapped)).toBe(true);
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
              "as_string": "Error: lvl 1; obj 0",
              "children_omitted_reason": "Reached max depth - 1",
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 0",
              "path": "$.cause[0]",
              "typeof": "object",
            },
            Object {
              "as_json": Object {},
              "as_string": "Error: lvl 1; obj 1",
              "children_omitted_reason": "Reached max depth - 1",
              "constructor_name": "Error",
              "id": "1",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1; obj 1",
              "path": "$.cause[1]",
              "typeof": "object",
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
          "v": "corj/v0.9",
        }
      `);
    });

    test('childrenMetadataFields: true', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', { cause: new Error('lvl 1') });
      const report = makeCaughtObjectReportJson(caught, {
        childrenMetadataFields: true,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
              "$schema": "https://raw.githubusercontent.com/dany-fedorov/caught-object-report-json/main/schema-versions/corj/v0.9/report-array.json",
              "as_json": Object {},
              "as_json_format": "safe-stable-stringify@2.4.1",
              "as_string": "Error: lvl 1",
              "as_string_format": "String",
              "children_sources": Array [
                "cause",
                "errors",
              ],
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1",
              "path": "$.cause",
              "typeof": "object",
              "v": "corj/v0.9",
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
          "v": "corj/v0.9",
        }
      `);
    });

    test('childrenMetadataFields: false', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', { cause: new Error('lvl 1') });
      const report = makeCaughtObjectReportJson(caught, {
        childrenMetadataFields: false,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
              "as_string": "Error: lvl 1",
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1",
              "path": "$.cause",
              "typeof": "object",
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
          "v": "corj/v0.9",
        }
      `);
    });

    test('childrenMetadataFields: {}', () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const caught = new Error('lvl 0', { cause: new Error('lvl 1') });
      const report = makeCaughtObjectReportJson(caught, {
        childrenMetadataFields: {
          v: true,
        },
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
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
              "as_string": "Error: lvl 1",
              "constructor_name": "Error",
              "id": "0",
              "instanceof_error": true,
              "level": 1,
              "message": "lvl 1",
              "path": "$.cause",
              "typeof": "object",
              "v": "corj/v0.9",
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
          "v": "corj/v0.9",
        }
      `);
    });
  });

  describe('Using toCorjAsString method', () => {
    test('Uses toCorjAsString method', () => {
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          return 'Used toCorjAsString';
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: [
          CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
          CORJ_AS_STRING_FORMAT_STRING_COERCION,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe(caught.toCorjAsString());
    });

    test('After toCorjAsString throws, falls back to string coercion', () => {
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          throw new Error('Hey!');
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: [
          CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
          CORJ_AS_STRING_FORMAT_STRING_COERCION,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe(caught.toString());
    });

    test('If toCorjAsString returns not a string, falls back to string coercion', () => {
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          return 123;
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: [
          CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
          CORJ_AS_STRING_FORMAT_STRING_COERCION,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe(caught.toString());
    });

    test('If toCorjAsString returns not a string and there is no fallback option, sets as_string to null', () => {
      const caught = {
        toString() {
          return 'Used toString';
        },
        toCorjAsString() {
          return 123;
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: [
          CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe(null);
    });
  });

  describe('Using toCorjAsJson method', () => {
    test('Uses toCorjAsJson method', () => {
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          return {
            msg: 'Used toCorjAsJson',
          };
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: [
          CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
          CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toMatchObject(caught.toCorjAsJson());
    });

    test('After toCorjAsJson throws, falls back to string coercion', () => {
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          throw new Error('hey');
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: [
          CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
          CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toMatchObject(caught.toJSON());
    });

    test('If toCorjAsJson stringification returns not a string, falls back to string coercion', () => {
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          return function fn() {
            return 1;
          };
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: [
          CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
          CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
        ],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toMatchObject(caught.toJSON());
    });

    test('If toCorjAsJson stringification returns not a string and there is no fallback option, sets as_json to null', () => {
      const caught = {
        toJSON() {
          return { msg: 'Used toJSON' };
        },
        toCorjAsJson() {
          return function fn() {
            return 1;
          };
        },
      };
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: [CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD],
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toBe(null);
    });
  });

  describe.each(
    Array.from({ length: 3 }).map(
      (_, i) =>
        i +
        1 +
        1 /* 1 accounting for fact that we start at 1, 1 accounting for assign that happens when spreading*/,
    ),
  )(
    'onCaughtMaking throws after screening - idx %i',
    (onCaughtMaking_i_target) => {
      const makeTestOnCaughtMakingRandomlyThrowingInstance = () => {
        let onCaughtMaking_i = 0;
        const opts_proto = { ...CORJ_MAKER_DEFAULT_OPTIONS };
        const opts = {
          get onCaughtMaking() {
            onCaughtMaking_i++;
            if (onCaughtMaking_i === onCaughtMaking_i_target) {
              throw new Error(
                `I'm an error from onCaughtMaking - ${JSON.stringify({
                  onCaughtMaking_i,
                })}`,
              );
            }
            return function mock_onCaughtMaking_thatDoesNotThrow() {};
          },
        };
        Object.setPrototypeOf(opts, opts_proto);
        return new CorjMaker(opts as any);
      };
      test('Nothing throws', () => {
        const caught = new Error(`I'm an error`);
        const maker = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const report = maker.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('string');
        delete report.stack;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": Object {},
                    "as_json_format": "safe-stable-stringify@2.4.1",
                    "as_string": "Error: I'm an error",
                    "as_string_format": "String",
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": "Error",
                    "instanceof_error": true,
                    "message": "I'm an error",
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
      });

      test('.toString throws', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const caught = {
          toString: () => {
            throw new Error('I am a nasty error!');
          },
        };
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('undefined');
        delete report.stack;
        expect(['String', null]).toContain(report.as_string_format);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_string_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": Object {},
                    "as_json_format": "safe-stable-stringify@2.4.1",
                    "as_string": null,
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": "Object",
                    "instanceof_error": false,
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });

      test('.toString returns not string and it causes applying String() to throw', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const caught = {
          toString: () => {
            return {
              returningObjectAndNotAStringOnPurpose:
                'Person who wrote this method is simply a piece of shit',
            };
          },
        };
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('undefined');
        delete report.stack;
        expect(['String', null]).toContain(report.as_string_format);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_string_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": Object {},
                    "as_json_format": "safe-stable-stringify@2.4.1",
                    "as_string": null,
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": "Object",
                    "instanceof_error": false,
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });

      test('.constructor throws', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const caught = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          get constructor() {
            throw new Error(
              `(in .constructor) Yes, I'm a piece of shit for throwing here and I know it`,
            );
          },
        };
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('undefined');
        delete report.stack;
        expect(['safe-stable-stringify@2.4.1', null]).toContain(
          report.as_json_format,
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_json_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": null,
                    "as_string": "[object Object]",
                    "as_string_format": "String",
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": null,
                    "instanceof_error": false,
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });

      test('.constructor.name throws', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
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
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('undefined');
        delete report.stack;
        expect(['safe-stable-stringify@2.4.1', null]).toContain(
          report.as_json_format,
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_json_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": null,
                    "as_string": "[object Object]",
                    "as_string_format": "String",
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": null,
                    "instanceof_error": false,
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });

      test('.message throws', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const caught = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          get message() {
            throw new Error(
              `(in .message) Yes, I'm a piece of shit for throwing here and I know it`,
            );
          },
        };
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(typeof report.stack).toBe('undefined');
        delete report.stack;
        expect(['safe-stable-stringify@2.4.1', null]).toContain(
          report.as_json_format,
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_json_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": null,
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
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });

      test('.stack throws', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        consoleWarnSpy.mockImplementation(() => null);
        const corj = makeTestOnCaughtMakingRandomlyThrowingInstance();
        const caught = {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          get stack() {
            throw new Error(
              `(in .stack) Yes, I'm a piece of shit for throwing here and I know it`,
            );
          },
        };
        const report = corj.makeReportObject(caught);
        expect(getReportObjectReportValidator()(report)).toBe(true);
        expect(report.stack).toBe(null);
        delete report.stack;
        expect(['safe-stable-stringify@2.4.1', null]).toContain(
          report.as_json_format,
        );
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete report.as_json_format;
        expect(report).toMatchInlineSnapshot(`
                  Object {
                    "as_json": null,
                    "as_string": "[object Object]",
                    "as_string_format": "String",
                    "children_sources": Array [
                      "cause",
                      "errors",
                    ],
                    "constructor_name": "Object",
                    "instanceof_error": false,
                    "typeof": "object",
                    "v": "corj/v0.9",
                  }
              `);
        jest.restoreAllMocks();
      });
    },
  );

  describe('Misc', () => {
    test('if onCaughtMaking is not a function, it is not called', () => {
      const caught = {
        get prop_a() {
          throw new Error(`I'm thrown form prop_a`);
        },
      };
      expect(() => {
        const r1 = makeCaughtObjectReportJson(caught, {
          onCaughtMaking: null,
        });
        expect(getReportObjectReportValidator()(r1)).toBe(true);
        const r2 = makeCaughtObjectReportJson(caught, {
          onCaughtMaking: 123 as unknown as null,
        });
        expect(getReportObjectReportValidator()(r2)).toBe(true);
        const r3 = makeCaughtObjectReportJson(caught, {
          onCaughtMaking: 'str' as unknown as null,
        });
        expect(getReportObjectReportValidator()(r3)).toBe(true);
      }).not.toThrow();
    });

    test('toCorjAsString is not a function', () => {
      expect(() => {
        const caught_1 = {
          toCorjAsString: null,
        };
        const report_1 = makeCaughtObjectReportJson(caught_1, {
          asStringFormatsToApply: [
            CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
            CORJ_AS_STRING_FORMAT_STRING_COERCION,
          ],
        });
        expect(getReportObjectReportValidator()(report_1)).toBe(true);
        const caught_2 = {
          toCorjAsString: 123,
        };
        const report_2 = makeCaughtObjectReportJson(caught_2, {
          asStringFormatsToApply: [
            CORJ_AS_STRING_FORMAT_TO_CORJ_AS_STRING_METHOD,
          ],
        });
        expect(getReportObjectReportValidator()(report_2)).toBe(true);
      }).not.toThrow();
    });

    test('toCorjAsJson is not a function', () => {
      expect(() => {
        const caught_1 = {
          toCorjAsJson: null,
        };
        const report_1 = makeCaughtObjectReportJson(caught_1, {
          asJsonFormatsToApply: [
            CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD,
            CORJ_AS_JSON_FORMAT_SAFE_STABLE_STRINGIFY_2_4_1,
          ],
        });
        expect(getReportObjectReportValidator()(report_1)).toBe(true);
        const caught_2 = {
          toCorjAsJson: 123,
        };
        const report_2 = makeCaughtObjectReportJson(caught_2, {
          asJsonFormatsToApply: [CORJ_AS_JSON_FORMAT_TO_CORJ_AS_JSON_METHOD],
        });
        expect(getReportObjectReportValidator()(report_2)).toBe(true);
      }).not.toThrow();
    });

    test('If asStringFormatsToApply is empty, sets as_string & as_string_format to null', () => {
      const caught = new Error(`I'm an error`);
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: [] as any,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toBe(null);
      expect(report.as_string_format).toBe(null);
    });

    test('If asStringFormatsToApply is not an array, falls back to default settings', () => {
      const caught = new Error(`I'm an error`);
      const report = makeCaughtObjectReportJson(caught, {
        asStringFormatsToApply: 123 as any,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_string).toMatchInlineSnapshot(`"Error: I'm an error"`);
    });

    test('If asJsonFormatsToApply is empty, sets as_json & as_json_format to null', () => {
      const caught = new Error(`I'm an error`);
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: [] as any,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toBe(null);
      expect(report.as_json_format).toBe(null);
    });

    test('If asJsonFormatsToApply is not an array, falls back to default settings', () => {
      const caught = new Error(`I'm an error`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      caught.test_prop_for_as_json = 'test_prop_for_as_json';
      const report = makeCaughtObjectReportJson(caught, {
        asJsonFormatsToApply: 123 as any,
      });
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toMatchInlineSnapshot(`
        Object {
          "test_prop_for_as_json": "test_prop_for_as_json",
        }
      `);
    });

    test('If circular reference is marked as child key, do not try to stringify it', () => {
      const caught = new Error(`I'm an error`);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      caught.errors = caught;
      const report = makeCaughtObjectReportJson(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
      expect(report.as_json).toMatchInlineSnapshot(`Object {}`);
    });

    test('if cannot merge options, fallback to base options', () => {
      expect(() => {
        let i = 0;
        const corj = CorjMaker.withDefaults({
          get onCaughtMaking() {
            i++;
            if (i === 2) {
              throw new Error();
            }
            return function () {};
          },
        });
        const report = corj.makeReportObject({ random: Math.random() });
        expect(getReportObjectReportValidator()(report)).toBe(true);
      }).not.toThrow();
    });

    test('constructor.name is not string', () => {
      const caught = {
        constructor: {
          name: 123,
        },
      };
      const report = makeCaughtObjectReportJson(caught);
      expect(getReportObjectReportValidator()(report)).toBe(true);
    });
  });

  test('parseStackToArray', () => {
    const caught = new Error(`I'm an error`);
    const report = makeCaughtObjectReportJson(caught, {
      parseStackToArray: true,
    });
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Array.isArray(report.stack)).toBe(true);
  });

  test('makeCaughtObjectReportJsonArray', () => {
    const caught = new Error(`I'm an error`);
    const report = makeCaughtObjectReportJsonArray(caught);
    expect(getReportArrayReportValidator()(report)).toBe(true);
    if (report.length < 1 || !report[0]) {
      throw new Error('Test failed');
    }
    expect(typeof report[0].stack).toBe('string');
    delete report[0].stack;
    expect(report).toMatchInlineSnapshot(`
      Array [
        Object {
          "as_json": Object {},
          "as_json_format": "safe-stable-stringify@2.4.1",
          "as_string": "Error: I'm an error",
          "as_string_format": "String",
          "children": Array [],
          "children_sources": Array [
            "cause",
            "errors",
          ],
          "constructor_name": "Error",
          "id": "root",
          "instanceof_error": true,
          "level": 0,
          "message": "I'm an error",
          "path": "$",
          "typeof": "object",
          "v": "corj/v0.9",
        },
      ]
    `);
  });
});
