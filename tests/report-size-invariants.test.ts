import {
  CaughtObjectReportJsonChild,
  CorjMaker,
  CorjMakerOptions,
  CorjReportSizeUnit,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

const units: CorjReportSizeUnit[] = ['utf8-bytes', 'utf16-code-units'];
const metadataCases = [
  false,
  true,
  { as_json_format: true, as_string_format: false, children_sources: false },
];
const matrix = units.flatMap((unit) =>
  [false, true].flatMap((array) =>
    [256, 257, 512, 1_024, 4_096].flatMap((limit) =>
      metadataCases.map((metadata, index) => ({
        unit,
        array,
        limit,
        metadata,
        name: `${
          array ? 'array' : 'object'
        } / ${unit} / ${limit} / metadata ${index}`,
      })),
    ),
  ),
);

function fixture(seed: number) {
  let state = seed;
  const next = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
  const characters = ['a', 'Ж', '界', '😀', '\n', '"', '\\', '\ud800'];
  const text = () =>
    characters[next() % characters.length]!.repeat(next() % 500);
  const node = (depth: number): Record<string, unknown> => {
    const value: Record<string, unknown> = {
      message: text(),
      stack: text() + '\n at operation (' + text() + ')',
      payload: {
        [text()]: text(),
        sequence: [
          null,
          undefined,
          Infinity,
          BigInt('9999999999999999'),
          text(),
        ],
      },
    };
    if (depth > 0) {
      value['cause'] = node(depth - 1);
      value['errors'] = [node(depth - 1), null];
    }
    // Cycles are in ordinary JSON data, not the child report graph.
    if (seed % 2 === 0) value['self'] = value;
    return value;
  };
  return node(seed % 3);
}

function measure(value: unknown, unit: CorjReportSizeUnit) {
  const json = JSON.stringify(value);
  return unit === 'utf8-bytes' ? Buffer.byteLength(json, 'utf8') : json.length;
}

function assertReferences(rows: CaughtObjectReportJsonChild[]) {
  const ids = new Set(rows.map((row) => row.id));
  expect(ids.size).toBe(rows.length);
  for (const row of rows) {
    for (const id of (row.children ?? []) as (string | null)[]) {
      if (id !== null) expect(ids.has(id)).toBe(true);
    }
  }
}

describe('whole-report invariants', () => {
  test.each(matrix)('$name', ({ unit, array, limit, metadata }) => {
    for (let seed = 1; seed <= 6; seed++) {
      const caught = fixture(seed);
      const original = fixture(seed);
      const options = {
        maxReportSize: limit,
        reportSizeUnit: unit,
        metadataFields: metadata,
        childrenMetadataFields: metadata,
        maxChildrenLevel: seed % 3,
        parseStackToArray: seed % 2 === 0,
        onCaughtMaking: null,
        printWarningsOnUnhandledErrors: false,
        makeReportId: ({ index }: { index: number }) =>
          `report-${seed}-${index}`,
      };
      const maker = CorjMaker.withDefaults(options);
      const unlimitedMaker = CorjMaker.withDefaults({
        ...options,
        maxReportSize: null,
      });
      const report = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const unlimited = array
        ? unlimitedMaker.makeReportArray(caught)
        : unlimitedMaker.makeReportObject(caught);

      expect(measure(report, unit)).toBeLessThanOrEqual(limit);
      const validate = array
        ? getReportArrayReportValidator()
        : getReportObjectReportValidator();
      expect(validate(report)).toBe(true);
      if (measure(unlimited, unit) <= limit) {
        expect(report).toEqual(unlimited);
      } else {
        const root = Array.isArray(report) ? report[0]! : report;
        expect(root.truncated).toBe(true);
      }
      const rows = Array.isArray(report)
        ? report
        : (report.children ?? []).filter(
            (row): row is CaughtObjectReportJsonChild => row !== null,
          );
      assertReferences(rows);
      expect(caught).toEqual(original);
    }
  });

  test.each(units)(
    'preserves exact-fit Unicode reports and truncates one unit below (%s)',
    (reportSizeUnit) => {
      const caught = { message: 'Ж😀'.repeat(100), payload: '界'.repeat(200) };
      const unlimited = CorjMaker.withDefaults({
        maxReportSize: null,
      }).makeReportObject(caught);
      const size = measure(unlimited, reportSizeUnit);
      const maker = CorjMaker.withDefaults({
        maxReportSize: size,
        reportSizeUnit,
      });
      expect(maker.makeReportObject(caught)).toEqual(unlimited);
      const smaller = maker
        .cloneWith({ maxReportSize: size - 1 })
        .makeReportObject(caught);
      expect(measure(smaller, reportSizeUnit)).toBeLessThanOrEqual(size - 1);
      expect(smaller.truncated).toBe(true);
      expect(getReportObjectReportValidator()(smaller)).toBe(true);
    },
  );

  test.each([true, false])(
    'cloning the size budget preserves boolean metadata settings (%s)',
    (metadataFields) => {
      const maker = CorjMaker.withDefaults({
        metadataFields,
        childrenMetadataFields: metadataFields,
      });
      const caught = { message: 'root', cause: { message: 'child' } };
      const clone = maker.cloneWith({
        maxReportSize: 10_000,
        reportSizeUnit: 'utf16-code-units',
      });
      expect(clone.options.metadataFields).toBe(metadataFields);
      expect(clone.options.childrenMetadataFields).toBe(metadataFields);
      expect(clone.makeReportObject(caught)).toEqual(
        maker.makeReportObject(caught),
      );
    },
  );

  test('does not re-run custom formatters while finding the whole-report budget', () => {
    let jsonCalls = 0;
    let stringCalls = 0;
    let payloadReads = 0;
    const caught = {
      toCorjAsJson() {
        jsonCalls++;
        return {
          get payload() {
            payloadReads++;
            return '😀'.repeat(1_000);
          },
        };
      },
      toCorjAsString() {
        stringCalls++;
        return 'Ж'.repeat(1_000);
      },
    };
    const errors: unknown[] = [];
    const report = CorjMaker.withDefaults({
      maxReportSize: 512,
      onCaughtMaking: (error) => errors.push(error),
    }).makeReportObject(caught);
    expect(measure(report, 'utf8-bytes')).toBeLessThanOrEqual(512);
    expect(report.truncated).toBe(true);
    expect({ jsonCalls, stringCalls, payloadReads }).toEqual({
      jsonCalls: 1,
      stringCalls: 1,
      payloadReads: 1,
    });
    expect(errors).toEqual([]);
  });

  test('does not infer truncation from marker text supplied by the caller', () => {
    const marker = '[caught-object-report-json: Truncated]';
    const maker = CorjMaker.withDefaults({ maxReportSize: 4_096 });
    expect(maker.makeReportObject('x'.repeat(5_000)).truncated).toBe(true);
    const report = maker.makeReportObject({
      message: marker,
      nested: { '...': marker },
    });
    expect(report.truncated).toBeUndefined();
    expect(report.as_json).toEqual({
      message: marker,
      nested: { '...': marker },
    });
  });

  test.each([false, true])(
    'propagates child truncation even when the assembled report fits (array=%s)',
    (array) => {
      const maker = CorjMaker.withDefaults({
        maxReportSize: 1_000,
        metadataFields: false,
        childrenMetadataFields: false,
      });
      const caught = { cause: { ['x'.repeat(2_000)]: 1 } };
      const report = array
        ? maker.makeReportArray(caught)
        : maker.makeReportObject(caught);
      const root = Array.isArray(report) ? report[0]! : report;
      const child = Array.isArray(report) ? report[1]! : report.children![0]!;
      expect(measure(report, 'utf8-bytes')).toBeLessThan(1_000);
      expect(root.truncated).toBe(true);
      expect(child.truncated).toBe(true);
    },
  );

  test('preserves retained custom IDs exactly when they contain escaped and multibyte characters', () => {
    const maker = CorjMaker.withDefaults({
      maxReportSize: 2_048,
      makeReportId: ({ index }) => `error-"\\😀-${index}`,
    });
    const caught = {
      errors: Array.from({ length: 30 }, (_, i) => ({
        message: 'child ' + i,
        cause: { message: 'nested ' + i },
      })),
    };
    const unlimited = maker
      .cloneWith({ maxReportSize: null })
      .makeReportArray(caught);
    const report = maker.makeReportArray(caught);
    expect(report.length).toBeGreaterThan(1);
    expect(report.length).toBeLessThan(unlimited.length);
    expect(measure(report, 'utf8-bytes')).toBeLessThanOrEqual(2_048);
    const byPath = new Map(unlimited.map((row) => [row.path, row]));
    for (const row of report) {
      const original = byPath.get(row.path)!;
      expect(row.id).toBe(original.id);
      for (const id of row.children ?? [])
        expect(original.children).toContain(id);
    }
    assertReferences(report);
  });

  test.each(['maxReportSize', 'reportSizeUnit'] as const)(
    'uses safe defaults if reading %s throws',
    (key) => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const options = Object.defineProperty({}, key, {
          get() {
            throw new Error('Unavailable option');
          },
        });
        const report = CorjMaker.withDefaults(options).makeReportObject({
          message: 'x'.repeat(120_000),
        });
        expect(measure(report, 'utf8-bytes')).toBeLessThanOrEqual(100_000);
        expect(getReportObjectReportValidator()(report)).toBe(true);
      } finally {
        warn.mockRestore();
      }
    },
  );

  test.each(['512', false, {}, []])(
    'rejects nonnumeric limits (%j)',
    (maxReportSize) => {
      expect(() =>
        CorjMaker.withDefaults({
          maxReportSize,
        } as unknown as CorjMakerOptions),
      ).toThrow();
    },
  );

  test.each([null, false, {}, 'utf16-bytes'])(
    'rejects unsupported measurement modes (%j)',
    (reportSizeUnit) => {
      expect(() =>
        CorjMaker.withDefaults({
          reportSizeUnit,
        } as unknown as CorjMakerOptions),
      ).toThrow();
    },
  );
});
