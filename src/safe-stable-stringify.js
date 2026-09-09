'use strict';

/**
 * @dany-fedorov: This is a copy of https://github.com/BridgeAR/safe-stable-stringify commit 0c192c2c1e26676ba5af1f7dbe066b98d76f353f
 * Changes include
 * - Disable array replacer
 * - Disable indentation option
 * - Remove fn version without replacer, modify the one with replacer
 * - Add lengthLimit with valid partial JSON and early termination
 *
 * Copyright (c) Ruben Bridgewater. MIT license; see the notice below.
 */

/*
The MIT License (MIT)

Copyright (c) Ruben Bridgewater

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const { hasOwnProperty } = Object.prototype;

const stringify = configure();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
stringify.configure = configure;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
stringify.stringify = stringify;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
stringify.default = stringify;

// @ts-expect-error used for named export
exports.stringify = stringify;
// @ts-expect-error used for named export
exports.configure = configure;

module.exports = stringify;

// eslint-disable-next-line no-control-regex
const strEscapeSequencesRegExp = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;

// Escape C0 control characters, double quotes, the backslash and every code
// unit with a numeric value in the inclusive range 0xD800 to 0xDFFF.
function strEscape(str) {
  // Some magic numbers that worked out fine while benchmarking with v8 8.0
  if (str.length < 5000 && !strEscapeSequencesRegExp.test(str)) {
    return `"${str}"`;
  }
  return JSON.stringify(str);
}

function sort(array, comparator) {
  // Insertion sort is very efficient for small input sizes, but it has a bad
  // worst case complexity. Thus, use native array sort for bigger values.
  if (array.length > 2e2 || comparator) {
    return array.sort(comparator);
  }
  for (let i = 1; i < array.length; i++) {
    const currentValue = array[i];
    let position = i;
    while (position !== 0 && array[position - 1] > currentValue) {
      array[position] = array[position - 1];
      position--;
    }
    array[position] = currentValue;
  }
  return array;
}

const typedArrayPrototypeGetSymbolToStringTag = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array())),
  Symbol.toStringTag,
).get;

function isTypedArrayWithEntries(value) {
  return (
    typedArrayPrototypeGetSymbolToStringTag.call(value) !== undefined &&
    value.length !== 0
  );
}

function getCircularValueOption(options) {
  if (hasOwnProperty.call(options, 'circularValue')) {
    const circularValue = options.circularValue;
    if (typeof circularValue === 'string') {
      return strEscape(circularValue);
    }
    if (circularValue == null) {
      return circularValue === null ? 'null' : undefined;
    }
    if (circularValue === Error || circularValue === TypeError) {
      return {
        toString() {
          throw new TypeError('Converting circular structure to JSON');
        },
      };
    }
    throw new TypeError(
      'The "circularValue" argument must be of type string or the value null or undefined',
    );
  }
  return '"[Circular]"';
}

function getDeterministicOption(options) {
  let value;
  if (hasOwnProperty.call(options, 'deterministic')) {
    value = options.deterministic;
    if (typeof value !== 'boolean' && typeof value !== 'function') {
      throw new TypeError(
        'The "deterministic" argument must be of type boolean or comparator function',
      );
    }
  }
  return value === undefined ? true : value;
}

function getBooleanOption(options, key) {
  let value;
  if (hasOwnProperty.call(options, key)) {
    value = options[key];
    if (typeof value !== 'boolean') {
      throw new TypeError(`The "${key}" argument must be of type boolean`);
    }
  }
  return value === undefined ? true : value;
}

function getPositiveIntegerOption(options, key) {
  let value;
  if (hasOwnProperty.call(options, key)) {
    value = options[key];
    if (typeof value !== 'number') {
      throw new TypeError(`The "${key}" argument must be of type number`);
    }
    if (!Number.isInteger(value)) {
      throw new TypeError(`The "${key}" argument must be an integer`);
    }
    if (value < 1) {
      throw new RangeError(`The "${key}" argument must be >= 1`);
    }
  }
  return value === undefined ? Infinity : value;
}

function getItemCount(number) {
  if (number === 1) {
    return '1 item';
  }
  return `${number} items`;
}

function getStrictOption(options) {
  if (hasOwnProperty.call(options, 'strict')) {
    const value = options.strict;
    if (typeof value !== 'boolean') {
      throw new TypeError('The "strict" argument must be of type boolean');
    }
    if (value) {
      return (value) => {
        let message = `Object can not safely be stringified. Received type ${typeof value}`;
        if (typeof value !== 'function') message += ` (${value.toString()})`;
        throw new Error(message);
      };
    }
  }
}

function configure(options) {
  options = { ...options };
  const fail = getStrictOption(options);
  if (fail) {
    if (options.bigint === undefined) {
      options.bigint = false;
    }
    if (!('circularValue' in options)) {
      options.circularValue = Error;
    }
  }
  const circularValue = getCircularValueOption(options);
  const bigint = getBooleanOption(options, 'bigint');
  const deterministic = getDeterministicOption(options);
  const comparator =
    typeof deterministic === 'function' ? deterministic : undefined;
  const maximumDepth = getPositiveIntegerOption(options, 'maximumDepth');
  const maximumBreadth = getPositiveIntegerOption(options, 'maximumBreadth');
  const lengthLimit = getPositiveIntegerOption(options, 'lengthLimit');

  // Four characters allow a valid fallback (null) even if a marker cannot fit.
  if (lengthLimit < 4) {
    throw new RangeError('The "lengthLimit" argument must be >= 4');
  }

  /**
   * @param {unknown} value
   * @param {((this: object, key: string, value: any) => any) | null} [replacer]
   * @returns {string | undefined}
   */
  function stringify(value, replacer = null) {
    if (Array.isArray(replacer)) {
      throw new Error(
        'caught-object-report-json::Internal Error: Array replacer is not supported',
      );
    }
    // State belongs to this call so a replacer can safely invoke stringify again.
    const stack = [];
    const overflow = Symbol('length limit');
    const marker = '[caught-object-report-json: Truncated]';
    const markerJson = strEscape(marker);
    let truncated = false;

    function fit(json, budget) {
      if (json === undefined || json.length <= budget) return json;
      truncated = true;
      return overflow;
    }

    function truncateString(value, budget) {
      truncated = true;
      if (markerJson.length > budget) return overflow;
      // Search only a bounded prefix, without serializing a potentially huge string.
      let low = 0;
      let high = Math.min(value.length, budget - markerJson.length);
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (strEscape(value.slice(0, middle) + marker).length <= budget) {
          low = middle;
        } else {
          high = middle - 1;
        }
      }
      // Do not split a UTF-16 surrogate pair at the truncation boundary.
      if (
        low > 0 &&
        low < value.length &&
        value.charCodeAt(low - 1) >= 0xd800 &&
        value.charCodeAt(low - 1) <= 0xdbff &&
        value.charCodeAt(low) >= 0xdc00 &&
        value.charCodeAt(low) <= 0xdfff
      ) {
        low--;
      }
      return strEscape(value.slice(0, low) + marker);
    }

    function read(key, parent) {
      let value = parent[key];
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof value.toJSON === 'function'
      ) {
        value = value.toJSON(key);
      }
      return replacer ? replacer.call(parent, key, value) : value;
    }

    function serialize(value, budget) {
      switch (typeof value) {
        case 'string': {
          if (value.length + 2 <= budget) {
            const json = strEscape(value);
            if (json.length <= budget) return json;
          }
          return truncateString(value, budget);
        }
        case 'number':
          return fit(
            isFinite(value) ? String(value) : fail ? fail(value) : 'null',
            budget,
          );
        case 'boolean':
          return fit(value ? 'true' : 'false', budget);
        case 'undefined':
          return undefined;
        case 'bigint':
          // Reports parse this text back to JSON values. Count the eventual
          // number representation, which can grow when a bigint is rounded.
          return fit(
            bigint
              ? JSON.stringify(Number(value))
              : fail
              ? fail(value)
              : undefined,
            budget,
          );
        case 'object':
          break;
        default:
          return fail ? fail(value) : undefined;
      }
      if (value === null) return fit('null', budget);
      if (stack.indexOf(value) !== -1) {
        return fit(
          circularValue === undefined ? undefined : String(circularValue),
          budget,
        );
      }

      const isArray = Array.isArray(value);
      const open = isArray ? '[' : '{';
      const close = isArray ? ']' : '}';
      if (budget < 2) return fit(open + close, budget);
      let keys = isArray ? null : Object.keys(value);
      const count = isArray ? value.length : keys.length;
      if (count === 0) return open + close;
      if (maximumDepth < stack.length + 1) {
        return fit(isArray ? '"[Array]"' : '"[Object]"', budget);
      }
      if (!isArray && deterministic && !isTypedArrayWithEntries(value)) {
        keys = sort(keys, comparator);
      }
      const entries = [];
      // Reserve the closing delimiter before visiting any child.
      let length = 2;

      function append(key, json) {
        length += (entries.length ? 1 : 0) + json.length;
        entries.push({ key, json });
      }

      function finishTruncated() {
        truncated = true;
        // "..." is reserved for truncation metadata in an incomplete object.
        // Remove an existing occurrence rather than emit duplicate JSON keys.
        if (!isArray) {
          const index = entries.findIndex((entry) => entry.key === '...');
          if (index !== -1) {
            const [entry] = entries.splice(index, 1);
            length -= entry.json.length + (entries.length ? 1 : 0);
          }
        }
        const tail = isArray ? markerJson : '"...":' + markerJson;
        while (entries.length && length + 1 + tail.length > budget) {
          const entry = entries.pop();
          length -= entry.json.length + (entries.length ? 1 : 0);
        }
        if (length + (entries.length ? 1 : 0) + tail.length > budget) {
          return fit(markerJson, budget);
        }
        append('...', tail);
        return open + entries.map((entry) => entry.json).join(',') + close;
      }

      stack.push(value);
      try {
        const maximum = Math.min(count, maximumBreadth);
        for (let i = 0; i < maximum; i++) {
          const key = isArray ? String(i) : keys[i];
          const available = budget - length - (entries.length ? 1 : 0);
          if (isArray && available < 1) return finishTruncated();
          const child = read(key, value);
          // An overlong key need not be escaped, but its value must still pass
          // through the replacer: omitted properties consume no output space.
          const prefix = isArray
            ? ''
            : key.length + 3 > available
            ? null
            : strEscape(key) + ':';
          let json = serialize(
            child,
            prefix === null ? 0 : available - prefix.length,
          );
          if (json === undefined) {
            if (!isArray) continue;
            json = fit('null', available);
          }
          if (json === overflow || prefix === null) return finishTruncated();
          append(key, prefix + json);
          if (truncated) break;
        }
        if (!truncated && count > maximumBreadth) {
          const omitted =
            getItemCount(count - maximumBreadth) + ' not stringified';
          const tail = isArray
            ? strEscape('... ' + omitted)
            : '"...":' + strEscape(omitted);
          if (length + (entries.length ? 1 : 0) + tail.length > budget)
            return finishTruncated();
          append('...', tail);
        }
        return open + entries.map((entry) => entry.json).join(',') + close;
      } finally {
        stack.pop();
      }
    }

    const result = serialize(read('', { '': value }), lengthLimit);
    // Tiny budgets cannot hold the marker. This fallback is always valid JSON.
    return result === overflow
      ? markerJson.length <= lengthLimit
        ? markerJson
        : 'null'
      : result;
  }

  return stringify;
}
