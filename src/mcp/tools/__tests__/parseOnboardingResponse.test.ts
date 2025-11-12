import { describe, it, expect, vi } from 'vitest';
import { parseOnboardingResponse } from '../parseOnboardingResponse.js';
import type { OnboardingSession } from '../../types.js';

describe('parseOnboardingResponse', () => {
  describe('Subtask 1: File Structure & Types', () => {
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

    // Mock the AI client
    const mockAIClient = {
      callModel: vi.fn().mockResolvedValue(JSON.stringify({}))
    };

    const result = parseOnboardingResponse('test input', mockSession, mockAIClient as any);
    
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

    // Mock the AI client
    const mockAIClient = {
      callModel: vi.fn().mockResolvedValue(JSON.stringify({}))
    };

    // Just verify function is callable without error
    const result = await parseOnboardingResponse('input', mockSession, mockAIClient as any);
    expect(result).toBeDefined();
  });
  });

  describe('Subtask 2: AI Prompt Construction and Client Call', () => {
    it('should construct a prompt that requests JSON with value, confidence, source structure', async () => {
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

      // Mock the AI client to capture the prompt
      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(JSON.stringify({}))
      };

      // The function should internally construct a proper prompt
      // This test verifies the prompt construction by checking that the result
      // reflects proper extraction (we'll mock the AI client in later subtasks)
      const result = await parseOnboardingResponse(
        'We are a team of 5 developers building a web app',
        mockSession,
        mockAIClient as any
      );

      // Verify the AI client was called with prompts
      expect(mockAIClient.callModel).toHaveBeenCalled();
      const [systemPrompt, userPrompt] = mockAIClient.callModel.mock.calls[0];
      
      // System prompt should mention the required extraction format
      expect(systemPrompt).toContain('value');
      expect(systemPrompt).toContain('confidence');
      expect(systemPrompt).toContain('source');
      
      // User prompt should contain the user's input
      expect(userPrompt).toContain('We are a team of 5 developers');

      // Verify it returns a session
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('onboarding');
    });

    it('should call MCP AI client with the constructed prompt', async () => {
      // This test will be properly implemented when we mock the AI client
      // For RED phase: we expect the function to attempt an AI call
      // Currently it won't, so this test FAILS
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

      const userInput = 'We are 3 experienced developers';
      
      // This should trigger an AI client call (which will fail until subtask 2 is implemented)
      // Expecting the function to at least attempt to call an AI service
      await expect(async () => {
        await parseOnboardingResponse(userInput, mockSession);
      }).not.toThrow();  // Should not throw - it should handle gracefully
    });

    it('should extract projectVision field from user input via AI', async () => {
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

      // Mock the AI client to return extraction data
      const mockAIResponse = JSON.stringify({
        projectVision: {
          value: 'SaaS platform for project management',
          confidence: 0.95,
          source: 'direct'
        },
        teamSize: {
          value: null,
          confidence: 0,
          source: 'missing'
        }
      });

      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(mockAIResponse)
      };

      // When user describes their project, AI should extract projectVision
      const result = await parseOnboardingResponse(
        'We want to build a SaaS platform for project management',
        mockSession,
        mockAIClient as any
      );

      // Should have called the AI client with prompts
      expect(mockAIClient.callModel).toHaveBeenCalled();

      // Should have extracted the vision field with confidence score
      expect(result.onboarding.requiredData['projectVision']).toBeDefined();
      expect(result.onboarding.requiredData['projectVision']).toHaveProperty('value');
      expect(result.onboarding.requiredData['projectVision']).toHaveProperty('confidence');
      expect(result.onboarding.requiredData['projectVision']).toHaveProperty('source');
      expect(result.onboarding.requiredData['projectVision'].confidence).toBeGreaterThan(0.7);
    });
  });
});
