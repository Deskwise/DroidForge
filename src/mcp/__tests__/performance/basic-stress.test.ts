import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { SessionStore } from '../../sessionStore.js';
import { ExecutionManager, ExecutionPlan } from '../../execution/manager.js';
import { createSmartScanTool } from '../../tools/smartScan.js';
import { createForgeRosterTool } from '../../tools/forgeRoster.js';
import { createRecordProjectGoalTool } from '../../tools/recordProjectGoal.js';
import { createSelectMethodologyTool } from '../../tools/selectMethodology.js';
import { createRecommendDroidsTool } from '../../tools/recommendDroids.js';
import { ensureDir } from '../../fs.js';

describe('Performance: Basic Stress Tests', () => {
  it('handles large repository with many files (stress test)', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-perf-large-'));
    const startTime = Date.now();

    try {
      // Create a repo with 1000 files
      await ensureDir(join(repoRoot, 'src'));
      const fileCreationPromises: Promise<void>[] = [];
      
      for (let i = 0; i < 1000; i++) {
        const dirPath = join(repoRoot, 'src', `module${Math.floor(i / 100)}`);
        await ensureDir(dirPath);
        fileCreationPromises.push(
          fs.writeFile(
            join(dirPath, `file${i}.ts`),
            `export const value${i} = ${i};`
          )
        );
      }
      
      await Promise.all(fileCreationPromises);

      // Add package.json
      await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify({
        name: 'large-test-project',
        dependencies: { react: '^18.0.0' }
      }, null, 2));

      const fileCreationTime = Date.now() - startTime;

      // Test smart scan on large repo
      const sessionStore = new SessionStore();
      const executionManager = new ExecutionManager();
      const sessionId = randomUUID();

      const scanStart = Date.now();
      const smartScanTool = createSmartScanTool({ sessionStore, executionManager });
      const scanResult = await smartScanTool.handler({ repoRoot, sessionId });
      const scanTime = Date.now() - scanStart;

      assert.ok(scanResult.summary, 'Should complete scan');
      assert.ok(scanTime < 5000, `Scan should complete in <5s, took ${scanTime}ms`);

      // Cleanup execution manager
      await executionManager.shutdown();

      console.log(`Performance metrics (1000 files):
  - File creation: ${fileCreationTime}ms
  - Smart scan: ${scanTime}ms`);

    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('handles many concurrent droids (10+ droids)', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-perf-droids-'));
    const startTime = Date.now();

    try {
      await ensureDir(join(repoRoot, 'src'));
      await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify({
        name: 'many-droids-test',
        dependencies: { react: '^18.0.0', typescript: '^5.0.0', jest: '^29.0.0' }
      }, null, 2));

      const sessionStore = new SessionStore();
      const executionManager = new ExecutionManager();
      const sessionId = randomUUID();

      await createSmartScanTool({ sessionStore, executionManager })
        .handler({ repoRoot, sessionId });

      await createRecordProjectGoalTool({ sessionStore, executionManager })
        .handler({ repoRoot, sessionId, description: 'Large team test' });

      await createSelectMethodologyTool({ sessionStore, executionManager })
        .handler({ repoRoot, sessionId, choice: 'agile' });

      const recommendations = await createRecommendDroidsTool({ sessionStore, executionManager })
        .handler({ repoRoot, sessionId });

      const forgeStart = Date.now();
      
      // Create 12 droids
      const forgeTool = createForgeRosterTool({ sessionStore, executionManager });
      await forgeTool.handler({
        repoRoot,
        sessionId,
        selected: recommendations.suggestions.slice(0, 10).map(s => ({
          id: s.id,
          label: s.label || s.id,
          abilities: [],
          goal: s.summary
        })),
        customInput: 'Database specialist\nAPI documentation expert'
      });

      const forgeTime = Date.now() - forgeStart;
      
      // Verify all droids created
      const droidsDir = join(repoRoot, '.droidforge', 'droids');
      const files = await fs.readdir(droidsDir);
      const droidCount = files.filter(f => f.endsWith('.json') && f.startsWith('df-')).length;

      assert.ok(droidCount >= 8, `Should create at least 8 droids, created ${droidCount}`);
      assert.ok(forgeTime < 3000, `Forging should complete in <3s, took ${forgeTime}ms`);

      // Cleanup execution manager
      await executionManager.shutdown();

      console.log(`Performance metrics (${droidCount} droids):
  - Forge time: ${forgeTime}ms
  - Total time: ${Date.now() - startTime}ms`);

    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('handles concurrent execution requests without data corruption', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-perf-concurrent-'));
    
    try {
      await ensureDir(join(repoRoot, 'src'));
      const manager = new ExecutionManager();
      const startTime = Date.now();

      // Create 10 execution plans and start them concurrently
      const executionPromises = Array.from({ length: 10 }, async (_, i) => {
        const plan: ExecutionPlan = {
          nodes: Array.from({ length: 5 }, (_, j) => ({
            nodeId: `exec${i}-task${j}`,
            droidId: `droid-${i}-${j}`,
            resourceClaims: [`file-${i}-${j}.ts`]
          })),
          edges: [],
          concurrency: 3
        };

        const record = manager.plan(repoRoot, plan);
        manager.start(record.id);

        // Execute all tasks
        let task;
        while ((task = await manager.requestNext(record.id))) {
          await manager.completeNode(record.id, task.nodeId);
        }

        return manager.poll(record.id);
      });

      const results = await Promise.all(executionPromises);
      const totalTime = Date.now() - startTime;

      // Verify all completed successfully
      const allCompleted = results.every(r => r.status === 'completed');
      assert.ok(allCompleted, 'All executions should complete successfully');
      assert.ok(totalTime < 10000, `Concurrent executions should complete in <10s, took ${totalTime}ms`);

      // Cleanup execution manager
      await manager.shutdown();

      console.log(`Performance metrics (10 concurrent executions, 50 total tasks):
  - Total time: ${totalTime}ms
  - Average per execution: ${(totalTime / 10).toFixed(0)}ms`);

    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('memory usage remains stable with repeated operations', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-perf-memory-'));

    try {
      await ensureDir(join(repoRoot, 'src'));
      await fs.writeFile(join(repoRoot, 'package.json'), '{"name":"test"}');

      const sessionStore = new SessionStore();
      const executionManager = new ExecutionManager();
      
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const startTime = Date.now();

      // Perform 100 scan operations
      for (let i = 0; i < 100; i++) {
        const sessionId = randomUUID();
        const smartScanTool = createSmartScanTool({ sessionStore, executionManager });
        await smartScanTool.handler({ repoRoot, sessionId });
      }

      const totalTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const memoryIncrease = finalMemory - initialMemory;

      assert.ok(memoryIncrease < 50, `Memory increase should be <50MB, was ${memoryIncrease.toFixed(2)}MB`);
      assert.ok(totalTime < 15000, `100 operations should complete in <15s, took ${totalTime}ms`);

      // Cleanup execution manager
      await executionManager.shutdown();

      console.log(`Performance metrics (100 scan operations):
  - Total time: ${totalTime}ms
  - Initial memory: ${initialMemory.toFixed(2)}MB
  - Final memory: ${finalMemory.toFixed(2)}MB
  - Memory increase: ${memoryIncrease.toFixed(2)}MB`);

    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
