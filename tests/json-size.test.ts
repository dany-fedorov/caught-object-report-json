import { measureStringSize } from '../src/json-size';

describe('JSON string size measurement', () => {
  test.each([
    '',
    'ASCII',
    'Привіт',
    '漢字',
    '😀',
    'a😀Ж界z',
    '\ud800',
    '\udfff',
    '\ud800\ud800\udc00\udfff',
    '\u007f\u0080\u07ff\u0800\uffff',
    '{"ключ":"😀","escaped":"\\n\\"\\\\\\ud800"}',
  ])('matches UTF-8 encoding for %j', (text) => {
    expect(measureStringSize(text)).toBe(Buffer.byteLength(text, 'utf8'));
    expect(measureStringSize(text, 'utf8-bytes')).toBe(
      Buffer.byteLength(text, 'utf8'),
    );
  });

  test('measures JSON escapes as the serialized ASCII text', () => {
    const text = JSON.stringify('\ud800\n"\\');
    expect(measureStringSize(text)).toBe(14);
    expect(measureStringSize(text, 'utf16-code-units')).toBe(14);
  });

  test('counts surrogate pairs as two UTF-16 code units', () => {
    expect(measureStringSize('a😀Ж', 'utf16-code-units')).toBe(4);
  });
});
