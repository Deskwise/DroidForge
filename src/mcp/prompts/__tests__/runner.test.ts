import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptRunner } from '../runner.js';
import type { PromptScript } from '../types.js';

const script: PromptScript = {
  name: 'test',
  segments: [
    { kind: 'say', speaker: 'assistant', text: 'Hello' },
    { kind: 'input', id: 'goal', label: 'Goal?' },
    {
      kind: 'tool',
      name: 'echo',
      input: {
        message: { fromInput: 'goal' }
      }
    },
    { kind: 'summary', title: 'Done', lines: ['All set.'] }
  ]
};

test('PromptRunner emits segments in order and resolves placeholders', async () => {
  const invocations: any[] = [];
  const runner = new PromptRunner(script, async (invocation: any) => {
    invocations.push(invocation);
    return { message: invocation.input?.message } as any;
  });

  const first = await runner.next();
  assert.equal(first.type, 'say');
  const second = await runner.next();
  assert.equal(second.type, 'input');
  assert.equal((second as any).segment.id, 'goal');

  runner.submitInput('goal', 'Build stuff');
  const summary = await runner.next();

  assert.deepEqual(invocations[0].input, { message: 'Build stuff' });
  assert.equal(summary.type, 'summary');
  const done = await runner.next();
  assert.equal(done.type, 'complete');
});
