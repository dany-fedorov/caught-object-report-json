import { CorjMaker, makeCorj, makeCorjArray } from '../src/index';
import type { CorjOccurrenceIdSource, CorjReportingError } from '../src/index';

// The compile target predates `cause`; the runtime has it.
const ErrorWithCause = Error as unknown as new (
  message?: string,
  options?: { cause?: unknown },
) => Error;

const silent = () => undefined;
const withSources = (
  occurrenceIdSources: readonly CorjOccurrenceIdSource[] | null,
) => new CorjMaker({ onError: silent, occurrenceIdSources });

describe('occurrence_id', () => {
  test('null and [] both turn the field off', () => {
    expect(
      withSources(null).makeReportObject(new Error('x')),
    ).not.toHaveProperty('occurrence_id');
    expect(withSources([]).makeReportObject(new Error('x'))).not.toHaveProperty(
      'occurrence_id',
    );
  });

  test('auto random: one object, one id, across calls and makers', () => {
    const error = new Error('x');
    const a = withSources([{ auto: 'random' }]).makeReportObject(
      error,
    ).occurrence_id;
    const b = withSources([{ auto: 'random' }]).makeReportObject(
      error,
    ).occurrence_id;
    expect(a).toMatch(/^CORJ_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(b).toBe(a);
  });

  test('the first source that yields a valid id wins', () => {
    const maker = withSources([
      { field: 'requestId' },
      { field: 'traceId' },
      { auto: 'random' },
    ]);
    expect(
      maker.makeReportObject(
        Object.assign(new Error('x'), { requestId: 'req-1', traceId: 't-1' }),
      ).occurrence_id,
    ).toBe('req-1');
    expect(
      maker.makeReportObject(Object.assign(new Error('x'), { traceId: 't-1' }))
        .occurrence_id,
    ).toBe('t-1');
    expect(maker.makeReportObject(new Error('x')).occurrence_id).toMatch(
      /^CORJ_/,
    );
  });

  test.each([
    [42],
    [''],
    ['has space'],
    ['x'.repeat(129)],
    [{ nested: 1 }],
    [null],
  ])('an invalid field value %j falls through silently', (value) => {
    const report = withSources([{ field: 'requestId' }]).makeReportObject(
      Object.assign(new Error('x'), { requestId: value }),
    );
    expect(report).not.toHaveProperty('occurrence_id');
    expect(report).not.toHaveProperty('reporting_errors');
  });

  test('a path entry walks into the value, array indexes included', () => {
    const error = Object.assign(new Error('x'), {
      response: {
        headers: { 'x-request-id': 'req-9' },
        ids: ['first', 'second'],
      },
    });
    expect(
      withSources([
        { path: ['response', 'headers', 'x-request-id'] },
      ]).makeReportObject(error).occurrence_id,
    ).toBe('req-9');
    expect(
      withSources([{ path: ['response', 'ids', 1] }]).makeReportObject(error)
        .occurrence_id,
    ).toBe('second');
    expect(
      withSources([
        { path: ['response', 'missing', 'deeper'] },
      ]).makeReportObject(error),
    ).not.toHaveProperty('occurrence_id');
  });

  test('sources read the root only, never a cause', () => {
    const error = new ErrorWithCause('outer', {
      cause: Object.assign(new Error('inner'), { requestId: 'inner-1' }),
    });
    expect(
      withSources([{ field: 'requestId' }]).makeReportObject(error),
    ).not.toHaveProperty('occurrence_id');
  });

  test('a getter runs under the default inspection and is skipped under no-invoke', () => {
    let ran = 0;
    class WithGetter extends Error {
      get requestId() {
        ran++;
        return 'from-getter';
      }
    }
    expect(
      withSources([{ field: 'requestId' }]).makeReportObject(
        new WithGetter('x'),
      ).occurrence_id,
    ).toBe('from-getter');
    const before = ran;
    const strict = new CorjMaker({
      onError: silent,
      inspection: 'no-invoke',
      occurrenceIdSources: [{ field: 'requestId' }, { auto: 'random' }],
    });
    expect(strict.makeReportObject(new WithGetter('x')).occurrence_id).toMatch(
      /^CORJ_/,
    );
    expect(ran).toBe(before);
  });

  test('a per-entry inspection overrides the maker in both directions', () => {
    let ran = 0;
    class WithGetter extends Error {
      get requestId() {
        ran++;
        return 'from-getter';
      }
    }
    const tightened = withSources([
      { field: 'requestId', inspection: 'no-invoke' },
    ]);
    expect(tightened.makeReportObject(new WithGetter('x'))).not.toHaveProperty(
      'occurrence_id',
    );
    expect(ran).toBe(0);
    const loosened = new CorjMaker({
      onError: silent,
      inspection: 'no-invoke',
      occurrenceIdSources: [{ field: 'requestId', inspection: 'default' }],
    });
    expect(loosened.makeReportObject(new WithGetter('x')).occurrence_id).toBe(
      'from-getter',
    );
  });

  test('a throwing getter is recorded and resolution continues', () => {
    const error = new Error('x');
    Object.defineProperty(error, 'requestId', {
      get() {
        throw new Error('id getter failed');
      },
    });
    const report = withSources([
      { field: 'requestId' },
      { auto: 'random' },
    ]).makeReportObject(error);
    expect(report.occurrence_id).toMatch(/^CORJ_/);
    expect(report.reporting_errors).toEqual([
      expect.objectContaining({
        stage: 'prop-access',
        key: 'occurrence_id',
        prop: 'requestId',
      }),
    ]);
  });

  test('a skip rule hides the field from the chain too', () => {
    const maker = new CorjMaker({
      onError: silent,
      redact: { keys: ['requestId'] },
      occurrenceIdSources: [{ field: 'requestId' }],
    });
    expect(
      maker.makeReportObject(
        Object.assign(new Error('x'), { requestId: 'req-1' }),
      ),
    ).not.toHaveProperty('occurrence_id');
  });

  test('the id is never passed through the scrub rules', () => {
    const maker = new CorjMaker({
      onError: silent,
      redact: { patterns: [/req/g] },
      occurrenceIdSources: [{ field: 'requestId' }],
    });
    expect(
      maker.makeReportObject(
        Object.assign(new Error('x'), { requestId: 'req-1' }),
      ).occurrence_id,
    ).toBe('req-1');
  });

  test('a function source gets the root id context; invalid results fall through; a throw is recorded', () => {
    const seen: unknown[] = [];
    const error = new Error('x');
    const report = withSources([
      (context) => {
        seen.push(context);
        return 42;
      },
      () => {
        throw new Error('source failed');
      },
      () => 'fn-id',
    ]).makeReportObject(error);
    expect(seen).toEqual([{ index: -1, level: 0, path: '$', caught: error }]);
    expect(report.occurrence_id).toBe('fn-id');
    expect(report.reporting_errors).toEqual([
      {
        stage: 'other',
        path: '$',
        key: 'occurrence_id',
        error: 'Error: source failed',
      },
    ]);
  });

  test('the call argument wins over every source', () => {
    const maker = withSources([{ field: 'requestId' }]);
    expect(
      maker.makeReportObject(
        Object.assign(new Error('x'), { requestId: 'req-1' }),
        {
          occurrenceId: 'explicit-1',
        },
      ).occurrence_id,
    ).toBe('explicit-1');
    // and works with the feature off
    expect(
      withSources(null).makeReportObject('primitive', {
        occurrenceId: 'explicit-2',
      }).occurrence_id,
    ).toBe('explicit-2');
  });

  test.each([[''], ['has space'], ['x'.repeat(129)], [7]])(
    'an invalid call argument %j is recorded and falls through to the sources',
    (occurrenceId) => {
      const records: CorjReportingError[] = [];
      const maker = new CorjMaker({
        onError: (_caught, record) => void records.push(record),
        occurrenceIdSources: [{ field: 'requestId' }],
      });
      const report = maker.makeReportObject(
        Object.assign(new Error('x'), { requestId: 'req-1' }),
        { occurrenceId: occurrenceId as string },
      );
      // Runtime data, not configuration: reporting one error never throws a second.
      expect(report.occurrence_id).toBe('req-1');
      expect(report.reporting_errors).toEqual([
        {
          stage: 'other',
          path: '$',
          key: 'occurrence_id',
          error:
            'occurrenceId must be 1 to 128 printable ASCII characters without spaces',
        },
      ]);
      expect(records).toHaveLength(1);
    },
  );

  test('an invalid call argument is never quoted back', () => {
    const report = withSources(null).makeReportObject(new Error('x'), {
      occurrenceId: 'req 42',
    });
    expect(report).not.toHaveProperty('occurrence_id');
    expect(JSON.stringify(report)).not.toContain('req 42');
  });

  test('a paths rule on an intermediate segment stops the read', () => {
    const caught = Object.assign(new Error('x'), {
      a: { b: { id: 'deep-1' } },
    });
    const entry = { path: ['a', 'b', 'id'] } as const;
    expect(withSources([entry]).makeReportObject(caught).occurrence_id).toBe(
      'deep-1',
    );
    const skipping = new CorjMaker({
      onError: silent,
      occurrenceIdSources: [entry],
      redact: { paths: ['$.a.b'] },
    });
    expect(skipping.makeReportObject(caught)).not.toHaveProperty(
      'occurrence_id',
    );
  });

  test('a per-entry inspection applies at every segment of a path', () => {
    const caught = Object.assign(new Error('x'), {
      a: {
        get b(): { id: string } {
          return { id: 'deep-2' };
        },
      },
    });
    const source = (inspection: 'default' | 'no-invoke') =>
      ({ path: ['a', 'b', 'id'], inspection } as const);
    // The first segment is a data property, so only the second can be refused.
    expect(
      withSources([source('no-invoke')]).makeReportObject(caught),
    ).not.toHaveProperty('occurrence_id');
    expect(
      new CorjMaker({
        onError: silent,
        inspection: 'no-invoke',
        occurrenceIdSources: [source('default')],
      }).makeReportObject(caught).occurrence_id,
    ).toBe('deep-2');
  });

  test('occurrence_id is the first key of the root, in both shapes', () => {
    const options = {
      onError: silent,
      occurrenceIdSources: [{ auto: 'random' }],
    } as const;
    expect(Object.keys(makeCorj(new Error('x'), options))[0]).toBe(
      'occurrence_id',
    );
    const rows = makeCorjArray(
      new ErrorWithCause('x', { cause: new Error('y') }),
      options,
    );
    expect(Object.keys(rows[0]!)[0]).toBe('occurrence_id');
    expect(rows[1]).not.toHaveProperty('occurrence_id');
  });

  test('the id survives the tightest budget', () => {
    const report = makeCorj(new Error('m'.repeat(5000)), {
      maxReportSize: 512,
      occurrenceIdSources: [{ auto: 'random' }],
    });
    expect(report.occurrence_id).toMatch(/^CORJ_/);
  });

  test.each([
    [5, 'occurrenceIdSources must be an array or null'],
    [[{ auto: 'uuid' }], 'occurrenceIdSources[0].auto must be "random"'],
    [
      [{ auto: 'random' }, { field: 'id' }],
      'occurrenceIdSources[1] can never be reached: it follows { auto }',
    ],
    [['requestId'], 'occurrenceIdSources[0] must be an object or a function'],
    [[{ field: '' }], 'occurrenceIdSources[0].field must be a nonempty string'],
  ])('rejects the option %j', (value, message) => {
    expect(
      () => new CorjMaker({ occurrenceIdSources: value as never }),
    ).toThrow(message);
  });
});
