'use strict';

// This helper is shared with the bundled CommonJS serializer, so it is a
// CommonJS module too.

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Whether `prop` resolves to a data property, so reading it runs nothing.
 *
 * @param {unknown} host
 * @param {PropertyKey} prop
 * @returns {boolean}
 */
function isDataProperty(host, prop) {
  let current = host;
  while (current !== undefined && current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor !== undefined) return 'value' in descriptor;
    current = Object.getPrototypeOf(current);
  }
  // Absent is safe: formatting reads `undefined` and runs nothing.
  return true;
}

/**
 * Whether materializing `host.stack` would run code the caught object supplied.
 *
 * V8 builds the stack string on first read, reading `name` and `message` to do
 * it, so an accessor on either turns the read into a call into the caught
 * object. On Node 18 and 20 `stack` is an own data property V8 formats lazily,
 * and `Object.getOwnPropertyDescriptor(host, 'stack')` is itself that read:
 * asking this question has to come first, and it reads only the descriptors of
 * `name` and `message`, which is safe.
 *
 * `Error.prepareStackTrace` is a global application hook rather than anything
 * this object owns, and is out of reach either way.
 *
 * @param {unknown} host
 * @returns {boolean}
 */
function lazyStackFormattingIsSafe(host) {
  return isDataProperty(host, 'name') && isDataProperty(host, 'message');
}

/**
 * Whether `host` has `prop` at all, own or inherited, without materializing the
 * value: `hasOwnProperty` does not trigger V8's lazy stack formatting, while a
 * descriptor lookup does.
 *
 * @param {unknown} host
 * @param {PropertyKey} prop
 * @returns {boolean}
 */
function hasPropertyWithoutReading(host, prop) {
  let current = host;
  while (current !== undefined && current !== null) {
    if (hasOwnProperty.call(current, prop)) return true;
    current = Object.getPrototypeOf(current);
  }
  return false;
}

exports.isDataProperty = isDataProperty;
exports.lazyStackFormattingIsSafe = lazyStackFormattingIsSafe;
exports.hasPropertyWithoutReading = hasPropertyWithoutReading;
