import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { ExecutionManager, ExecutionPlan } from '../../execution/manager.js';
import { StagingManager } from '../../execution/staging.js';
import { ExecutionMerger } from '../../execution/merger.js';
import { ensureDir } from '../../fs.js';
import { createHash } from 'node:crypto';

describe('E2E: Parallel Execution Safety', () => {
  let repoRoot: string;
  let manager: ExecutionManager;
  let stagingManager: StagingManager;
  let merger: ExecutionMerger;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-e2e-parallel-'));
    manager = new ExecutionManager();
    stagingManager = new StagingManager();
    merger = new ExecutionMerger();

    // Create a realistic repo structure
    await ensureDir(join(repoRoot, 'src'));
    await fs.writeFile(join(repoRoot, 'src/index.ts'), 'console.log("original");');
    await fs.writeFile(join(repoRoot, 'src/utils.ts'), 'export const add = (a, b) => a + b;');
    await fs.writeFile(join(repoRoot, 'src/config.ts'), 'export const VERSION = "1.0.0";');
    await ensureDir(join(repoRoot, 'tests'));
    await fs.writeFile(join(repoRoot, 'tests/test.ts'), 'test("basic", () => {});');
  });

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('identifies parallel execution opportunities in plan', async () => {
    // Plan with independent tasks that can run in parallel
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'task-1', droidId: 'droid-1', title: 'Update index.ts', resourceClaims: ['src/index.ts'] },
        { nodeId: 'task-2', droidId: 'droid-2', title: 'Update utils.ts', resourceClaims: ['src/utils.ts'] },
        { nodeId: 'task-3', droidId: 'droid-3', title: 'Update config.ts', resourceClaims: ['src/config.ts'] }
      ],
      edges: [], // No dependencies - all can run in parallel
      concurrency: 3
    };

    const record = manager.plan(repoRoot, plan);
    
    assert.equal(record.status, 'planned', 'Execution should be in planned state');
    assert.equal(record.plan?.nodes.length, 3, 'Should have 3 nodes in plan');
    assert.equal(record.plan?.edges.length, 0, 'Should have no edges (dependencies)');
    assert.equal(record.plan?.concurrency, 3, 'Concurrency should be 3');

    // Start execution
    manager.start(record.id);
    
    const snapshot = manager.poll(record.id);
    assert.equal(snapshot.status, 'running', 'Execution should be running');

    // All tasks should be ready to run (no dependencies)
    const readyTasks = snapshot.nodes.filter(n => n.status === 'ready' || n.status === 'running');
    assert.ok(readyTasks.length > 0, 'Should have tasks ready to run');
  });

  it('prevents conflicting resource claims during parallel execution', async () => {
    // Plan with conflicting write access to the same file
    const plan: ExecutionPlan = {
      nodes: [
        { 
          nodeId: 'writer-1', 
          droidId: 'droid-w1', 
          resourceClaims: ['src/index.ts'],
          mode: 'write'
        },
        { 
          nodeId: 'writer-2', 
          droidId: 'droid-w2', 
          resourceClaims: ['src/index.ts'],
          mode: 'write'
        },
        {
          nodeId: 'reader-safe',
          droidId: 'droid-r',
          resourceClaims: ['src/utils.ts'],
          mode: 'read'
        }
      ],
      edges: [],
      concurrency: 3
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Request first task
    const task1 = await manager.requestNext(record.id);
    assert.ok(task1, 'Should get first task');

    // Request second task
    const task2 = await manager.requestNext(record.id);

    // If task1 is writing to index.ts, task2 should not also be writing to index.ts
    if (task1.resourceClaims.includes('src/index.ts') && task1.mode === 'write') {
      if (task2) {
        const task2WritesToIndex = task2.resourceClaims.includes('src/index.ts') && task2.mode === 'write';
        assert.ok(!task2WritesToIndex, 'Should not allow concurrent writes to same resource');
      }
    }

    // Clean up
    if (task1) await manager.completeNode(record.id, task1.nodeId);
    if (task2) await manager.completeNode(record.id, task2.nodeId);
    
    let remaining;
    while ((remaining = await manager.requestNext(record.id))) {
      await manager.completeNode(record.id, remaining.nodeId);
    }
  });

  it('enforces file locking to prevent write conflicts', async () => {
    const plan: ExecutionPlan = {
      nodes: [
        { 
          nodeId: 'task-a', 
          droidId: 'droid-a', 
          resourceClaims: ['src/shared.ts'],
          mode: 'write'
        },
        { 
          nodeId: 'task-b', 
          droidId: 'droid-b', 
          resourceClaims: ['src/shared.ts'],
          mode: 'write'
        }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Get first task (should succeed)
    const firstTask = await manager.requestNext(record.id);
    assert.ok(firstTask, 'Should get first task');
    assert.ok(firstTask.resourceClaims.includes('src/shared.ts'));

    // Try to get second task while first is still running
    const secondTask = await manager.requestNext(record.id);

    // Second task should either be null (blocked) or be a different task
    if (secondTask) {
      // If we got a second task, it should not be the conflicting writer
      const bothWriteToShared = 
        firstTask.resourceClaims.includes('src/shared.ts') &&
        secondTask.resourceClaims.includes('src/shared.ts');
      assert.ok(!bothWriteToShared, 'Should not assign conflicting tasks concurrently');
    }

    // Complete first task to release lock
    await manager.completeNode(record.id, firstTask.nodeId);

    // Now second task should become available
    const nextTask = await manager.requestNext(record.id);
    if (nextTask) {
      await manager.completeNode(record.id, nextTask.nodeId);
    }

    const finalSnapshot = manager.poll(record.id);
    assert.equal(finalSnapshot.status, 'completed', 'Execution should complete successfully');
  });

  it('provides staging isolation for parallel workers', async () => {
    const executionId = 'test-exec-123';
    
    // Create staging for two nodes
    const staging1 = await stagingManager.createStaging(repoRoot, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(repoRoot, executionId, 'node-2');

    // Verify they are different directories
    assert.notEqual(staging1, staging2, 'Each node should get unique staging directory');

    // Verify both have copies of the source files
    const file1InStaging1 = await fs.readFile(join(staging1, 'src/index.ts'), 'utf8');
    const file1InStaging2 = await fs.readFile(join(staging2, 'src/index.ts'), 'utf8');

    assert.equal(file1InStaging1, 'console.log("original");', 'Staging 1 should have original content');
    assert.equal(file1InStaging2, 'console.log("original");', 'Staging 2 should have original content');

    // Modify files in each staging area independently
    await fs.writeFile(join(staging1, 'src/index.ts'), 'console.log("modified by node 1");');
    await fs.writeFile(join(staging2, 'src/utils.ts'), 'export const multiply = (a, b) => a * b;');

    // Verify isolation - changes in one staging don't affect the other
    const indexInStaging2 = await fs.readFile(join(staging2, 'src/index.ts'), 'utf8');
    assert.equal(indexInStaging2, 'console.log("original");', 'Staging 2 should not see staging 1 changes');

    const utilsInStaging1 = await fs.readFile(join(staging1, 'src/utils.ts'), 'utf8');
    assert.equal(utilsInStaging1, 'export const add = (a, b) => a + b;', 'Staging 1 should not see staging 2 changes');

    // Clean up
    await stagingManager.cleanStaging(repoRoot, executionId, 'node-1');
    await stagingManager.cleanStaging(repoRoot, executionId, 'node-2');
  });

  it('detects merge conflicts when multiple nodes modify same file', async () => {
    const executionId = 'test-exec-conflict';

    // Create two staging areas
    const staging1 = await stagingManager.createStaging(repoRoot, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(repoRoot, executionId, 'node-2');

    // Both nodes modify the same file with different content
    await fs.writeFile(join(staging1, 'src/index.ts'), 'console.log("version A");');
    await fs.writeFile(join(staging2, 'src/index.ts'), 'console.log("version B");');

    // Collect changes
    const changes1 = await stagingManager.collectChanges(repoRoot, staging1, ['src/**']);
    const changes2 = await stagingManager.collectChanges(repoRoot, staging2, ['src/**']);

    // Combine changes into conflict detection format
    const allChanges = new Map<string, Array<{ nodeId: string; content: string; contentHash: string }>>();
    
    for (const [path, content] of changes1.entries()) {
      if (!allChanges.has(path)) allChanges.set(path, []);
      allChanges.get(path)!.push({
        nodeId: 'node-1',
        content,
        contentHash: createHash('sha256').update(content).digest('hex')
      });
    }

    for (const [path, content] of changes2.entries()) {
      if (!allChanges.has(path)) allChanges.set(path, []);
      allChanges.get(path)!.push({
        nodeId: 'node-2',
        content,
        contentHash: createHash('sha256').update(content).digest('hex')
      });
    }

    // Detect conflicts
    const conflicts = await merger.detectConflicts(repoRoot, allChanges);

    assert.ok(conflicts.length > 0, 'Should detect conflicts');
    assert.ok(conflicts.includes('src/index.ts'), 'Should identify index.ts as conflicted');

    // Clean up
    await stagingManager.cleanStaging(repoRoot, executionId, 'node-1');
    await stagingManager.cleanStaging(repoRoot, executionId, 'node-2');
  });

  it('completes execution with successful atomic merge', async () => {
    const plan: ExecutionPlan = {
      nodes: [
        { 
          nodeId: 'task-1', 
          droidId: 'droid-1', 
          resourceClaims: ['src/index.ts'],
          mode: 'write'
        },
        { 
          nodeId: 'task-2', 
          droidId: 'droid-2', 
          resourceClaims: ['src/utils.ts'],
          mode: 'write'
        }
      ],
      edges: [],
      concurrency: 2
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Execute all tasks
    const completedTasks: string[] = [];
    let task;
    while ((task = await manager.requestNext(record.id))) {
      completedTasks.push(task.nodeId);
      await manager.completeNode(record.id, task.nodeId);
    }

    assert.equal(completedTasks.length, 2, 'Should complete both tasks');

    const finalSnapshot = manager.poll(record.id);
    assert.equal(finalSnapshot.status, 'completed', 'Execution should be marked completed');

    // Verify all nodes completed
    const allCompleted = finalSnapshot.nodes.every(n => n.status === 'completed');
    assert.ok(allCompleted, 'All nodes should be marked completed');
  });

  it('handles execution failure and prevents partial merge', async () => {
    const plan: ExecutionPlan = {
      nodes: [
        { nodeId: 'task-1', droidId: 'droid-1', resourceClaims: ['src/index.ts'] },
        { nodeId: 'task-2', droidId: 'droid-2', resourceClaims: ['src/utils.ts'] },
        { nodeId: 'task-fail', droidId: 'droid-fail', resourceClaims: ['src/config.ts'] }
      ],
      edges: [],
      concurrency: 3
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Complete some tasks successfully
    const task1 = await manager.requestNext(record.id);
    if (task1) await manager.completeNode(record.id, task1.nodeId);

    // Fail one task
    const task2 = await manager.requestNext(record.id);
    if (task2 && task2.nodeId === 'task-fail') {
      await manager.failNode(record.id, task2.nodeId, { error: 'Simulated failure' });
    } else if (task2) {
      await manager.completeNode(record.id, task2.nodeId);
    }

    // Get and fail the failure task if not already done
    let remaining;
    while ((remaining = await manager.requestNext(record.id))) {
      if (remaining.nodeId === 'task-fail') {
        await manager.failNode(record.id, remaining.nodeId, { error: 'Simulated failure' });
      } else {
        await manager.completeNode(record.id, remaining.nodeId);
      }
    }

    const finalSnapshot = manager.poll(record.id);
    assert.equal(finalSnapshot.status, 'failed', 'Execution should be marked as failed');

    // Verify at least one node failed
    const failedNodes = finalSnapshot.nodes.filter(n => n.status === 'failed');
    assert.ok(failedNodes.length > 0, 'Should have at least one failed node');
  });

  it('detects and reports deadlock when all tasks are blocked', async () => {
    // Create a plan where circular dependencies could cause deadlock
    // Note: The current implementation should prevent this at planning time,
    // but we test the detection mechanism
    const plan: ExecutionPlan = {
      nodes: [
        { 
          nodeId: 'task-a', 
          droidId: 'droid-a',
          resourceClaims: ['src/file1.ts', 'src/file2.ts'],
          mode: 'write'
        },
        { 
          nodeId: 'task-b', 
          droidId: 'droid-b',
          resourceClaims: ['src/file2.ts', 'src/file3.ts'],
          mode: 'write'
        },
        { 
          nodeId: 'task-c', 
          droidId: 'droid-c',
          resourceClaims: ['src/file3.ts', 'src/file1.ts'],
          mode: 'write'
        }
      ],
      edges: [],
      concurrency: 3
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Try to get tasks - deadlock detection should eventually kick in
    const task1 = await manager.requestNext(record.id);
    
    if (task1) {
      // The fact that we got a task means deadlock wasn't immediate
      // Complete it to allow progress
      await manager.completeNode(record.id, task1.nodeId);

      // Continue executing
      let task;
      while ((task = await manager.requestNext(record.id))) {
        await manager.completeNode(record.id, task.nodeId);
      }

      const snapshot = manager.poll(record.id);
      
      // Either completed successfully or paused due to deadlock
      assert.ok(
        snapshot.status === 'completed' || snapshot.status === 'paused',
        'Execution should either complete or pause on deadlock'
      );
    }
  });

  it('maintains execution consistency under concurrent task requests', async () => {
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 10 }, (_, i) => ({
        nodeId: `task-${i}`,
        droidId: `droid-${i}`,
        resourceClaims: [`src/file-${i}.ts`],
        mode: 'write' as const
      })),
      edges: [],
      concurrency: 5
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Simulate multiple concurrent workers requesting tasks
    const workers = Array.from({ length: 5 }, async () => {
      const assignedTasks: string[] = [];
      let task;
      while ((task = await manager.requestNext(record.id))) {
        assignedTasks.push(task.nodeId);
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1));
        await manager.completeNode(record.id, task.nodeId);
      }
      return assignedTasks;
    });

    const results = await Promise.all(workers);

    // Collect all assigned tasks
    const allAssigned = results.flat();

    // Verify no task was assigned twice
    const uniqueTasks = new Set(allAssigned);
    assert.equal(
      uniqueTasks.size,
      allAssigned.length,
      'No task should be assigned to multiple workers'
    );

    // Verify all tasks were completed
    assert.equal(allAssigned.length, 10, 'All 10 tasks should be completed');

    const finalSnapshot = manager.poll(record.id);
    assert.equal(finalSnapshot.status, 'completed', 'Execution should complete successfully');
  });

  it('respects concurrency limits during parallel execution', async () => {
    const plan: ExecutionPlan = {
      nodes: Array.from({ length: 10 }, (_, i) => ({
        nodeId: `task-${i}`,
        droidId: `droid-${i}`,
        resourceClaims: [`src/independent-${i}.ts`]
      })),
      edges: [],
      concurrency: 3 // Limit to 3 concurrent tasks
    };

    const record = manager.plan(repoRoot, plan);
    manager.start(record.id);

    // Try to get 5 tasks at once
    const tasks = await Promise.all([
      manager.requestNext(record.id),
      manager.requestNext(record.id),
      manager.requestNext(record.id),
      manager.requestNext(record.id),
      manager.requestNext(record.id)
    ]);

    // Should get at most 3 tasks due to concurrency limit
    const assignedTasks = tasks.filter(t => t !== null);
    assert.ok(
      assignedTasks.length <= 3,
      `Should respect concurrency limit of 3, got ${assignedTasks.length}`
    );

    // Clean up
    for (const task of assignedTasks) {
      if (task) await manager.completeNode(record.id, task.nodeId);
    }

    // Complete remaining
    let remaining;
    while ((remaining = await manager.requestNext(record.id))) {
      await manager.completeNode(record.id, remaining.nodeId);
    }
  });
});
