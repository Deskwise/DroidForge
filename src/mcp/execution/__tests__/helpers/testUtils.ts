/**
 * Test utilities and helper functions for execution tests
 */

import { ExecutionPlan, ExecutionPlanNode } from '../../manager.js';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, removeIfExists } from '../../../fs.js';

/**
 * Create a simple test execution plan
 */
export function createSimplePlan(nodeCount = 3): ExecutionPlan {
  const nodes: ExecutionPlanNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      nodeId: `node-${i}`,
      droidId: `droid-${i}`,
      title: `Task ${i}`,
      description: `Test task ${i}`
    });
  }
  return {
    nodes,
    edges: [],
    concurrency: 2
  };
}

/**
 * Create a plan with dependencies
 */
export function createDependentPlan(): ExecutionPlan {
  return {
    nodes: [
      { nodeId: 'root', droidId: 'droid-root', title: 'Root task' },
      { nodeId: 'child-1', droidId: 'droid-child-1', title: 'Child 1' },
      { nodeId: 'child-2', droidId: 'droid-child-2', title: 'Child 2' },
      { nodeId: 'grandchild', droidId: 'droid-grandchild', title: 'Grandchild' }
    ],
    edges: [
      { from: 'root', to: 'child-1' },
      { from: 'root', to: 'child-2' },
      { from: 'child-1', to: 'grandchild' },
      { from: 'child-2', to: 'grandchild' }
    ],
    concurrency: 2
  };
}

/**
 * Create a plan with resource claims
 */
export function createResourcePlan(): ExecutionPlan {
  return {
    nodes: [
      { 
        nodeId: 'writer-1', 
        droidId: 'droid-writer-1',
        resourceClaims: ['src/file1.ts'],
        mode: 'write'
      },
      { 
        nodeId: 'writer-2', 
        droidId: 'droid-writer-2',
        resourceClaims: ['src/file2.ts'],
        mode: 'write'
      },
      { 
        nodeId: 'reader-1', 
        droidId: 'droid-reader-1',
        resourceClaims: ['src/file1.ts'],
        mode: 'read'
      }
    ],
    edges: [],
    concurrency: 3
  };
}

/**
 * Create a temporary test repository
 */
export async function createTestRepo(): Promise<string> {
  const tmpDir = join('/tmp', `droidforge-test-${randomUUID()}`);
  await ensureDir(tmpDir);
  
  // Create some test files
  await ensureDir(join(tmpDir, 'src'));
  await fs.writeFile(join(tmpDir, 'src', 'file1.ts'), 'export const value = 1;');
  await fs.writeFile(join(tmpDir, 'src', 'file2.ts'), 'export const value = 2;');
  await fs.writeFile(join(tmpDir, 'README.md'), '# Test Repository');
  
  return tmpDir;
}

/**
 * Clean up a temporary test repository
 */
export async function cleanupTestRepo(repoPath: string): Promise<void> {
  await removeIfExists(repoPath);
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  checkIntervalMs = 10
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Run a function multiple times in parallel
 */
export async function runConcurrently<T>(
  fn: () => Promise<T>,
  count: number
): Promise<T[]> {
  const promises: Promise<T>[] = [];
  for (let i = 0; i < count; i++) {
    promises.push(fn());
  }
  return Promise.all(promises);
}

/**
 * Sleep for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a plan that could cause deadlock without proper ordering
 */
export function createPotentialDeadlockPlan(): ExecutionPlan {
  return {
    nodes: [
      {
        nodeId: 'node-a',
        droidId: 'droid-a',
        resourceClaims: ['file1.ts', 'file2.ts'],
        mode: 'write'
      },
      {
        nodeId: 'node-b',
        droidId: 'droid-b',
        resourceClaims: ['file2.ts', 'file1.ts'], // Different order
        mode: 'write'
      }
    ],
    edges: [],
    concurrency: 2
  };
}
