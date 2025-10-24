/**
 * Tests for StagingManager - isolated workspace management
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { StagingManager } from '../staging.js';
import { createTestRepo, cleanupTestRepo } from './helpers/testUtils.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

describe('StagingManager', () => {
  let testRepo: string;
  let stagingManager: StagingManager;

  before(async () => {
    testRepo = await createTestRepo();
    stagingManager = new StagingManager();
  });

  after(async () => {
    await cleanupTestRepo(testRepo);
  });

  it('creates isolated staging directory', async () => {
    const executionId = 'exec-test-1';
    const nodeId = 'node-1';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Staging path should exist
    const stats = await fs.stat(stagingPath);
    assert.ok(stats.isDirectory(), 'Staging path should be a directory');
    
    // Should contain copied files
    const file1Exists = await fs.access(join(stagingPath, 'src', 'file1.ts'))
      .then(() => true)
      .catch(() => false);
    assert.equal(file1Exists, true, 'Should contain copied file1.ts');
    
    const readmeExists = await fs.access(join(stagingPath, 'README.md'))
      .then(() => true)
      .catch(() => false);
    assert.equal(readmeExists, true, 'Should contain copied README.md');
  });

  it('excludes .droidforge directory from staging', async () => {
    // Create .droidforge directory in test repo
    await fs.mkdir(join(testRepo, '.droidforge', 'exec'), { recursive: true });
    await fs.writeFile(join(testRepo, '.droidforge', 'test.json'), '{}');
    
    const stagingPath = await stagingManager.createStaging(testRepo, 'exec-test-2', 'node-2');
    
    // .droidforge should NOT exist in staging
    const droidforgeExists = await fs.access(join(stagingPath, '.droidforge'))
      .then(() => true)
      .catch(() => false);
    assert.equal(droidforgeExists, false, 'Should not copy .droidforge directory');
  });

  it('maintains file isolation between nodes', async () => {
    const executionId = 'exec-test-3';
    
    // Create staging for two nodes
    const staging1 = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(testRepo, executionId, 'node-2');
    
    // Modify file in first staging
    await fs.writeFile(join(staging1, 'src', 'file1.ts'), 'export const modified = true;');
    
    // Second staging should have original content
    const content2 = await fs.readFile(join(staging2, 'src', 'file1.ts'), 'utf-8');
    assert.equal(content2, 'export const value = 1;', 'Should have original content');
    
    // Original repo should be unchanged
    const originalContent = await fs.readFile(join(testRepo, 'src', 'file1.ts'), 'utf-8');
    assert.equal(originalContent, 'export const value = 1;', 'Original should be unchanged');
  });

  it('collects changes based on resource claims', async () => {
    const executionId = 'exec-test-4';
    const nodeId = 'node-collect';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Modify files in staging
    await fs.writeFile(join(stagingPath, 'src', 'file1.ts'), 'export const value = 100;');
    await fs.writeFile(join(stagingPath, 'src', 'file2.ts'), 'export const value = 200;');
    
    // Collect changes for specific resource claims
    const changes = await stagingManager.collectChanges(
      testRepo,
      stagingPath,
      ['src/file1.ts']
    );
    
    assert.equal(changes.size, 1, 'Should collect only claimed files');
    assert.ok(changes.has('src/file1.ts'), 'Should contain file1.ts');
    assert.equal(changes.get('src/file1.ts'), 'export const value = 100;');
  });

  it('handles glob patterns in resource claims', async () => {
    const executionId = 'exec-test-5';
    const nodeId = 'node-glob';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Modify files
    await fs.writeFile(join(stagingPath, 'src', 'file1.ts'), 'modified 1');
    await fs.writeFile(join(stagingPath, 'src', 'file2.ts'), 'modified 2');
    
    // Collect with glob pattern
    const changes = await stagingManager.collectChanges(
      testRepo,
      stagingPath,
      ['src/*.ts']
    );
    
    assert.equal(changes.size, 2, 'Should collect all matching files');
    assert.ok(changes.has('src/file1.ts'));
    assert.ok(changes.has('src/file2.ts'));
  });

  it('handles nested directory patterns', async () => {
    const executionId = 'exec-test-6';
    const nodeId = 'node-nested';
    
    // Create nested structure in test repo
    await fs.mkdir(join(testRepo, 'src', 'nested', 'deep'), { recursive: true });
    await fs.writeFile(join(testRepo, 'src', 'nested', 'file.ts'), 'nested');
    await fs.writeFile(join(testRepo, 'src', 'nested', 'deep', 'file.ts'), 'deep');
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Collect with recursive pattern
    const changes = await stagingManager.collectChanges(
      testRepo,
      stagingPath,
      ['src/**/*.ts']
    );
    
    assert.ok(changes.size >= 2, 'Should collect nested files');
    assert.ok(changes.has('src/nested/file.ts') || Array.from(changes.keys()).some(k => k.includes('nested')));
  });

  it('returns empty map for empty resource claims', async () => {
    const executionId = 'exec-test-7';
    const nodeId = 'node-empty';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    const changes = await stagingManager.collectChanges(
      testRepo,
      stagingPath,
      []
    );
    
    assert.equal(changes.size, 0, 'Should return empty map for no claims');
  });

  it('cleans staging directory', async () => {
    const executionId = 'exec-test-8';
    const nodeId = 'node-clean';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Verify it exists
    let exists = await fs.access(stagingPath)
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, true, 'Staging should exist before cleanup');
    
    // Clean it
    await stagingManager.cleanStaging(testRepo, executionId, nodeId);
    
    // Verify it's gone
    exists = await fs.access(stagingPath)
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, false, 'Staging should not exist after cleanup');
  });

  it('handles cleanup of non-existent staging gracefully', async () => {
    // Should not throw
    await stagingManager.cleanStaging(testRepo, 'exec-nonexistent', 'node-nonexistent');
  });

  it('creates staging path in correct location', async () => {
    const executionId = 'exec-test-9';
    const nodeId = 'node-path';
    
    const stagingPath = await stagingManager.createStaging(testRepo, executionId, nodeId);
    
    // Path should follow convention: {repoRoot}/.droidforge/exec/{executionId}/staging/{nodeId}
    const expectedPath = join(testRepo, '.droidforge', 'exec', executionId, 'staging', nodeId);
    assert.equal(stagingPath, expectedPath, 'Should create staging at expected path');
  });

  it('preserves file permissions in staging', async () => {
    // Create executable file
    const execPath = join(testRepo, 'script.sh');
    await fs.writeFile(execPath, '#!/bin/bash\necho "test"');
    await fs.chmod(execPath, 0o755);
    
    const stagingPath = await stagingManager.createStaging(testRepo, 'exec-test-10', 'node-perm');
    
    // Check permissions in staging
    const stagedScript = join(stagingPath, 'script.sh');
    const stats = await fs.stat(stagedScript);
    
    // Should be readable
    assert.ok((stats.mode & 0o400) !== 0, 'Should preserve read permission');
  });

  it('handles multiple staging directories for same execution', async () => {
    const executionId = 'exec-test-multi';
    
    // Create multiple staging areas
    const staging1 = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(testRepo, executionId, 'node-2');
    const staging3 = await stagingManager.createStaging(testRepo, executionId, 'node-3');
    
    // All should exist and be different
    assert.notEqual(staging1, staging2);
    assert.notEqual(staging2, staging3);
    
    const exists1 = await fs.access(staging1).then(() => true).catch(() => false);
    const exists2 = await fs.access(staging2).then(() => true).catch(() => false);
    const exists3 = await fs.access(staging3).then(() => true).catch(() => false);
    
    assert.ok(exists1 && exists2 && exists3, 'All staging directories should exist');
  });

  it('handles special characters in file names', async () => {
    // Create file with special characters
    await fs.writeFile(join(testRepo, 'file with spaces.txt'), 'content');
    await fs.writeFile(join(testRepo, 'file-with-dashes.txt'), 'content');
    
    const stagingPath = await stagingManager.createStaging(testRepo, 'exec-special', 'node-special');
    
    // Files should be copied
    const exists1 = await fs.access(join(stagingPath, 'file with spaces.txt'))
      .then(() => true)
      .catch(() => false);
    const exists2 = await fs.access(join(stagingPath, 'file-with-dashes.txt'))
      .then(() => true)
      .catch(() => false);
    
    assert.ok(exists1 && exists2, 'Should handle special characters in file names');
  });

  it('supports concurrent staging operations', async () => {
    const executionId = 'exec-concurrent';
    
    // Create multiple staging directories concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      stagingManager.createStaging(testRepo, executionId, `node-${i}`)
    );
    
    const stagingPaths = await Promise.all(promises);
    
    // All should be created
    assert.equal(stagingPaths.length, 5);
    
    // All should be unique
    const uniquePaths = new Set(stagingPaths);
    assert.equal(uniquePaths.size, 5);
    
    // All should exist
    const existenceChecks = await Promise.all(
      stagingPaths.map(path => fs.access(path).then(() => true).catch(() => false))
    );
    assert.ok(existenceChecks.every(exists => exists), 'All staging directories should exist');
  });
});
