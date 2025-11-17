import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SessionStore } from '../../sessionStore.js';
import { createGetOnboardingProgressTool } from '../getOnboardingProgress.js';

describe('get_onboarding_progress tool – nested onboarding model', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-onboarding-progress-'));
    sessionStore = new SessionStore();
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('treats requiredData entries as collected even when legacy flat fields are empty', async () => {
    const sessionId = 's-progress-1';

    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      description: '',
      onboarding: {
        requiredData: {
          projectVision: { value: 'Nested vision', confidence: 0.9, source: 'ai' },
          targetAudience: { value: 'Developers', confidence: 0.9, source: 'ai' }
        },
        collectionMetadata: {},
        methodology: {},
        team: {},
        projectVision: undefined,
        targetAudience: undefined
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createGetOnboardingProgressTool({ sessionStore });
    const result = await tool.handler({ repoRoot, sessionId });

    assert.equal(result.collected.projectVision, true);
    assert.equal(result.collected.targetAudience, true);
    // Sanity check: we still report something missing when other fields are absent
    assert.ok(result.missing.includes('timelineConstraints'));
  });

  it('falls back to session description when projectVision is missing elsewhere', async () => {
    const sessionId = 's-progress-desc';

    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      description: 'Use AI to refactor',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createGetOnboardingProgressTool({ sessionStore });
    const result = await tool.handler({ repoRoot, sessionId });

    assert.equal(result.collected.projectVision, true, 'description fallback should count');
  });

  it('uses legacy top-level fields when nested values are empty', async () => {
    const sessionId = 's-progress-legacy';

    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      targetAudience: 'Security teams',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createGetOnboardingProgressTool({ sessionStore });
    const result = await tool.handler({ repoRoot, sessionId });

    assert.equal(result.collected.targetAudience, true, 'legacy field should count');
    assert.ok(result.missing.includes('projectVision'), 'other fields still missing');
  });
});
