import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { SessionStore } from '../../sessionStore.js';
import { ExecutionManager } from '../../execution/manager.js';
import { createSmartScanTool } from '../../tools/smartScan.js';
import { createRecommendDroidsTool } from '../../tools/recommendDroids.js';
import { createForgeRosterTool } from '../../tools/forgeRoster.js';
import { createRecordProjectGoalTool } from '../../tools/recordProjectGoal.js';
import { createSelectMethodologyTool } from '../../tools/selectMethodology.js';
import { createConfirmMethodologyTool } from '../../tools/confirmMethodology.js';
import { createCleanupRepoTool } from '../../tools/cleanupRepo.js';
import { ensureDir } from '../../fs.js';
import type { DroidDefinition } from '../../../types.js';

describe('E2E: Safe Cleanup Flow', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;
  let executionManager: ExecutionManager;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-e2e-cleanup-'));
    sessionStore = new SessionStore();
    executionManager = new ExecutionManager();

    // Create minimal repo structure
    await ensureDir(join(repoRoot, 'src'));
    await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: { react: '^18.0.0' }
    }, null, 2));
  });

  afterEach(async () => {
    // Shutdown execution manager to wait for any pending persistence operations
    await executionManager.shutdown();

    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  async function createRoster(droidCount: number) {
    const sessionId = randomUUID();
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Test cleanup flow' 
    });

    // Populate required discovery fields
    const session = await sessionStore.load(repoRoot, sessionId);
    if (session) {
      session.targetAudience = 'Test users';
      session.timelineConstraints = '3 months';
      session.qualityVsSpeed = 'Balanced';
      session.teamSize = '3';
      session.experienceLevel = 'Mid-level';
      session.budgetConstraints = '$50k';
      session.deploymentRequirements = 'Cloud';
      session.securityRequirements = 'Standard';
      session.scalabilityNeeds = 'Medium';
      await sessionStore.save(repoRoot, session);
    }

    const confirmTool = createConfirmMethodologyTool(deps);
    await confirmTool.handler({ repoRoot, sessionId, methodology: 'agile' });

    const selectMethodologyTool = createSelectMethodologyTool(deps);
    await selectMethodologyTool.handler({
      repoRoot,
      sessionId,
      choice: 'agile'
    });

    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    const forgeTool = createForgeRosterTool(deps);
    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: recommendations.suggestions
        .slice(0, droidCount)
        .map(s => ({
          id: s.id,
          label: s.label || s.id,
          abilities: [],
          goal: s.summary
        }))
    });
  }

  async function getDroidCount(): Promise<number> {
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    try {
      const files = await fs.readdir(droidsDir);
      return files.filter(f => f.endsWith('.json') && f.startsWith('df-')).length;
    } catch {
      return 0;
    }
  }

  async function checkDirectoryExists(path: string): Promise<boolean> {
    try {
      await fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  it('shows preview with all droids and UUIDs when no confirmation provided', async () => {
    await createRoster(3);

    const cleanupTool = createCleanupRepoTool();
    const result = await cleanupTool.handler({ repoRoot });

    // Should return preview, not perform deletion
    assert.ok(result.preview, 'Should return preview');
    assert.equal(result.removed.length, 0, 'Should not remove anything without confirmation');

    // Preview should show all droids
    assert.ok(result.preview.droidCount >= 3, 'Should show at least 3 droids in preview');
    assert.equal(result.preview.droids.length, result.preview.droidCount, 'Droid list should match count');

    // Each droid in preview should have required fields
    for (const droid of result.preview.droids) {
      assert.ok(droid.id, 'Droid should have ID');
      assert.ok(droid.id.startsWith('df-'), 'Droid ID should have df- prefix');
      assert.ok(droid.uuid, 'Droid should have UUID in preview');
      assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(droid.uuid),
        'UUID should be valid format'
      );
      assert.ok(droid.purpose, 'Droid should have purpose');
    }

    // Preview should list files to remove
    assert.ok(result.preview.filesToRemove.length > 0, 'Should list files to remove');
    assert.ok(
      result.preview.filesToRemove.includes('.droidforge'),
      'Should include .droidforge in removal list'
    );

    // Verify nothing was actually deleted
    const droidCount = await getDroidCount();
    assert.ok(droidCount >= 3, 'Droids should still exist after preview');
  });

  it('rejects cleanup with wrong confirmation string', async () => {
    await createRoster(3);

    const cleanupTool = createCleanupRepoTool();
    
    // Try with wrong confirmation
    const result = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'wrong confirmation' 
    });

    // Should reject with error
    assert.ok(result.error, 'Should return error on rejection');
    assert.equal(result.error.code, 'CONFIRMATION_MISMATCH', 'Should have mismatch error code');
    assert.equal(result.removed.length, 0, 'Should not remove anything with wrong confirmation');
    
    // Verify nothing was deleted
    const droidCountAfter = await getDroidCount();
    assert.ok(droidCountAfter >= 3, 'Droids should still exist after wrong confirmation');

    const droidsDirExists = await checkDirectoryExists(join(repoRoot, '.droidforge'));
    assert.ok(droidsDirExists, '.droidforge directory should still exist');
  });

  it('rejects cleanup with partial/case variation confirmation', async () => {
    await createRoster(2);

    const cleanupTool = createCleanupRepoTool();
    
    // Try case variations - all should be rejected since exact match required
    const wrongConfirmations = [
      'delete everything',  // Missing 'DroidForge'
      'droidforge delete',  // Wrong order
      'yes delete everything',  // Extra words
    ];

    for (const wrongConf of wrongConfirmations) {
      const result = await cleanupTool.handler({ 
        repoRoot, 
        confirmationString: wrongConf 
      });

      assert.ok(result.error, `Should return error for "${wrongConf}"`);
      assert.equal(result.removed.length, 0, `Should not remove with "${wrongConf}"`);
    }

    // Verify nothing was deleted
    const droidCount = await getDroidCount();
    assert.ok(droidCount >= 2, 'Droids should still exist after all rejections');
  });

  it('accepts case-insensitive exact confirmation and performs cleanup', async () => {
    await createRoster(3);

    const cleanupTool = createCleanupRepoTool();
    
    // Get preview first to know what will be deleted
    const preview = await cleanupTool.handler({ repoRoot });
    assert.ok(preview.preview, 'Should get preview');

    // Try case-insensitive exact match
    const result = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'remove all droids' 
    });

    // Should perform cleanup
    assert.ok(result.removed.length > 0, 'Should remove files');
    assert.ok(!result.preview, 'Should not return preview after successful cleanup');
    assert.ok(!result.error, 'Should not return error after successful cleanup');

    // Verify all droids were deleted
    const droidCountAfter = await getDroidCount();
    assert.equal(droidCountAfter, 0, 'All droids should be deleted');

    // Verify droids directory was removed (logs directory may still exist)
    const droidsDirExists = await checkDirectoryExists(join(repoRoot, '.droidforge', 'droids'));
    assert.ok(!droidsDirExists, '.droidforge/droids directory should be removed');
  });

  it('case-insensitive confirmation works with different casing', async () => {
    await createRoster(2);

    const cleanupTool = createCleanupRepoTool();
    
    // Try different case variations of the exact string
    const result = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'REMOVE ALL DROIDS'  // uppercase
    });

    // Should perform cleanup
    assert.ok(result.removed.length >= 2, 'Should remove droids');
    assert.ok(!result.preview, 'Should not return preview');

    // Verify deletion
    const droidCountAfter = await getDroidCount();
    assert.equal(droidCountAfter, 0, 'All droids should be deleted');
  });

  it('logs cleanup operation with droid UUIDs', async () => {
    await createRoster(3);

    // Capture UUIDs before cleanup
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const files = await fs.readdir(droidsDir);
    const uuids: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        uuids.push(droid.uuid!);
      }
    }

    // Perform cleanup
    const cleanupTool = createCleanupRepoTool();
    const result = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'remove all droids' 
    });

    // Check removed list reports deleted files
    assert.ok(result.removed.length > 0, 'Should report removed files');
    assert.ok(
      result.removed.includes('.droidforge'),
      'Should include .droidforge in removed list'
    );

    // Check log file was created
    const logDir = join(repoRoot, '.droidforge', 'logs');
    const logExists = await checkDirectoryExists(logDir);
    assert.ok(logExists, 'Log directory should exist');

    const logFiles = await fs.readdir(logDir);
    const latestLog = logFiles.sort().reverse()[0];
    assert.ok(latestLog, 'Should have log file');

    const logContent = await fs.readFile(join(logDir, latestLog), 'utf8');
    const logLines = logContent.trim().split('\n');
    
    // Find cleanup event in logs
    const cleanupEvents = logLines
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(event => event.event === 'cleanup_repo');
    
    assert.ok(cleanupEvents.length > 0, 'Should have cleanup event in logs');
    
    const cleanupEvent = cleanupEvents[cleanupEvents.length - 1];
    assert.equal(cleanupEvent.status, 'ok', 'Cleanup should be logged as successful');
  });

  it('allows re-initialization after cleanup', async () => {
    // Create initial roster
    await createRoster(3);
    const firstCount = await getDroidCount();

    // Perform cleanup
    const cleanupTool = createCleanupRepoTool();
    await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'remove all droids' 
    });

    // Verify cleanup
    const afterCleanup = await getDroidCount();
    assert.equal(afterCleanup, 0, 'Should have no droids after cleanup');

    // Re-initialize with new roster
    await createRoster(2);
    const afterReinit = await getDroidCount();
    
    assert.ok(afterReinit >= 2, 'Should be able to create new droids after cleanup');

    // Verify new droids have fresh UUIDs
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const newFiles = await fs.readdir(droidsDir);
    
    for (const file of newFiles) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        
        assert.ok(droid.uuid, 'New droid should have UUID');
        assert.ok(droid.createdAt, 'New droid should have createdAt');
        
        // Verify createdAt is recent (within last minute)
        const createdDate = new Date(droid.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - createdDate.getTime();
        assert.ok(diffMs < 60000, 'New droid should have recent createdAt timestamp');
      }
    }
  });

  it('cleanup preview includes all target files and directories', async () => {
    await createRoster(3);

    // Create additional files that should be cleaned up
    await ensureDir(join(repoRoot, 'docs'));
    await fs.writeFile(
      join(repoRoot, 'docs', 'DroidForge_user_guide_en.md'), 
      '# User Guide'
    );

    await ensureDir(join(repoRoot, '.factory', 'commands'));
    await fs.writeFile(
      join(repoRoot, '.factory', 'commands', 'df'), 
      '#!/bin/bash\necho "command"'
    );

    const cleanupTool = createCleanupRepoTool();
    const result = await cleanupTool.handler({ repoRoot });

    assert.ok(result.preview, 'Should return preview');
    
    // Should list expected targets
    const targets = result.preview.filesToRemove;
    assert.ok(
      targets.some(t => t.includes('.droidforge')),
      'Should include .droidforge directory'
    );
    assert.ok(
      targets.some(t => t.includes('.factory')),
      'Should include .factory directory'
    );
  });

  it('handles cleanup with no droids gracefully', async () => {
    // Don't create any roster - just test empty repo cleanup
    const cleanupTool = createCleanupRepoTool();
    const result = await cleanupTool.handler({ repoRoot });

    // Should return preview even with no droids
    assert.ok(result.preview, 'Should return preview');
    assert.equal(result.preview.droidCount, 0, 'Should show 0 droids');
    assert.equal(result.preview.droids.length, 0, 'Should have empty droids list');
    
    // Cleanup with confirmation should succeed even with no droids
    const cleanupResult = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'remove all droids' 
    });
    
    // May remove target files even if no droids exist
    assert.ok(!cleanupResult.error, 'Should not error on empty repo cleanup');
    
    // Verify no droids after cleanup (should still be 0)
    const finalCount = await getDroidCount();
    assert.equal(finalCount, 0, 'Should have no droids after cleanup');
  });

  it('multiple cleanup attempts with wrong confirmation do not cause issues', async () => {
    await createRoster(2);

    const cleanupTool = createCleanupRepoTool();
    
    // Try multiple wrong confirmations
    for (let i = 0; i < 5; i++) {
      const result = await cleanupTool.handler({ 
        repoRoot, 
        confirmationString: `wrong-${i}` 
      });
      
      assert.ok(result.error, `Attempt ${i + 1} should return error`);
      assert.equal(result.removed.length, 0, `Attempt ${i + 1} should not remove anything`);
    }

    // Verify droids still intact
    const droidCount = await getDroidCount();
    assert.ok(droidCount >= 2, 'Droids should still exist after multiple failed attempts');

    // Finally cleanup successfully
    const finalResult = await cleanupTool.handler({ 
      repoRoot, 
      confirmationString: 'remove all droids' 
    });

    assert.ok(finalResult.removed.length >= 2, 'Should successfully cleanup after failed attempts');
  });
});
