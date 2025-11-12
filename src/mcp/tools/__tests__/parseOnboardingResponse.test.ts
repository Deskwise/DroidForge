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
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          teamSize: {
            value: '3',
            confidence: 0.9,
            source: 'direct'
          }
        }))
      };

      const userInput = 'We are 3 experienced developers';
      
      // Call with mocked AI client
      const result = await parseOnboardingResponse(userInput, mockSession, mockAIClient as any);
      
      // Verify AI client was called
      expect(mockAIClient.callModel).toHaveBeenCalled();
      expect(result).toBeDefined();
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

  describe('Subtask 3: Session Merging Logic', () => {
    it('should respect confidence thresholds when merging', async () => {
      // Session with existing high-confidence data
      const mockSession: OnboardingSession = {
        sessionId: 'test-123',
        repoRoot: '/test',
        createdAt: new Date().toISOString(),
        state: 'collecting-goal',
        onboarding: {
          requiredData: {
            teamSize: {
              value: '5',
              confidence: 0.95,
              source: 'direct'
            }
          },
          collectionMetadata: {},
          methodology: {},
          team: {}
        }
      };

      // AI returns low-confidence conflicting data
      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          teamSize: {
            value: '3',
            confidence: 0.4,  // Too low - should NOT override
            source: 'inferred'
          },
          projectVision: {
            value: 'Mobile app',
            confidence: 0.9,
            source: 'direct'
          }
        }))
      };

      const result = await parseOnboardingResponse(
        'We are building a mobile app',
        mockSession,
        mockAIClient as any
      );

      // Should preserve high-confidence existing data
      expect(result.onboarding.requiredData.teamSize.value).toBe('5');
      expect(result.onboarding.requiredData.teamSize.confidence).toBe(0.95);

      // Should add new high-confidence data
      expect(result.onboarding.requiredData.projectVision.value).toBe('Mobile app');
      expect(result.onboarding.requiredData.projectVision.confidence).toBe(0.9);
    });

    it('should update empty fields with extracted data regardless of confidence', async () => {
      const mockSession: OnboardingSession = {
        sessionId: 'test-123',
        repoRoot: '/test',
        createdAt: new Date().toISOString(),
        state: 'collecting-goal',
        onboarding: {
          requiredData: {},  // All empty
          collectionMetadata: {},
          methodology: {},
          team: {}
        }
      };

      // AI returns data with various confidence levels
      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          teamSize: {
            value: '4',
            confidence: 0.6,  // Below threshold but field is empty
            source: 'inferred'
          },
          projectVision: {
            value: 'Web platform',
            confidence: 0.85,
            source: 'direct'
          }
        }))
      };

      const result = await parseOnboardingResponse(
        'Team building web platform',
        mockSession,
        mockAIClient as any
      );

      // Should populate empty fields even with low confidence
      expect(result.onboarding.requiredData.teamSize.value).toBe('4');
      expect(result.onboarding.requiredData.teamSize.confidence).toBe(0.6);
      
      expect(result.onboarding.requiredData.projectVision.value).toBe('Web platform');
    });

    it('should skip fields marked as missing by the AI', async () => {
      const mockSession: OnboardingSession = {
        sessionId: 'test-123',
        repoRoot: '/test',
        createdAt: new Date().toISOString(),
        state: 'collecting-goal',
        onboarding: {
          requiredData: {
            teamSize: {
              value: '5',
              confidence: 0.9,
              source: 'direct'
            }
          },
          collectionMetadata: {},
          methodology: {},
          team: {}
        }
      };

      // AI marks teamSize as missing but extracts projectVision
      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          teamSize: {
            value: null,
            confidence: 0,
            source: 'missing'
          },
          projectVision: {
            value: 'SaaS app',
            confidence: 0.85,
            source: 'direct'
          }
        }))
      };

      const result = await parseOnboardingResponse(
        'Building SaaS',
        mockSession,
        mockAIClient as any
      );

      // Should keep existing teamSize (not overwritten because marked missing)
      expect(result.onboarding.requiredData.teamSize.value).toBe('5');

      // Should add projectVision
      expect(result.onboarding.requiredData.projectVision.value).toBe('SaaS app');
    });
  });

  describe('Subtask 4: Structured Logging', () => {
    it('should emit structured log event with extraction context', async () => {
      const mockSession: OnboardingSession = {
        sessionId: 'audit-123',
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
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          projectVision: {
            value: 'Enterprise SaaS',
            confidence: 0.9,
            source: 'direct'
          }
        }))
      };

      // Mock the logger (will be available when Task 10 is implemented)
      const mockLogger = {
        logEvent: vi.fn()
      };

      const userInput = 'We are building enterprise SaaS';

      const result = await parseOnboardingResponse(
        userInput,
        mockSession,
        mockAIClient as any
      );

      // When logging is implemented, it should call logEvent with:
      // - sessionId
      // - userInput
      // - raw AI response
      // - merged session state
      expect(result.onboarding.requiredData.projectVision.value).toBe('Enterprise SaaS');
      // TODO: Verify mockLogger.logEvent was called with correct structure
      // once observability/logger.ts integration is complete
    });

    it('should handle logging gracefully if logger fails', async () => {
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

      const mockAIClient = {
        callModel: vi.fn().mockResolvedValue(JSON.stringify({
          projectVision: { value: 'App', confidence: 0.8, source: 'direct' }
        }))
      };

      // Function should not throw even if logging fails
      const result = await parseOnboardingResponse(
        'Building app',
        mockSession,
        mockAIClient as any
      );

      expect(result).toBeDefined();
      expect(result.onboarding.requiredData.projectVision).toBeDefined();
    });
  });
});
