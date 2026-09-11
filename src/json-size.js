'use strict';

/** @typedef {'utf8-bytes' | 'utf16-code-units'} JsonSizeUnit */

// eslint-disable-next-line no-control-regex
const nonAsciiRegExp = /[^\u0000-\u007f]/;

/**
 * Measures text as it will be stored or transmitted, without serializing it.
 *
 * @param {string} text Already serialized text.
 * @param {JsonSizeUnit} [unit='utf8-bytes']
 * @returns {number}
 */
function measureStringSize(text, unit = 'utf8-bytes') {
  if (unit === 'utf16-code-units') return text.length;
  // ASCII text is one byte per code unit; the native regex test is far cheaper
  // than the per-character loop below.
  if (!nonAsciiRegExp.test(text)) return text.length;
  let size = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      size++;
    } else if (code < 0x800) {
      size += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      text.charCodeAt(i + 1) >= 0xdc00 &&
      text.charCodeAt(i + 1) <= 0xdfff
    ) {
      size += 4;
      i++;
    } else {
      // Unpaired surrogates encode as the three-byte replacement character.
      size += 3;
    }
  }
  return size;
}

exports.measureStringSize = measureStringSize;
