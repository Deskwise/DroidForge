/**
 * Tests for ExecutionMerger - merging changes from staging areas
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionMerger } from '../merger.js';
import { StagingManager } from '../staging.js';
import { createTestRepo, cleanupTestRepo } from './helpers/testUtils.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

describe('ExecutionMerger', () => {
  let testRepo: string;
  let merger: ExecutionMerger;
  let stagingManager: StagingManager;

  before(async () => {
    testRepo = await createTestRepo();
    merger = new ExecutionMerger();
    stagingManager = new StagingManager();
  });

  after(async () => {
    await cleanupTestRepo(testRepo);
  });

  it('detects no conflicts when files are different', async () => {
    const changes = new Map([
      ['file1.ts', [
        { nodeId: 'node-1', content: 'content1', contentHash: 'hash1' }
      ]],
      ['file2.ts', [
        { nodeId: 'node-2', content: 'content2', contentHash: 'hash2' }
      ]]
    ]);

    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    assert.equal(conflicts.length, 0, 'Should detect no conflicts for different files');
  });

  it('detects no conflicts when multiple nodes produce identical content', async () => {
    const changes = new Map([
      ['file1.ts', [
        { nodeId: 'node-1', content: 'same content', contentHash: 'hash-same' },
        { nodeId: 'node-2', content: 'same content', contentHash: 'hash-same' }
      ]]
    ]);

    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    assert.equal(conflicts.length, 0, 'Should detect no conflicts for identical content');
  });

  it('detects conflicts when nodes produce different content for same file', async () => {
    const changes = new Map([
      ['file1.ts', [
        { nodeId: 'node-1', content: 'content version 1', contentHash: 'hash1' },
        { nodeId: 'node-2', content: 'content version 2', contentHash: 'hash2' }
      ]]
    ]);

    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    assert.equal(conflicts.length, 1);
    assert.ok(conflicts.includes('file1.ts'));
  });

  it('merges changes successfully when no conflicts exist', async () => {
    const executionId = 'exec-merge-1';
    
    // Create staging for two nodes
    const staging1 = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(testRepo, executionId, 'node-2');
    
    // Modify different files in each staging
    await fs.writeFile(join(staging1, 'src', 'file1.ts'), 'export const a = 1;');
    await fs.writeFile(join(staging2, 'src', 'file2.ts'), 'export const b = 2;');
    
    // Create mock state file for resource claims
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['src/file1.ts'] } },
          { nodeId: 'node-2', spec: { resourceClaims: ['src/file2.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1', 'node-2'], stagingManager);
    
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
    assert.ok(result.mergedFiles);
    assert.equal(result.mergedFiles.length, 2);
    
    // Verify files were merged to repo
    const file1Content = await fs.readFile(join(testRepo, 'src', 'file1.ts'), 'utf-8');
    const file2Content = await fs.readFile(join(testRepo, 'src', 'file2.ts'), 'utf-8');
    
    assert.equal(file1Content, 'export const a = 1;');
    assert.equal(file2Content, 'export const b = 2;');
  });

  it('fails merge when conflicts are detected', async () => {
    const executionId = 'exec-merge-conflict';
    
    // Create staging for two nodes
    const staging1 = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(testRepo, executionId, 'node-2');
    
    // Both modify the same file differently
    await fs.writeFile(join(staging1, 'src', 'file1.ts'), 'export const value = "version1";');
    await fs.writeFile(join(staging2, 'src', 'file1.ts'), 'export const value = "version2";');
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['src/file1.ts'] } },
          { nodeId: 'node-2', spec: { resourceClaims: ['src/file1.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1', 'node-2'], stagingManager);
    
    assert.equal(result.success, false);
    assert.ok(result.conflicts.length > 0);
    assert.ok(result.conflicts.includes('src/file1.ts'));
  });

  it('handles merge with no staging directories', async () => {
    const result = await merger.merge(
      testRepo,
      'exec-nonexistent',
      ['node-1', 'node-2'],
      stagingManager
    );
    
    // Should succeed with no changes
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
  });

  it('handles merge with empty resource claims', async () => {
    const executionId = 'exec-empty-claims';
    
    // Create staging but no changes
    await stagingManager.createStaging(testRepo, executionId, 'node-1');
    
    // Create mock state file with empty claims
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: [] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1'], stagingManager);
    
    assert.equal(result.success, true);
    assert.equal(result.conflicts.length, 0);
  });

  it('merges multiple files from single node', async () => {
    const executionId = 'exec-multi-files';
    
    const staging = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    
    // Create multiple new files
    await fs.writeFile(join(staging, 'new1.ts'), 'export const new1 = 1;');
    await fs.writeFile(join(staging, 'new2.ts'), 'export const new2 = 2;');
    await fs.writeFile(join(staging, 'new3.ts'), 'export const new3 = 3;');
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['new*.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1'], stagingManager);
    
    assert.equal(result.success, true);
    assert.ok(result.mergedFiles);
    assert.equal(result.mergedFiles.length, 3);
  });

  it('handles partial merge failure gracefully', async () => {
    const executionId = 'exec-partial';
    
    // Create staging for three nodes
    const staging1 = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    const staging2 = await stagingManager.createStaging(testRepo, executionId, 'node-2');
    const staging3 = await stagingManager.createStaging(testRepo, executionId, 'node-3');
    
    // node-1 and node-2 have conflict, node-3 is fine
    await fs.writeFile(join(staging1, 'conflict.ts'), 'version 1');
    await fs.writeFile(join(staging2, 'conflict.ts'), 'version 2');
    await fs.writeFile(join(staging3, 'safe.ts'), 'safe content');
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['conflict.ts'] } },
          { nodeId: 'node-2', spec: { resourceClaims: ['conflict.ts'] } },
          { nodeId: 'node-3', spec: { resourceClaims: ['safe.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(
      testRepo,
      executionId,
      ['node-1', 'node-2', 'node-3'],
      stagingManager
    );
    
    // Should fail due to conflict
    assert.equal(result.success, false);
    assert.ok(result.conflicts.includes('conflict.ts'));
  });

  it('preserves file content exactly', async () => {
    const executionId = 'exec-preserve';
    const staging = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    
    // Content with special characters, newlines, etc.
    const specialContent = `
      export const data = {
        "special": "chars",
        "unicode": "Hello 世界",
        "newlines": "line1\\nline2\\nline3"
      };
    `;
    
    await fs.writeFile(join(staging, 'special.ts'), specialContent);
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['special.ts'] } }
        ]
      })
    );
    
    await merger.merge(testRepo, executionId, ['node-1'], stagingManager);
    
    // Verify content is exactly preserved
    const mergedContent = await fs.readFile(join(testRepo, 'special.ts'), 'utf-8');
    assert.equal(mergedContent, specialContent);
  });

  it('handles deeply nested directory structures', async () => {
    const executionId = 'exec-nested';
    const staging = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    
    // Create deeply nested structure
    const nestedPath = join(staging, 'src', 'deep', 'nested', 'structure');
    await fs.mkdir(nestedPath, { recursive: true });
    await fs.writeFile(join(nestedPath, 'file.ts'), 'export const deep = true;');
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['src/**/*.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1'], stagingManager);
    
    assert.equal(result.success, true);
    
    // Verify nested file was created
    const nestedFile = join(testRepo, 'src', 'deep', 'nested', 'structure', 'file.ts');
    const exists = await fs.access(nestedFile).then(() => true).catch(() => false);
    assert.ok(exists, 'Nested file should be created');
  });

  it('correctly hashes file content for conflict detection', async () => {
    const content1 = 'export const value = 1;';
    const content2 = 'export const value = 1;'; // Identical
    const content3 = 'export const value = 2;'; // Different
    
    const changes = new Map([
      ['file.ts', [
        { nodeId: 'node-1', content: content1, contentHash: 'hash1' },
        { nodeId: 'node-2', content: content2, contentHash: 'hash1' }, // Same hash
        { nodeId: 'node-3', content: content3, contentHash: 'hash2' }  // Different hash
      ]]
    ]);
    
    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    // Should detect conflict because hash2 differs from hash1
    assert.equal(conflicts.length, 1);
    assert.ok(conflicts.includes('file.ts'));
  });

  it('handles three-way conflicts correctly', async () => {
    const changes = new Map([
      ['file.ts', [
        { nodeId: 'node-1', content: 'version 1', contentHash: 'hash1' },
        { nodeId: 'node-2', content: 'version 2', contentHash: 'hash2' },
        { nodeId: 'node-3', content: 'version 3', contentHash: 'hash3' }
      ]]
    ]);
    
    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    assert.equal(conflicts.length, 1);
    assert.ok(conflicts.includes('file.ts'));
  });

  it('handles empty changes map', async () => {
    const changes = new Map();
    const conflicts = await merger.detectConflicts(testRepo, changes);
    
    assert.equal(conflicts.length, 0);
  });

  it('reports all merged files correctly', async () => {
    const executionId = 'exec-report';
    const staging = await stagingManager.createStaging(testRepo, executionId, 'node-1');
    
    await fs.writeFile(join(staging, 'file1.ts'), 'content1');
    await fs.writeFile(join(staging, 'file2.ts'), 'content2');
    await fs.writeFile(join(staging, 'file3.ts'), 'content3');
    
    // Create mock state file
    await fs.mkdir(join(testRepo, '.droidforge', 'exec', executionId), { recursive: true });
    await fs.writeFile(
      join(testRepo, '.droidforge', 'exec', executionId, 'state.json'),
      JSON.stringify({
        nodes: [
          { nodeId: 'node-1', spec: { resourceClaims: ['*.ts'] } }
        ]
      })
    );
    
    const result = await merger.merge(testRepo, executionId, ['node-1'], stagingManager);
    
    assert.equal(result.success, true);
    assert.ok(result.mergedFiles);
    assert.ok(result.mergedFiles.includes('file1.ts'));
    assert.ok(result.mergedFiles.includes('file2.ts'));
    assert.ok(result.mergedFiles.includes('file3.ts'));
  });
});
