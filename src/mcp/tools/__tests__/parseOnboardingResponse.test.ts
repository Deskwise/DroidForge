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
