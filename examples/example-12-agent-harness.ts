import { strict as assert } from 'node:assert';
import { CorjMaker, restoreExpectedValues } from '../src';
import type { CorjReport } from '../src';

type Llm = { complete(prompt: string): Promise<string> };
type NodeResult<T> = { node: string } & (
  | { ok: true; value: T }
  | { ok: false; error: CorjReport }
);

const corj = new CorjMaker({
  maxReportSize: 4096,
  reportSizeUnit: 'utf8-bytes',
  maxDepth: 2,
  maxChildren: 4,
  metadata: true,
});

async function runNode<T>(
  node: string,
  operation: () => Promise<T>,
): Promise<NodeResult<T>> {
  try {
    return { node, ok: true, value: await operation() };
  } catch (caught: unknown) {
    return { node, ok: false, error: corj.makeReportObject(caught) };
  }
}

// Graph routing is application code, based on an explicit outcome.
function nextNode(result: NodeResult<string>): 'deliver' | 'fallback' {
  return result.ok ? 'deliver' : 'fallback';
}

async function main() {
  const workingModel: Llm = { complete: async () => 'A fixture answer.' };
  const failure = Object.assign(new Error('Model request failed'), {
    cause: { code: 'MODEL_UNAVAILABLE' },
  });
  failure.stack = 'Error: Model request failed'; // Stable diagnostic fixture.
  const failingModel: Llm = {
    complete: async () => {
      throw failure;
    },
  };

  const success = await runNode('answer', () => workingModel.complete('Hello'));
  assert.equal(nextNode(success), 'deliver');
  assert.deepEqual(success, {
    node: 'answer',
    ok: true,
    value: 'A fixture answer.',
  });

  const failed = await runNode('answer', () => failingModel.complete('Hello'));
  assert.equal(nextNode(failed), 'fallback');
  if (failed.ok) throw new Error('Expected the failing fixture to fail');

  const full = restoreExpectedValues(failed.error);
  assert.equal(full.message, 'Model request failed');
  assert.equal(full.children?.[0]?.path, '$.cause');
  assert.deepEqual(full.children?.[0]?.as_json, { code: 'MODEL_UNAVAILABLE' });
  assert.equal(failed.error.v, 'corj/v0.12');
  assert.ok(failed.error.$schema?.endsWith('/corj/v0.12/report-object.json'));
  assert.ok(Buffer.byteLength(JSON.stringify(failed.error), 'utf8') <= 4096);

  const oversized = await runNode('answer', async () => {
    throw 'x'.repeat(10000);
  });
  if (oversized.ok) throw new Error('Expected the oversized fixture to fail');
  assert.equal(oversized.error.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(oversized.error), 'utf8') <= 4096);

  // Harness metadata lives outside CORJ's report and its size budget.
  const evalRecord = { runId: 'eval-1', ...failed };
  assert.equal(evalRecord.node, 'answer');
  console.log('Success, fallback, nested-cause, and report-size evals passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
