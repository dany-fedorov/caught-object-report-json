import { makeCaughtObjectReportJson } from '../src';
import { getReportObjectReportValidator } from './utils/getReportObjectReportValidator';

describe('makeCaughtObjectReportJson', function () {
  test('default', () => {
    const report = makeCaughtObjectReportJson(new Error('I am an error!'));
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(Array.isArray(report.stack)).toBe(true);
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "v": "corj/v0.11",
      }
    `);
  });

  test('onCaughtMaking', () => {
    const onCaughtMakingArray: unknown[] = [];
    const report = makeCaughtObjectReportJson(undefined, {
      onCaughtMaking: (caught) => {
        onCaughtMakingArray.push(caught);
      },
    });
    expect(getReportObjectReportValidator()(report)).toBe(true);
    expect(typeof report.stack).toBe('undefined');
    delete report.stack;
    expect(report).toMatchInlineSnapshot(`
      Object {
        "as_json": null,
        "as_string": "undefined",
        "instanceof_error": false,
        "typeof": "undefined",
        "v": "corj/v0.11",
      }
    `);
    expect(onCaughtMakingArray).toMatchInlineSnapshot(`
      Array [
        [Error: Could not convert caught object to json string using safe-stable-stringify-with-length-limit.],
      ]
    `);
  });
});
