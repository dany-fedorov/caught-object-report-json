import {
  CORJ_TRUNCATED_MARKER,
  CorjMaker,
  CorjOptionsInput,
  CorjReport,
  CorjReportChild,
  CorjReportSizeUnit,
  makeCorj,
  makeCorjArray,
  restoreExpectedValues,
} from '../src';
import {
  getReportArrayReportValidator,
  getReportObjectReportValidator,
} from './utils/getReportObjectReportValidator';

// Deterministic pseudo-random generator so a failure can be replayed by seed.
function rng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
  return {
    int: (max: number) => next() % max,
    chance: (p: number) => next() / 0x1_0000_0000 < p,
    pick: <T>(items: readonly T[]): T => items[next() % items.length]!,
  };
}

type Random = ReturnType<typeof rng>;

const fragments = [
  'a',
  'Ж',
  '界',
  '😀',
  '\n',
  '"',
  '\\',
  '\ud800',
  ': ',
  ' at x (y:1:2)',
];

function text(random: Random, max = 80): string {
  let out = '';
  const length = random.int(max);
  for (let i = 0; i < length; i++) out += random.pick(fragments);
  return out;
}

function throwingGetter(target: object, prop: string) {
  Object.defineProperty(target, prop, {
    get() {
      throw new Error(`getter ${prop} threw`);
    },
    configurable: true,
  });
}

/** Builds an error-like graph with cycles, shared nodes, proxies and hostile members. */
function graph(
  random: Random,
  budget: { nodes: number },
  pool: object[],
): unknown {
  if (budget.nodes <= 0) return random.pick(['leaf', null, 0, undefined]);
  budget.nodes--;
  const kind = random.int(10);
  if (kind === 0)
    return random.pick([
      'str',
      42,
      true,
      null,
      undefined,
      BigInt(7),
      Symbol('s'),
      () => 1,
    ]);
  if (kind === 1 && pool.length > 0) return random.pick(pool);
  let node: Record<string, unknown>;
  if (kind <= 5) {
    node = new Error(text(random)) as unknown as Record<string, unknown>;
  } else if (kind <= 7) {
    node = { message: text(random), stack: text(random, 200) };
  } else {
    node = Object.create(null) as Record<string, unknown>;
    node['payload'] = {
      deep: { list: [text(random, 500), BigInt(1), undefined, Infinity] },
    };
  }
  pool.push(node);
  const children = () => {
    const count = random.int(4);
    const items: unknown[] = [];
    for (let i = 0; i < count; i++) items.push(graph(random, budget, pool));
    if (random.chance(0.2)) items.length += random.int(3); // holes
    return items;
  };
  if (random.chance(0.6))
    node['cause'] = random.chance(0.3)
      ? children()
      : graph(random, budget, pool);
  if (random.chance(0.5)) node['errors'] = children();
  if (random.chance(0.2)) node['custom'] = graph(random, budget, pool);
  if (random.chance(0.15))
    throwingGetter(
      node,
      random.pick(['message', 'stack', 'cause', 'errors', 'constructor']),
    );
  // Everything a callback returns is decided now, so reports are repeatable.
  if (random.chance(0.1)) {
    const custom = text(random, 300);
    node['toCorjAsJson'] = random.chance(0.5)
      ? () => ({ custom })
      : () => {
          throw new Error('toCorjAsJson threw');
        };
  }
  if (random.chance(0.1)) {
    const asString = text(random);
    node['toCorjAsString'] = random.chance(0.5) ? () => asString : () => 5;
  }
  if (random.chance(0.05)) node['self'] = node;
  if (random.chance(0.05)) {
    const throwOnErrors = random.chance(0.5);
    return new Proxy(node, {
      has(target, prop) {
        if (prop === 'errors' && throwOnErrors) throw new Error('has trap');
        return Reflect.has(target, prop);
      },
    });
  }
  return node;
}

function options(random: Random): CorjOptionsInput {
  const maxReportSize = random.pick([null, 256, 300, 512, 1024, 4096, 100_000]);
  return {
    onError: () => undefined,
    maxReportSize,
    reportSizeUnit: random.pick<CorjReportSizeUnit>([
      'utf8-bytes',
      'utf16-code-units',
    ]),
    omitExpectedValues: random.chance(0.8),
    stackFormat: random.pick(['lines', 'string']),
    metadata: random.pick([true, false, { $schema: true }, { v: false }]),
    maxDepth: random.int(6),
    maxChildren: random.pick([0, 1, 3, 10, 100]),
    childrenSources: random.pick([
      ['cause', 'errors'],
      ['cause', 'errors', 'custom'],
      ['custom'],
      [],
    ]),
    ...(random.chance(0.3)
      ? {
          makeReportId: ({ index, path }: { index: number; path: string }) =>
            `${index}@${path}`,
        }
      : {}),
  };
}

function size(report: unknown, unit: CorjReportSizeUnit): number {
  const json = JSON.stringify(report);
  return unit === 'utf8-bytes' ? Buffer.byteLength(json, 'utf8') : json.length;
}

function checkIds(
  root: CorjReportChild | undefined,
  rows: CorjReportChild[],
  rootId: string,
) {
  const ids = new Set(rows.map((row) => row.id));
  const known = new Set(Array.from(ids).concat(rootId));
  expect(ids.size).toBe(rows.length);
  for (const row of [...(root ? [root] : []), ...rows]) {
    for (const id of row.child_ids ?? []) expect(known.has(id)).toBe(true);
    if (row.child_ids) expect(row.child_ids.length).toBeGreaterThan(0);
    if (row.children_omitted)
      expect(['max_depth', 'max_children', 'max_size']).toContain(
        row.children_omitted,
      );
    expect(row.path.startsWith('$')).toBe(true);
    expect(row.level).toBeGreaterThanOrEqual(row === root ? 0 : 1);
  }
}

function checkObject(
  report: CorjReport,
  input: CorjOptionsInput,
  kind: 'compact' | 'full',
  rootId: string,
) {
  const validate = getReportObjectReportValidator(kind);
  expect(validate(report)).toBe(true);
  if (input.maxReportSize !== null) {
    expect(size(report, input.reportSizeUnit!)).toBeLessThanOrEqual(
      input.maxReportSize!,
    );
  }
  expect(report).not.toHaveProperty('id');
  expect(report).not.toHaveProperty('child_ids');
  if (report.children) {
    expect(report.children.length).toBeGreaterThan(0);
    expect(report.children.length).toBeLessThanOrEqual(input.maxChildren!);
    for (const child of report.children) {
      expect(child.level).toBeLessThanOrEqual(input.maxDepth!);
      expect(child).not.toHaveProperty('v');
      expect(child).not.toHaveProperty('$schema');
      expect(child).not.toHaveProperty('children_sources');
    }
    checkIds(undefined, report.children, rootId);
  }
}

function checkArray(
  rows: CorjReportChild[],
  input: CorjOptionsInput,
  kind: 'compact' | 'full',
) {
  const validate = getReportArrayReportValidator(kind);
  expect(validate(rows)).toBe(true);
  if (input.maxReportSize !== null) {
    expect(size(rows, input.reportSizeUnit!)).toBeLessThanOrEqual(
      input.maxReportSize!,
    );
  }
  const [root, ...children] = rows;
  expect(root!.path).toBe('$');
  expect(root!.level).toBe(0);
  expect(children.length).toBeLessThanOrEqual(input.maxChildren!);
  for (const child of children) {
    expect(child.level).toBeLessThanOrEqual(input.maxDepth!);
    expect(child).not.toHaveProperty('v');
    expect(child).not.toHaveProperty('$schema');
  }
  checkIds(root, children, root!.id);
}

describe('randomized invariants', () => {
  const seeds = Array.from({ length: 400 }, (_, i) => i + 1);

  test.each(seeds)(
    'seed %i: never throws, fits, validates, links consistently',
    (seed) => {
      const random = rng(seed);
      const input = options(random);
      const caught = graph(random, { nodes: 12 + random.int(40) }, []);
      const kind = input.omitExpectedValues ? 'compact' : 'full';
      const maker = new CorjMaker(input);
      const object = maker.makeReportObject(caught);
      const rows = maker.makeReportArray(caught);
      const rootId = rows[0]!.id;
      expect(rootId).toBe(input.makeReportId ? '-1@$' : 'root');
      checkObject(object, input, kind, rootId);
      checkArray(rows, input, kind);
      // Both forms describe the same tree; the size limiter keeps a prefix of
      // it, and the array form carries more per-node overhead, so one list is a
      // prefix of the other.
      const objectNodes = (object.children ?? []).map(
        (c) => `${c.id} ${c.path} ${c.level}`,
      );
      const arrayNodes = rows
        .slice(1)
        .map((c) => `${c.id} ${c.path} ${c.level}`);
      const shorter = Math.min(objectNodes.length, arrayNodes.length);
      expect(objectNodes.slice(0, shorter)).toEqual(
        arrayNodes.slice(0, shorter),
      );
      if (input.maxReportSize === null) expect(objectNodes).toEqual(arrayNodes);
      // The convenience functions agree with the maker.
      expect(makeCorj(caught, input)).toEqual(object);
      expect(makeCorjArray(caught, input)).toEqual(rows);
      // Restoring a compact report gives the full report of the same input.
      if (input.omitExpectedValues && input.maxReportSize === null) {
        const full = maker.with({ omitExpectedValues: false });
        expect(restoreExpectedValues(object)).toEqual(
          full.makeReportObject(caught),
        );
        expect(restoreExpectedValues(rows)).toEqual(
          full.makeReportArray(caught),
        );
      }
      // Truncation is flagged exactly when a marker was inserted or nodes were dropped.
      const json = JSON.stringify(rows);
      if (
        json.includes(CORJ_TRUNCATED_MARKER) ||
        rows.some((row) => row.children_omitted === 'max_size')
      ) {
        expect(rows[0]!.truncated).toBe(true);
      }
    },
  );

  test('the same input always yields the same report', () => {
    const random = rng(99);
    const caught = graph(random, { nodes: 30 }, []);
    const maker = new CorjMaker({
      onError: () => undefined,
      maxReportSize: 2048,
    });
    const first = maker.makeReportObject(caught);
    for (let i = 0; i < 5; i++)
      expect(maker.makeReportObject(caught)).toEqual(first);
  });

  test('big inputs stay bounded in time', () => {
    const wide = {
      errors: Array.from({ length: 20_000 }, (_, i) => ({
        message: `e${i}`,
        payload: 'x'.repeat(1000),
      })),
    };
    let deep: Record<string, unknown> = { message: 'bottom' };
    for (let i = 0; i < 5_000; i++)
      deep = { message: `level ${i}`, cause: deep };
    const start = Date.now();
    const wideReport = makeCorj(wide, { onError: () => undefined });
    const deepReport = makeCorj(deep, {
      onError: () => undefined,
      maxDepth: 1_000,
    });
    expect(Date.now() - start).toBeLessThan(5_000);
    expect(wideReport.children).toHaveLength(100);
    expect(wideReport.children_omitted).toBe('max_children');
    expect(deepReport.children).toHaveLength(100);
    expect(deepReport.children![99]!.children_omitted).toBe('max_children');
  });
});
