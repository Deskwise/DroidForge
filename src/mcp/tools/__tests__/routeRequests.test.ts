import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRouteTools } from '../routeRequests.js';
import { ExecutionManager } from '../../execution/manager.js';

describe('route requests', () => {
  it('enqueues orchestrator request and returns executionId', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-test-'));
    const manager = new ExecutionManager();
    const { routeOrchestratorTool } = createRouteTools({ manager });

    const result = await routeOrchestratorTool.handler({ repoRoot, request: 'hello orchestrator' });
    assert.ok(result.executionId && /^exec-/.test(result.executionId));

    if (!result.executionId) {
      throw new Error('expected executionId');
    }
    const execId = result.executionId;
    const snapshot = manager.poll(execId);
    assert.equal(snapshot.requests[0].droidId, 'df-orchestrator');
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('enqueues specialist requests with provided executionId', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-test-'));
    const manager = new ExecutionManager();
    const execution = manager.plan(repoRoot, { nodes: [], edges: [] });
    const { routeSpecialistTool } = createRouteTools({ manager });

    const result = await routeSpecialistTool.handler({
      repoRoot,
      executionId: execution.id,
      request: 'help me build',
      droidId: 'df-builder'
    });

    assert.equal(result.executionId, execution.id);
    const execId = result.executionId ?? execution.id;
    const snapshot = manager.poll(execId);
    assert.equal(snapshot.requests[0].droidId, 'df-builder');
    rmSync(repoRoot, { recursive: true, force: true });
  });
});
