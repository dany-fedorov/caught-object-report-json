import type { CorjOptionsInput } from '../src/index';

/**
 * corj 11 adds `occurrence_id` (random) and `fingerprint` (depends on stack line
 * numbers) to every report by default. Tests written against the 10.x shape pass
 * this to keep asserting exactly what they asserted before; the two fields have
 * their own suites.
 */
export const LEGACY: CorjOptionsInput = Object.freeze({
  occurrenceIdSources: null,
  fingerprintParts: null,
});
