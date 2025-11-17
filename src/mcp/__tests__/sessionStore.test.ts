import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SessionStore } from '../sessionStore.js';

async function makeRepoRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'session-store-test-'));
}

test('SessionStore.save deep merges onboarding.requiredData without wiping siblings', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 's1';

  const baseSession: any = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        vision: { value: 'v1', confidence: 0.9, source: 'user' },
        audience: { value: 'a1', confidence: 0.8, source: 'user' }
      }
    }
  };

  await store.save(repoRoot, baseSession);

  const patchSession: any = {
    ...baseSession,
    onboarding: {
      requiredData: {
        vision: { value: 'v2', confidence: 0.95, source: 'user' }
      }
    }
  };

  await store.save(repoRoot, patchSession);

  const loaded = (await store.load(repoRoot, sessionId)) as any;
  assert.ok(loaded, 'expected a loaded session');

  const rd = loaded.onboarding?.requiredData;
  assert.ok(rd, 'expected onboarding.requiredData to be present');

  assert.strictEqual(rd.vision.value, 'v2');
  assert.strictEqual(rd.audience.value, 'a1');

  await rm(repoRoot, { recursive: true, force: true });
});

test('SessionStore.save deep merges onboarding and replaces arrays instead of merging', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 's2';

  const baseSession: any = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        vision: { value: 'v1', confidence: 0.9, source: 'user' }
      },
      aiRecommendations: ['a', 'b']
    }
  };

  await store.save(repoRoot, baseSession);

  const patchSession: any = {
    ...baseSession,
    onboarding: {
      requiredData: {
        vision: { value: 'v2', confidence: 0.95, source: 'user' }
      },
      aiRecommendations: ['c']
    }
  };

  await store.save(repoRoot, patchSession);

  const loaded = (await store.load(repoRoot, sessionId)) as any;
  assert.ok(loaded, 'expected a loaded session');

  const onboarding = loaded.onboarding;
  assert.ok(onboarding, 'expected onboarding to be present');

  assert.deepStrictEqual(onboarding.aiRecommendations, ['c']);
  assert.strictEqual(onboarding.requiredData.vision.value, 'v2');

  await rm(repoRoot, { recursive: true, force: true });
});

test('SessionStore.save preserves legacy fields when patches omit them', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 's3';

  const baseSession: any = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    description: 'Initial goal',
    methodologyConfirmed: true,
    customNote: 'keep-me',
    onboarding: {
      requiredData: {
        vision: { value: 'v1', confidence: 0.9, source: 'user' }
      }
    }
  };

  await store.save(repoRoot, baseSession);

  const patchSession: any = {
    sessionId,
    repoRoot,
    createdAt: baseSession.createdAt,
    state: baseSession.state,
    description: 'Updated goal',
    onboarding: undefined
  };

  await store.save(repoRoot, patchSession);

  const loaded = (await store.load(repoRoot, sessionId)) as any;
  assert.ok(loaded, 'expected session to load');
  assert.equal(loaded.description, 'Updated goal');
  assert.equal(loaded.methodologyConfirmed, true, 'methodologyConfirmed should persist');
  assert.equal(loaded.customNote, 'keep-me', 'custom fields should be preserved');
  assert.ok(loaded.onboarding.requiredData.vision, 'onboarding data remains');

  await rm(repoRoot, { recursive: true, force: true });
});

test('SessionStore.save keeps onboarding subtree when only top-level fields change', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 's4';

  const baseSession: any = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        projectVision: { value: 'Ship it', confidence: 0.8, source: 'user' }
      },
      collectionMetadata: { lastCollector: 'agent' }
    }
  };

  await store.save(repoRoot, baseSession);

  const patchSession: any = {
    sessionId,
    repoRoot,
    createdAt: baseSession.createdAt,
    state: baseSession.state,
    selectedDroids: ['planner', 'builder']
  };

  await store.save(repoRoot, patchSession);

  const loaded = (await store.load(repoRoot, sessionId)) as any;
  assert.ok(loaded, 'expected session to load');
  assert.deepStrictEqual(loaded.selectedDroids, ['planner', 'builder']);
  assert.equal(loaded.onboarding.requiredData.projectVision.value, 'Ship it');
  assert.equal(loaded.onboarding.collectionMetadata.lastCollector, 'agent');

  await rm(repoRoot, { recursive: true, force: true });
});

test('SessionStore.save deep merges onboarding collectionMetadata entries', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 's5';

  const baseSession: any = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        projectVision: { value: 'Ship', confidence: 0.9, source: 'user' }
      },
      collectionMetadata: {
        lastQuestion: 'projectVision',
        aiSummary: 'Initial summary'
      }
    }
  };

  await store.save(repoRoot, baseSession);

  const patchSession: any = {
    sessionId,
    repoRoot,
    createdAt: baseSession.createdAt,
    state: baseSession.state,
    onboarding: {
      collectionMetadata: {
        aiSummary: 'Updated summary'
      }
    }
  };

  await store.save(repoRoot, patchSession);

  const loaded = (await store.load(repoRoot, sessionId)) as any;
  assert.ok(loaded, 'expected loaded session');
  assert.equal(loaded.onboarding.collectionMetadata.aiSummary, 'Updated summary');
  assert.equal(
    loaded.onboarding.collectionMetadata.lastQuestion,
    'projectVision',
    'existing metadata should be preserved'
  );

  await rm(repoRoot, { recursive: true, force: true });
});

test('SessionStore.loadActive returns the newest session with onboarding intact', async () => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();

  const older: any = {
    sessionId: 'old',
    repoRoot,
    createdAt: new Date('2023-01-01T00:00:00.000Z').toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        projectVision: { value: 'Legacy vision', confidence: 0.6, source: 'user' }
      },
      collectionMetadata: { lastQuestion: 'projectVision' }
    }
  };
  await store.save(repoRoot, older);

  const newer: any = {
    sessionId: 'new',
    repoRoot,
    createdAt: new Date('2023-02-01T00:00:00.000Z').toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        projectVision: { value: 'Newer vision', confidence: 0.9, source: 'ai' }
      },
      collectionMetadata: { lastQuestion: 'targetAudience' }
    }
  };
  await store.save(repoRoot, newer);

  const active = await store.loadActive(repoRoot);
  assert.ok(active, 'expected active session');
  assert.equal(active!.sessionId, 'new');
  assert.equal(active!.onboarding.requiredData.projectVision.value, 'Newer vision');

  await rm(repoRoot, { recursive: true, force: true });
});
