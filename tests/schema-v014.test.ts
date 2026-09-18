import {
  CORJ_VERSION,
  CORJ_VERSION_FULL,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src/index';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

// The compile target predates `cause`; the runtime has it.
const ErrorWithCause = Error as unknown as new (
  message?: string,
  options?: { cause?: unknown },
) => Error;

const silent = () => undefined;

function everything() {
  const error = new ErrorWithCause('outer', { cause: new Error('inner') });
  Object.defineProperty(error, 'bad', {
    enumerable: true,
    get() {
      throw new Error('getter failed');
    },
  });
  return error;
}

describe('corj/v0.14', () => {
  test('the version constants', () => {
    expect(CORJ_VERSION).toBe('corj/v0.14');
    expect(CORJ_VERSION_FULL).toBe('corj/v0.14-full');
  });

  test('a report using every new field validates, compact and full, object and array', () => {
    const call = { context: { runId: 'run-1' } };
    const compact = makeCorj(everything(), { onError: silent }, call);
    expect(compact.reporting_errors).toBeDefined();
    const validateObject = getReportObjectReportValidator('compact');
    expect(validateObject(compact)).toBe(true);
    expect(
      getReportObjectReportValidator('full')(restoreExpectedValues(compact)),
    ).toBe(true);
    const rows = makeCorjArray(everything(), { onError: silent }, call);
    expect(getReportArrayReportValidator('compact')(rows)).toBe(true);
    expect(
      getReportArrayReportValidator('full')(restoreExpectedValues(rows)),
    ).toBe(true);
  });

  test('a trimmed report with both omission flags validates', () => {
    const report = makeCorj(
      everything(),
      { onError: silent, maxReportSize: 600 },
      { context: { blob: 'c'.repeat(3000) } },
    );
    expect(report.context_omitted).toBe('max_size');
    expect(getReportObjectReportValidator('compact')(report)).toBe(true);
  });

  test.each([
    [{ occurrence_id: 'has space' }],
    [{ fingerprint: 'x'.repeat(65) }],
    [{ context_omitted: 'max_depth' }],
    [{ reporting_errors: [{ stage: 'nope', path: '$', error: 'x' }] }],
    [
      {
        reporting_errors: [{ stage: 'other', path: '$', error: 'x', extra: 1 }],
      },
    ],
  ])('the schema rejects %j', (patch) => {
    const report = { ...makeCorj(new Error('x')), ...patch };
    expect(getReportObjectReportValidator('compact')(report)).toBe(false);
  });
});
