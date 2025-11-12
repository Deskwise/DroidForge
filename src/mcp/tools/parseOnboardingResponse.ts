import type { OnboardingSession } from '../types.js';

/**
 * Represents a single extracted field with confidence metadata from the AI
 */
export interface AIExtractionResult {
  value: any;
  confidence: number; // 0-1
  source: string; // e.g., "direct", "inferred"
}

/**
 * Parse freeform user input and extract structured onboarding data
 * @param userInput - Raw text from the user
 * @param currentSession - Current onboarding session state
 * @returns Updated session with merged extracted data
 */
export async function parseOnboardingResponse(
  userInput: string,
  currentSession: OnboardingSession
): Promise<OnboardingSession> {
  // TODO: Subtask 2 - Implement AI prompt construction and client call
  // TODO: Subtask 3 - Implement merging logic
  // TODO: Subtask 4 - Integrate structured logging
  
  return currentSession;
}
