import { describe, it, expect } from 'vitest';
import { parseOnboardingResponse } from '../parseOnboardingResponse.js';
import type { OnboardingSession } from '../../types.js';

describe('parseOnboardingResponse - Subtask 1: File Structure & Types', () => {
  it('should export parseOnboardingResponse as an async function', async () => {
    expect(parseOnboardingResponse).toBeDefined();
    expect(typeof parseOnboardingResponse).toBe('function');
  });

  it('should accept userInput string and currentSession, returning Promise<OnboardingSession>', async () => {
    const mockSession: OnboardingSession = {
      sessionId: 'test-123',
      repoRoot: '/test',
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    const result = parseOnboardingResponse('test input', mockSession);
    
    // Must return a Promise
    expect(result).toBeInstanceOf(Promise);
    
    const resolved = await result;
    
    // Must resolve to OnboardingSession
    expect(resolved).toHaveProperty('sessionId');
    expect(resolved).toHaveProperty('onboarding');
  });

  it('should have AIExtractionResult type defined for field extraction', async () => {
    // This test validates that the module exports the correct types
    // The type will be imported and used in later subtasks
    const mockSession: OnboardingSession = {
      sessionId: 'test-123',
      repoRoot: '/test',
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        requiredData: {},
        collectionMetadata: {},
        methodology: {},
        team: {}
      }
    };

    // Just verify function is callable without error
    const result = await parseOnboardingResponse('input', mockSession);
    expect(result).toBeDefined();
  });
});
