import { CorjMaker, makeCorj, CORJ_VERSION_FULL } from '../src/index';
import type { CorjReport, CorjReportChild } from '../src/index';
import { makeMinimalReport } from '../src/report-size';

const silent = () => undefined;
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).length;

function noisy(): Error {
  const error = new Error('m'.repeat(300));
  // A fixed stack: jest runs with a stack trace limit of 1000, and a real stack would decide the sizes below.
  error.stack = 'Error: fixed\n    at fixed (file.js:1:1)';
  Object.defineProperty(error, 'bad', {
    enumerable: true,
    get() {
      throw new Error('getter failed');
    },
  });
  return error;
}

describe('limiter drop order', () => {
  test('the floor is 512', () => {
    expect(() => new CorjMaker({ maxReportSize: 511 })).toThrow(
      'maxReportSize must be a safe integer >= 512, or null to disable the limit',
    );
    expect(() => new CorjMaker({ maxReportSize: 512 })).not.toThrow();
  });

  test('context goes first, whole, and the report says so', () => {
    const big = { blob: 'c'.repeat(3000) };
    const roomy = makeCorj(
      noisy(),
      { onError: silent, maxReportSize: 100_000 },
      { context: big },
    );
    expect(roomy.context).toEqual(big);
    const tight = makeCorj(
      noisy(),
      { onError: silent, maxReportSize: 2500 },
      { context: big },
    );
    expect(tight).not.toHaveProperty('context');
    expect(tight.context_omitted).toBe('max_size');
    expect(tight.truncated).toBe(true);
    expect(tight.reporting_errors).toBeDefined(); // errors survive when dropping context was enough
    expect(bytes(tight)).toBeLessThanOrEqual(2500);
  });

  test('reporting_errors go second, and the report says so', () => {
    const report = makeCorj(
      noisy(),
      { onError: silent, maxReportSize: 600 },
      {
        context: { blob: 'c'.repeat(3000) },
      },
    );
    expect(report.context_omitted).toBe('max_size');
    expect(report).not.toHaveProperty('reporting_errors');
    expect(report.reporting_errors_omitted).toBe('max_size');
    expect(bytes(report)).toBeLessThanOrEqual(600);
  });

  test('context goes before any error content is trimmed, however small it is', () => {
    const report = makeCorj(
      new Error('m'.repeat(5000)),
      { maxReportSize: 1024 },
      {
        context: { runId: 'run-1' },
      },
    );
    expect(report.truncated).toBe(true);
    expect(report).not.toHaveProperty('context');
    expect(report.context_omitted).toBe('max_size');
  });

  test('a report that fits keeps its context untouched', () => {
    const report = makeCorj(
      new Error('small'),
      { maxReportSize: 100_000 },
      {
        context: { runId: 'run-1' },
      },
    );
    expect(report.context).toEqual({ runId: 'run-1' });
    expect(report).not.toHaveProperty('context_omitted');
  });

  test('v survives the tightest budget', () => {
    const report = makeCorj(new Error('m'.repeat(5000)), {
      maxReportSize: 512,
    });
    expect(report.v).toBe(makeCorj(new Error('x')).v);
  });

  test('v is still absent when metadata turned it off', () => {
    expect(
      makeCorj(new Error('m'.repeat(5000)), {
        maxReportSize: 512,
        metadata: false,
      }),
    ).not.toHaveProperty('v');
  });

  test('the minimal report keeps the fixed fields and both flags, and fits the floor in the worst case', () => {
    const worstRoot = {
      occurrence_id: '!'.repeat(128),
      fingerprint: '~'.repeat(64),
      instanceof_error: false,
      typeof: 'undefined',
      context: { blob: 'c'.repeat(3000) },
      reporting_errors: [{ stage: 'other', path: '$', error: 'x' }],
      v: CORJ_VERSION_FULL,
      $schema: 'https://example.invalid/dropped',
    } as unknown as CorjReport;
    const child = { id: '0', path: '$.cause', level: 1 };
    const asObject = makeMinimalReport({
      ...worstRoot,
      children: [child],
    } as CorjReport);
    const asArray = makeMinimalReport([
      { id: 'root', path: '$', level: 0, ...worstRoot },
      child,
    ] as CorjReportChild[]);
    for (const minimal of [asObject, asArray[0]!]) {
      expect(minimal).toMatchObject({
        occurrence_id: '!'.repeat(128),
        fingerprint: '~'.repeat(64),
        context_omitted: 'max_size',
        reporting_errors_omitted: 'max_size',
        children_omitted: 'max_size',
        v: CORJ_VERSION_FULL,
      });
      expect(minimal).not.toHaveProperty('context');
      expect(minimal).not.toHaveProperty('reporting_errors');
      expect(minimal).not.toHaveProperty('$schema');
    }
    expect(bytes(asObject)).toBeLessThanOrEqual(512);
    expect(bytes(asArray)).toBeLessThanOrEqual(512); // measured while planning: 487
  });
});
