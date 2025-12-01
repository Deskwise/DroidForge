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

test('onboarding prompt writes manifest and commands', { timeout: 60000 }, async () => {
  console.log('[INTEGRATION] Test starting...');
  const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-integration-'));
  console.log('[INTEGRATION] Created temp dir:', repoRoot);
    let server;
    try {
      console.log('[INTEGRATION] Creating server...');
      server = createServer({ repoRoot });
      const sessionId = 'session-integration';

      console.log('[INTEGRATION] Starting onboarding...');
      await runOnboarding(server, repoRoot, sessionId);
      console.log('[INTEGRATION] Onboarding complete');

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
      if (server && typeof (server as any).shutdown === 'function') {
        // Ensure any pending async work is flushed before removing the temp repo
        // Tests should not rely on this but it's safe and makes teardown deterministic.
        // eslint-disable-next-line no-await-in-loop
        await (server as any).shutdown();
      }
      
      // Aggressive cleanup: destroy all handles to force process exit
      const anyProc = process as any;
      const handles: any[] = anyProc._getActiveHandles?.() ?? [];
      for (const h of handles) {
        try {
          if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
          h?.unref?.();
          if (h?.destroy && typeof h.destroy === 'function') {
            try { h.destroy(); } catch {}
          }
        } catch {}
      }
      
      rmSync(repoRoot, { recursive: true, force: true });
    }
});

test('route orchestrator auto-creates execution plan and timeline', { timeout: 60000 }, async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-execution-'));
  let server;
  try {
    server = createServer({ repoRoot });

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
    if (server && typeof (server as any).shutdown === 'function') {
      await (server as any).shutdown();
    }
    
    // Aggressive cleanup: destroy all handles to force process exit
    const anyProc = process as any;
    const handles: any[] = anyProc._getActiveHandles?.() ?? [];
    for (const h of handles) {
      try {
        if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
        h?.unref?.();
        if (h?.destroy && typeof h.destroy === 'function') {
          try { h.destroy(); } catch {}
        }
      } catch {}
    }
    
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
