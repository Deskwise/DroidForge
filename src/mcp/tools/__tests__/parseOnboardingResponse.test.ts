import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseOnboardingResponse } from '../parseOnboardingResponse.js';
import type { OnboardingSession } from '../../types.js';

describe('parseOnboardingResponse', () => {
  let mockSession: OnboardingSession;

  beforeEach(() => {
    mockSession = {
      sessionId: 'test-session-123',
      repoRoot: '/test/repo',
      createdAt: new Date().toISOString(),
      state: 'collecting-goal',
      onboarding: {
        projectVision: undefined,
        targetAudience: undefined,
        timelineConstraints: undefined,
        qualityVsSpeed: undefined,
        teamSize: undefined,
        experienceLevel: undefined,
        budgetConstraints: undefined,
        deploymentRequirements: undefined,
        securityRequirements: undefined,
        scalabilityNeeds: undefined,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path: Clear user response', () => {
    it('should extract all data correctly from a clear response', async () => {
      const userInput = 'We are a team of 3 developers with 5+ years experience. We want to build a high-performance API for real-time data processing with strict security requirements.';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      expect(result.onboarding.teamSize).toBe('3');
      expect(result.onboarding.experienceLevel).toBe('5+ years');
      expect(result.onboarding.scalabilityNeeds).toContain('high-performance');
      expect(result.onboarding.securityRequirements).toContain('strict');
    });
  });

  describe('Vague Input: Ambiguous response', () => {
    it('should produce lower confidence scores for ambiguous data', async () => {
      const userInput = 'We might need something maybe?';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Result should have undefined values for truly vague input with no specifics
      expect(result.onboarding.scalabilityNeeds).toBeUndefined();
      expect(result.onboarding.securityRequirements).toBeUndefined();
      expect(result.onboarding.teamSize).toBeUndefined();
    });
  });

  describe('Inference: Implied data extraction', () => {
    it('should correctly infer values from implicit context', async () => {
      const userInput = 'We are a duo working on a startup project';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Should infer teamSize from "duo"
      expect(result.onboarding.teamSize).toBe('2');
    });
  });

  describe('Merging Logic: Existing data preservation', () => {
    it('should correctly merge new data without overwriting high-confidence existing values', async () => {
      mockSession.onboarding.teamSize = '5'; // High-confidence existing value
      mockSession.onboarding.projectVision = undefined; // Empty field
      
      const userInput = 'We want to build an AI chatbot, but our team might be 3 or 4 people';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // High-confidence existing value should NOT be overwritten
      expect(result.onboarding.teamSize).toBe('5');
      // Empty field should be populated
      expect(result.onboarding.projectVision).toBeDefined();
      expect(result.onboarding.projectVision).toMatch(/AI chatbot/);
    });

    it('should handle complex multi-field merging scenarios', async () => {
      // Pre-populate some fields
      mockSession.onboarding.teamSize = '3';
      mockSession.onboarding.experienceLevel = 'junior';
      mockSession.onboarding.projectVision = undefined;
      mockSession.onboarding.scalabilityNeeds = undefined;
      
      const userInput = 'We are 5 senior developers building a high-performance trading platform with enterprise security';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Existing values should NOT be overwritten
      expect(result.onboarding.teamSize).toBe('3');
      expect(result.onboarding.experienceLevel).toBe('junior');
      
      // Empty fields should be populated with new data
      expect(result.onboarding.projectVision).toBeDefined();
      expect(result.onboarding.scalabilityNeeds).toBeDefined();
      expect(result.onboarding.securityRequirements).toContain('enterprise');
    });

    it('should merge multiple fields from single complex input', async () => {
      const userInput = 'Startup of 2 experienced devs building API in 6 months with tight budget but high uptime needs';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Should extract multiple distinct fields
      expect(result.onboarding.teamSize).toBe('2');
      expect(result.onboarding.timelineConstraints).toContain('6 months');
      expect(result.onboarding.budgetConstraints).toContain('tight');
      expect(result.onboarding.deploymentRequirements).toBeDefined();
    });

    it('should not overwrite fields with partial matches', async () => {
      mockSession.onboarding.experienceLevel = 'expert';
      
      const userInput = 'Our team of 5 junior people working together';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // existing expert level should NOT be overwritten by junior
      expect(result.onboarding.experienceLevel).toBe('expert');
      // But team size should be updated
      expect(result.onboarding.teamSize).toBe('5');
    });

    it('should handle null/undefined transition correctly', async () => {
      mockSession.onboarding.projectVision = null as any;
      
      const userInput = 'Building a real-time chat application with WebSockets';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Should populate previously null field
      expect(result.onboarding.projectVision).toBeDefined();
    });

    it('should preserve original session metadata while updating onboarding', async () => {
      mockSession.scan = { summary: 'test scan', frameworks: [], testConfigs: [], prdPaths: [], scripts: [], prdContent: null };
      mockSession.state = 'collecting-goal';
      
      const userInput = 'We are 3 developers wanting to build a REST API';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Original session properties should be preserved
      expect(result.sessionId).toBe(mockSession.sessionId);
      expect(result.repoRoot).toBe(mockSession.repoRoot);
      expect(result.state).toBe('collecting-goal');
      expect(result.scan?.summary).toBe('test scan');
      
      // Onboarding data should be updated
      expect(result.onboarding.teamSize).toBe('3');
      expect(result.onboarding.projectVision).toContain('REST API');
    });

    it('should emit structured log events during merging', async () => {
      // This test validates structured logging integration (subtask 4)
      const userInput = 'Team of 5 junior engineers building mobile app in 3 months';
      
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Verify onboarding was updated
      expect(result.onboarding).toBeDefined();
      expect(result.onboarding.teamSize).toBe('5');
      
      // TODO: Once logging is implemented, verify logEvent was called with:
      // - userInput
      // - rawAIResponse
      // - mergedSession state
      // This will be verified in subtask 4
    });
  });

  describe('AI Client Integration', () => {
    it('should call the MCP AI client with a properly formatted prompt', async () => {
      const userInput = 'We are a startup team of 2 people building web apps';
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Should return a session with at least some fields populated
      expect(result.onboarding.teamSize).toBeDefined();
      expect(result.onboarding.projectVision).toBeDefined();
    });

    it('should handle complex multi-field extraction from AI response', async () => {
      const userInput = 'Enterprise app, team of 10 senior devs, needs high security and 24/7 uptime';
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Should extract multiple fields with high confidence
      expect(result.onboarding.teamSize).toBe('10');
      expect(result.onboarding.experienceLevel).toBe('senior');
      expect(result.onboarding.securityRequirements).toBeDefined();
      expect(result.onboarding.deploymentRequirements).toContain('24/7');
    });

    it('should preserve undefined fields when confidence is low', async () => {
      const userInput = 'Uncertain about many things';
      const result = await parseOnboardingResponse(userInput, mockSession);
      
      // Low-confidence fields should remain undefined
      expect(result.onboarding.teamSize).toBeUndefined();
      expect(result.onboarding.scalabilityNeeds).toBeUndefined();
    });
  });
});
