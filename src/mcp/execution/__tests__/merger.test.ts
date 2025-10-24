import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { ExecutionMerger } from '../merger.js';
import { StagingManager } from '../staging.js';
import { ensureDir, removeIfExists, writeJsonAtomic } from '../../fs.js';

describe('ExecutionMerger', () => {
  let testRoot: string;
  let merger: ExecutionMerger;
  let stagingManager: StagingManager;

  before(async () => {
    // Create a temporary test repository
    testRoot = join(tmpdir(), `merger-test-${Date.now()}`);
    await ensureDir(testRoot);
    merger = new ExecutionMerger();
    stagingManager = new StagingManager();

    // Create test files
    await fs.writeFile(join(testRoot, 'file1.txt'), 'original content', 'utf-8');
    await ensureDir(join(testRoot, 'src'));
    await fs.writeFile(join(testRoot, 'src', 'index.ts'), 'original code', 'utf-8');
  });

  after(async () => {
    // Clean up test directory
    await removeIfExists(testRoot);
  });

  it('merges changes from single node without conflicts', async () => {
    const executionId = 'exec-1';
    const nodeId = 'node-1';

    // Create staging with changes
    const stagingPath = await stagingManager.createStaging(testRoot, executionId, nodeId);
    await fs.writeFile(join(stagingPath, 'file1.txt'), 'modified by node-1', 'utf-8');

    // Create state file with resource claims
    const stateDir = join(testRoot, '.droidforge', 'exec', executionId);
    await ensureDir(stateDir);
    await writeJsonAtomic(join(stateDir, 'state.json'), {
      nodes: [{
        nodeId: 'node-1',
        spec: {
          nodeId: 'node-1',
          droidId: 'droid-1',
          resourceClaims: ['file1.txt']
        }
      }]
    });

    // Merge changes
    const result = await merger.merge(testRoot, executionId, [nodeId], stagingManager);

    // Verify merge succeeded
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
    assert.ok(result.mergedFiles);
    assert.ok(result.mergedFiles.includes('file1.txt'));

    // Verify file was updated
    const content = await fs.readFile(join(testRoot, 'file1.txt'), 'utf-8');
    assert.equal(content, 'modified by node-1');

    // Clean up
    await stagingManager.cleanStaging(testRoot, executionId, nodeId);
  });

  it('merges changes from multiple nodes without conflicts', async () => {
    const executionId = 'exec-2';

    // Create two staging directories with different file changes
    const staging1 = await stagingManager.createStaging(testRoot, executionId, 'node-a');
    await fs.writeFile(join(staging1, 'file-a.txt'), 'from node-a', 'utf-8');

    const staging2 = await stagingManager.createStaging(testRoot, executionId, 'node-b');
    await fs.writeFile(join(staging2, 'file-b.txt'), 'from node-b', 'utf-8');

    // Create state file
    const stateDir = join(testRoot, '.droidforge', 'exec', executionId);
    await ensureDir(stateDir);
    await writeJsonAtomic(join(stateDir, 'state.json'), {
      nodes: [
        {
          nodeId: 'node-a',
          spec: {
            nodeId: 'node-a',
            droidId: 'droid-a',
            resourceClaims: ['file-a.txt']
          }
        },
        {
          nodeId: 'node-b',
          spec: {
            nodeId: 'node-b',
            droidId: 'droid-b',
            resourceClaims: ['file-b.txt']
          }
        }
      ]
    });

    // Merge changes
    const result = await merger.merge(testRoot, executionId, ['node-a', 'node-b'], stagingManager);

    // Verify merge succeeded
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);

    // Verify both files were created
    const contentA = await fs.readFile(join(testRoot, 'file-a.txt'), 'utf-8');
    assert.equal(contentA, 'from node-a');

    const contentB = await fs.readFile(join(testRoot, 'file-b.txt'), 'utf-8');
    assert.equal(contentB, 'from node-b');

    // Clean up
    await stagingManager.cleanStaging(testRoot, executionId, 'node-a');
    await stagingManager.cleanStaging(testRoot, executionId, 'node-b');
    await removeIfExists(join(testRoot, 'file-a.txt'));
    await removeIfExists(join(testRoot, 'file-b.txt'));
  });

  it('detects conflicts when multiple nodes modify same file differently', async () => {
    const executionId = 'exec-3';

    // Create two staging directories modifying the same file differently
    const staging1 = await stagingManager.createStaging(testRoot, executionId, 'node-c');
    await fs.writeFile(join(staging1, 'conflict.txt'), 'version from node-c', 'utf-8');

    const staging2 = await stagingManager.createStaging(testRoot, executionId, 'node-d');
    await fs.writeFile(join(staging2, 'conflict.txt'), 'version from node-d', 'utf-8');

    // Create state file
    const stateDir = join(testRoot, '.droidforge', 'exec', executionId);
    await ensureDir(stateDir);
    await writeJsonAtomic(join(stateDir, 'state.json'), {
      nodes: [
        {
          nodeId: 'node-c',
          spec: {
            nodeId: 'node-c',
            droidId: 'droid-c',
            resourceClaims: ['conflict.txt']
          }
        },
        {
          nodeId: 'node-d',
          spec: {
            nodeId: 'node-d',
            droidId: 'droid-d',
            resourceClaims: ['conflict.txt']
          }
        }
      ]
    });

    // Merge changes
    const result = await merger.merge(testRoot, executionId, ['node-c', 'node-d'], stagingManager);

    // Verify conflict was detected
    assert.equal(result.success, false);
    assert.equal(result.conflicts.length, 1);
    assert.ok(result.conflicts.includes('conflict.txt'));

    // Clean up
    await stagingManager.cleanStaging(testRoot, executionId, 'node-c');
    await stagingManager.cleanStaging(testRoot, executionId, 'node-d');
  });

  it('allows multiple nodes to modify same file identically', async () => {
    const executionId = 'exec-4';
    const sameContent = 'identical content from both nodes';

    // Create two staging directories with identical changes
    const staging1 = await stagingManager.createStaging(testRoot, executionId, 'node-e');
    await fs.writeFile(join(staging1, 'same.txt'), sameContent, 'utf-8');

    const staging2 = await stagingManager.createStaging(testRoot, executionId, 'node-f');
    await fs.writeFile(join(staging2, 'same.txt'), sameContent, 'utf-8');

    // Create state file
    const stateDir = join(testRoot, '.droidforge', 'exec', executionId);
    await ensureDir(stateDir);
    await writeJsonAtomic(join(stateDir, 'state.json'), {
      nodes: [
        {
          nodeId: 'node-e',
          spec: {
            nodeId: 'node-e',
            droidId: 'droid-e',
            resourceClaims: ['same.txt']
          }
        },
        {
          nodeId: 'node-f',
          spec: {
            nodeId: 'node-f',
            droidId: 'droid-f',
            resourceClaims: ['same.txt']
          }
        }
      ]
    });

    // Merge changes
    const result = await merger.merge(testRoot, executionId, ['node-e', 'node-f'], stagingManager);

    // Verify merge succeeded (no conflict since content is identical)
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);

    // Verify file was created with correct content
    const content = await fs.readFile(join(testRoot, 'same.txt'), 'utf-8');
    assert.equal(content, sameContent);

    // Clean up
    await stagingManager.cleanStaging(testRoot, executionId, 'node-e');
    await stagingManager.cleanStaging(testRoot, executionId, 'node-f');
    await removeIfExists(join(testRoot, 'same.txt'));
  });

  it('handles merge with empty node list', async () => {
    const result = await merger.merge(testRoot, 'exec-5', [], stagingManager);

    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
    assert.equal(result.mergedFiles?.length ?? 0, 0);
  });

  it('handles merge when staging directory does not exist', async () => {
    const result = await merger.merge(testRoot, 'exec-999', ['node-999'], stagingManager);

    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
  });

  it('detects conflicts directly with conflict detection method', async () => {
    const changes = new Map([
      ['file1.txt', [
        { nodeId: 'node-1', content: 'version 1', contentHash: 'hash1' },
        { nodeId: 'node-2', content: 'version 2', contentHash: 'hash2' }
      ]],
      ['file2.txt', [
        { nodeId: 'node-1', content: 'same', contentHash: 'hash3' },
        { nodeId: 'node-2', content: 'same', contentHash: 'hash3' }
      ]],
      ['file3.txt', [
        { nodeId: 'node-1', content: 'only one', contentHash: 'hash4' }
      ]]
    ]);

    const conflicts = await merger.detectConflicts(testRoot, changes);

    // Only file1.txt should have a conflict
    assert.equal(conflicts.length, 1);
    assert.ok(conflicts.includes('file1.txt'));
  });
});
