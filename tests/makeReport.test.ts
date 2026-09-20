import { Corj, CorjMaker } from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';
import { LEGACY } from './legacy-options';

const { makeReport, makeReportArray } = Corj;

describe('makeReport', function () {
  test('default', () => {
    const report = makeReport(new Error('I am an error!'), LEGACY);
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Array.isArray(report.stack)).toBe(true);
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "v": "corj/v0.15",
      }
    `);
  });

  test('onReportingError', () => {
    const onErrorArray: unknown[] = [];
    const report = makeReport(
      {
        get message() {
          throw new Error('no message');
        },
      },
      {
        ...LEGACY,
        onReportingError: (caught, context) => {
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
            "path": "$",
            "reportKey": "message",
            "sourceProperty": "message",
            "stage": "prop-access",
          },
          Object {
            "error": "Error: no message",
            "path": "$",
            "reportKey": "as_json",
            "stage": "as_json",
          },
        ],
        "v": "corj/v0.15",
      }
    `);
    expect(onErrorArray).toMatchInlineSnapshot(`
      Array [
        Object {
          "caught": [Error: no message],
          "context": Object {
            "error": "Error: no message",
            "path": "$",
            "reportKey": "message",
            "sourceProperty": "message",
            "stage": "prop-access",
          },
        },
        Object {
          "caught": [Error: no message],
          "context": Object {
            "error": "Error: no message",
            "path": "$",
            "reportKey": "as_json",
            "stage": "as_json",
          },
        },
      ]
    `);
  });

  test('without configuration, including a call-only bag, the same default maker is reused', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReport');
    makeReport(1, { context: { runId: 'r-1' } });
    makeReport(2, { occurrenceId: 'r-2' });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.instances[0]).toBe(spy.mock.instances[1]);
    expect(
      (spy.mock.instances[0] as unknown as CorjMaker).options.maxDepth,
    ).toBe(5);
    spy.mockRestore();
  });

  test('with options a fresh maker is used each time', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReport');
    makeReport(1, { ...LEGACY, maxDepth: 1 });
    makeReport(2, { ...LEGACY, maxDepth: 1 });
    expect(spy.mock.instances[0]).not.toBe(spy.mock.instances[1]);
    expect(
      (spy.mock.instances[0] as unknown as CorjMaker).options.maxDepth,
    ).toBe(1);
    spy.mockRestore();
  });

  test('makeReportArray shares the same behaviour', () => {
    const spy = jest.spyOn(CorjMaker.prototype, 'makeReportArray');
    const a = makeReportArray(new Error('a'), LEGACY);
    const b = makeReportArray(new Error('b'), { ...LEGACY, metadata: false });
    expect(getReportArrayReportValidator()(a)).toBe(true);
    expect(getReportArrayReportValidator()(b)).toBe(true);
    expect(a[0]!.v).toBe('corj/v0.15');
    expect(b[0]!.v).toBeUndefined();
    expect(spy.mock.instances[0]).not.toBe(spy.mock.instances[1]);
    spy.mockRestore();
  });

  test('invalid options throw before any report is made', () => {
    expect(() => makeReport(1, { ...LEGACY, maxReportSize: 1 })).toThrow(
      RangeError,
    );
    expect(() =>
      makeReportArray(1, { ...LEGACY, stackFormat: 'x' as never }),
    ).toThrow(TypeError);
  });
});
