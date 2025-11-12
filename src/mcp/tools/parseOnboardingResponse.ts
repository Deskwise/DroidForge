import type { OnboardingSession } from '../types.js';
import type { OnboardingData } from '../../types.js';

/**
 * Represents a single extracted field with confidence metadata
 */
export interface ExtractedField {
  value: any;
  confidence: number; // 0-1, where 1 is absolute certainty
  source: string; // e.g., "direct", "inferred", "context"
}

/**
 * The raw response from the MCP AI client
 */
export interface AIExtractionResponse {
  [key: string]: ExtractedField;
}

/**
 * Extract team size from text (e.g., "duo" -> 2, "3 developers" -> 3)
 */
function extractTeamSize(text: string): string | undefined {
  // Match "duo"
  if (/\bduo\b/i.test(text)) return '2';
  
  // Match "team of N", "N developers", etc.
  const match = text.match(/(?:team of |(?:^|\s))(\d+)\s+(?:developers?|people?|engineers?|members?)/i);
  if (match) return match[1];
  
  // Match "N [adj] developers", "of N developers", "N devs", etc.
  // Flexible pattern that allows adjectives between number and dev/engineer words
  const match2 = text.match(/(?:of\s+)?(\d+)\s+[a-z\s]*?(?:devs?|developers?|engineers?|people?)/i);
  if (match2) return match2[1];
  
  return undefined;
}

/**
 * Extract experience level from text
 */
function extractExperienceLevel(text: string): string | undefined {
  // Match "senior devs", "junior developers", etc.
  const adjMatch = text.match(/\b(senior|junior|mid-level|expert|experienced|beginner)\b/i);
  if (adjMatch) {
    return adjMatch[1].toLowerCase();
  }
  
  // Match X+ years patterns
  const yearsMatch = text.match(/(\d+\+?\s*years?)/i);
  if (yearsMatch) {
    return yearsMatch[1].trim();
  }
  
  return undefined;
}

/**
 * Extract scalability needs from text
 */
function extractScalability(text: string): string | undefined {
  if (/high-performance|scalable|scale|scaling|load-bearing/i.test(text)) {
    return 'high-performance and scalable';
  }
  return undefined;
}

/**
 * Extract security requirements from text
 */
function extractSecurity(text: string): string | undefined {
  if (/enterprise.*security|security.*enterprise/i.test(text)) {
    return 'enterprise security requirements';
  }
  if (/security|secure|encryption|compliance|strict|pci|hipaa|gdpr/i.test(text)) {
    return 'strict security requirements';
  }
  return undefined;
}

/**
 * Extract deployment requirements from text
 */
function extractDeploymentRequirements(text: string): string | undefined {
  if (/24\/7|always.*up|uptime|reliability|persistent|continuous|high.*availability/i.test(text)) {
    return '24/7 availability and high uptime';
  }
  return undefined;
}

/**
 * Extract timeline constraints from text
 */
function extractTimeline(text: string): string | undefined {
  // Match "N months", "N weeks", "N years"
  const match = text.match(/(\d+)\s+(?:months?|weeks?|years?)/i);
  if (match) {
    return `${match[0]} timeline`;
  }
  return undefined;
}

/**
 * Extract budget constraints from text
 */
function extractBudget(text: string): string | undefined {
  if (/tight|limited|low|budget/i.test(text)) {
    return 'tight budget constraints';
  }
  if (/generous|high|large|unlimited|ample/i.test(text) && /budget/i.test(text)) {
    return 'generous budget available';
  }
  return undefined;
}

/**
 * Extract project vision from text
 */
function extractProjectVision(text: string): string | undefined {
  // Look for build/create/make/develop/want to build
  let match = text.match(/(?:build|create|make|develop)\s+([a-zA-Z0-9\s-]+?)(?:\s+(?:for|with|using|to)|\s*,|\s*\.|\s*$)/i);
  
  if (!match) {
    // Try "want to" + verb
    match = text.match(/want\s+to\s+(\w+\s+[a-zA-Z0-9\s-]+?)(?:\s*,|\s*\.|\s*$)/i);
  }
  
  if (!match) {
    // Very simple: any noun phrase after "build"
    match = text.match(/\b(?:building|building a|build|want to build)\s+([a-zA-Z0-9\s-]+?)(?:\s*$|,)/i);
  }
  
  if (match) {
    const vision = match[1]?.trim() || '';
    if (vision.length > 2) {
      return vision.replace(/[,;.]$/, '').trim();
    }
  }
  return undefined;
}

/**
 * Merge extracted data with current session, respecting existing high-confidence values
 */
function mergeData(
  extracted: AIExtractionResponse,
  currentSession: OnboardingSession,
  userInput: string
): OnboardingSession {
  const merged = { ...currentSession };
  const newOnboarding = { ...currentSession.onboarding };
  
  // Helper to update field if new data is available and either field is empty or confidence is high
  const updateField = (key: keyof OnboardingData, extractedValue: string | undefined) => {
    if (extractedValue !== undefined) {
      if (!newOnboarding[key]) {
        newOnboarding[key] = extractedValue;
      }
    }
  };
  
  updateField('teamSize', extractTeamSize(userInput));
  updateField('experienceLevel', extractExperienceLevel(userInput));
  updateField('scalabilityNeeds', extractScalability(userInput));
  updateField('securityRequirements', extractSecurity(userInput));
  updateField('deploymentRequirements', extractDeploymentRequirements(userInput));
  updateField('timelineConstraints', extractTimeline(userInput));
  updateField('budgetConstraints', extractBudget(userInput));
  updateField('projectVision', extractProjectVision(userInput));
  
  merged.onboarding = newOnboarding;
  return merged;
}

/**
 * Parse a user's freeform text input and extract structured onboarding data
 * using the MCP AI client. Intelligently merges extracted data with the current session.
 *
 * @param userInput - Raw freeform text from the user
 * @param currentSession - The current OnboardingSession to merge with
 * @returns Promise<OnboardingSession> - Updated session with merged data
 */
export async function parseOnboardingResponse(
  userInput: string,
  currentSession: OnboardingSession
): Promise<OnboardingSession> {
  // TODO: Replace with actual MCP AI client call
  // For now, we use basic pattern matching for extraction
  const extracted: AIExtractionResponse = {};
  
  // Merge extracted data with current session
  const result = mergeData(extracted, currentSession, userInput);
  
  // TODO: Emit structured log event (Task 10 integration)
  // When observability/logger.ts is available:
  // logEvent({
  //   event: 'parse_onboarding_response',
  //   sessionId: currentSession.sessionId,
  //   userInput,
  //   extractedFields: Object.keys(extracted),
  //   mergedSession: result
  // });
  
  return result;
}
