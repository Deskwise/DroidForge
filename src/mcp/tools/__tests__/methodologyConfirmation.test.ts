import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConfirmMethodologyTool } from '../confirmMethodology.js';
import { createSelectMethodologyTool } from '../selectMethodology.js';
import { SessionStore } from '../../sessionStore.js';
import type { OnboardingSession } from '../../../types.js';

describe('methodology confirmation persistence', () => {
  let repoRoot: string;
  let sessionStore: SessionStore;
  let confirmTool: ReturnType<typeof createConfirmMethodologyTool>;
  let selectTool: ReturnType<typeof createSelectMethodologyTool>;
  let session: OnboardingSession;

  beforeEach(async () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'droidforge-test-'));
    sessionStore = new SessionStore();
    confirmTool = createConfirmMethodologyTool({ sessionStore });
    selectTool = createSelectMethodologyTool({ sessionStore });

    // Create a session in collecting-goal state with some data
    session = {
      sessionId: 'test-session',
      state: 'collecting-goal',
      createdAt: new Date().toISOString(),
      projectVision: 'Test project',
      targetAudience: 'Developers',
      timelineConstraints: '2 weeks',
      qualityVsSpeed: 'Quality',
      teamSize: 'Solo',
      experienceLevel: 'Intermediate',
      budgetConstraints: 'Low',
      deploymentRequirements: 'Web',
      securityRequirements: 'Standard',
      scalabilityNeeds: 'Medium',
      methodologyConfirmed: false,
      methodology: undefined,
      aiRecommendations: [],
      inferredData: {},
      selectedDroids: [],
      customDroids: [],
    };

    await sessionStore.save(repoRoot, session);
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('should persist methodologyConfirmed across tool calls', async () => {
    // Step 1: Confirm methodology
    await confirmTool.handler({
      repoRoot,
      sessionId: session.sessionId,
      methodology: 'Test-Driven Development (TDD)',
    });

    // Step 2: Load session and verify flag is true
    const loadedAfterConfirm = await sessionStore.load(repoRoot, session.sessionId);
    assert.ok(loadedAfterConfirm);
    assert.strictEqual(loadedAfterConfirm.methodologyConfirmed, true);

    // Step 3: Select methodology should succeed
    const result = await selectTool.handler({
      repoRoot,
      sessionId: session.sessionId,
      choice: 'tdd',
    });

    assert.strictEqual(result.methodology, 'Test-Driven Development (TDD)');

    // Step 4: Final load should have methodology set and state changed
    const finalSession = await sessionStore.load(repoRoot, session.sessionId);
    assert.ok(finalSession);
    assert.strictEqual(finalSession.methodologyConfirmed, true);
    assert.strictEqual(finalSession.methodology, 'Test-Driven Development (TDD)');
    assert.strictEqual(finalSession.state, 'roster');
  });

  it('should reject select_methodology when methodologyConfirmed is false', async () => {
    await assert.rejects(
      () =>
        selectTool.handler({
          repoRoot,
          sessionId: session.sessionId,
          choice: 'tdd',
        }),
      /Please confirm the methodology before I record it/
    );
  });
});
