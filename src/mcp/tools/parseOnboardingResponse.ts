import type { OnboardingSession } from '../types.js';

/**
 * Represents a single extracted field with confidence metadata from the AI
 */
export interface AIExtractionResult {
  value: any;
  confidence: number; // 0-1, higher = more confident
  source: string; // e.g., "direct", "inferred"
}

/**
 * Interface for the MCP AI client
 */
interface MCPAIClient {
  callModel(systemPrompt: string, userPrompt: string): Promise<string>;
}

/**
 * Default MCP AI client implementation
 * TODO: Replace with actual MCP integration when available
 */
const defaultAIClient: MCPAIClient = {
  async callModel(systemPrompt: string, userPrompt: string): Promise<string> {
    // Placeholder for actual AI client
    // When MCP is integrated, this will be replaced with real API call
    throw new Error('AI client not configured. TODO: Integrate MCP AI service.');
  }
};

/**
 * Construct the system prompt for the AI to extract onboarding data
 */
function constructSystemPrompt(): string {
  return `You are an expert project manager and business analyst. Your task is to extract structured data from freeform user input about their project and team.

Extract the following 10 fields if present in the user's text:
1. projectVision - What they want to build
2. targetAudience - Who will use it
3. timelineConstraints - Timeline/deadline
4. qualityVsSpeed - Priority between quality and speed
5. teamSize - How many people
6. experienceLevel - Team's technical experience
7. budgetConstraints - Budget situation
8. deploymentRequirements - Where/how to deploy
9. securityRequirements - Security needs
10. scalabilityNeeds - Scaling requirements

Respond with a JSON object where each field is structured as:
{
  "fieldName": {
    "value": <extracted value or null>,
    "confidence": <0.0 to 1.0>,
    "source": "<direct|inferred|missing>"
  }
}

Only include fields where you found relevant information. For missing fields, use null value and "missing" source. Set confidence high (0.8-1.0) for explicitly stated information, medium (0.5-0.8) for inferred information.`;
}

/**
 * Construct the user prompt from the input
 */
function constructUserPrompt(userInput: string): string {
  return `Please analyze the following user input and extract the onboarding data:\n\n"${userInput}"`;
}

/**
 * Merge extracted data into session, respecting confidence thresholds
 */
function mergeExtractedData(
  session: OnboardingSession,
  extractedData: Record<string, AIExtractionResult>
): OnboardingSession {
  const updated = { ...session };
  const requiredData = { ...session.onboarding.requiredData };
  
  // Confidence threshold: only merge data above this score or if field is empty
  const CONFIDENCE_THRESHOLD = 0.75;
  
  for (const [fieldName, extraction] of Object.entries(extractedData)) {
    // Skip if extraction source is "missing"
    if (extraction.source === 'missing') {
      continue;
    }
    
    // Skip if confidence is too low and field already has data
    if (extraction.confidence < CONFIDENCE_THRESHOLD && requiredData[fieldName]) {
      continue;
    }
    
    // Merge the extracted field
    requiredData[fieldName] = extraction;
  }
  
  updated.onboarding = {
    ...session.onboarding,
    requiredData
  };
  
  return updated;
}

/**
 * Parse freeform user input and extract structured onboarding data
 * @param userInput - Raw text from the user
 * @param currentSession - Current onboarding session state
 * @param aiClient - Optional AI client for testing (uses default if not provided)
 * @returns Updated session with merged extracted data
 */
export async function parseOnboardingResponse(
  userInput: string,
  currentSession: OnboardingSession,
  aiClient: MCPAIClient = defaultAIClient
): Promise<OnboardingSession> {
  // Subtask 2: AI Prompt Construction and Client Call
  const systemPrompt = constructSystemPrompt();
  const userPrompt = constructUserPrompt(userInput);
  
  // Call the AI client
  const rawResponse = await aiClient.callModel(systemPrompt, userPrompt);
  
  // Parse the JSON response
  let extractedData: Record<string, AIExtractionResult>;
  try {
    extractedData = JSON.parse(rawResponse);
  } catch (error) {
    throw new Error(`Failed to parse AI response as JSON: ${error}`);
  }
  
  // Subtask 3: Implement merging logic with confidence-aware updates
  const merged = mergeExtractedData(currentSession, extractedData);
  
  // TODO: Subtask 4 - Integrate structured logging
  
  return merged;
}
