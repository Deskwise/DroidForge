import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SessionStore } from '../sessionStore.js';
import { OnboardingSession } from '../types.js';

async function makeRepoRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'session-persistence-test-'));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test('SessionStore persistence snapshots', async (t) => {
  const repoRoot = await makeRepoRoot();
  const store = new SessionStore();
  const sessionId = 'test-persistence-1';
  
  const session: OnboardingSession = {
    sessionId,
    repoRoot,
    createdAt: new Date().toISOString(),
    state: 'collecting-goal',
    onboarding: {
      requiredData: {
        vision: { value: 'Initial Vision', confidence: 1.0, source: 'user' }
      }
    }
  };

  await t.test('saveSnapshot appends to jsonl and updates canonical json', async () => {
    // @ts-ignore - methods not implemented yet
    await store.saveSnapshot(session);

    const jsonlPath = path.join(repoRoot, '.factory', 'sessions', `${sessionId}.jsonl`);
    const jsonPath = path.join(repoRoot, '.droidforge', 'session', `${sessionId}.json`);

    assert.ok(await fileExists(jsonlPath), 'JSONL snapshot file created');
    assert.ok(await fileExists(jsonPath), 'Canonical JSON file created');

    const jsonlContent = await readFile(jsonlPath, 'utf8');
    const jsonContent = await readFile(jsonPath, 'utf8');
    
    const jsonlLines = jsonlContent.trim().split('\n');
    assert.strictEqual(jsonlLines.length, 1, 'One snapshot recorded');
    assert.deepStrictEqual(JSON.parse(jsonlLines[0]), session, 'Snapshot content matches');
    assert.deepStrictEqual(JSON.parse(jsonContent), session, 'Canonical content matches');

    // Update session and save again
    const updatedSession = { ...session, state: 'analyzing' as const };
    // @ts-ignore
    await store.saveSnapshot(updatedSession);

    const jsonlContent2 = await readFile(jsonlPath, 'utf8');
    const jsonlLines2 = jsonlContent2.trim().split('\n');
    assert.strictEqual(jsonlLines2.length, 2, 'Second snapshot appended');
    assert.deepStrictEqual(JSON.parse(jsonlLines2[1]), updatedSession, 'Second snapshot matches updated state');
    
    const jsonContent2 = await readFile(jsonPath, 'utf8');
    assert.deepStrictEqual(JSON.parse(jsonContent2), updatedSession, 'Canonical file updated to latest');
  });

  await t.test('loadSnapshot retrieves the last state', async () => {
    // @ts-ignore
    const loaded = await store.loadSnapshot(repoRoot, sessionId);
    
    assert.ok(loaded, 'Snapshot loaded successfully');
    assert.strictEqual(loaded.state, 'analyzing', 'Loaded state is the most recent one');
    assert.deepStrictEqual(loaded.onboarding, session.onboarding, 'Deep structure preserved');
  });

  await rm(repoRoot, { recursive: true, force: true });
});

