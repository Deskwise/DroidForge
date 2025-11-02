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
import { createSnapshotTool } from '../../tools/snapshot.js';
import { createRestoreSnapshotTool } from '../../tools/restoreSnapshot.js';
import { createListSnapshotsTool } from '../../tools/listSnapshots.js';
import { ensureDir } from '../../fs.js';
import type { DroidDefinition } from '../../../types.js';

describe('E2E: Snapshot and Restore', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;
  let executionManager: ExecutionManager;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-e2e-snapshot-'));
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

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  async function createRoster(droidCount: number = 3) {
    const sessionId = randomUUID();
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Test snapshot/restore' 
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

  async function getDroidUUIDs(): Promise<Map<string, { uuid: string; createdAt: string; displayName: string }>> {
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const files = await fs.readdir(droidsDir);
    const uuids = new Map<string, { uuid: string; createdAt: string; displayName: string }>();

    for (const file of files) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        uuids.set(droid.id, { 
          uuid: droid.uuid!, 
          createdAt: droid.createdAt,
          displayName: droid.displayName 
        });
      }
    }

    return uuids;
  }

  it('creates snapshot with metadata and preserves all droid data', async () => {
    await createRoster(3);

    const snapshotTool = createSnapshotTool();
    const result = await snapshotTool.handler({ 
      repoRoot, 
      label: 'test-backup' 
    });

    assert.ok(result.snapshotId, 'Should return snapshot ID');
    assert.ok(result.snapshotId.includes('test-backup'), 'Snapshot ID should include label');
    assert.ok(result.paths.length > 0, 'Should return paths');

    // Verify snapshot directory was created
    const snapshotDir = result.paths[0];
    const exists = await fs.stat(snapshotDir).then(() => true).catch(() => false);
    assert.ok(exists, 'Snapshot directory should exist');

    // Verify snapshot contains metadata
    const metadataPath = join(snapshotDir, 'snapshot.json');
    const metadataExists = await fs.stat(metadataPath).then(() => true).catch(() => false);
    assert.ok(metadataExists, 'Snapshot metadata should exist');

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    assert.equal(metadata.label, 'test-backup', 'Metadata should include label');
    assert.ok(metadata.createdAt, 'Metadata should include createdAt');
    assert.equal(metadata.id, result.snapshotId, 'Metadata ID should match result');

    // Verify snapshot contains droids directory
    const droidsDirPath = join(snapshotDir, 'droids');
    const droidsDirExists = await fs.stat(droidsDirPath).then(() => true).catch(() => false);
    assert.ok(droidsDirExists, 'Snapshot should contain droids directory');

    // Verify snapshot contains manifest
    const manifestPath = join(snapshotDir, 'droids-manifest.json');
    const manifestExists = await fs.stat(manifestPath).then(() => true).catch(() => false);
    assert.ok(manifestExists, 'Snapshot should contain manifest');

    // Verify droid files were copied
    const droidFiles = await fs.readdir(droidsDirPath);
    const jsonFiles = droidFiles.filter(f => f.endsWith('.json') && f.startsWith('df-'));
    assert.ok(jsonFiles.length >= 3, 'Snapshot should contain at least 3 droid files');
  });

  it('lists snapshots with correct metadata and sorting', async () => {
    await createRoster(2);

    const snapshotTool = createSnapshotTool();
    
    // Create multiple snapshots
    const snapshot1 = await snapshotTool.handler({ repoRoot, label: 'first' });
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
    const snapshot2 = await snapshotTool.handler({ repoRoot, label: 'second' });
    await new Promise(resolve => setTimeout(resolve, 10));
    const snapshot3 = await snapshotTool.handler({ repoRoot });

    const listTool = createListSnapshotsTool();
    const list = await listTool.handler({ repoRoot });

    assert.ok(list.snapshots, 'Should return snapshots array');
    assert.equal(list.snapshots.length, 3, 'Should list all 3 snapshots');

    // Verify snapshots are sorted by createdAt (newest first)
    for (let i = 0; i < list.snapshots.length - 1; i++) {
      const current = new Date(list.snapshots[i].createdAt);
      const next = new Date(list.snapshots[i + 1].createdAt);
      assert.ok(current >= next, 'Snapshots should be sorted newest first');
    }

    // Verify snapshot metadata
    const firstSnapshot = list.snapshots.find(s => s.label === 'first');
    const secondSnapshot = list.snapshots.find(s => s.label === 'second');
    const thirdSnapshot = list.snapshots.find(s => !s.label);

    assert.ok(firstSnapshot, 'Should find first snapshot');
    assert.ok(secondSnapshot, 'Should find second snapshot');
    assert.ok(thirdSnapshot, 'Should find unlabeled snapshot');

    assert.equal(firstSnapshot.id, snapshot1.snapshotId, 'First snapshot ID should match');
    assert.equal(secondSnapshot.id, snapshot2.snapshotId, 'Second snapshot ID should match');
  });

  it('restores snapshot with exact state preservation including UUIDs', async () => {
    // Create initial roster
    await createRoster(3);
    const originalUUIDs = await getDroidUUIDs();
    const originalDroidIds = Array.from(originalUUIDs.keys());

    // Create snapshot
    const snapshotTool = createSnapshotTool();
    const snapshot = await snapshotTool.handler({ repoRoot, label: 'restore-test' });

    // Modify roster (add more droids)
    const sessionId = randomUUID();
    const deps = { sessionStore, executionManager };
    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });
    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ repoRoot, sessionId, description: 'Modified roster' });
    
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
    await selectMethodologyTool.handler({ repoRoot, sessionId, choice: 'agile' });
    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });
    const forgeTool = createForgeRosterTool(deps);
    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: recommendations.suggestions
        .slice(0, 5)
        .map(s => ({ id: s.id, label: s.label || s.id, abilities: [], goal: s.summary }))
    });

    const modifiedUUIDs = await getDroidUUIDs();
    assert.ok(modifiedUUIDs.size > originalUUIDs.size, 'Modified roster should have more droids');

    // Restore snapshot
    const restoreTool = createRestoreSnapshotTool();
    const restoreResult = await restoreTool.handler({ 
      repoRoot, 
      snapshotId: snapshot.snapshotId 
    });

    assert.ok(restoreResult.restored, 'Should return restored paths');
    assert.ok(restoreResult.restored.length > 0, 'Should restore at least one path');

    // Verify exact restoration
    const restoredUUIDs = await getDroidUUIDs();

    // Should have same number of droids
    assert.equal(restoredUUIDs.size, originalUUIDs.size, 'Restored roster should match original size');

    // Every original droid should be restored with exact same data
    for (const [droidId, originalData] of originalUUIDs.entries()) {
      const restoredData = restoredUUIDs.get(droidId);
      assert.ok(restoredData, `Droid ${droidId} should be restored`);
      assert.equal(
        restoredData.uuid,
        originalData.uuid,
        `UUID for ${droidId} should be exactly restored`
      );
      assert.equal(
        restoredData.createdAt,
        originalData.createdAt,
        `createdAt for ${droidId} should be exactly restored`
      );
      assert.equal(
        restoredData.displayName,
        originalData.displayName,
        `displayName for ${droidId} should be exactly restored`
      );
    }

    // No droids from modified roster should remain
    for (const [droidId] of modifiedUUIDs.entries()) {
      if (!originalUUIDs.has(droidId)) {
        assert.ok(
          !restoredUUIDs.has(droidId),
          `New droid ${droidId} from modified roster should not be in restored state`
        );
      }
    }
  });

  it('handles restore of non-existent snapshot gracefully', async () => {
    const restoreTool = createRestoreSnapshotTool();
    
    await assert.rejects(
      async () => {
        await restoreTool.handler({ repoRoot, snapshotId: 'non-existent-snapshot' });
      },
      /Snapshot not found/,
      'Should throw error for non-existent snapshot'
    );
  });

  it('creates multiple snapshots and lists them all', async () => {
    await createRoster(2);

    const snapshotTool = createSnapshotTool();
    const listTool = createListSnapshotsTool();

    // Initially no snapshots
    const initialList = await listTool.handler({ repoRoot });
    const initialCount = initialList.snapshots.length;

    // Create 5 snapshots
    const snapshotIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await snapshotTool.handler({ 
        repoRoot, 
        label: `snapshot-${i}` 
      });
      snapshotIds.push(result.snapshotId);
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
    }

    // List should show all snapshots
    const finalList = await listTool.handler({ repoRoot });
    assert.equal(
      finalList.snapshots.length,
      initialCount + 5,
      'Should list all created snapshots'
    );

    // Verify all snapshot IDs are present
    for (const id of snapshotIds) {
      const found = finalList.snapshots.find(s => s.id === id);
      assert.ok(found, `Snapshot ${id} should be in list`);
    }
  });

  it('restores to earlier snapshot after multiple changes', async () => {
    // Create v1: 2 droids
    await createRoster(2);
    const v1UUIDs = await getDroidUUIDs();
    const snapshotTool = createSnapshotTool();
    const v1Snapshot = await snapshotTool.handler({ repoRoot, label: 'v1' });

    // Create v2: 3 droids
    await createRoster(3);
    const v2UUIDs = await getDroidUUIDs();
    const v2Snapshot = await snapshotTool.handler({ repoRoot, label: 'v2' });

    // Create v3: 5 droids
    await createRoster(5);
    const v3UUIDs = await getDroidUUIDs();

    // Verify we're at v3 state
    const currentUUIDs = await getDroidUUIDs();
    assert.ok(currentUUIDs.size >= 5, 'Should have at least 5 droids in current state');

    // Restore to v1
    const restoreTool = createRestoreSnapshotTool();
    await restoreTool.handler({ repoRoot, snapshotId: v1Snapshot.snapshotId });

    const restoredToV1 = await getDroidUUIDs();
    assert.equal(restoredToV1.size, v1UUIDs.size, 'Should restore to v1 size');

    // Verify v1 UUIDs match
    for (const [droidId, v1Data] of v1UUIDs.entries()) {
      const restoredData = restoredToV1.get(droidId);
      assert.ok(restoredData, `v1 droid ${droidId} should be restored`);
      assert.equal(restoredData.uuid, v1Data.uuid, `v1 UUID for ${droidId} should match`);
    }

    // Restore to v2
    await restoreTool.handler({ repoRoot, snapshotId: v2Snapshot.snapshotId });

    const restoredToV2 = await getDroidUUIDs();
    assert.equal(restoredToV2.size, v2UUIDs.size, 'Should restore to v2 size');

    // Verify v2 UUIDs match
    for (const [droidId, v2Data] of v2UUIDs.entries()) {
      const restoredData = restoredToV2.get(droidId);
      assert.ok(restoredData, `v2 droid ${droidId} should be restored`);
      assert.equal(restoredData.uuid, v2Data.uuid, `v2 UUID for ${droidId} should match`);
    }
  });

  it('snapshot contains complete manifest with all droid metadata', async () => {
    await createRoster(4);

    const snapshotTool = createSnapshotTool();
    const snapshot = await snapshotTool.handler({ repoRoot, label: 'manifest-test' });

    // Read manifest from snapshot
    const snapshotDir = snapshot.paths[0];
    const manifestPath = join(snapshotDir, 'droids-manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Verify manifest structure
    assert.ok(manifest.droids, 'Manifest should have droids array');
    assert.ok(Array.isArray(manifest.droids), 'Droids should be an array');
    assert.ok(manifest.droids.length >= 4, 'Manifest should list at least 4 droids');

    // Verify each droid entry has required fields
    for (const droid of manifest.droids) {
      assert.ok(droid.id, 'Droid entry should have ID');
      assert.ok(droid.role, 'Droid entry should have role');
      assert.ok(droid.status, 'Droid entry should have status');
    }
  });

  it('preserves droid file integrity in snapshot', async () => {
    await createRoster(3);

    // Get current droid data
    const currentUUIDs = await getDroidUUIDs();
    const snapshotTool = createSnapshotTool();
    const snapshot = await snapshotTool.handler({ repoRoot });

    // Read droid files from snapshot
    const snapshotDroidsDir = join(snapshot.paths[0], 'droids');
    const snapshotFiles = await fs.readdir(snapshotDroidsDir);

    for (const file of snapshotFiles) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const snapshotContent = await fs.readFile(join(snapshotDroidsDir, file), 'utf8');
        const snapshotDroid = JSON.parse(snapshotContent) as DroidDefinition;

        // Compare with current
        const currentData = currentUUIDs.get(snapshotDroid.id);
        assert.ok(currentData, `Snapshot droid ${snapshotDroid.id} should exist in current state`);

        // Verify all fields match
        assert.equal(snapshotDroid.uuid, currentData.uuid, 'UUID should match');
        assert.equal(snapshotDroid.createdAt, currentData.createdAt, 'createdAt should match');
        assert.equal(snapshotDroid.displayName, currentData.displayName, 'displayName should match');
        assert.ok(snapshotDroid.purpose, 'Purpose should be preserved');
        assert.ok(Array.isArray(snapshotDroid.abilities), 'Abilities should be preserved');
        assert.ok(Array.isArray(snapshotDroid.tools), 'Tools should be preserved');
      }
    }
  });

  it('handles empty repository snapshot gracefully', async () => {
    // Don't create any roster - try to snapshot empty repo
    const snapshotTool = createSnapshotTool();
    
    await assert.rejects(
      async () => {
        await snapshotTool.handler({ repoRoot, label: 'empty' });
      },
      'Should fail to snapshot repo without droids'
    );
  });

  it('list snapshots returns empty array when no snapshots exist', async () => {
    const listTool = createListSnapshotsTool();
    const result = await listTool.handler({ repoRoot });

    assert.ok(result.snapshots, 'Should return snapshots array');
    assert.equal(result.snapshots.length, 0, 'Should return empty array when no snapshots');
  });
});
