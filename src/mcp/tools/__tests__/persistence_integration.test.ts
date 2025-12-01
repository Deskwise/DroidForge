import { test } from 'node:test';
import assert from 'node:assert';
import { SessionStore } from '../../sessionStore.js';
import { createRecordProjectGoalTool } from '../recordProjectGoal.js';
import { createRecordOnboardingDataTool } from '../recordOnboardingData.js';
import { createSelectMethodologyTool } from '../selectMethodology.js';
import { createRecommendDroidsTool } from '../recommendDroids.js';
import { createForgeRosterTool } from '../forgeRoster.js';
import { OnboardingSession } from '../../types.js';

// Mock SessionStore
class MockSessionStore extends SessionStore {
  savedSnapshot: OnboardingSession | null = null;
  override async saveSnapshot(session: OnboardingSession): Promise<void> {
    this.savedSnapshot = session;
  }
  
  // Mock loadActive to return a mock session
  override async loadActive(repoRoot: string): Promise<OnboardingSession | null> {
    return {
      sessionId: 'test-session',
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: { requiredData: {} }
    };
  }

  // Mock save to do nothing
  override async save(repoRoot: string, session: OnboardingSession): Promise<void> {}
}

test('Tools call saveSnapshot on mutation', async (t) => {
  const store = new MockSessionStore();
  const deps = { sessionStore: store };

  await t.test('record_project_goal calls saveSnapshot', async () => {
    const tool = createRecordProjectGoalTool(deps);
    await tool.handler({ 
      goal: 'Test Goal',
      repoRoot: '/tmp' 
    });
    
    assert.ok(store.savedSnapshot, 'saveSnapshot should be called');
    assert.equal(store.savedSnapshot?.onboarding?.requiredData?.projectVision?.value, 'Test Goal');
    store.savedSnapshot = null; // Reset
  });

  await t.test('record_onboarding_data calls saveSnapshot', async () => {
    const tool = createRecordOnboardingDataTool(deps);
    await tool.handler({ 
      data: { targetAudience: { value: 'Users', confidence: 1, source: 'user' } },
      repoRoot: '/tmp'
    });

    assert.ok(store.savedSnapshot, 'saveSnapshot should be called');
    assert.equal(store.savedSnapshot?.onboarding?.requiredData?.targetAudience?.value, 'Users');
    store.savedSnapshot = null;
  });

  await t.test('select_methodology calls saveSnapshot', async () => {
    const tool = createSelectMethodologyTool(deps);
    await tool.handler({
        methodology: 'agile',
        repoRoot: '/tmp'
    });

    assert.ok(store.savedSnapshot, 'saveSnapshot should be called');
    assert.equal(store.savedSnapshot?.onboarding?.selectedMethodology, 'agile');
    store.savedSnapshot = null;
  });
  
  // We mock the handler for recommendDroids and forgeRoster to simplify,
  // assuming they rely on similar patterns. 
  // Since they require more complex setup (LLM interaction or specific state),
  // we'll focus on the first 3 for the RED phase and then implement all.
});

