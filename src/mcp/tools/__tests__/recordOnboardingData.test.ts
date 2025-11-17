import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SessionStore } from '../../sessionStore.js';
import { createRecordOnboardingDataTool } from '../recordOnboardingData.js';

describe('record_onboarding_data tool – nested onboarding model', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-onboarding-test-'));
    sessionStore = new SessionStore();
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes projectVision and targetAudience into onboarding.requiredData points', async () => {
    const sessionId = 's-onboarding-1';
    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createRecordOnboardingDataTool({ sessionStore });

    // First call: capture projectVision only (respects existing guard)
    await tool.handler({
      repoRoot,
      sessionId,
      projectVision: 'Build a SaaS for project management'
    });

    // Second call: update targetAudience
    await tool.handler({
      repoRoot,
      sessionId,
      targetAudience: 'Tech teams at startups'
    });

    const reloaded = (await sessionStore.load(repoRoot, sessionId)) as any;
    assert.ok(reloaded, 'expected session to reload');
    assert.ok(reloaded.onboarding, 'expected onboarding block');
    assert.ok(reloaded.onboarding.requiredData, 'expected onboarding.requiredData');

    const rd = reloaded.onboarding.requiredData;
    assert.strictEqual(rd.projectVision.value, 'Build a SaaS for project management');
    assert.strictEqual(rd.projectVision.source, 'user');
    assert.ok(typeof rd.projectVision.confidence === 'number');

    assert.strictEqual(rd.targetAudience.value, 'Tech teams at startups');
    assert.strictEqual(rd.targetAudience.source, 'user');
    assert.ok(typeof rd.targetAudience.confidence === 'number');
  });

  it('rejects recording other fields before projectVision is captured', async () => {
    const sessionId = 's-onboarding-guard';
    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createRecordOnboardingDataTool({ sessionStore });

    await assert.rejects(
      () =>
        tool.handler({
          repoRoot,
          sessionId,
          targetAudience: 'Enterprises'
        }),
      /Capture projectVision first/
    );

    const reloaded = (await sessionStore.load(repoRoot, sessionId)) as any;
    assert.equal(reloaded.onboarding.requiredData.targetAudience, undefined);
  });

  it('merges inferred data payloads while tracking canonical answers', async () => {
    const sessionId = 's-onboarding-inferred';
    const baseSession: any = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    await sessionStore.save(repoRoot, baseSession);

    const tool = createRecordOnboardingDataTool({ sessionStore });

    await tool.handler({ repoRoot, sessionId, projectVision: 'Improve docs' });

    await tool.handler({
      repoRoot,
      sessionId,
      timelineConstraints: 'Launch in Q4',
      inferred: { priority: 'high' }
    });

    await tool.handler({
      repoRoot,
      sessionId,
      inferred: { owner: 'AI parser' }
    });

    const reloaded = (await sessionStore.load(repoRoot, sessionId)) as any;
    const rd = reloaded.onboarding.requiredData;
    assert.equal(rd.timelineConstraints.value, 'Launch in Q4');
    assert.equal(rd.timelineConstraints.source, 'user');
    assert.equal(reloaded.onboarding.inferredData.priority, 'high');
    assert.equal(reloaded.onboarding.inferredData.owner, 'AI parser');
  });
});
