import { CorjMaker, makeReport } from '../src/index';
import type { CorjReportingError } from '../src/index';
import * as reportSize from '../src/report-size';

// The compile target predates AggregateError; the runtime has it.
const AggregateErrorCtor = (
  globalThis as unknown as {
    AggregateError: new (
      errors: Iterable<unknown>,
      message?: string,
    ) => Error & { errors: unknown[] };
  }
).AggregateError;

const silent = () => undefined;

function throwingGetter(message: string): Error {
  const error = new Error('outer');
  Object.defineProperty(error, 'message', {
    get() {
      throw new Error(message);
    },
    enumerable: false,
    configurable: true,
  });
  return error;
}

describe('reporting errors as data', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('a failure is written into the report and handed to onReportingError as the same record', () => {
    const seen: [unknown, CorjReportingError][] = [];
    const report = makeReport(throwingGetter('getter blew up'), {
      onReportingError: (caught, record) => seen.push([caught, record]),
    });
    expect(report.reporting_errors).toBeDefined();
    const row = report.reporting_errors!.find(
      (r) => r.sourceProperty === 'message',
    )!;
    expect(row).toEqual({
      stage: 'prop-access',
      path: '$',
      reportKey: 'message',
      sourceProperty: 'message',
      error: 'Error: getter blew up',
    });
    const handed = seen.find(([, r]) => r.sourceProperty === 'message')!;
    expect(handed[1]).toEqual(row);
    expect(handed[0]).toBeInstanceOf(Error); // the raw thrown value, for sinks such as Sentry
  });

  test('a clean report has no reporting_errors field', () => {
    expect(
      makeReport(new Error('fine'), { onReportingError: silent }),
    ).not.toHaveProperty('reporting_errors');
  });

  test('at most 8 records are kept; the handler still sees every failure', () => {
    // One failing getter per child: a single hostile object fails `as_json` once, as a whole.
    const children = Array.from({ length: 12 }, (_, i) =>
      throwingGetter(`boom ${i}`),
    );
    let calls = 0;
    const report = makeReport(new AggregateErrorCtor(children, 'many'), {
      onReportingError: () => calls++,
    });
    expect(report.reporting_errors).toHaveLength(8);
    expect(calls).toBeGreaterThan(8);
  });

  test('text is scrubbed before it is cut to 256 characters', () => {
    const secret = 'sk-abcdefghij';
    const padding = 'x'.repeat(250);
    const report = makeReport(throwingGetter(`${padding}${secret}`), {
      onReportingError: silent,
      redact: { patterns: [/sk-[a-z]{10}/g] },
    });
    const row = report.reporting_errors!.find(
      (r) => r.sourceProperty === 'message',
    )!;
    expect(row.error).toHaveLength(256);
    expect(row.error).not.toContain('sk-');
    expect(JSON.stringify(report)).not.toContain('sk-abc');
  });

  test('path and prop of a record go through the policy', () => {
    const hostile = {};
    Object.defineProperty(hostile, 'link_sk-abcdefghij', {
      get() {
        throw new Error('nope');
      },
    });
    const report = makeReport(hostile, {
      onReportingError: silent,
      childrenSources: ['link_sk-abcdefghij'],
      redact: { patterns: [/sk-[a-z]{10}/g] },
    });
    const row = report.reporting_errors!.find((r) => r.stage === 'children')!;
    expect(row.sourceProperty).toBe('link_[redacted]');
    expect(JSON.stringify(report.reporting_errors)).not.toContain('sk-abc');
  });

  test('a redact-stage record withholds the thrown message entirely', () => {
    const report = makeReport(new Error('plain'), {
      onReportingError: silent,
      redact: {
        transform: () => {
          throw new Error('policy failed on SECRET-VALUE');
        },
      },
    });
    const rows = report.reporting_errors!.filter((r) => r.stage === 'redact');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.error).toBe('[redacted]');
    expect(JSON.stringify(report)).not.toContain('SECRET-VALUE');
  });

  test('records are per call: a shared maker does not leak one report into the next', () => {
    const maker = new CorjMaker({ onReportingError: silent });
    expect(
      maker.makeReport(throwingGetter('first')).reporting_errors,
    ).toBeDefined();
    expect(maker.makeReport(new Error('clean'))).not.toHaveProperty(
      'reporting_errors',
    );
  });

  test('a caught object that re-enters the same maker keeps both record lists apart', () => {
    const maker = new CorjMaker({ onReportingError: silent });
    let inner: ReturnType<typeof maker.makeReport> | undefined;
    const outer = {
      toCorjAsJson() {
        inner = maker.makeReport(new Error('inner is clean'));
        throw new Error('outer hook failed');
      },
    };
    const report = maker.makeReport(outer);
    expect(inner).not.toHaveProperty('reporting_errors');
    expect(
      report.reporting_errors!.some((r) => r.sourceProperty === 'toCorjAsJson'),
    ).toBe(true);
  });

  test('the default handler prints the scrubbed record, never the raw text', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      makeReport(throwingGetter('leak sk-abcdefghij'), {
        redact: { patterns: [/sk-[a-z]{10}/g] },
      });
      const printed = warn.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('stage=prop-access');
      expect(printed).toContain('sourceProperty=message');
      expect(printed).not.toContain('sk-abc');
    } finally {
      warn.mockRestore();
    }
  });

  test('a failure past the point of no return reaches the handler only', () => {
    const failure = new Error('limiter failed');
    jest.spyOn(reportSize, 'limitReportSize').mockImplementation(() => {
      throw failure;
    });
    const seen: CorjReportingError[] = [];
    const report = makeReport(throwingGetter('getter blew up'), {
      onReportingError: (_caught, record) => seen.push(record),
    });
    expect(seen).toContainEqual({
      stage: 'limit',
      path: '$',
      error: 'Error: limiter failed',
    });
    expect(
      (report.reporting_errors ?? []).some((r) => r.stage === 'limit'),
    ).toBe(false);
  });

  test('a handler that rewrites its record cannot rewrite the report', () => {
    const report = makeReport(throwingGetter('getter blew up'), {
      onReportingError: (_caught, record) => {
        record.error = 'tampered';
        record.path = '$.tampered';
      },
    });
    const row = report.reporting_errors!.find(
      (r) => r.sourceProperty === 'message',
    )!;
    expect(row.error).toBe('Error: getter blew up');
    expect(row.path).toBe('$');
    expect(JSON.stringify(report)).not.toContain('tampered');
  });

  test('a handler that throws cannot break the report', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const report = makeReport(throwingGetter('x'), {
        onReportingError: () => {
          throw new Error('handler bug');
        },
      });
      expect(report.reporting_errors).toBeDefined();
    } finally {
      warn.mockRestore();
    }
  });
});
