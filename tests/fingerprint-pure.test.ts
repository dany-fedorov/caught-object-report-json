import {
  fingerprintOf,
  hasStackFrames,
  resolveFingerprintParts,
  stackWithoutHeader,
} from '../src/fingerprint';
import { sha256Hex } from '../src/sha256';

describe('stackWithoutHeader', () => {
  test("cuts the node's own string form from the head, multi-line messages included", () => {
    const error = new Error('line one\nline two');
    const rest = stackWithoutHeader(error.stack!, String(error));
    expect(rest.startsWith('    at ')).toBe(true);
    expect(rest).not.toContain('line one');
  });

  test('falls back to the first V8 frame line when the string form does not match', () => {
    const stack =
      'Error: User 12345 not found\n    at run (/app/a.js:1:1)\n    at main (/app/b.js:2:2)';
    expect(stackWithoutHeader(stack, 'custom toString')).toBe(
      '    at run (/app/a.js:1:1)\n    at main (/app/b.js:2:2)',
    );
  });

  test('leaves a stack without a header alone (Firefox, Safari)', () => {
    const stack = 'run@file.js:1:2\nmain@file.js:9:1';
    expect(stackWithoutHeader(stack, 'Error: x')).toBe(stack);
  });

  test('a stack that is only the header becomes empty', () => {
    expect(stackWithoutHeader('Error: x', 'Error: x')).toBe('');
  });

  test.each([[undefined], [null], [''], [42]])(
    'ignores the string form %p',
    (asString) => {
      expect(stackWithoutHeader('Error: x\n    at a (b:1:1)', asString)).toBe(
        '    at a (b:1:1)',
      );
    },
  );

  test('a prefix that stops inside the header is not a header', () => {
    // `toCorjAsString: () => 'E'` prefixes `Error: <message>`; cutting there
    // would leave the message in what the `stack` part contributes.
    const stack = 'Error: User 12345 not found\n    at run (/app/a.js:1:1)';
    expect(stackWithoutHeader(stack, 'E')).toBe('    at run (/app/a.js:1:1)');
  });

  test('a partial prefix with no frame line leaves the stack alone', () => {
    expect(stackWithoutHeader('Error: no frames here', 'E')).toBe(
      'Error: no frames here',
    );
  });
});

describe('hasStackFrames', () => {
  test.each([
    ['a V8 frame', '    at run (/app/a.js:1:1)\n    at main (/app/b.js:2:2)'],
    ['a V8 frame with no parentheses', '    at /app/a.js:1:1'],
    ['a V8 frame after a first line', 'Error: x\n    at run (/app/a.js:1:1)'],
    ['a Firefox frame', 'run@file:///app/a.js:1:2\nmain@file:///app/b.js:9:1'],
    ['a Safari frame', 'global code@https://example.com/main.js:44:3'],
    ['a Firefox frame with no column', 'run@file:///app/a.js:1'],
  ])('%s is a frame', (_label, cut) => {
    expect(hasStackFrames(cut)).toBe(true);
  });

  test.each([
    ['a bare sentence', 'PIN 4921 rejected for alice@example.com'],
    ['nothing at all', ''],
    ['the redaction marker', '[redacted]'],
    ['the no-invoke marker', '[not-inspected]'],
    ['a message containing the word at', 'the pool closed at midnight'],
    ['an address with no line number', 'alice@example.com'],
    ['a message that only mentions a file', 'failed to open /app/a.js:1:1'],
  ])('%s is not a frame', (_label, cut) => {
    expect(hasStackFrames(cut)).toBe(false);
  });
});

describe('resolveFingerprintParts', () => {
  test('null and [] both mean off', () => {
    expect(resolveFingerprintParts(null)).toBeNull();
    expect(resolveFingerprintParts([])).toBeNull();
  });

  test('named parts are sorted by label; functions keep their order after them', () => {
    const first = () => 1;
    const second = () => 2;
    const resolved = resolveFingerprintParts([
      'stack',
      first,
      { path: ['details', 'tool'] },
      'constructor_name',
      second,
      { field: '_tag' },
    ])!;
    expect(resolved.map((r) => r.label)).toEqual([
      'constructor_name',
      'field:_tag',
      'path:["details","tool"]',
      'stack',
      'fn:0',
      'fn:1',
    ]);
    expect(resolved[4]!.part).toBe(first);
    expect(resolved[5]!.part).toBe(second);
  });

  test.each([
    [5, 'fingerprintParts must be an array or null'],
    [
      ['as_json'],
      'fingerprintParts[0] must be one of as_string, constructor_name, message, stack, typeof, an entry object, or a function',
    ],
    [['stack', 'stack'], 'fingerprintParts[1] repeats "stack"'],
    [[{ field: 'a' }, { field: 'a' }], 'fingerprintParts[1] repeats "field:a"'],
    [[{ field: '' }], 'fingerprintParts[0].field must be a nonempty string'],
    [[null], 'fingerprintParts[0] must be one of'],
  ] as [unknown, string][])('rejects %j', (value, message) => {
    expect(() => resolveFingerprintParts(value)).toThrow(message);
  });
});

describe('fingerprintOf', () => {
  const labels = ['constructor_name', 'stack'];

  test('is fp1_ plus 32 lowercase hex characters', () => {
    expect(
      fingerprintOf(
        labels,
        [['$', ['Error', 'frames']]],
        ['object', 'Error: x'],
      ),
    ).toMatch(/^fp1_[0-9a-f]{32}$/);
  });

  test('an empty row list still hashes', () => {
    expect(fingerprintOf(labels, [], ['object', null])).toMatch(
      /^fp1_[0-9a-f]{32}$/,
    );
  });

  test('is a pure function of its input', () => {
    const rows = [['$', ['Error', 'frames']] as const];
    expect(fingerprintOf(labels, rows, ['object', 'a'])).toBe(
      fingerprintOf(labels, rows, ['object', 'b']),
    );
  });

  test('values cannot slide between slots', () => {
    expect(
      fingerprintOf(labels, [['$', ['ab', 'c']]], ['object', null]),
    ).not.toBe(fingerprintOf(labels, [['$', ['a', 'bc']]], ['object', null]));
    expect(
      fingerprintOf(labels, [['$', [null, 'x']]], ['object', null]),
    ).not.toBe(fingerprintOf(labels, [['$', ['x', null]]], ['object', null]));
  });

  test('the recipe is part of the input', () => {
    const rows = [['$', ['same', 'same']] as const];
    expect(
      fingerprintOf(['constructor_name', 'stack'], rows, ['object', null]),
    ).not.toBe(fingerprintOf(['message', 'stack'], rows, ['object', null]));
  });

  test('the path is part of the input', () => {
    expect(
      fingerprintOf(
        labels,
        [
          ['$', ['A', 'f']],
          ['$.cause', ['B', 'g']],
        ],
        ['object', null],
      ),
    ).not.toBe(
      fingerprintOf(
        labels,
        [
          ['$', ['A', 'f']],
          ['$.errors[0]', ['B', 'g']],
        ],
        ['object', null],
      ),
    );
  });

  test('an empty root falls back to typeof and the string form', () => {
    const empty = [['$', [null, '']] as const];
    expect(fingerprintOf(labels, empty, ['string', 'socket closed'])).not.toBe(
      fingerprintOf(labels, empty, ['string', 'disk full']),
    );
    expect(fingerprintOf(labels, empty, ['string', 'same'])).not.toBe(
      fingerprintOf(labels, empty, ['number', 'same']),
    );
  });

  test('a root without a stack always carries the fallback, even when a part has a value', () => {
    // A thrown string has constructor_name "String", so its row is not empty.
    const row = [['$', ['String', null]] as const];
    expect(
      fingerprintOf(labels, row, ['string', 'socket closed'], true),
    ).not.toBe(fingerprintOf(labels, row, ['string', 'disk full'], true));
    expect(fingerprintOf(labels, row, ['string', 'a'], false)).toBe(
      fingerprintOf(labels, row, ['string', 'b'], false),
    );
  });

  test('the exact input format is pinned', () => {
    // sha256 of JSON.stringify(['fp1', ['constructor_name','stack'], [['$', ['Error','f']]]])
    const input = JSON.stringify(['fp1', labels, [['$', ['Error', 'f']]]]);
    expect(
      fingerprintOf(labels, [['$', ['Error', 'f']]], ['object', 'Error: x']),
    ).toBe(`fp1_${sha256Hex(input).slice(0, 32)}`);
  });
});
