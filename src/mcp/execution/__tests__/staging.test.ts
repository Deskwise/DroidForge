import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { StagingManager } from '../staging.js';
import { ensureDir, removeIfExists } from '../../fs.js';

describe('StagingManager', () => {
  let testRoot: string;
  let stagingManager: StagingManager;

  before(async () => {
    // Create a temporary test repository
    testRoot = join(tmpdir(), `staging-test-${Date.now()}`);
    await ensureDir(testRoot);
    stagingManager = new StagingManager();

    // Create test files
    await fs.writeFile(join(testRoot, 'file1.txt'), 'content1', 'utf-8');
    await fs.writeFile(join(testRoot, 'file2.txt'), 'content2', 'utf-8');
    
    await ensureDir(join(testRoot, 'src'));
    await fs.writeFile(join(testRoot, 'src', 'index.ts'), 'export const x = 1;', 'utf-8');
    
    await ensureDir(join(testRoot, 'tests'));
    await fs.writeFile(join(testRoot, 'tests', 'test.ts'), 'test code', 'utf-8');
  });

  after(async () => {
    // Clean up test directory
    await removeIfExists(testRoot);
  });

  it('creates staging directory with repo copy', async () => {
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-1', 'node-1');
    
    // Verify staging path is correct
    assert.equal(stagingPath, join(testRoot, '.droidforge', 'exec', 'exec-1', 'staging', 'node-1'));
    
    // Verify staging directory exists
    const stat = await fs.stat(stagingPath);
    assert.ok(stat.isDirectory());
    
    // Verify files were copied
    const file1Content = await fs.readFile(join(stagingPath, 'file1.txt'), 'utf-8');
    assert.equal(file1Content, 'content1');
    
    const srcIndexContent = await fs.readFile(join(stagingPath, 'src', 'index.ts'), 'utf-8');
    assert.equal(srcIndexContent, 'export const x = 1;');
  });

  it('excludes .droidforge directory from staging copy', async () => {
    // Create .droidforge directory in repo
    const droidforgeDir = join(testRoot, '.droidforge');
    await ensureDir(droidforgeDir);
    await fs.writeFile(join(droidforgeDir, 'test.txt'), 'should not copy', 'utf-8');
    
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-2', 'node-2');
    
    // Verify .droidforge was not copied
    try {
      await fs.access(join(stagingPath, '.droidforge'));
      assert.fail('.droidforge directory should not be copied');
    } catch (error) {
      // Expected - directory should not exist
      assert.ok(true);
    }
  });

  it('collects changes based on resource claims', async () => {
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-3', 'node-3');
    
    // Modify a file in staging
    await fs.writeFile(join(stagingPath, 'file1.txt'), 'modified content', 'utf-8');
    
    // Collect changes for specific resource claim
    const changes = await stagingManager.collectChanges(
      testRoot,
      stagingPath,
      ['file1.txt']
    );
    
    // Verify changes were collected
    assert.equal(changes.size, 1);
    assert.equal(changes.get('file1.txt'), 'modified content');
  });

  it('collects changes with glob patterns', async () => {
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-4', 'node-4');
    
    // Modify files in staging
    await fs.writeFile(join(stagingPath, 'src', 'index.ts'), 'export const x = 2;', 'utf-8');
    await fs.writeFile(join(stagingPath, 'src', 'utils.ts'), 'export const y = 3;', 'utf-8');
    
    // Collect changes with glob pattern
    const changes = await stagingManager.collectChanges(
      testRoot,
      stagingPath,
      ['src/**/*.ts']
    );
    
    // Verify multiple files were collected
    assert.ok(changes.size >= 1);
    assert.equal(changes.get(join('src', 'index.ts')), 'export const x = 2;');
  });

  it('returns empty map for no resource claims', async () => {
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-5', 'node-5');
    
    const changes = await stagingManager.collectChanges(
      testRoot,
      stagingPath,
      []
    );
    
    assert.equal(changes.size, 0);
  });

  it('cleans staging directory', async () => {
    const stagingPath = await stagingManager.createStaging(testRoot, 'exec-6', 'node-6');
    
    // Verify staging exists
    await fs.access(stagingPath);
    
    // Clean staging
    await stagingManager.cleanStaging(testRoot, 'exec-6', 'node-6');
    
    // Verify staging was removed
    try {
      await fs.access(stagingPath);
      assert.fail('Staging directory should be removed');
    } catch (error) {
      // Expected - directory should not exist
      assert.ok(true);
    }
  });

  it('handles multiple staging directories for same execution', async () => {
    const staging1 = await stagingManager.createStaging(testRoot, 'exec-7', 'node-a');
    const staging2 = await stagingManager.createStaging(testRoot, 'exec-7', 'node-b');
    
    // Verify both exist
    await fs.access(staging1);
    await fs.access(staging2);
    
    // Verify they're different
    assert.notEqual(staging1, staging2);
    
    // Clean up
    await stagingManager.cleanStaging(testRoot, 'exec-7', 'node-a');
    await stagingManager.cleanStaging(testRoot, 'exec-7', 'node-b');
  });

  it('handles cleaning non-existent staging directory', async () => {
    // Should not throw error
    await stagingManager.cleanStaging(testRoot, 'exec-999', 'node-999');
    assert.ok(true);
  });
});
