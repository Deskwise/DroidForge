import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, readFile, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SessionStore } from '../sessionStore.js';
import { createRecordProjectGoalTool } from '../tools/recordProjectGoal.js';
import { createRecordOnboardingDataTool } from '../tools/recordOnboardingData.js';
import { createSelectMethodologyTool } from '../tools/selectMethodology.js';
import { OnboardingSession } from '../types.js';

async function makeRepoRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'session-integration-test-'));
}

test('End-to-end session persistence and resumption', async (t) => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  
  // 1. Manually create an initial session (as if started by user)
  const initialSession: OnboardingSession = {
    sessionId: 'e2e-session',
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'idle',
    onboarding: { requiredData: {} }
  };
  await store.saveSnapshot(initialSession);

  const deps = { sessionStore: store };

  // 2. Use record_project_goal to update state
  await t.test('Tool usage triggers snapshot', async () => {
    const goalTool = createRecordProjectGoalTool(deps);
    await goalTool.handler({ 
      description: 'Build a spaceship', // Fixed prop name
      repoRoot,
      sessionId: 'e2e-session'
    });

    // Verify snapshot file exists and has 2 lines (initial + goal update)
    const snapshotPath = path.join(repoRoot, '.factory', 'sessions', 'e2e-session.jsonl');
    const content = await readFile(snapshotPath, 'utf8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 2, 'Should have 2 snapshots');
    
    const lastState = JSON.parse(lines[1]);
    assert.strictEqual(lastState.onboarding.projectVision, 'Build a spaceship');
  });

  // 3. Simulate restart by creating new store instance and loading
  await t.test('Resume from snapshot after tool usage', async () => {
    const newStore = new SessionStore();
    const loaded = await newStore.loadActive(repoRoot);
    
    assert.ok(loaded, 'Should load active session');
    assert.strictEqual(loaded?.sessionId, 'e2e-session');
    assert.strictEqual(loaded?.onboarding.projectVision, 'Build a spaceship');
    assert.strictEqual(loaded?.state, 'collecting-goal');
  });

  // 4. Continue with more tools
  await t.test('Continue session with more tools', async () => {
    const dataTool = createRecordOnboardingDataTool(deps);
    await dataTool.handler({
      repoRoot,
      sessionId: 'e2e-session',
      targetAudience: 'Astronauts'
    });

    const methodologyTool = createSelectMethodologyTool(deps);
    // Hack: force methodologyConfirmed=true because select_methodology requires it
    // In a real flow, confirm_methodology would be called.
    // We'll simulate it by saving a snapshot with it set.
    let current = await store.loadActive(repoRoot);
    if (current) {
        current.methodologyConfirmed = true;
        await store.saveSnapshot(current);
    }

    await methodologyTool.handler({
      repoRoot,
      sessionId: 'e2e-session',
      choice: 'agile'
    });

    // Verify final state
    const finalStore = new SessionStore();
    const final = await finalStore.loadActive(repoRoot);
    
    assert.strictEqual(final?.onboarding.requiredData.targetAudience.value, 'Astronauts');
    assert.strictEqual(final?.methodology, 'agile');
    assert.strictEqual(final?.state, 'roster');
    
    // Verify snapshot count (initial + goal + data + confirm + methodology)
    const snapshotPath = path.join(repoRoot, '.factory', 'sessions', 'e2e-session.jsonl');
    const content = await readFile(snapshotPath, 'utf8');
    const lines = content.trim().split('\n');
    assert.ok(lines.length >= 5, 'Should have multiple history entries');
  });

  await rm(repoRoot, { recursive: true, force: true });
});

