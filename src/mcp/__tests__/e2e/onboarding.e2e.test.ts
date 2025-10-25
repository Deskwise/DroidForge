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
import { createGenerateUserGuideTool } from '../../tools/generateUserGuide.js';
import { createRecordProjectGoalTool } from '../../tools/recordProjectGoal.js';
import { createSelectMethodologyTool } from '../../tools/selectMethodology.js';
import { ensureDir } from '../../fs.js';
import type { DroidDefinition } from '../../../types.js';

describe('E2E: Full Onboarding Flow', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;
  let executionManager: ExecutionManager;
  let sessionId: string;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-e2e-onboarding-'));
    sessionStore = new SessionStore();
    executionManager = new ExecutionManager();
    sessionId = randomUUID();

    // Create a realistic repo structure for testing
    await ensureDir(join(repoRoot, 'src'));
    await ensureDir(join(repoRoot, 'docs'));
    await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest',
        build: 'tsc',
        lint: 'eslint .'
      },
      dependencies: {
        react: '^18.0.0',
        typescript: '^5.0.0'
      }
    }, null, 2));

    await fs.writeFile(join(repoRoot, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs'
      }
    }, null, 2));

    await fs.writeFile(join(repoRoot, 'jest.config.js'), 
      'module.exports = { testEnvironment: "node" };'
    );

    await fs.writeFile(join(repoRoot, 'src/index.ts'), 
      'console.log("Hello, World!");'
    );

    // Create PRD in a location that scanRepo will find
    await ensureDir(join(repoRoot, 'docs', 'prd'));
    await fs.writeFile(join(repoRoot, 'docs/prd/product-requirements.md'), 
      '# Product Requirements\n\nVision: Build a modern web application.\n\n## Features\n- User authentication\n- Dashboard'
    );
  });

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('completes full onboarding: scan → goal → methodology → recommend → forge → guide', async () => {
    const deps = { sessionStore, executionManager };

    // Step 1: Smart Scan
    const smartScanTool = createSmartScanTool(deps);
    const scanResult = await smartScanTool.handler({ repoRoot, sessionId });

    assert.ok(scanResult.summary, 'Scan should produce a summary');
    assert.ok(scanResult.signals.length > 0, 'Scan should detect signals');
    assert.ok(scanResult.signals.some(s => s.includes('framework:')), 'Should detect React framework');
    assert.ok(scanResult.signals.some(s => s.includes('npm:')), 'Should detect npm scripts');
    assert.ok(scanResult.prdFiles.length > 0, 'Should find PRD files');

    // Verify session was created
    const session1 = await sessionStore.load(repoRoot, sessionId);
    assert.ok(session1, 'Session should be created');
    assert.equal(session1?.state, 'collecting-goal', 'Session should be in collecting-goal state');

    // Step 2: Record Project Goal
    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Build a scalable web application with React and TypeScript' 
    });

    const session2 = await sessionStore.load(repoRoot, sessionId);
    assert.equal(session2?.state, 'methodology', 'Session should move to methodology state');
    assert.equal(session2?.description, 'Build a scalable web application with React and TypeScript');

    // Step 3: Select Methodology
    const selectMethodologyTool = createSelectMethodologyTool(deps);
    await selectMethodologyTool.handler({
      repoRoot,
      sessionId,
      choice: 'agile'
    });

    const session3 = await sessionStore.load(repoRoot, sessionId);
    assert.equal(session3?.state, 'roster', 'Session should move to roster state');
    assert.equal(session3?.methodology, 'agile');

    // Step 4: Recommend Droids
    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    assert.ok(recommendations.suggestions.length > 0, 'Should suggest droids');
    assert.ok(recommendations.mandatory, 'Should include mandatory orchestrator');
    assert.equal(recommendations.mandatory.id, 'df-orchestrator', 'Orchestrator should be mandatory');

    // Step 5: Forge Roster with selected droids
    const forgeTool = createForgeRosterTool(deps);
    const forgeResult = await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: recommendations.suggestions.slice(0, 3).map(s => ({
        id: s.id,
        label: s.label || s.id,
        abilities: [],
        goal: s.summary
      }))
    });

    assert.ok(forgeResult.bootLog.length > 0, 'Should create droids');
    assert.ok(forgeResult.outputPaths.length > 0, 'Should create droid files');
    
    // Verify .droidforge/droids directory was created
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const droidsDirExists = await fs.stat(droidsDir).then(() => true).catch(() => false);
    assert.ok(droidsDirExists, '.droidforge/droids directory should exist');

    // Verify all created droid files have UUIDs
    const droidFiles = await fs.readdir(droidsDir);
    const jsonFiles = droidFiles.filter(f => f.endsWith('.json') && f.startsWith('df-'));
    
    assert.ok(jsonFiles.length >= 3, 'Should create at least 3 droid files');

    for (const file of jsonFiles) {
      const content = await fs.readFile(join(droidsDir, file), 'utf8');
      const droid = JSON.parse(content) as DroidDefinition;
      
      assert.ok(droid.uuid, `Droid ${file} should have a UUID`);
      assert.ok(droid.uuid.match(/^[0-9a-f-]{36}$/i), `UUID should be valid format: ${droid.uuid}`);
      assert.ok(droid.version, `Droid ${file} should have a version`);
      assert.ok(droid.createdAt, `Droid ${file} should have a createdAt timestamp`);
      assert.ok(droid.id.startsWith('df-'), `Droid ${file} should have df- prefix`);
    }

    // Verify droids-manifest.json exists
    const manifestPath = join(repoRoot, '.droidforge', 'droids-manifest.json');
    const manifestExists = await fs.stat(manifestPath).then(() => true).catch(() => false);
    assert.ok(manifestExists, 'droids-manifest.json should exist');

    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    assert.ok(manifest.droids, 'Manifest should have droids array');
    assert.ok(manifest.droids.length >= 3, 'Manifest should list all droids');

    // Note: Commands directory is created by installCommands tool, which is separate from forge_roster
    // Skipping commands directory verification in this test

    // Step 6: Generate User Guide
    const guideTool = createGenerateUserGuideTool(deps);
    const guideResult = await guideTool.handler({ repoRoot, sessionId });

    assert.ok(guideResult.savePath, 'Should create user guide');
    assert.ok(guideResult.markdown, 'Should generate markdown content');

    const guideFullPath = join(repoRoot, guideResult.savePath);
    const guideExists = await fs.stat(guideFullPath).then(() => true).catch(() => false);
    assert.ok(guideExists, 'User guide file should exist');

    const guideContent = await fs.readFile(guideFullPath, 'utf8');
    assert.ok(guideContent.includes('DROIDFORGE'), 'Guide should mention DroidForge');
    assert.ok(guideContent.length > 100, 'Guide should have substantial content');

    // Verify final session state
    const finalSession = await sessionStore.load(repoRoot, sessionId);
    assert.equal(finalSession?.state, 'complete', 'Session should be complete');
    assert.ok(finalSession?.selectedDroids && finalSession.selectedDroids.length > 0, 'Session should track selected droids');
  });

  it('handles returning user flow - second onboarding attempt', async () => {
    const deps = { sessionStore, executionManager };

    // First onboarding
    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'First goal' 
    });

    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    const forgeTool = createForgeRosterTool(deps);
    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: recommendations.suggestions.slice(0, 2).map(s => ({
        id: s.id,
        label: s.label || s.id,
        abilities: [],
        goal: s.summary
      }))
    });

    // Capture first set of UUIDs
    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const firstFiles = await fs.readdir(droidsDir);
    const firstUUIDs = new Map<string, string>();
    
    for (const file of firstFiles) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        firstUUIDs.set(droid.id, droid.uuid!);
      }
    }

    // Second onboarding with new session (returning user scenario)
    const sessionId2 = randomUUID();
    await smartScanTool.handler({ repoRoot, sessionId: sessionId2 });

    const session2 = await sessionStore.load(repoRoot, sessionId2);
    assert.equal(session2?.state, 'collecting-goal', 'New session should start fresh');

    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId: sessionId2, 
      description: 'Updated goal' 
    });

    const recommendations2 = await recommendTool.handler({ repoRoot, sessionId: sessionId2 });
    await forgeTool.handler({ 
      repoRoot, 
      sessionId: sessionId2,
      selected: recommendations2.suggestions.slice(0, 3).map(s => ({
        id: s.id,
        label: s.label || s.id,
        abilities: [],
        goal: s.summary
      }))
    });

    // Verify UUIDs were preserved for existing droids
    const secondFiles = await fs.readdir(droidsDir);
    for (const file of secondFiles) {
      if (file.endsWith('.json') && file.startsWith('df-')) {
        const content = await fs.readFile(join(droidsDir, file), 'utf8');
        const droid = JSON.parse(content) as DroidDefinition;
        
        if (firstUUIDs.has(droid.id)) {
          assert.equal(
            droid.uuid, 
            firstUUIDs.get(droid.id),
            `UUID should be preserved for existing droid ${droid.id}`
          );
        } else {
          // New droid should have fresh UUID
          assert.ok(droid.uuid, `New droid ${droid.id} should have UUID`);
        }
      }
    }
  });

  it('creates droids with valid metadata', async () => {
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Test goal' 
    });

    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    const forgeTool = createForgeRosterTool(deps);
    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: [recommendations.mandatory].map(s => ({
        id: s.id,
        label: s.id,
        abilities: [],
        goal: s.summary
      }))
    });

    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const orchestratorPath = join(droidsDir, 'df-orchestrator.json');
    
    const exists = await fs.stat(orchestratorPath).then(() => true).catch(() => false);
    assert.ok(exists, 'Orchestrator droid file should exist');

    const content = await fs.readFile(orchestratorPath, 'utf8');
    const droid = JSON.parse(content) as DroidDefinition;

    // Validate all required fields
    assert.equal(droid.id, 'df-orchestrator', 'Droid ID should match');
    assert.ok(droid.uuid, 'Should have UUID');
    assert.ok(droid.version, 'Should have version');
    assert.ok(droid.displayName, 'Should have display name');
    assert.ok(droid.purpose, 'Should have purpose');
    assert.ok(Array.isArray(droid.abilities), 'Should have abilities array');
    assert.ok(Array.isArray(droid.tools), 'Should have tools array');
    assert.ok(droid.createdAt, 'Should have createdAt timestamp');
    
    // Validate timestamp format
    const createdDate = new Date(droid.createdAt);
    assert.ok(!isNaN(createdDate.getTime()), 'createdAt should be valid ISO date');
    
    // Validate UUID format
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(droid.uuid),
      'UUID should be valid v4 format'
    );
  });

  it('handles onboarding with custom droids', async () => {
    const deps = { sessionStore, executionManager };

    const smartScanTool = createSmartScanTool(deps);
    await smartScanTool.handler({ repoRoot, sessionId });

    const recordGoalTool = createRecordProjectGoalTool(deps);
    await recordGoalTool.handler({ 
      repoRoot, 
      sessionId, 
      description: 'Test with custom droids' 
    });

    const recommendTool = createRecommendDroidsTool(deps);
    const recommendations = await recommendTool.handler({ repoRoot, sessionId });

    const forgeTool = createForgeRosterTool(deps);
    await forgeTool.handler({ 
      repoRoot, 
      sessionId,
      selected: [recommendations.mandatory].map(s => ({
        id: s.id,
        label: s.id,
        abilities: [],
        goal: s.summary
      })),
      customInput: 'Database specialist for PostgreSQL\nAPI documentation writer'
    });

    const droidsDir = join(repoRoot, '.droidforge', 'droids');
    const files = await fs.readdir(droidsDir);
    
    // Should have orchestrator + 2 custom droids
    const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('df-'));
    assert.ok(jsonFiles.length >= 3, 'Should create orchestrator + custom droids');

    // Check for custom droids with UUIDs
    let customCount = 0;
    for (const file of jsonFiles) {
      const content = await fs.readFile(join(droidsDir, file), 'utf8');
      const droid = JSON.parse(content) as DroidDefinition;
      
      if (droid.id !== 'df-orchestrator') {
        customCount++;
        assert.ok(droid.uuid, `Custom droid ${droid.id} should have UUID`);
        assert.ok(droid.createdAt, `Custom droid ${droid.id} should have createdAt`);
      }
    }
    
    assert.ok(customCount >= 2, 'Should create at least 2 custom droids');
  });
});
