import {
  hasPropertyWithoutReading,
  isDataProperty,
  PrototypeInspectionLimitError,
} from '../src/lazy-stack';
import { CorjMaker, CORJ_TRUNCATED_MARKER } from '../src/index';
import type { CorjReportingError } from '../src/index';

const silent = () => undefined;

describe('caught input boundaries', () => {
  test.each(['default', 'no-invoke'] as const)(
    'numeric object keys cannot bypass path exclusions in %s inspection',
    (inspection) => {
      let reads = 0;
      const map = {
        get 0() {
          reads++;
          return 'SECRET-ID';
        },
      };
      const maker = new CorjMaker({
        inspection,
        redact: { paths: ['$.map.0'] },
        occurrenceIdSources: [{ path: ['map', 0] }],
        fingerprintParts: [{ path: ['map', 0] }],
        onReportingError: silent,
      });
      const report = maker.makeReport({ map });
      expect(reads).toBe(0);
      expect(report.occurrence_id).toBe('[redacted]');
      expect(report.as_json).toEqual({ map: { 0: '[redacted]' } });
      expect(report.fingerprint).toBe(
        maker.makeFingerprint({ map: { 0: 'different' } }),
      );
    },
  );

  test('an excluded numeric ID source stops the source chain', () => {
    const maker = new CorjMaker({
      redact: { paths: ['$.map.0'], replacement: 'not a token' },
      occurrenceIdSources: [
        { path: ['map', 0] },
        { sourceProperty: 'publicId' },
      ],
    });
    expect(
      maker.makeReport({ map: { 0: 'SECRET' }, publicId: 'public' })
        .occurrence_id,
    ).toBe('[redacted]');
  });

  test.each(['default', 'no-invoke'] as const)(
    'revoked child sources return reports in %s inspection',
    (inspection) => {
      for (const prop of ['cause', 'errors']) {
        for (const array of [false, true]) {
          const { proxy, revoke } = Proxy.revocable({}, {});
          revoke();
          const records: CorjReportingError[] = [];
          const maker = new CorjMaker({
            inspection,
            onReportingError: (_, r) => records.push(r),
          });
          const caught = { message: 'original failure', [prop]: proxy };
          const result = array
            ? maker.makeReportArray(caught)
            : maker.makeReport(caught);
          const root = Array.isArray(result) ? result[0]! : result;
          const children = Array.isArray(result)
            ? result.slice(1)
            : result.children;
          expect(root.message).toBe('original failure');
          expect(children).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: `$.${prop}` }),
            ]),
          );
          expect(records).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ stage: 'children', path: `$.${prop}` }),
            ]),
          );
        }
      }
    },
  );

  test.each(['default', 'no-invoke'] as const)(
    'root bigint conversion is guarded in %s mode',
    (inspection) => {
      const tooBig = BigInt('1' + '0'.repeat(16384));
      const report = new CorjMaker({
        inspection,
        maxReportSize: null,
        onReportingError: silent,
      }).makeReport(tooBig);
      expect(report.as_string).toBe(CORJ_TRUNCATED_MARKER);
      expect(report.truncated).toBe(true);
      expect(report).not.toHaveProperty('fingerprint');
      expect(report.reporting_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'limit', reportKey: 'as_string' }),
        ]),
      );
    },
  );

  test.each([1, -1])(
    'oversized fingerprint bigint %s omits the fingerprint, not the report',
    (sign) => {
      const records: CorjReportingError[] = [];
      const maker = new CorjMaker({
        fingerprintParts: [{ sourceProperty: 'large' }],
        onReportingError: (_, record) => records.push(record),
      });
      const caught = { large: BigInt(sign) * BigInt('1' + '0'.repeat(16384)) };
      expect(maker.makeFingerprint(caught)).toBeUndefined();
      expect(maker.makeReport(caught)).not.toHaveProperty('fingerprint');
      expect(records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reportKey: 'fingerprint' }),
        ]),
      );
      expect(maker.makeFingerprint({ large: BigInt(42) })).toMatch(/^fp1_/);
    },
  );

  test('JSON traversal stops even when properties consume no output space', () => {
    let reads = 0;
    const value: Record<string, unknown> = {};
    for (let i = 0; i < 20000; i++)
      Object.defineProperty(value, String(i), {
        enumerable: true,
        get: () => {
          reads++;
          return undefined;
        },
      });
    const view = new CorjMaker({ onReportingError: silent }).makeJsonView(
      value,
      { maxSize: null },
    );
    expect(reads).toBeLessThanOrEqual(10000);
    expect(view.truncated).toBe(true);
    expect(JSON.stringify(view.value)).toContain(CORJ_TRUNCATED_MARKER);
  });

  test('deep JSON retains partial content instead of overflowing the call stack', () => {
    let value: unknown = { end: true };
    for (let i = 0; i < 10000; i++) value = { next: value };
    const view = new CorjMaker({ onReportingError: silent }).makeJsonView(
      value,
      { maxSize: null },
    );
    expect(view.value).not.toBeNull();
    expect(view.truncated).toBe(true);
    expect(JSON.stringify(view.value)).toContain(CORJ_TRUNCATED_MARKER);
    expect(view.errors).toEqual([]);
  });

  test('repeated child references consume the inspection budget', () => {
    let reads = 0;
    const root: { errors: unknown[] } = { errors: [] };
    for (let i = 0; i < 20000; i++)
      Object.defineProperty(root.errors, i, {
        enumerable: true,
        get: () => {
          reads++;
          return root;
        },
      });
    const report = new CorjMaker({
      maxChildren: 1,
      maxReportSize: null,
      onReportingError: silent,
    }).makeReport(root);
    expect(reads).toBeLessThanOrEqual(10000);
    expect(report.truncated).toBe(true);
    expect(report).not.toHaveProperty('fingerprint');
    expect(report.reporting_errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'limit', reportKey: 'children' }),
      ]),
    );
  });

  test('oversized text is withheld before it reaches a redaction transform', () => {
    let largest = 0;
    const maker = new CorjMaker({
      maxReportSize: null,
      redact: {
        transform: (v) => {
          if (typeof v === 'string') largest = Math.max(largest, v.length);
          return v;
        },
      },
      onReportingError: silent,
    });
    const report = maker.makeReport({ message: 'SECRET'.repeat(200000) });
    expect(largest).toBeLessThanOrEqual(1000000);
    expect(report.message).toBe(CORJ_TRUNCATED_MARKER);
    expect(report.truncated).toBe(true);
    expect(JSON.stringify(report)).not.toContain('SECRET');
  });

  test('stack expansion is bounded and the full supported stack still fingerprints consistently', () => {
    const caught = { stack: 'Error: x\n' + '    at f (x:1:1)\n'.repeat(20000) };
    const maker = new CorjMaker({
      maxReportSize: null,
      onReportingError: silent,
    });
    const report = maker.makeReport(caught);
    expect((report.stack as string[]).length).toBeLessThanOrEqual(10001);
    expect((report.stack as string[]).at(-1)).toBe(CORJ_TRUNCATED_MARKER);
    expect(report.truncated).toBe(true);
    expect(report.fingerprint).toBe(maker.makeFingerprint(caught));
  });
});

describe('supported fp1 canonical inputs', () => {
  test('retains published baseline hashes for ordinary supported inputs', () => {
    expect(
      new CorjMaker({ onReportingError: silent }).makeFingerprint({
        name: 'Error',
        message: 'boom',
        stack: 'Error: boom\n    at run (/app.js:2:3)',
      }),
    ).toBe('fp1_e599f2ed7ad9a9c4428e04deaaee943d');
    expect(
      new CorjMaker({ onReportingError: silent }).makeFingerprint('same'),
    ).toBe('fp1_70b96275a08f2c9931bbbe960963219e');
    expect(
      new CorjMaker({
        fingerprintParts: [{ sourceProperty: 'large' }],
        onReportingError: silent,
      }).makeFingerprint({ large: BigInt(42) }),
    ).toBe('fp1_dc25dc097b1a8c523824036e2bf07878');
    const nested = new CorjMaker({
      fingerprintParts: [{ sourceProperty: 'details' }],
      onReportingError: silent,
    });
    expect(nested.makeFingerprint({ details: { b: 2, a: 'stable' } })).toBe(
      'fp1_6b8d95901833592bc6ed48f2f13bc072',
    );
    expect(nested.makeFingerprint({ details: { a: 'stable', b: 2 } })).toBe(
      'fp1_6b8d95901833592bc6ed48f2f13bc072',
    );
    expect(
      new CorjMaker({
        fingerprintParts: [{ sourceProperty: 'code' }],
        redact: {
          patterns: [/secret/g],
          transform: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
        },
        onReportingError: silent,
      }).makeFingerprint({ code: 'secret' }),
    ).toBe('fp1_6c907f4000bbf680ea67e0a91695c106');
  });

  test('JSON limits do not poison an independent fingerprint and all budgets reset next call', () => {
    const maker = new CorjMaker({
      fingerprintParts: [{ sourceProperty: 'code' }],
      onReportingError: silent,
      maxReportSize: null,
    });
    let deep: unknown = { end: true };
    for (let i = 0; i < 1000; i++) deep = { next: deep };
    const report = maker.makeReport({ code: 'ok', deep });
    expect(report.truncated).toBe(true);
    expect(report.fingerprint).toBe(maker.makeFingerprint({ code: 'ok' }));
    expect(maker.makeReport({ code: 'ok' }).truncated).toBeUndefined();
    expect(maker.makeJsonView({ ok: 1 }, { maxSize: null }).truncated).toBe(
      false,
    );
  });

  test('explicit fingerprints survive input safety omissions', () => {
    const report = new CorjMaker({
      maxReportSize: null,
      onReportingError: silent,
    }).makeReport(BigInt('1' + '0'.repeat(16384)), {
      fingerprint: 'application-group',
    });
    expect(report.fingerprint).toBe('application-group');
  });

  test('colliding fingerprint keys omit rather than silently changing the hash recipe', () => {
    const maker = new CorjMaker({
      fingerprintParts: [{ sourceProperty: 'details' }],
      redact: { patterns: [/secret[12]/g] },
      onReportingError: silent,
    });
    expect(
      maker.makeFingerprint({ details: { secret1: 1, secret2: 2 } }),
    ).toBeUndefined();
  });
});

test('oversized scalar subjects bypass policy callbacks entirely', () => {
  const seen: string[] = [];
  const maker = new CorjMaker({
    maxReportSize: null,
    fingerprintParts: null,
    redact: {
      transform: (v, c) => {
        if (c.reportKey === 'message' && c.stage === 'prop-access')
          seen.push(c.path);
        return v;
      },
    },
    onReportingError: silent,
  });
  const report = maker.makeReport({ message: 'SECRET'.repeat(200000) });
  expect(report.message).toBe(CORJ_TRUNCATED_MARKER);
  expect(seen).toEqual([]);
});

test('snapshot input limits mark standalone views truncated under named roots', () => {
  const maker = new CorjMaker({
    redact: { transform: (v) => v },
    onReportingError: silent,
  });
  const wide = Object.fromEntries(
    Array.from({ length: 10001 }, (_, i) => ['key' + i, i]),
  );
  const view = maker.makeJsonView(wide, { root: '$context', maxSize: null });
  expect(view.truncated).toBe(true);
  expect(view.errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ stage: 'limit' })]),
  );
  expect(
    maker.makeJsonView({ a: 1 }, { root: '$context', maxSize: null }).truncated,
  ).toBe(false);
});

describe('input boundary diagnostics and inspection guards', () => {
  test('diagnostics withhold expensive BigInt and text conversions', () => {
    for (const failure of [
      BigInt('1' + '0'.repeat(16384)),
      'SECRET'.repeat(200000),
    ]) {
      const caught = {
        get message() {
          throw failure;
        },
      };
      const report = new CorjMaker({
        onReportingError: silent,
        maxReportSize: null,
      }).makeReport(caught);
      expect(report.reporting_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ error: CORJ_TRUNCATED_MARKER }),
        ]),
      );
      expect(JSON.stringify(report)).not.toContain('SECRET');
    }
  });

  test('overlong custom graph IDs fall back to valid structural IDs', () => {
    const report = new CorjMaker({
      makeReportId: () => 'x'.repeat(1000001),
      onReportingError: silent,
    }).makeReportArray({ cause: new Error('child') });
    expect(report[0]!.id).toBe('root');
    expect(report[1]!.id).toBe('0');
    expect(report[0]!.child_ids).toEqual(['0']);
    expect(report[0]!.truncated).toBe(true);
  });

  test('no-invoke derived text is bounded before concatenation', () => {
    const maker = new CorjMaker({
      inspection: 'no-invoke',
      maxReportSize: null,
      onReportingError: silent,
    });
    for (const [name, message] of [
      ['x'.repeat(1000001), ''],
      ['', 'x'.repeat(1000001)],
      ['x'.repeat(500000), 'y'.repeat(500000)],
    ]) {
      const error = Object.create(Error.prototype) as Error;
      Object.defineProperties(error, {
        name: { value: name },
        message: { value: message },
      });
      expect(maker.makeReport(error).as_string).toBe(CORJ_TRUNCATED_MARKER);
    }
    expect(
      maker.makeReport({ [Symbol.toStringTag]: 'x'.repeat(1000000) }).as_string,
    ).toBe(CORJ_TRUNCATED_MARKER);
  });

  test('fingerprint text limits deduplicate diagnostics for equivalent source paths', () => {
    const maker = new CorjMaker({
      fingerprintParts: [{ path: ['map', 0] }, { path: ['map', '0'] }],
      onReportingError: silent,
    });
    const report = maker.makeReport({ map: { 0: 'x'.repeat(1000001) } });
    expect(report.fingerprint).toBeUndefined();
    expect(
      report.reporting_errors!.filter(
        (e) => e.stage === 'limit' && e.reportKey === 'fingerprint',
      ),
    ).toHaveLength(1);
    expect(report.truncated).toBe(true);
  });

  test('sorted fingerprint serialization rejects overwide canonical input', () => {
    const details = Object.fromEntries(
      Array.from({ length: 10001 }, (_, i) => ['key' + i, i]),
    );
    expect(
      new CorjMaker({
        fingerprintParts: [{ sourceProperty: 'details' }],
        onReportingError: silent,
      }).makeFingerprint({ details }),
    ).toBeUndefined();
  });

  test('a lossy transform snapshot withholds its fingerprint contribution', () => {
    expect(
      new CorjMaker({
        fingerprintParts: [{ sourceProperty: 'details' }],
        redact: { transform: (v) => v },
        onReportingError: silent,
      }).makeFingerprint({ details: { fn: () => undefined } }),
    ).toBeUndefined();
  });

  test('no-invoke source lookup stops at deep and repeating prototypes', () => {
    let deep: object = Object.create(null);
    for (let i = 0; i < 130; i++) deep = Object.create(deep) as object;
    let repeating: object;
    repeating = new Proxy({}, { getPrototypeOf: () => repeating });
    for (const value of [deep, repeating]) {
      const report = new CorjMaker({
        inspection: 'no-invoke',
        occurrenceIdSources: [{ path: ['value', 'absent'] }, () => 'fallback'],
        onReportingError: silent,
      }).makeReport({ value });
      expect(report.occurrence_id).toBe('fallback');
    }
  });
});

test('prototype safety exhaustion marks reports and fingerprint contributions unavailable', () => {
  let caught: object = { message: 'deep', stable: 'secret' };
  for (let i = 0; i < 130; i++) caught = Object.create(caught) as object;
  const maker = new CorjMaker({
    inspection: 'no-invoke',
    fingerprintParts: [{ sourceProperty: 'stable' }],
    onReportingError: silent,
  });
  const report = maker.makeReport(caught);
  expect(report.truncated).toBe(true);
  expect(report.fingerprint).toBeUndefined();
  expect(report.reporting_errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ stage: 'limit' })]),
  );
});

test('lazy-stack presence and descriptor checks reject deep and repeating prototype walks', () => {
  let deep: object = Object.create(null);
  for (let i = 0; i < 130; i++) deep = Object.create(deep) as object;
  let repeating: object;
  repeating = new Proxy({}, { getPrototypeOf: () => repeating });
  for (const value of [deep, repeating]) {
    expect(() => isDataProperty(value, 'absent')).toThrow(
      PrototypeInspectionLimitError,
    );
    expect(() => hasPropertyWithoutReading(value, 'absent')).toThrow(
      PrototypeInspectionLimitError,
    );
  }
});

test('JSON views report prototype safety exhaustion while checking lazy stacks', () => {
  let prototype: object = Object.create(null);
  for (let i = 0; i < 130; i++) prototype = Object.create(prototype) as object;
  const value = Object.create(prototype) as object;
  Object.defineProperty(value, 'stack', {
    value: 'Error: withheld',
    enumerable: true,
  });
  const view = new CorjMaker({
    inspection: 'no-invoke',
    onReportingError: silent,
  }).makeJsonView(value, { maxSize: null });
  expect(view.truncated).toBe(true);
  expect(view.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ stage: 'limit', reportKey: 'as_json' }),
    ]),
  );
});

test('non-idempotent scalar pattern changes never publish a changed fp1 recipe', () => {
  const maker = new CorjMaker({
    fingerprintParts: [{ sourceProperty: 'code' }],
    redact: { patterns: [/x/g], replacement: 'xx', transform: (v) => v },
    onReportingError: silent,
  });
  expect(maker.makeFingerprint({ code: 'x' })).toBeUndefined();
  expect(maker.makeReport({ code: 'x' }).fingerprint).toBeUndefined();
});

test('non-idempotent named-field and fallback changes withhold computed fingerprints', () => {
  const options = {
    redact: {
      patterns: [/x/g],
      replacement: 'xx',
      transform: (v: unknown) => v,
    },
    onReportingError: silent,
  };
  expect(
    new CorjMaker({
      ...options,
      fingerprintParts: ['message'],
    }).makeFingerprint({ message: 'x' }),
  ).toBeUndefined();
  expect(new CorjMaker(options).makeFingerprint('x')).toBeUndefined();
});

describe('arbitrary thrown values cannot interfere with prototype limit branding', () => {
  test.each(['default', 'no-invoke'] as const)(
    'reports retain failures when caught inspection throws a revoked proxy in %s mode',
    (inspection) => {
      const { proxy: failure, revoke } = Proxy.revocable({}, {});
      revoke();
      const caught =
        inspection === 'default'
          ? {
              get message() {
                throw failure;
              },
            }
          : new Proxy(
              {},
              {
                getOwnPropertyDescriptor() {
                  throw failure;
                },
              },
            );
      const maker = new CorjMaker({ inspection, onReportingError: silent });
      expect(() => maker.makeReport(caught)).not.toThrow();
      expect(() => maker.makeReportArray(caught)).not.toThrow();
      const childSource =
        inspection === 'default'
          ? new Proxy(
              {},
              {
                has() {
                  throw failure;
                },
              },
            )
          : new Proxy(
              {},
              {
                getOwnPropertyDescriptor() {
                  throw failure;
                },
              },
            );
      expect(() => maker.makeReport(childSource)).not.toThrow();
    },
  );

  test.each(['default', 'no-invoke'] as const)(
    'JSON views handle revoked proxy failures with and without transform snapshots in %s mode',
    (inspection) => {
      const { proxy: failure, revoke } = Proxy.revocable({}, {});
      revoke();
      for (const transform of [undefined, (value: unknown) => value]) {
        const caught = new Proxy(
          {},
          {
            ownKeys() {
              throw failure;
            },
          },
        );
        const maker = new CorjMaker({
          inspection,
          ...(transform === undefined ? {} : { redact: { transform } }),
          onReportingError: silent,
        });
        expect(() =>
          maker.makeJsonView(caught, { maxSize: null }),
        ).not.toThrow();
        expect(() => maker.makeReport(caught)).not.toThrow();
      }
    },
  );
});

test('excluding sparse-array length withholds incompatible transform fingerprints', () => {
  const details = [1, , ,];
  const maker = new CorjMaker({
    fingerprintParts: [{ sourceProperty: 'details' }],
    redact: { keys: ['length'], transform: (value) => value },
    onReportingError: silent,
  });
  const report = maker.makeReport({ details });
  expect(report.as_json).toEqual({ details: [1] });
  expect(report.fingerprint).toBeUndefined();
  expect(report.reporting_errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ reportKey: 'fingerprint' }),
    ]),
  );
});
