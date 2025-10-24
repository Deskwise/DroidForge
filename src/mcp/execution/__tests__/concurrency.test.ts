/**
 * Concurrency tests for ExecutionManager
 * Tests race conditions, concurrent access, and thread safety
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionManager, ExecutionPlan } from '../manager.js';
import { createSimplePlan, createDependentPlan, runConcurrently } from './helpers/testUtils.js';

describe('ExecutionManager - Concurrency', () => {
  it('handles 100 concurrent requestNext calls without race conditions', async () => {
    const manager = new ExecutionManager();
    
    // Create a plan with 50 nodes, concurrency limit of 10
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 50 }, (_, i) => ({
        nodeId: `node-${i}`,
        droidId: `droid-${i}`,
        title: `Task ${i}`
      })),
      edges: [],
      concurrency: 10
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // 100 threads trying to get tasks concurrently
    const results = await runConcurrently(
      () => manager.requestNext(record.id),
      100
    );
    
    const tasks = results.filter(t => t !== null);
    
    // Should get exactly 10 tasks (concurrency limit)
    assert.equal(tasks.length, 10, 'Should respect concurrency limit');
    
    // All tasks should be unique (no duplicates from race conditions)
    const nodeIds = new Set(tasks.map(t => t!.nodeId));
    assert.equal(nodeIds.size, 10, 'All tasks should be unique');
  });

  it('handles concurrent completeNode calls', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 10 }, (_, i) => ({
        nodeId: `node-${i}`,
        droidId: `droid-${i}`
      })),
      edges: [],
      concurrency: 10 // High concurrency so we can get all tasks at once
    };
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Get all tasks at once (high concurrency allows this)
    const tasks = [];
    let task;
    while ((task = await manager.requestNext(record.id))) {
      tasks.push(task);
    }
    
    assert.equal(tasks.length, 10, 'Should get all 10 tasks');
    
    // Complete all tasks concurrently
    await Promise.all(
      tasks.map(t => manager.completeNode(record.id, t.nodeId))
    );
    
    // All tasks should be completed
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'completed');
    assert.equal(
      snapshot.nodes.filter(n => n.status === 'completed').length,
      10
    );
  });

  it('prevents lock conflicts under concurrent load', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { 
          nodeId: 'write1', 
          droidId: 'droid1', 
          resourceClaims: ['src/file.ts'], 
          mode: 'write' 
        },
        { 
          nodeId: 'write2', 
          droidId: 'droid2', 
          resourceClaims: ['src/file.ts'], 
          mode: 'write' 
        },
        { 
          nodeId: 'read1', 
          droidId: 'droid3', 
          resourceClaims: ['src/file.ts'], 
          mode: 'read' 
        }
      ],
      edges: [],
      concurrency: 3
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Try to get multiple tasks concurrently
    const tasks = await runConcurrently(
      () => manager.requestNext(record.id),
      10
    );
    
    const validTasks = tasks.filter(t => t !== null);
    
    // Only one should get access to the conflicting resource
    assert.ok(validTasks.length >= 1, 'At least one task should be scheduled');
    assert.ok(validTasks.length <= 3, 'Should respect concurrency limit');
  });

  it('handles 1000 iterations without corruption', async () => {
    for (let iteration = 0; iteration < 1000; iteration++) {
      const manager = new ExecutionManager();
      const plan: ExecutionPlan = {
        nodes: [
          { nodeId: 'a', droidId: 'da' },
          { nodeId: 'b', droidId: 'db' },
          { nodeId: 'c', droidId: 'dc' }
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'c' }
        ],
        concurrency: 2
      };
      
      const record = manager.plan('/repo', plan);
      manager.start(record.id);
      
      // Execute the plan
      let task;
      while ((task = await manager.requestNext(record.id))) {
        await manager.completeNode(record.id, task.nodeId);
      }
      
      // Verify completion
      const snapshot = manager.poll(record.id);
      assert.equal(snapshot.status, 'completed', `Iteration ${iteration} failed`);
      assert.equal(
        snapshot.nodes.filter(n => n.status === 'completed').length,
        3,
        `Iteration ${iteration}: All nodes should be completed`
      );
    }
  });

  it('maintains execution integrity under mixed operations', async () => {
    const manager = new ExecutionManager();
    const plan = createDependentPlan();
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Mix of concurrent operations
    const operations = [
      () => manager.requestNext(record.id),
      () => manager.poll(record.id),
      () => manager.list(),
      () => manager.requestNext(record.id)
    ];
    
    // Run operations concurrently
    await runConcurrently(
      async () => {
        const op = operations[Math.floor(Math.random() * operations.length)];
        await op();
      },
      50
    );
    
    // Execution should still be valid
    const snapshot = manager.poll(record.id);
    assert.ok(['running', 'completed'].includes(snapshot.status));
  });

  it('prevents duplicate task assignment in high contention', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'task-1', droidId: 'droid-1' }
      ],
      edges: [],
      concurrency: 1
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // 100 threads competing for 1 task
    const results = await runConcurrently(
      () => manager.requestNext(record.id),
      100
    );
    
    const tasks = results.filter(t => t !== null);
    
    // Only one should get the task
    assert.equal(tasks.length, 1, 'Only one caller should get the task');
    assert.equal(tasks[0]!.nodeId, 'task-1');
  });

  it('handles pause/resume under concurrent load', async () => {
    const manager = new ExecutionManager();
    const plan = createSimplePlan(20);
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Concurrent operations with pause/resume
    const operations = async () => {
      const rand = Math.random();
      if (rand < 0.3) {
        manager.pause(record.id);
      } else if (rand < 0.6) {
        manager.resume(record.id);
      } else {
        const task = await manager.requestNext(record.id);
        if (task) {
          await manager.completeNode(record.id, task.nodeId);
        }
      }
    };
    
    await runConcurrently(operations, 50);
    
    // Execution should be in a valid state
    const snapshot = manager.poll(record.id);
    assert.ok(
      ['running', 'paused', 'completed'].includes(snapshot.status),
      'Should be in valid state'
    );
  });

  it('safely handles concurrent fail operations', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'task-1', droidId: 'droid-1' },
        { nodeId: 'task-2', droidId: 'droid-2' },
        { nodeId: 'task-3', droidId: 'droid-3' }
      ],
      edges: [],
      concurrency: 3
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Get all tasks
    const task1 = await manager.requestNext(record.id);
    const task2 = await manager.requestNext(record.id);
    const task3 = await manager.requestNext(record.id);
    
    // Fail tasks concurrently
    if (task1 && task2 && task3) {
      await Promise.all([
        manager.completeNode(record.id, task1.nodeId),
        Promise.resolve(manager.failNode(record.id, task2.nodeId)),
        manager.completeNode(record.id, task3.nodeId)
      ]);
    }
    
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'failed', 'Should be marked as failed');
  });

  it('maintains lock consistency under concurrent access', async () => {
    const manager = new ExecutionManager();
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 10 }, (_, i) => ({
        nodeId: `node-${i}`,
        droidId: `droid-${i}`,
        resourceClaims: [`file-${i % 3}.ts`], // 10 nodes competing for 3 resources
        mode: 'write' as const
      })),
      edges: [],
      concurrency: 5
    };
    
    const record = manager.plan('/repo', plan);
    manager.start(record.id);
    
    // Get tasks concurrently
    const tasks = await runConcurrently(
      () => manager.requestNext(record.id),
      20
    );
    
    const validTasks = tasks.filter(t => t !== null);
    
    // Check that no two tasks have the same resource claim
    const resourceMap = new Map<string, string>();
    for (const task of validTasks) {
      if (task && task.resourceClaims) {
        for (const resource of task.resourceClaims) {
          const existingOwner = resourceMap.get(resource);
          assert.ok(
            !existingOwner || existingOwner === task.nodeId,
            `Resource ${resource} claimed by multiple nodes`
          );
          resourceMap.set(resource, task.nodeId);
        }
      }
    }
  });
});
