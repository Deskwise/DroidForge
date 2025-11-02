import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptRunner } from '../runner.js';
import type { PromptScript, InputSegment } from '../types.js';

test('blocks progress when required input is empty', async () => {
  const mockInvokeTool = () => Promise.resolve({});
  const sessionId = 'test-session';
  const repoRoot = '/test/repo';

  const script: PromptScript = {
    name: 'test',
    sessionId,
    repoRoot,
    segments: [
      {
        kind: 'input',
        id: 'required-field',
        label: 'Required Field',
        required: true,
        emptyMessage: 'This field is required.'
      }
    ]
  };

  const runner = new PromptRunner(script, mockInvokeTool);
  const result = await runner.next();

  assert.equal(result.type, 'input');
  assert.equal((result as any).segment.id, 'required-field');

  // Attempt to submit empty string should throw
  assert.throws(() => runner.submitInput('required-field', ''), /This field is required./);
  assert.throws(() => runner.submitInput('required-field', '   '), /This field is required./);

  // Runner should still be awaiting input after failed submission
  const stillAwaiting = await runner.next();
  assert.equal(stillAwaiting.type, 'input');
  assert.equal((stillAwaiting as any).segment.id, 'required-field');
});

test('allows progress when required input has content', async () => {
  const mockInvokeTool = () => Promise.resolve({});
  const sessionId = 'test-session';
  const repoRoot = '/test/repo';

  const script: PromptScript = {
    name: 'test',
    sessionId,
    repoRoot,
    segments: [
      {
        kind: 'input',
        id: 'required-field',
        label: 'Required Field',
        required: true,
        emptyMessage: 'This field is required.'
      }
    ]
  };

  const runner = new PromptRunner(script, mockInvokeTool);
  await runner.next(); // advance to input state

  // Submit valid content should succeed
  assert.doesNotThrow(() => runner.submitInput('required-field', 'Valid content'));

  // Runner should complete after valid submission
  const result = await runner.next();
  assert.equal(result.type, 'complete');
});

test('allows empty input for non-required fields', async () => {
  const mockInvokeTool = () => Promise.resolve({});
  const sessionId = 'test-session';
  const repoRoot = '/test/repo';

  const script: PromptScript = {
    name: 'test',
    sessionId,
    repoRoot,
    segments: [
      {
        kind: 'input',
        id: 'optional-field',
        label: 'Optional Field'
      }
    ]
  };

  const runner = new PromptRunner(script, mockInvokeTool);
  await runner.next(); // advance to input state

  // Submit empty string should succeed for optional fields
  assert.doesNotThrow(() => runner.submitInput('optional-field', ''));
  
  // Runner should complete after optional submission
  const result = await runner.next();
  assert.equal(result.type, 'complete');
});
