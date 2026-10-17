'use strict';

const INPUT_MAX_VISITS = 10_000;
const INPUT_MAX_DEPTH = 128;
const INPUT_MAX_TEXT_LENGTH = 1_000_000;
const INPUT_MAX_BIGINT_DIGITS = 16_384;
const INPUT_MAX_STACK_LINES = 10_000;
// Compare magnitudes before any library-controlled decimal conversion.
const BIGINT_THRESHOLD = BigInt('1' + '0'.repeat(INPUT_MAX_BIGINT_DIGITS));
const NEGATIVE_BIGINT_THRESHOLD = -BIGINT_THRESHOLD;

function bigintExceedsInputLimit(value) {
  return value >= BIGINT_THRESHOLD || value <= NEGATIVE_BIGINT_THRESHOLD;
}

module.exports = {
  INPUT_MAX_VISITS,
  INPUT_MAX_DEPTH,
  INPUT_MAX_TEXT_LENGTH,
  INPUT_MAX_BIGINT_DIGITS,
  INPUT_MAX_STACK_LINES,
  bigintExceedsInputLimit,
};
