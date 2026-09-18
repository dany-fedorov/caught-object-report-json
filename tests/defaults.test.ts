import { CORJ_DEFAULT_OPTIONS, makeCorj } from '../src/index';

describe('defaults', () => {
  test('a report carries an id and a fingerprint out of the box', () => {
    const report = makeCorj(new Error('x'));
    expect(report.occurrence_id).toMatch(/^CORJ_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(report.fingerprint).toMatch(/^fp1_[0-9a-f]{32}$/);
  });

  test('the default lists are these, and frozen', () => {
    expect(CORJ_DEFAULT_OPTIONS.occurrenceIdSources).toEqual([{ auto: 'random' }]);
    expect(CORJ_DEFAULT_OPTIONS.fingerprintParts).toEqual(['constructor_name', 'stack']);
    expect(Object.isFrozen(CORJ_DEFAULT_OPTIONS.occurrenceIdSources)).toBe(true);
    expect(Object.isFrozen(CORJ_DEFAULT_OPTIONS.fingerprintParts)).toBe(true);
  });

  test('a test that needs a deterministic report turns both off, or pins them', () => {
    expect(
      makeCorj(new Error('x'), { occurrenceIdSources: null, fingerprintParts: null }),
    ).not.toHaveProperty('occurrence_id');
    const pinned = makeCorj(new Error('x'), undefined, {
      occurrenceId: 'test-id',
      fingerprint: 'test-fp',
    });
    expect([pinned.occurrence_id, pinned.fingerprint]).toEqual(['test-id', 'test-fp']);
  });
});
