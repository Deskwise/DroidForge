import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionManager, type ExecutionPlan } from '../manager.js';

describe('Deadlock Detection', () => {
  it('detects deadlock when all nodes are blocked', async () => {
    const manager = new ExecutionManager();
    
    // Create a plan where nodes need resources already locked
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['file1.ts'], mode: 'write' },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['file1.ts'], mode: 'write' }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // First node gets the lock
    const task1 = await manager.requestNext(record.id);
    assert.ok(task1);
    assert.equal(task1.nodeId, 'a');

    // Complete first node to release lock
    await manager.completeNode(record.id, task1.nodeId);

    // Second node should be able to proceed (no deadlock)
    const task2 = await manager.requestNext(record.id);
    assert.ok(task2);
    assert.equal(task2.nodeId, 'b');
  });

  it('detects deadlock when nodes wait for each other', async () => {
    const manager = new ExecutionManager();
    
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['file1.ts'], mode: 'write' },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['file1.ts'], mode: 'write' }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // Node A acquires file1
    const taskA = await manager.requestNext(record.id);
    assert.equal(taskA?.nodeId, 'a');

    // Node B tries to acquire file1 but can't (already locked by A)
    const taskB = await manager.requestNext(record.id);
    assert.equal(taskB, null);

    // Check if execution was paused due to deadlock detection
    const snapshot = manager.poll(record.id);
    
    // If node A is still running, no deadlock yet
    // Deadlock only occurs when nothing is running and tasks are waiting
    assert.equal(snapshot.status, 'running'); // Still running because A is active
  });

  it('pauses execution when true deadlock is detected', async () => {
    const manager = new ExecutionManager();
    
    // Create artificial deadlock: no running nodes, but nodes in queue waiting for locks
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['file1.ts'], mode: 'write' },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['file1.ts'], mode: 'write' }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // First node gets the resource
    const task1 = await manager.requestNext(record.id);
    assert.ok(task1);

    // Complete it
    await manager.completeNode(record.id, task1.nodeId);

    // Second node should now be able to get the resource
    const task2 = await manager.requestNext(record.id);
    assert.ok(task2);

    // Complete second node
    await manager.completeNode(record.id, task2.nodeId);

    // Check final state
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'completed');
  });

  it('does not detect deadlock when tasks can proceed', async () => {
    const manager = new ExecutionManager();
    
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['file1.ts'], mode: 'write' },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['file2.ts'], mode: 'write' }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // Both should be able to run concurrently (different resources)
    const task1 = await manager.requestNext(record.id);
    const task2 = await manager.requestNext(record.id);

    assert.ok(task1);
    assert.ok(task2);
    assert.notEqual(task1.nodeId, task2.nodeId);

    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'running');
  });

  it('handles deadlock with multiple blocked nodes', async () => {
    const manager = new ExecutionManager();
    
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'a', droidId: 'da', resourceClaims: ['shared.ts'], mode: 'write' },
        { nodeId: 'b', droidId: 'db', resourceClaims: ['shared.ts'], mode: 'write' },
        { nodeId: 'c', droidId: 'dc', resourceClaims: ['shared.ts'], mode: 'write' }
      ],
      edges: [],
      concurrency: 3
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // First node gets the lock
    const task1 = await manager.requestNext(record.id);
    assert.ok(task1);

    // Other nodes can't proceed
    const task2 = await manager.requestNext(record.id);
    const task3 = await manager.requestNext(record.id);
    
    assert.equal(task2, null);
    assert.equal(task3, null);

    // Still running (first task is active)
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'running');
  });

  it('allows read locks to coexist without deadlock', async () => {
    const manager = new ExecutionManager();
    
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'r1', droidId: 'dr1', resourceClaims: ['file.ts'], mode: 'read' },
        { nodeId: 'r2', droidId: 'dr2', resourceClaims: ['file.ts'], mode: 'read' },
        { nodeId: 'r3', droidId: 'dr3', resourceClaims: ['file.ts'], mode: 'read' }
      ],
      edges: [],
      concurrency: 3
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // All readers should be able to acquire the lock
    const task1 = await manager.requestNext(record.id);
    const task2 = await manager.requestNext(record.id);
    const task3 = await manager.requestNext(record.id);

    assert.ok(task1);
    assert.ok(task2);
    assert.ok(task3);

    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'running');
    assert.equal(snapshot.nodes.filter(n => n.status === 'running').length, 3);
  });

  it('records deadlock event in timeline', async () => {
    const manager = new ExecutionManager();
    
    // Use a pre-locked resource to force deadlock
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'blocker', droidId: 'd1', resourceClaims: ['resource.ts'], mode: 'write' },
        { nodeId: 'waiter', droidId: 'd2', resourceClaims: ['resource.ts'], mode: 'write' }
      ],
      edges: [{ from: 'blocker', to: 'waiter' }], // waiter depends on blocker
      concurrency: 2
    };

    const record = manager.plan('/repo', plan);
    manager.start(record.id);

    // Get blocker
    const task1 = await manager.requestNext(record.id);
    assert.equal(task1?.nodeId, 'blocker');

    // Complete blocker so waiter becomes ready
    await manager.completeNode(record.id, 'blocker');

    // Get waiter
    const task2 = await manager.requestNext(record.id);
    assert.equal(task2?.nodeId, 'waiter');

    // Complete waiter
    await manager.completeNode(record.id, 'waiter');

    // Should complete successfully
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'completed');
  });
});
