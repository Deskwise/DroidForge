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
import { ensureDir } from '../../fs.js';
import type { DroidDefinition } from '../../../types.js';

describe('E2E: UUID Persistence Across Re-forging', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;
  let executionManager: ExecutionManager;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-e2e-uuid-'));
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

  async function runOnboardingFlow(sessionId: string, selectedCount: number) {
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Test project' 
    });

    const selectMethodologyTool = createSelectMethodologyTool(deps);
    await selectMethodologyTool.handler({
      repoRoot,
      sessionId,
      choice: 'agile'
    });

    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    const forgeTool = createForgeRosterTool(deps);
    const selected = recommendations.suggestions
      .slice(0, selectedCount)
      .map(s => ({
        id: s.id,
        label: s.label || s.id,
        abilities: [],
        goal: s.summary
      }));

    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected
    });
  }

  async function getDroidUUIDs(): Promise<Map<string, { uuid: string; createdAt: string }>> {
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const files = await fs.readdir(droidsDir);
    const uuids = new Map<string, { uuid: string; createdAt: string }>();

    for (const file of files) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        uuids.set(droid.id, { 
          uuid: droid.uuid!, 
          createdAt: droid.createdAt 
        });
      }
    }

    return uuids;
  }

  it('preserves UUIDs when re-forging with same droids', async () => {
    const sessionId1 = randomUUID();
    await runOnboardingFlow(sessionId1, 3);

    // Capture first set of UUIDs
    const firstUUIDs = await getDroidUUIDs();
    assert.ok(firstUUIDs.size >= 3, 'Should have created at least 3 droids');

    // Store for comparison
    const firstDroidIds = Array.from(firstUUIDs.keys());
    const firstDroidData = Array.from(firstUUIDs.entries());

    // Wait a moment to ensure different timestamps if they were regenerated
    await new Promise(resolve => setTimeout(resolve, 10));

    // Re-forge with same droids
    const sessionId2 = randomUUID();
    await runOnboardingFlow(sessionId2, 3);

    // Get UUIDs after re-forging
    const secondUUIDs = await getDroidUUIDs();

    // Verify all existing droids kept their UUIDs and createdAt timestamps
    for (const [droidId, firstData] of firstDroidData) {
      const secondData = secondUUIDs.get(droidId);
      assert.ok(secondData, `Droid ${droidId} should still exist`);
      assert.equal(
        secondData.uuid, 
        firstData.uuid,
        `UUID should be preserved for ${droidId}`
      );
      assert.equal(
        secondData.createdAt,
        firstData.createdAt,
        `createdAt should be preserved for ${droidId}`
      );
    }
  });

  it('assigns new UUIDs to newly added droids while preserving existing ones', async () => {
    // First forge with 2 droids
    const sessionId1 = randomUUID();
    await runOnboardingFlow(sessionId1, 2);

    const firstUUIDs = await getDroidUUIDs();
    const firstDroidIds = Array.from(firstUUIDs.keys());
    
    assert.ok(firstUUIDs.size >= 2, 'Should have at least 2 droids initially');

    // Re-forge with more droids
    const sessionId2 = randomUUID();
    await runOnboardingFlow(sessionId2, 5);

    const secondUUIDs = await getDroidUUIDs();
    
    // Verify more droids were added
    assert.ok(secondUUIDs.size > firstUUIDs.size, 'Should have added new droids');

    // Check existing droids kept their UUIDs
    for (const [droidId, firstData] of firstUUIDs.entries()) {
      const secondData = secondUUIDs.get(droidId);
      assert.ok(secondData, `Existing droid ${droidId} should still exist`);
      assert.equal(
        secondData.uuid,
        firstData.uuid,
        `Existing droid ${droidId} UUID should be preserved`
      );
    }

    // Check new droids have valid UUIDs
    const newDroidIds = Array.from(secondUUIDs.keys()).filter(
      id => !firstUUIDs.has(id)
    );
    
    assert.ok(newDroidIds.length > 0, 'Should have new droids');
    
    for (const newId of newDroidIds) {
      const newData = secondUUIDs.get(newId)!;
      assert.ok(newData.uuid, `New droid ${newId} should have UUID`);
      assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newData.uuid),
        `New droid ${newId} should have valid UUID format`
      );
    }

    // Verify no UUID collisions
    const allUUIDs = Array.from(secondUUIDs.values()).map(d => d.uuid);
    const uniqueUUIDs = new Set(allUUIDs);
    assert.equal(
      uniqueUUIDs.size,
      allUUIDs.length,
      'All UUIDs should be unique'
    );
  });

  it('handles adding more droids without affecting existing UUIDs', async () => {
    // Create with 2 droids
    const sessionId1 = randomUUID();
    await runOnboardingFlow(sessionId1, 2);

    const firstUUIDs = await getDroidUUIDs();
    const firstDroidIds = Array.from(firstUUIDs.keys());

    // Re-forge with same count - UUIDs should be preserved
    const sessionId2 = randomUUID();
    await runOnboardingFlow(sessionId2, 2);

    const secondUUIDs = await getDroidUUIDs();
    
    // Note: Re-forging doesn't delete existing droids, it only adds/updates
    // Check all original droids kept their UUIDs
    for (const [droidId, firstData] of firstUUIDs.entries()) {
      const secondData = secondUUIDs.get(droidId);
      if (secondData) {
        assert.equal(
          secondData.uuid,
          firstData.uuid,
          `Droid ${droidId} should keep UUID`
        );
      }
    }

    // Add more droids
    const sessionId3 = randomUUID();
    await runOnboardingFlow(sessionId3, 5);

    const thirdUUIDs = await getDroidUUIDs();
    assert.ok(thirdUUIDs.size >= secondUUIDs.size, 'Should have same or more droids');
    
    // Check original droids still have original UUIDs
    for (const [droidId, firstData] of firstUUIDs.entries()) {
      const thirdData = thirdUUIDs.get(droidId);
      if (thirdData) {
        assert.equal(
          thirdData.uuid,
          firstData.uuid,
          `Droid ${droidId} should keep original UUID after adding more droids`
        );
      }
    }
  });

  it('maintains UUID persistence with 0 droids edge case', async () => {
    // Create with some droids
    const sessionId1 = randomUUID();
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId: sessionId1 });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId: sessionId1, 
      description: 'Test' 
    });

    const selectMethodologyTool = createSelectMethodologyTool(deps);
    await selectMethodologyTool.handler({
      repoRoot,
      sessionId: sessionId1,
      choice: 'agile'
    });

    const forgeTool = createForgeRosterTool(deps);
    
    // Forge with empty selection (just orchestrator)
    await forgeTool.handler({ 
      repoRoot, 
      sessionId: sessionId1,
      selected: []
    });

    const firstUUIDs = await getDroidUUIDs();
    
    // Should have at least orchestrator
    assert.ok(firstUUIDs.size > 0, 'Should have at least orchestrator');

    // Re-forge and check UUIDs preserved
    const sessionId2 = randomUUID();
    await runOnboardingFlow(sessionId2, 3);

    const secondUUIDs = await getDroidUUIDs();
    
    // Check orchestrator UUID is preserved
    for (const [droidId, firstData] of firstUUIDs.entries()) {
      if (secondUUIDs.has(droidId)) {
        assert.equal(
          secondUUIDs.get(droidId)!.uuid,
          firstData.uuid,
          `UUID should be preserved for ${droidId}`
        );
      }
    }
  });

  it('maintains UUID consistency with 10+ droids', async () => {
    const sessionId1 = randomUUID();
    await runOnboardingFlow(sessionId1, 10);

    const firstUUIDs = await getDroidUUIDs();
    assert.ok(firstUUIDs.size >= 5, 'Should have created multiple droids');

    // Capture all UUIDs
    const originalData = new Map(firstUUIDs);

    // Re-forge multiple times
    for (let i = 0; i < 3; i++) {
      const sessionId = randomUUID();
      await runOnboardingFlow(sessionId, 10);

      const currentUUIDs = await getDroidUUIDs();

      // Verify all originally created droids still have their UUIDs
      for (const [droidId, originalInfo] of originalData.entries()) {
        if (currentUUIDs.has(droidId)) {
          assert.equal(
            currentUUIDs.get(droidId)!.uuid,
            originalInfo.uuid,
            `UUID should remain unchanged for ${droidId} after iteration ${i + 1}`
          );
          assert.equal(
            currentUUIDs.get(droidId)!.createdAt,
            originalInfo.createdAt,
            `createdAt should remain unchanged for ${droidId} after iteration ${i + 1}`
          );
        }
      }
    }
  });

  it('assigns unique UUIDs across all droids', async () => {
    const sessionId = randomUUID();
    await runOnboardingFlow(sessionId, 10);

    const uuids = await getDroidUUIDs();
    const uuidValues = Array.from(uuids.values()).map(d => d.uuid);

    // Check all are valid UUIDs
    for (const uuid of uuidValues) {
      assert.ok(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid),
        `UUID ${uuid} should be valid v4 format`
      );
    }

    // Check all are unique
    const uniqueSet = new Set(uuidValues);
    assert.equal(
      uniqueSet.size,
      uuidValues.length,
      'All UUIDs should be unique across all droids'
    );

    // Verify none are empty or default values
    for (const uuid of uuidValues) {
      assert.notEqual(uuid, '', 'UUID should not be empty');
      assert.notEqual(uuid, '00000000-0000-0000-0000-000000000000', 'UUID should not be default');
    }
  });

  it('preserves UUIDs even when droid files are read and rewritten', async () => {
    const sessionId1 = randomUUID();
    await runOnboardingFlow(sessionId1, 3);

    const firstUUIDs = await getDroidUUIDs();
    
    // Manually read and rewrite one droid file (simulating external modification)
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const files = await fs.readdir(droidsDir);
    const firstDroidFile = files.find(f => f.endsWith('.json') && f.startsWith('df-'));
    
    if (firstDroidFile) {
      const filePath = join(droidsDir, firstDroidFile);
      const content = await fs.readFile(filePath, 'utf8');
      const droid = JSON.parse(content) as DroidDefinition;
      const originalUUID = droid.uuid;
      const originalCreatedAt = droid.createdAt;

      // Modify something else (not UUID)
      droid.purpose = 'Modified purpose';

      // Write back
      await fs.writeFile(filePath, JSON.stringify(droid, null, 2), 'utf8');

      // Re-forge
      const sessionId2 = randomUUID();
      await runOnboardingFlow(sessionId2, 3);

      // Verify UUID and createdAt preserved
      const secondUUIDs = await getDroidUUIDs();
      const secondData = secondUUIDs.get(droid.id);
      
      assert.ok(secondData, 'Droid should still exist');
      assert.equal(secondData.uuid, originalUUID, 'UUID should be preserved after manual edit');
      assert.equal(secondData.createdAt, originalCreatedAt, 'createdAt should be preserved after manual edit');
    }
  });
});
