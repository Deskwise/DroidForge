import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionManager, type ExecutionPlan } from '../manager.js';

describe('ExecutionManager', () => {
  const samplePlan = (): ExecutionPlan => ({
    nodes: [
      { nodeId: 'plan', droidId: 'df-orchestrator' },
      { nodeId: 'build', droidId: 'df-builder', resourceClaims: ['src/**'] },
      { nodeId: 'test', droidId: 'df-tester' }
    ],
    edges: [
      { from: 'plan', to: 'build' },
      { from: 'plan', to: 'test' }
    ],
    concurrency: 2
  });

  it('records ad-hoc enqueue requests', () => {
    const manager = new ExecutionManager();
    const result = manager.enqueue({ repoRoot: '/repo', droidId: 'df-orchestrator', request: 'hello' });
    const snapshot = manager.poll(result.executionId);
    assert.equal(snapshot.status, 'planned');
    assert.equal(snapshot.requests.length, 1);
    assert.equal(snapshot.timeline.at(-1)?.event, 'request.received');
  });

  it('schedules nodes respecting dependencies and concurrency', () => {
    const manager = new ExecutionManager();
    const record = manager.plan('/repo', samplePlan());
    manager.start(record.id);

    const firstTask = manager.requestNext(record.id);
    assert.equal(firstTask?.nodeId, 'plan');

    manager.completeNode(record.id, 'plan');

    const second = manager.requestNext(record.id);
    assert.ok(second !== null);
    assert.ok(['build', 'test'].includes(second?.nodeId ?? ''));
  });

  it('enforces lock exclusivity', () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'df-a', resourceClaims: ['src/file.ts'] },
        { nodeId: 'b', droidId: 'df-b', resourceClaims: ['src/file.ts'] }
      ],
      edges: []
    };
    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    const first = manager.requestNext(record.id);
    assert.ok(first?.nodeId);

    manager.completeNode(record.id, first!.nodeId);
    const second = manager.requestNext(record.id);
    assert.notEqual(second?.nodeId, first?.nodeId);
  });

  it('marks execution failed when a node fails', () => {
    const manager = new ExecutionManager();
    const record = manager.plan('/repo', samplePlan());
    manager.start(record.id);
    const task = manager.requestNext(record.id);
    if (!task) {
      throw new Error('expected task');
    }

    manager.failNode(record.id, task.nodeId, { error: 'boom' });
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'failed');
  });
});
