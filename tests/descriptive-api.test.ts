import * as corj from '../src/index';

describe('descriptive API', () => {
  test('Corj utilities work when extracted from the namespace', () => {
    const Corj = (corj as Record<string, any>)['Corj'];
    const {
      makeReport,
      makeReportArray,
      restoreExpectedValues,
      resolveRedactPolicy,
    } = Corj;

    expect(makeReport(new Error('x')).v).toBe('corj/v0.15');
    expect(makeReportArray(new Error('x'))[0].v).toBe('corj/v0.15');
    expect(restoreExpectedValues({ v: 'corj/v0.15' }).typeof).toBe('object');
    expect(resolveRedactPolicy(undefined)).toBeNull();
  });

  test('free report calls merge configuration and call context in one bag', () => {
    const report = corj.Corj.makeReport(new Error('x'), {
      context: { runId: 'r' },
      maxDepth: 1,
      occurrenceIdSources: null,
      fingerprintParts: null,
    });

    expect(report.context).toEqual({ runId: 'r' });
  });

  test('removed option and source names are rejected', () => {
    expect(
      () => new corj.CorjMaker({ ['on' + 'Error']: () => {} } as never),
    ).toThrow();
    expect(
      () =>
        new corj.CorjMaker({
          occurrenceIdSources: [{ ['fi' + 'eld']: 'id' }],
        } as never),
    ).toThrow();
  });

  test('free report calls reject a third positional argument', () => {
    expect(() =>
      (corj.Corj.makeReport as (...args: unknown[]) => unknown)(
        new Error('x'),
        {},
        {},
      ),
    ).toThrow();
    expect(() =>
      (corj.Corj.makeReportArray as (...args: unknown[]) => unknown)(
        new Error('x'),
        {},
        {},
      ),
    ).toThrow();
  });

  test('sourceProperty keeps the fp1 canonical source label stable', () => {
    const maker = new corj.CorjMaker({
      fingerprintParts: [{ sourceProperty: 'code' }],
      occurrenceIdSources: null,
      onReportingError: () => {},
    } as never);

    expect(maker.makeFingerprint({ code: 'E_X' })).toBe(
      'fp1_0aebaa5066f3e0de64d37b94135b3287',
    );
  });

  test('reporting errors use descriptive row and callback names', () => {
    const records: corj.CorjReportingError[] = [];
    const caught = Object.create(null, {
      message: {
        enumerable: true,
        get: () => {
          throw new Error('read failed');
        },
      },
    });
    const report = corj.Corj.makeReport(caught, {
      onReportingError: (
        _reportingFailure: unknown,
        record: corj.CorjReportingError,
      ) => records.push(record),
      occurrenceIdSources: null,
      fingerprintParts: null,
    });

    expect(report.v).toBe('corj/v0.15');
    expect(report.reporting_errors).toEqual(records);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reportKey: 'message',
          sourceProperty: 'message',
        }),
      ]),
    );
    expect(records[0]).not.toHaveProperty('key');
    expect(records[0]).not.toHaveProperty('prop');
  });
});
