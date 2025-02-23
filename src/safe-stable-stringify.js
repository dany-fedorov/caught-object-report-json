'use strict';

/**
 * @dany-fedorov: This is inlined version of safe-stable-stringify commit 0c192c2c1e26676ba5af1f7dbe066b98d76f353f
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

function stringifyTypedArray(array, separator, maximumBreadth) {
  if (array.length < maximumBreadth) {
    maximumBreadth = array.length;
  }
  const whitespace = separator === ',' ? '' : ' ';
  let res = `"0":${whitespace}${array[0]}`;
  for (let i = 1; i < maximumBreadth; i++) {
    res += `${separator}"${i}":${whitespace}${array[i]}`;
  }
  return res;
}

function getCircularValueOption(options) {
  if (hasOwnProperty.call(options, 'circularValue')) {
    const circularValue = options.circularValue;
    if (typeof circularValue === 'string') {
      return `"${circularValue}"`;
    }
    if (circularValue == null) {
      return circularValue;
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

function getUniqueReplacerSet(replacerArray) {
  const replacerSet = new Set();
  for (const value of replacerArray) {
    if (typeof value === 'string' || typeof value === 'number') {
      replacerSet.add(String(value));
    }
  }
  return replacerSet;
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

  function stringifyFnReplacer(
    key,
    parent,
    stack,
    replacer,
    _spacer,
    indentation,
    curLength,
    _isRoot,
  ) {
    let value = parent[key];

    if (
      typeof value === 'object' &&
      value !== null &&
      typeof value.toJSON === 'function'
    ) {
      value = value.toJSON(key);
    }
    value = replacer.call(parent, key, value);

    switch (typeof value) {
      case 'string': {
        const val = strEscape(value);
        curLength += val.length;
        return [val, curLength];
      }
      case 'object': {
        if (value === null) {
          return ['null', curLength + 4];
        }
        if (stack.indexOf(value) !== -1) {
          curLength += circularValue.length;
          return [circularValue, curLength];
        }

        let res = '';
        let join = ',';

        if (Array.isArray(value)) {
          if (value.length === 0) {
            curLength += 2;
            return ['[]', curLength];
          }
          if (maximumDepth < stack.length + 1) {
            const val = '"[Array]"';
            curLength += val.length;
            return [val, curLength];
          }
          stack.push(value);
          const maximumValuesToStringify = Math.min(
            value.length,
            maximumBreadth,
          );
          let i = 0;
          for (; i < maximumValuesToStringify - 1; i++) {
            const [tmp, newCurLength] = stringifyFnReplacer(
              String(i),
              value,
              stack,
              replacer,
              null,
              indentation,
              curLength,
              false,
            );
            curLength = newCurLength;
            if (tmp !== undefined) {
              res += tmp;
            } else {
              res += 'null';
              curLength += 4;
            }
            res += join;
            curLength += join.length;
          }
          const [tmp, newCurLength] = stringifyFnReplacer(
            String(i),
            value,
            stack,
            replacer,
            null,
            indentation,
            curLength,
            false,
          );
          curLength = newCurLength;
          if (tmp !== undefined) {
            res += tmp;
          } else {
            res += 'null';
            curLength += 4;
          }
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1;
            const strToAdd = `${join}"... ${getItemCount(
              removedKeys,
            )} not stringified"`;
            res += strToAdd;
            curLength += strToAdd.length;
          }
          stack.pop();
          return [`[${res}]`, curLength + 2];
        }

        let keys = Object.keys(value);
        const keyLength = keys.length;
        if (keyLength === 0) {
          const val = '{}';
          curLength += val.length;
          return [val, curLength];
        }
        if (maximumDepth < stack.length + 1) {
          const val = '"[Object]"';
          curLength += val.length;
          return [val, curLength];
        }
        let whitespace = '';
        let separator = '';
        const maximumPropertiesToStringify = Math.min(
          keyLength,
          maximumBreadth,
        );
        if (deterministic && !isTypedArrayWithEntries(value)) {
          keys = sort(keys, comparator);
        }
        stack.push(value);
        for (let i = 0; i < maximumPropertiesToStringify; i++) {
          const key = keys[i];
          const [tmp, newCurLength] = stringifyFnReplacer(
            key,
            value,
            stack,
            replacer,
            null,
            indentation,
            curLength,
            false,
          );
          curLength = newCurLength;
          if (tmp !== undefined) {
            const prefix = `${separator}${strEscape(key)}:${whitespace}`;
            curLength += prefix.length;
            res += `${prefix}${tmp}`;
            separator = join;
          }
        }
        if (keyLength > maximumBreadth) {
          const removedKeys = keyLength - maximumBreadth;
          const newStr = `${separator}"...":${whitespace}"${getItemCount(
            removedKeys,
          )} not stringified"`;
          res += newStr;
          curLength += newStr;
          separator = join;
        }
        stack.pop();
        return [`{${res}}`, curLength + 2];
      }
      case 'number': {
        const val = isFinite(value)
          ? String(value)
          : fail
          ? fail(value)
          : 'null';
        curLength += typeof val?.length === 'number' ? val.length : 0;
        return [val, curLength];
      }
      case 'boolean': {
        const val = value === true ? 'true' : 'false';
        curLength += val.length;
        return [val, curLength];
      }
      case 'undefined':
        return [undefined, curLength];
      case 'bigint': {
        if (bigint) {
          const val = String(value);
          curLength += val.length;
          return [val, curLength];
        } else {
          const val = fail ? fail(value) : undefined;
          curLength += typeof val?.length === 'number' ? val.length : 0;
          return [val, curLength];
        }
      }
      // fallthrough
      default: {
        const val = fail ? fail(value) : undefined;
        curLength += typeof val?.length === 'number' ? val.length : 0;
        return [val, curLength];
      }
    }
  }

  function stringifySimple(key, value, stack, curLength, isRoot) {
    switch (typeof value) {
      case 'string': {
        const val = strEscape(value);
        curLength += val.length;
        return [val, curLength];
      }
      case 'object': {
        if (value === null) {
          return ['null', curLength + 4];
        }
        if (typeof value.toJSON === 'function') {
          value = value.toJSON(key);
          // Prevent calling `toJSON` again
          if (typeof value !== 'object') {
            return stringifySimple(key, value, stack, curLength, false);
          }
          if (value === null) {
            return ['null', curLength + 4];
          }
        }
        if (stack.indexOf(value) !== -1) {
          return [circularValue, curLength + circularValue.length];
        }

        let res = '';

        const hasLength = value.length !== undefined;
        if (hasLength && Array.isArray(value)) {
          if (value.length === 0) {
            return ['[]', curLength + 2];
          }
          if (maximumDepth < stack.length + 1) {
            const val = '"[Array]"';
            return [val, curLength + val.length];
          }
          stack.push(value);
          const maximumValuesToStringify = Math.min(
            value.length,
            maximumBreadth,
          );
          let i = 0;
          for (; i < maximumValuesToStringify - 1; i++) {
            const [tmp, newCurLength] = stringifySimple(
              String(i),
              value[i],
              stack,
              curLength,
              false,
            );
            curLength += newCurLength;
            if (tmp !== undefined) {
              res += tmp;
            } else {
              res += 'null';
              curLength += 4;
            }
            res += ',';
            curLength += 1;
          }
          const [tmp, newCurLength] = stringifySimple(
            String(i),
            value[i],
            stack,
            curLength,
            false,
          );
          curLength = newCurLength;
          if (tmp !== undefined) {
            res += tmp;
          } else {
            res += 'null';
            curLength += 4;
          }
          if (value.length - 1 > maximumBreadth) {
            const removedKeys = value.length - maximumBreadth - 1;
            const newStr = `,"... ${getItemCount(
              removedKeys,
            )} not stringified"`;
            res += newStr;
            curLength += newStr.length;
          }
          stack.pop();
          return [`[${res}]`, curLength + 2];
        }

        let keys = Object.keys(value);
        const keyLength = keys.length;
        if (keyLength === 0) {
          return ['{}', curLength + 2];
        }
        if (maximumDepth < stack.length + 1) {
          const val = '"[Object]"';
          return [val, curLength + val.length];
        }
        let separator = '';
        let maximumPropertiesToStringify = Math.min(keyLength, maximumBreadth);
        if (hasLength && isTypedArrayWithEntries(value)) {
          const newStr = stringifyTypedArray(value, ',', maximumBreadth);
          res += newStr;
          curLength += newStr.length;
          keys = keys.slice(value.length);
          maximumPropertiesToStringify -= value.length;
          separator = ',';
        }
        if (deterministic) {
          keys = sort(keys, comparator);
        }
        stack.push(value);
        for (let i = 0; i < maximumPropertiesToStringify; i++) {
          const key = keys[i];
          const [tmp, newCurLength] = stringifySimple(
            key,
            value[key],
            stack,
            curLength,
            false,
          );
          curLength = newCurLength;
          if (tmp !== undefined) {
            const prefix = `${separator}${strEscape(key)}:`;
            res += `${prefix}${tmp}`;
            curLength += prefix.length;
            separator = ',';
          }
        }
        if (keyLength > maximumBreadth) {
          const removedKeys = keyLength - maximumBreadth;
          const newStr = `${separator}"...":"${getItemCount(
            removedKeys,
          )} not stringified"`;
          res += newStr;
          curLength += newStr.length;
        }
        stack.pop();
        return [`{${res}}`, curLength + 2];
      }
      case 'number': {
        const val = isFinite(value)
          ? String(value)
          : fail
          ? fail(value)
          : 'null';
        curLength += typeof val?.length === 'number' ? val.length : 0;
        return [val, curLength];
      }
      case 'boolean': {
        const val = value === true ? 'true' : 'false';
        curLength += val.length;
        return [val, curLength];
      }
      case 'undefined':
        return [undefined, curLength];
      case 'bigint': {
        if (bigint) {
          const val = String(value);
          curLength += val.length;
          return [val, curLength];
        } else {
          const val = fail ? fail(value) : undefined;
          curLength += typeof val?.length === 'number' ? val.length : 0;
          return [val, curLength];
        }
      }
      // fallthrough
      default: {
        const val = fail ? fail(value) : undefined;
        curLength += typeof val?.length === 'number' ? val.length : 0;
        return [val, curLength];
      }
    }
  }

  function stringify(value, replacer) {
    if (arguments.length > 1) {
      if (replacer != null) {
        if (typeof replacer === 'function') {
          const [res, _length] = stringifyFnReplacer(
            '',
            { '': value },
            [],
            replacer,
            null,
            '',
            0,
            true,
          );
          return res;
        }
        if (Array.isArray(replacer)) {
          throw new Error(
            'caught-object-report-json::Internal Error: Array replacer is not supported',
          );
        }
      }
    }
    const [res, _length] = stringifySimple('', value, [], 0, true);
    return res;
  }

  return stringify;
}
