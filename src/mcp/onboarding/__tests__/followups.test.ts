import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNextQuestion } from '../followups.js';
import type { OnboardingSession } from '../../types.js';

const createEmptySession = (): OnboardingSession => ({
  sessionId: 'test-session',
  repoRoot: '/tmp',
  createdAt: new Date().toISOString(),
  state: 'collecting-goal',
  onboarding: {
    requiredData: {},
    collectionMetadata: {},
    methodology: {},
    team: {}
  }
});

describe('getNextQuestion', () => {
  it('returns prompt for first required field when session is empty', () => {
    const session = createEmptySession();
    const result = getNextQuestion(session);
    
    assert.ok(result !== null, 'should return a FollowUpPrompt');
    assert.equal(result?.key, 'projectVision', 'should return first field');
    assert.equal(typeof result?.question, 'string', 'question should be a string');
    assert.equal(typeof result?.example, 'string', 'example should be a string');
  });

  it('returns prompt for first missing field when some data exists', () => {
    const session = createEmptySession();
    session.onboarding.requiredData = {
      projectVision: { value: 'Build a SaaS', confidence: 0.9, source: 'user' }
    };
    
    const result = getNextQuestion(session);
    
    assert.ok(result !== null, 'should return a FollowUpPrompt');
    assert.equal(result?.key, 'targetAudience', 'should return next missing field');
  });

  it('returns prompt for field with low confidence', () => {
    const session = createEmptySession();
    session.onboarding.requiredData = {
      projectVision: { value: 'Build a SaaS', confidence: 0.9, source: 'user' },
      targetAudience: { value: 'Maybe developers?', confidence: 0.5, source: 'user' }
    };
    
    const result = getNextQuestion(session);
    
    assert.ok(result !== null, 'should return a FollowUpPrompt for low confidence');
    assert.equal(result?.key, 'targetAudience', 'should return field with low confidence');
  });

  it('returns null when all fields have high confidence', () => {
    const session = createEmptySession();
    session.onboarding.requiredData = {
      projectVision: { value: 'Build a SaaS', confidence: 0.9, source: 'user' },
      targetAudience: { value: 'Developers', confidence: 0.9, source: 'user' },
      timelineConstraints: { value: '3 months', confidence: 0.9, source: 'user' },
      qualityVsSpeed: { value: 'Quality', confidence: 0.9, source: 'user' },
      teamSize: { value: '2', confidence: 0.9, source: 'user' },
      experienceLevel: { value: 'experienced', confidence: 0.9, source: 'user' },
      budgetConstraints: { value: 'Moderate', confidence: 0.9, source: 'user' },
      deploymentRequirements: { value: 'Cloud', confidence: 0.9, source: 'user' },
      securityRequirements: { value: 'High', confidence: 0.9, source: 'user' },
      scalabilityNeeds: { value: 'Medium', confidence: 0.9, source: 'user' }
    };
    
    const result = getNextQuestion(session);
    
    assert.equal(result, null, 'should return null when all fields complete');
  });

  it('skips null values and finds next missing field', () => {
    const session = createEmptySession();
    session.onboarding.requiredData = {
      projectVision: { value: null, confidence: 0, source: 'user' }
    };
    
    const result = getNextQuestion(session);
    
    assert.ok(result !== null, 'should return a FollowUpPrompt');
    assert.equal(result?.key, 'projectVision', 'should return field with null value');
  });
});

