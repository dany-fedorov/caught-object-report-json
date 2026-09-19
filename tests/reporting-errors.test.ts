import { CorjMaker, makeCorj } from '../src/index';
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

  test('a failure is written into the report and handed to onError as the same record', () => {
    const seen: [unknown, CorjReportingError][] = [];
    const report = makeCorj(throwingGetter('getter blew up'), {
      onError: (caught, record) => seen.push([caught, record]),
    });
    expect(report.reporting_errors).toBeDefined();
    const row = report.reporting_errors!.find((r) => r.prop === 'message')!;
    expect(row).toEqual({
      stage: 'prop-access',
      path: '$',
      key: 'message',
      prop: 'message',
      error: 'Error: getter blew up',
    });
    const handed = seen.find(([, r]) => r.prop === 'message')!;
    expect(handed[1]).toEqual(row);
    expect(handed[0]).toBeInstanceOf(Error); // the raw thrown value, for sinks such as Sentry
  });

  test('a clean report has no reporting_errors field', () => {
    expect(makeCorj(new Error('fine'), { onError: silent })).not.toHaveProperty(
      'reporting_errors',
    );
  });

  test('at most 8 records are kept; the handler still sees every failure', () => {
    // One failing getter per child: a single hostile object fails `as_json` once, as a whole.
    const children = Array.from({ length: 12 }, (_, i) =>
      throwingGetter(`boom ${i}`),
    );
    let calls = 0;
    const report = makeCorj(new AggregateErrorCtor(children, 'many'), {
      onError: () => calls++,
    });
    expect(report.reporting_errors).toHaveLength(8);
    expect(calls).toBeGreaterThan(8);
  });

  test('text is scrubbed before it is cut to 256 characters', () => {
    const secret = 'sk-abcdefghij';
    const padding = 'x'.repeat(250);
    const report = makeCorj(throwingGetter(`${padding}${secret}`), {
      onError: silent,
      redact: { patterns: [/sk-[a-z]{10}/g] },
    });
    const row = report.reporting_errors!.find((r) => r.prop === 'message')!;
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
    const report = makeCorj(hostile, {
      onError: silent,
      childrenSources: ['link_sk-abcdefghij'],
      redact: { patterns: [/sk-[a-z]{10}/g] },
    });
    const row = report.reporting_errors!.find((r) => r.stage === 'children')!;
    expect(row.prop).toBe('link_[redacted]');
    expect(JSON.stringify(report.reporting_errors)).not.toContain('sk-abc');
  });

  test('a redact-stage record withholds the thrown message entirely', () => {
    const report = makeCorj(new Error('plain'), {
      onError: silent,
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
    const maker = new CorjMaker({ onError: silent });
    expect(
      maker.makeReportObject(throwingGetter('first')).reporting_errors,
    ).toBeDefined();
    expect(maker.makeReportObject(new Error('clean'))).not.toHaveProperty(
      'reporting_errors',
    );
  });

  test('a caught object that re-enters the same maker keeps both record lists apart', () => {
    const maker = new CorjMaker({ onError: silent });
    let inner: ReturnType<typeof maker.makeReportObject> | undefined;
    const outer = {
      toCorjAsJson() {
        inner = maker.makeReportObject(new Error('inner is clean'));
        throw new Error('outer hook failed');
      },
    };
    const report = maker.makeReportObject(outer);
    expect(inner).not.toHaveProperty('reporting_errors');
    expect(
      report.reporting_errors!.some((r) => r.prop === 'toCorjAsJson'),
    ).toBe(true);
  });

  test('the default handler prints the scrubbed record, never the raw text', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      makeCorj(throwingGetter('leak sk-abcdefghij'), {
        redact: { patterns: [/sk-[a-z]{10}/g] },
      });
      const printed = warn.mock.calls.map((call) => String(call[0])).join('\n');
      expect(printed).toContain('stage=prop-access');
      expect(printed).toContain('prop=message');
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
    const report = makeCorj(throwingGetter('getter blew up'), {
      onError: (_caught, record) => seen.push(record),
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
    const report = makeCorj(throwingGetter('getter blew up'), {
      onError: (_caught, record) => {
        record.error = 'tampered';
        record.path = '$.tampered';
      },
    });
    const row = report.reporting_errors!.find((r) => r.prop === 'message')!;
    expect(row.error).toBe('Error: getter blew up');
    expect(row.path).toBe('$');
    expect(JSON.stringify(report)).not.toContain('tampered');
  });

  test('a handler that throws cannot break the report', () => {
    const warn = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    try {
      const report = makeCorj(throwingGetter('x'), {
        onError: () => {
          throw new Error('handler bug');
        },
      });
      expect(report.reporting_errors).toBeDefined();
    } finally {
      warn.mockRestore();
    }
  });
});
