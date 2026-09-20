/**
 * The published consumption contract, exercised against the packed artifact.
 *
 * Nothing here imports workspace source. The package is built, packed with
 * `npm pack`, and installed into an isolated consumer project; every check then
 * resolves `caught-object-report-json` the way a real dependent would.
 *
 * Usage:
 *   node tests/consumers/run.mjs               # every check
 *   node tests/consumers/run.mjs --only=bun    # one check
 *   node tests/consumers/run.mjs --skip=browser
 */

import { execFileSync, execSync } from 'node:child_process';
import {
  closeSync,
  cpSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const fixtures = path.join(here, 'fixtures');

/**
 * TypeScript declaration resolution modes the package supports.
 *
 * `defaultImport` records whether `import corj from 'caught-object-report-json'`
 * type-checks in that mode without `esModuleInterop`. The package exports named
 * bindings only; classic `node` resolution therefore needs the interop flag for
 * a default import, while the newer modes model the CommonJS default and do not.
 * Both expectations are asserted, so a change in either direction is a failure.
 */
const RESOLUTION_MODES = [
  { moduleResolution: 'node', module: 'commonjs', defaultImport: false },
  { moduleResolution: 'node16', module: 'node16', defaultImport: true },
  { moduleResolution: 'nodenext', module: 'nodenext', defaultImport: true },
  { moduleResolution: 'bundler', module: 'esnext', defaultImport: true },
];

/**
 * Pinned so a run is reproducible and a consumer-side break is attributable to
 * this package rather than to a dependency that moved underneath the test.
 */
const PINNED = {
  typescript: 'typescript@5.4.5',
  vite: 'vite@5.4.10',
  playwright: 'playwright@1.48.2',
};

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);
const skip = (
  args.find((a) => a.startsWith('--skip='))?.slice('--skip='.length) ?? ''
)
  .split(',')
  .filter(Boolean);
const keep = args.includes('--keep');

function run(command, argv, options = {}) {
  const capture = mkdtempSync(path.join(tmpdir(), 'corj-command-'));
  const stdoutPath = path.join(capture, 'stdout');
  const stderrPath = path.join(capture, 'stderr');
  const stdoutFd = openSync(stdoutPath, 'w');
  const stderrFd = openSync(stderrPath, 'w');
  let failure;
  try {
    execFileSync(command, argv, {
      ...options,
      stdio: ['ignore', stdoutFd, stderrFd],
    });
  } catch (caught) {
    failure = caught;
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }
  const stdout = readFileSync(stdoutPath, 'utf8');
  const stderr = readFileSync(stderrPath, 'utf8');
  rmSync(capture, { recursive: true, force: true });
  if (failure !== undefined) {
    failure.stdout = stdout;
    failure.stderr = stderr;
    throw failure;
  }
  return stdout;
}

/**
 * A fixture reports its own outcome on stdout and exits non-zero when it fails,
 * so a failing run is read from stdout rather than treated as a crash.
 */
function runFixture(command, argv, options = {}) {
  try {
    return run(command, argv, options);
  } catch (caught) {
    if (typeof caught.stdout === 'string' && caught.stdout.trim() !== '') {
      return caught.stdout;
    }
    throw caught;
  }
}

function errorOutput(caught) {
  for (const value of [caught?.stdout, caught?.stderr, caught?.message]) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return String(caught);
}

function has(command) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function versionOf(command, argv) {
  try {
    return run(command, argv).trim().split('\n')[0];
  } catch {
    return 'unavailable';
  }
}

/** Builds `npm-module-build` and packs it, returning the tarball path. */
function packArtifact() {
  run('npm', ['run', 'prepublish-me'], { cwd: repo });
  const build = path.join(repo, 'npm-module-build');
  const stdout = run('npm', ['pack', '--silent'], { cwd: build })
    .trim()
    .split('\n')
    .pop();
  const candidates = stdout?.endsWith('.tgz')
    ? [stdout]
    : readdirSync(build).filter((file) => file.endsWith('.tgz'));
  if (candidates.length !== 1) {
    throw new Error(
      `npm pack produced ${candidates.length} tarballs: ${candidates.join(
        ', ',
      )}`,
    );
  }
  const [tarball] = candidates;
  return path.join(build, tarball);
}

/** An isolated consumer project with the packed artifact installed. */
async function makeConsumer(tarball) {
  const dir = mkdtempSync(path.join(tmpdir(), 'corj-consumer-'));
  writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      { name: 'corj-consumer', private: true, version: '0.0.0' },
      null,
      2,
    ),
  );
  cpSync(path.join(fixtures, 'scenarios.mjs'), path.join(dir, 'scenarios.mjs'));
  for (const file of [
    'node-cjs.cjs',
    'node-esm.mjs',
    'bun-esm.mjs',
    'encapsulation.mjs',
  ]) {
    cpSync(path.join(fixtures, file), path.join(dir, file));
  }
  await mkdir(path.join(dir, 'types'), { recursive: true });
  cpSync(path.join(fixtures, 'types'), path.join(dir, 'types'), {
    recursive: true,
  });
  cpSync(path.join(fixtures, 'browser'), path.join(dir, 'browser'), {
    recursive: true,
  });
  cpSync(
    path.join(dir, 'scenarios.mjs'),
    path.join(dir, 'browser', 'scenarios.mjs'),
  );
  run('npm', ['install', '--silent', '--no-audit', '--no-fund', tarball], {
    cwd: dir,
  });
  return dir;
}

/** How many scenarios every runtime check must report, so a PASS cannot be vacuous. */
const SCENARIO_COUNT = (
  await import(pathToFileURL(path.join(fixtures, 'scenarios.mjs')).href)
).scenarios.length;

/** An outcome from a fixture that reports its own named checks, not scenarios. */
function parseChecks(stdout) {
  const line = stdout.trim().split('\n').pop();
  try {
    return JSON.parse(line);
  } catch {
    return {
      ok: false,
      results: [{ name: 'output', ok: false, error: stdout.trim() }],
    };
  }
}

function parseOutcome(stdout) {
  const line = stdout.trim().split('\n').pop();
  let outcome;
  try {
    outcome = JSON.parse(line);
  } catch {
    return {
      ok: false,
      results: [{ name: 'output', ok: false, error: stdout.trim() }],
    };
  }
  if (outcome.ok && outcome.results.length !== SCENARIO_COUNT) {
    return {
      ok: false,
      results: [
        {
          name: 'every scenario ran',
          ok: false,
          error: `expected ${SCENARIO_COUNT} scenarios, got ${outcome.results.length}`,
        },
      ],
    };
  }
  return outcome;
}

const checks = {
  'node-cjs': {
    title: 'Node, CommonJS require()',
    run: (dir) =>
      parseOutcome(
        runFixture(process.execPath, ['node-cjs.cjs'], { cwd: dir }),
      ),
  },
  'node-esm': {
    title: 'Node, ESM import of the CommonJS build',
    run: (dir) =>
      parseOutcome(
        runFixture(process.execPath, ['node-esm.mjs'], { cwd: dir }),
      ),
  },
  bun: {
    title: 'Bun, ESM import',
    run: (dir) => {
      if (!has('bun')) {
        return {
          ok: false,
          results: [{ name: 'bun', ok: false, error: 'bun is not installed' }],
        };
      }
      return parseOutcome(runFixture('bun', ['bun-esm.mjs'], { cwd: dir }));
    },
  },
  encapsulation: {
    title: 'Node, only the exported entry points resolve',
    run: (dir) =>
      parseChecks(
        runFixture(process.execPath, ['encapsulation.mjs'], { cwd: dir }),
      ),
  },
  types: {
    title: 'TypeScript declaration resolution',
    run: (dir) => {
      run(
        'npm',
        [
          'install',
          '--silent',
          '--no-audit',
          '--no-fund',
          '--no-save',
          PINNED.typescript,
        ],
        {
          cwd: dir,
        },
      );
      const tsc = path.join(dir, 'node_modules', '.bin', 'tsc');
      const check = (file, moduleResolution, module, interop) => {
        try {
          run(tsc, [
            '--noEmit',
            '--strict',
            '--skipLibCheck',
            '--target',
            'es2020',
            '--module',
            module,
            '--moduleResolution',
            moduleResolution,
            ...(interop ? ['--esModuleInterop'] : []),
            path.join(dir, 'types', file),
          ]);
          return null;
        } catch (caught) {
          return errorOutput(caught);
        }
      };
      const results = [];
      for (const {
        moduleResolution,
        module,
        defaultImport,
      } of RESOLUTION_MODES) {
        const named = check('probe.ts', moduleResolution, module, false);
        results.push({
          name: `${moduleResolution}: named imports`,
          ok: named === null,
          error: named ?? undefined,
        });

        const removed = check(
          'probe-removed.ts',
          moduleResolution,
          module,
          false,
        );
        const removedNames = [
          'makeReport',
          'makeReportArray',
          'resolveCorjRedactPolicy',
          'restoreExpectedValues',
        ];
        const removedDiagnostics =
          removed
            ?.split('\n')
            .filter((line) => /error TS(2305|2459|2724):/.test(line)) ?? [];
        const allRemoved =
          removedDiagnostics.length === removedNames.length &&
          removedNames.every((name) =>
            removedDiagnostics.some((line) => line.includes(`'${name}'`)),
          );
        results.push({
          name: `${moduleResolution}: legacy utility imports are rejected`,
          ok: allRemoved,
          error:
            removed === null
              ? 'legacy utility imports still type-check'
              : allRemoved
              ? undefined
              : `expected one missing/non-exported diagnostic for each legacy utility, got: ${removed}`,
        });

        const readonly = check(
          'probe-readonly.ts',
          moduleResolution,
          module,
          false,
        );
        results.push({
          name: `${moduleResolution}: Corj members are readonly`,
          ok: readonly !== null && /error TS2540:/.test(readonly),
          error:
            readonly === null
              ? 'assignment to Corj.makeReport type-checked'
              : /error TS2540:/.test(readonly)
              ? undefined
              : `expected a readonly-property diagnostic, got: ${readonly}`,
        });

        const bare = check('probe-default.ts', moduleResolution, module, false);
        // Only a missing-default-export diagnostic counts as the expected
        // rejection; any other error means the probe itself is broken.
        const interopDiagnostic =
          bare !== null && /error TS(1192|1259|2497|2613):/.test(bare);
        results.push({
          name: `${moduleResolution}: default import without esModuleInterop is ${
            defaultImport ? 'accepted' : 'rejected'
          }`,
          ok: defaultImport ? bare === null : interopDiagnostic,
          error: defaultImport
            ? bare ?? undefined
            : bare === null
            ? 'it was accepted, so the documented contract is stale'
            : interopDiagnostic
            ? undefined
            : `expected a missing-default-export diagnostic, got: ${bare}`,
        });

        const withInterop = check(
          'probe-default.ts',
          moduleResolution,
          module,
          true,
        );
        results.push({
          name: `${moduleResolution}: default import with esModuleInterop`,
          ok: withInterop === null,
          error: withInterop ?? undefined,
        });
      }

      // The exports map hides internal modules from the declaration resolver
      // too, but only in the modes that read it; `node` and `bundler` still
      // walk the file system, so only `node16` is asserted here.
      const deep = check('probe-deep.ts', 'node16', 'node16', false);
      results.push({
        name: 'node16: a deep import is a type error',
        ok: deep !== null && /error TS2307:/.test(deep),
        error:
          deep === null
            ? 'the deep import type-checked, so it is still reachable'
            : /error TS2307:/.test(deep)
            ? undefined
            : `expected a module-not-found diagnostic, got: ${deep}`,
      });
      return { ok: results.every((r) => r.ok), results };
    },
  },
  browser: {
    title: 'Vite build executed in Chromium',
    run: (dir) => {
      const browser = path.join(dir, 'browser');
      writeFileSync(
        path.join(browser, 'package.json'),
        JSON.stringify(
          { name: 'corj-browser-consumer', private: true, type: 'module' },
          null,
          2,
        ),
      );
      run(
        'npm',
        [
          'install',
          '--silent',
          '--no-audit',
          '--no-fund',
          PINNED.vite,
          PINNED.playwright,
        ],
        {
          cwd: browser,
        },
      );
      // The package is resolved from the consumer project one level up, so the
      // browser build sees exactly the installed artifact.
      run(
        path.join(browser, 'node_modules', '.bin', 'playwright'),
        ['install', ...(process.env['CI'] ? ['--with-deps'] : []), 'chromium'],
        { cwd: browser },
      );
      run(path.join(browser, 'node_modules', '.bin', 'vite'), ['build'], {
        cwd: browser,
      });
      return parseOutcome(
        runFixture(process.execPath, ['run-chromium.mjs'], { cwd: browser }),
      );
    },
  },
};

const selected = Object.keys(checks).filter(
  (name) => (only === undefined || only === name) && !skip.includes(name),
);

console.log('caught-object-report-json — consumption contract');
console.log(`  node       ${process.version}`);
console.log(
  `  bun        ${
    has('bun') ? versionOf('bun', ['--version']) : 'not installed'
  }`,
);
console.log(`  pinned     ${Object.values(PINNED).join(', ')}`);
console.log('');

const tarball = packArtifact();
console.log(`packed ${path.basename(tarball)}`);
const consumer = await makeConsumer(tarball);
console.log(`consumer project at ${consumer}\n`);

let failed = false;
for (const name of selected) {
  const check = checks[name];
  let outcome;
  try {
    outcome = check.run(consumer);
  } catch (caught) {
    outcome = {
      ok: false,
      results: [
        {
          name: 'check',
          ok: false,
          error: String(errorOutput(caught)).trim(),
        },
      ],
    };
  }
  console.log(`${outcome.ok ? 'PASS' : 'FAIL'}  ${name} — ${check.title}`);
  for (const result of outcome.results) {
    if (!result.ok) console.log(`        ✗ ${result.name}: ${result.error}`);
  }
  if (!outcome.ok) failed = true;
}

if (!keep) rmSync(consumer, { recursive: true, force: true });
rmSync(path.join(repo, 'npm-module-build'), { recursive: true, force: true });

console.log('');
if (failed) {
  console.log('the consumption contract is not met');
  process.exitCode = 1;
} else {
  console.log(`the consumption contract holds for: ${selected.join(', ')}`);
}
