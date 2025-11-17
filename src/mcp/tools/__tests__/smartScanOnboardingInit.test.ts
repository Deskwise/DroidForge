import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SessionStore } from '../../sessionStore.js';
import { createSmartScanTool } from '../smartScan.js';

describe('smart_scan tool – onboarding session initialization', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-smart-scan-'));
    sessionStore = new SessionStore();
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('initializes onboarding with nested requiredData/collectionMetadata/methodology/team when creating a new session', async () => {
    const tool = createSmartScanTool({ sessionStore });

    const result = await tool.handler({ repoRoot });
    assert.ok(result.sessionId, 'expected smart_scan to return a sessionId');

    const session = await sessionStore.load(repoRoot, result.sessionId);
    assert.ok(session, 'expected a session to be created');

    const onboarding: any = session!.onboarding;
    assert.ok(onboarding, 'expected onboarding to be present');

    // Nested buckets should exist
    assert.ok(onboarding.requiredData, 'expected onboarding.requiredData to exist');
    assert.ok(onboarding.collectionMetadata, 'expected onboarding.collectionMetadata to exist');
    assert.ok(onboarding.methodology, 'expected onboarding.methodology to exist');
    assert.ok(onboarding.team, 'expected onboarding.team to exist');
  });

  it('upgrades legacy sessions without onboarding by seeding the nested buckets', async () => {
    const sessionId = 'legacy-session';
    const sessionDir = join(repoRoot, '.droidforge', 'session');
    mkdirSync(sessionDir, { recursive: true });

    const legacyPayload = {
      sessionId,
      repoRoot,
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      projectVision: 'Legacy vision',
      targetAudience: 'Legacy audience'
    };
    writeFileSync(join(sessionDir, `${sessionId}.json`), JSON.stringify(legacyPayload, null, 2));

    const tool = createSmartScanTool({ sessionStore });
    await tool.handler({ repoRoot, sessionId });

    const session = await sessionStore.load(repoRoot, sessionId);
    assert.ok(session, 'expected upgraded session to load');
    const onboarding: any = session!.onboarding;
    assert.ok(onboarding.requiredData, 'requiredData bucket should now exist');
    assert.ok(onboarding.collectionMetadata, 'collectionMetadata bucket should now exist');
    assert.equal(onboarding.projectVision, 'Legacy vision');
    assert.equal(onboarding.targetAudience, 'Legacy audience');
  });
});
