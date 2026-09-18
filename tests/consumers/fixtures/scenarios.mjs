/**
 * The behaviour every supported runtime must reproduce, written in plain ESM
 * with no Node built-ins so the same file runs in Node, in Bun and in a browser.
 *
 * Each scenario receives the package's public namespace exactly as a consumer
 * imported it. Nothing here reaches into the workspace source.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function utf8Length(text) {
  // `TextEncoder` is the one measurement available in every target runtime.
  return new TextEncoder().encode(text).length;
}

export const scenarios = [
  {
    name: 'an ordinary error',
    run(corj) {
      const report = corj.makeCorj(new Error('ordinary failure'));
      const text = String(report.stack);
      assert(text.includes('Error: ordinary failure'), 'stack header missing');
      assert(report.v === corj.CORJ_VERSION, 'report version mismatch');
    },
  },
  {
    name: 'a cause chain',
    run(corj) {
      const outer = new Error('outer');
      outer.cause = new Error('inner');
      const report = corj.makeCorj(outer);
      assert(report.children?.length === 1, 'cause was not reported');
      assert(report.children[0].path === '$.cause', 'cause path wrong');
    },
  },
  {
    name: 'an aggregate of errors',
    run(corj) {
      const report = corj.makeCorj({
        errors: [new Error('one'), new Error('two')],
      });
      assert(report.children?.length === 2, 'errors array was not reported');
    },
  },
  {
    name: 'primitive throws',
    run(corj) {
      for (const [value, expected] of [
        ['a string', 'string'],
        [42, 'number'],
        [true, 'boolean'],
        [undefined, 'undefined'],
        [Symbol('s'), 'symbol'],
      ]) {
        const report = corj.makeCorj(value);
        assert(
          report.typeof === expected,
          `typeof ${expected} reported as ${report.typeof}`,
        );
      }
      const nullReport = corj.makeCorj(null);
      assert(nullReport.as_string === 'null', 'null not stringified');
    },
  },
  {
    name: 'a bounded report',
    run(corj) {
      const report = corj.makeCorj(
        { big: 'x'.repeat(50_000) },
        { maxReportSize: 1_024 },
      );
      const size = utf8Length(JSON.stringify(report));
      assert(size <= 1_024, `report of ${size} bytes exceeded the limit`);
      assert(report.truncated === true, 'truncation was not flagged');
    },
  },
  {
    name: 'a throwing inspection hook',
    run(corj) {
      const seen = [];
      const caught = {
        get message() {
          throw new Error('getter exploded');
        },
        toCorjAsString() {
          throw new Error('hook exploded');
        },
      };
      const report = corj.makeCorj(caught, {
        onError: (_error, context) => seen.push(context.stage),
      });
      assert(seen.length > 0, 'no failure was reported');
      assert(report.message === null, 'a failed read is not null');
    },
  },
  {
    name: 'inspection: "no-invoke" runs no accessor',
    run(corj) {
      let read = 0;
      const report = corj.makeCorj(
        {
          get secret() {
            read++;
            return 'value';
          },
          plain: 'kept',
        },
        { inspection: 'no-invoke' },
      );
      assert(read === 0, 'an accessor ran');
      assert(
        report.as_json.secret === corj.CORJ_OMITTED_MARKER,
        'omitted content is not marked',
      );
    },
  },
  {
    name: 'a redaction policy',
    run(corj) {
      const report = corj.makeCorj(new Error('token sk-live-ABC'), {
        redact: { patterns: [/sk-live-\w+/g] },
      });
      const text = JSON.stringify(report);
      assert(!text.includes('sk-live-ABC'), 'the secret survived redaction');
      assert(
        text.includes(corj.CORJ_REDACTED_MARKER),
        'the replacement is missing',
      );
    },
  },
  {
    name: 'cycles',
    run(corj) {
      const caught = { name: 'cyclic' };
      caught.self = caught;
      const report = corj.makeCorj(caught);
      assert(
        report.as_json.self === corj.CORJ_CIRCULAR_MARKER,
        'a cycle was not marked',
      );
    },
  },
  {
    name: 'the default report carries an occurrence id and a fingerprint',
    run(corj) {
      const report = corj.makeCorj(new Error('identified'));
      assert(
        /^CORJ_[0-9A-HJKMNP-TV-Z]{26}$/.test(report.occurrence_id),
        `occurrence_id is not a random id: ${report.occurrence_id}`,
      );
      assert(
        /^fp1_[0-9a-f]{32}$/.test(report.fingerprint),
        `fingerprint is not a v1 fingerprint: ${report.fingerprint}`,
      );
      const off = corj.makeCorj(new Error('anonymous'), {
        occurrenceIdSources: null,
        fingerprintParts: null,
      });
      assert(
        off.occurrence_id === undefined,
        'occurrence_id was not turned off',
      );
      assert(off.fingerprint === undefined, 'fingerprint was not turned off');
    },
  },
  {
    name: 'the array report shape',
    run(corj) {
      const outer = new Error('outer');
      outer.cause = new Error('inner');
      const rows = corj.makeCorjArray(outer);
      assert(Array.isArray(rows), 'not an array');
      assert(rows[0].id === 'root', 'first row is not the root');
      assert(rows.length === 2, 'the cause is missing from the array');
    },
  },
];

/** Runs every scenario, returning a plain result a caller can print or ship. */
export function runScenarios(corj) {
  const results = [];
  for (const scenario of scenarios) {
    try {
      scenario.run(corj);
      results.push({ name: scenario.name, ok: true });
    } catch (caught) {
      results.push({
        name: scenario.name,
        ok: false,
        error: caught instanceof Error ? caught.message : String(caught),
      });
    }
  }
  return { ok: results.every((r) => r.ok), results };
}
