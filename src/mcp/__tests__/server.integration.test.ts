import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.js';

async function runOnboarding(server: ReturnType<typeof createServer>, repoRoot: string, sessionId: string) {
  const runner = await server.createPromptRunner('droidforge.onboarding', { repoRoot, sessionId });

  while (true) {
    const event = await runner.next();
    if (event.type === 'complete') {
      return;
    }
    if (event.type === 'input') {
      if (event.segment.id === 'project-goal') {
        runner.submitInput('project-goal', 'Integration test project');
      } else if (event.segment.id === 'custom-droids') {
        runner.submitInput('custom-droids', '');
      }
    } else if (event.type === 'choice') {
      if (event.segment.id === 'methodology-choice') {
        runner.submitChoice('methodology-choice', 'lean');
      }
    }
  }
}

test('onboarding prompt writes manifest and commands', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-integration-'));
  try {
    const server = createServer({ repoRoot });
    const sessionId = 'session-integration';

    await runOnboarding(server, repoRoot, sessionId);

    const manifestPath = join(repoRoot, '.droidforge', 'droids-manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error('manifest not created');
    }
    const manifestRaw = readFileSync(manifestPath, 'utf8');
    if (!manifestRaw.trim()) {
      throw new Error('manifest empty');
    }
    const manifest = JSON.parse(manifestRaw);
    if (!Array.isArray(manifest.droids)) {
      throw new Error('manifest missing droids array');
    }

    const commandsDir = join(repoRoot, '.factory', 'commands');
    const dfCommand = existsSync(join(commandsDir, 'df')) || existsSync(join(commandsDir, 'df.md'));
    if (!dfCommand) {
      const available = existsSync(commandsDir) ? readdirSync(commandsDir) : null;
      throw new Error('df command not installed: ' + (available ? available.join(',') : 'missing dir'));
    }
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test('route orchestrator auto-creates execution plan and timeline', async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-execution-'));
  try {
    const server = createServer({ repoRoot });

    const result = await server.invoke({
      name: 'route_orchestrator',
      input: { repoRoot, request: 'Parallel demo task' }
    }) as any;

    assert.ok(result.executionId);
    const executionId = result.executionId as string;

    const poll = await server.invoke({
      name: 'poll_execution',
      input: { repoRoot, executionId }
    }) as any;

    assert.equal(poll.executionId, executionId);
    assert.ok(poll.timeline.some((event: any) => event.event === 'request.received'));
    assert.ok(poll.timeline.some((event: any) => event.event === 'execution.completed'));

    const list = await server.invoke({ name: 'list_executions', input: { repoRoot } }) as any;
    assert.ok(list.executions.some((entry: any) => entry.executionId === executionId));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
