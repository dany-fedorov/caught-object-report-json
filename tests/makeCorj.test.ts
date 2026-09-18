import { CorjMaker, makeCorj, makeCorjArray } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';
import { LEGACY } from './legacy-options';

describe('makeCorj', function () {
  test('default', () => {
    const report = makeCorj(new Error('I am an error!'), LEGACY);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Array.isArray(report.stack)).toBe(true);
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "v": "corj/v0.14",
      }
    `);
  });

  test('onError', () => {
    const onErrorArray: unknown[] = [];
    const report = makeCorj(
      {
        get message() {
          throw new Error('no message');
        },
      },
      {
        ...LEGACY,
        onError: (caught, context) => {
          onErrorArray.push({ caught, context });
        },
      },
    );
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": null,
        "as_string": "[object Object]",
        "constructor_name": "Object",
        "instanceof_error": false,
        "message": null,
        "reporting_errors": Array [
          Object {
            "error": "Error: no message",
            "key": "message",
            "path": "$",
            "prop": "message",
            "stage": "prop-access",
          },
          Object {
            "error": "Error: no message",
            "key": "as_json",
            "path": "$",
            "stage": "as_json",
          },
        ],
        "v": "corj/v0.14",
      }
    `);
    expect(onErrorArray).toMatchInlineSnapshot(`
      Array [
        Object {
          "caught": [Error: no message],
          "context": Object {
            "error": "Error: no message",
            "key": "message",
            "path": "$",
            "prop": "message",
            "stage": "prop-access",
          },
        },
        Object {
          "caught": [Error: no message],
          "context": Object {
            "error": "Error: no message",
            "key": "as_json",
            "path": "$",
            "stage": "as_json",
          },
        },
      ]
    `);
  });

  test('without options the same default maker is reused', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReportObject');
    makeCorj(1);
    makeCorj(2);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.instances[0]).toBe(spy.mock.instances[1]);
    expect(
      (spy.mock.instances[0] as unknown as CorjMaker).options.maxDepth,
    ).toBe(5);
    spy.mockRestore();
  });

  test('with options a fresh maker is used each time', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReportObject');
    makeCorj(1, { ...LEGACY, maxDepth: 1 });
    makeCorj(2, { ...LEGACY, maxDepth: 1 });
    expect(spy.mock.instances[0]).not.toBe(spy.mock.instances[1]);
    expect(
      (spy.mock.instances[0] as unknown as CorjMaker).options.maxDepth,
    ).toBe(1);
    spy.mockRestore();
  });

  test('makeCorjArray shares the same behaviour', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReportArray');
    const a = makeCorjArray(new Error('a'), LEGACY);
    const b = makeCorjArray(new Error('b'), { ...LEGACY, metadata: false });
    expect(getReportArrayReportValidator()(a)).toBe(true);
    expect(getReportArrayReportValidator()(b)).toBe(true);
    expect(a[0]!.v).toBe('corj/v0.14');
    expect(b[0]!.v).toBeUndefined();
    expect(spy.mock.instances[0]).not.toBe(spy.mock.instances[1]);
    spy.mockRestore();
  });

  test('invalid options throw before any report is made', () => {
    expect(() => makeCorj(1, { ...LEGACY, maxReportSize: 1 })).toThrow(
      RangeError,
    );
    expect(() =>
      makeCorjArray(1, { ...LEGACY, stackFormat: 'x' as never }),
    ).toThrow(TypeError);
  });
});
