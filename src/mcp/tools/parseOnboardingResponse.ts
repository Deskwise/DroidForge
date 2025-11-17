import { logEvent, type LogEvent } from '../../observability/logger.js';
import type { OnboardingSession } from '../types.js';

export interface AIExtractionResult {
  value: string | null;
  confidence: number;
  source: string;
}

export type AIExtractionMap = Record<string, AIExtractionResult>;

interface AIPromptRequest {
  systemPrompt: string;
  userPrompt: string;
}

export interface AIClient {
  completePrompt(request: AIPromptRequest): Promise<string>;
}

interface ParseOnboardingDeps {
  aiClient: AIClient;
  mergeSession: (session: OnboardingSession, extracted: AIExtractionMap) => OnboardingSession;
  logger: (event: LogEvent) => void;
}

const REQUIRED_FIELDS = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel',
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
] as const;

const CONFIDENCE_THRESHOLD = 0.75;

function normalizeValue(entry: AIExtractionResult): string | null {
  if (entry.value === null || entry.value === undefined) {
    return null;
  }
  const value = String(entry.value).trim();
  return value.length === 0 ? null : value;
}

function cloneOnboarding(session: OnboardingSession) {
  const nextRequiredData = { ...(session.onboarding.requiredData ?? {}) };
  const nextOnboarding = { ...session.onboarding, requiredData: nextRequiredData };
  return { nextOnboarding, nextRequiredData };
}

function mergeAIResponse(session: OnboardingSession, extracted: AIExtractionMap): OnboardingSession {
  if (!extracted || Object.keys(extracted).length === 0) {
    return session;
  }

  const { nextOnboarding, nextRequiredData } = cloneOnboarding(session);
  let updated = false;

  for (const field of REQUIRED_FIELDS) {
    const aiEntry = extracted[field];
    if (!aiEntry) continue;
    const normalizedValue = normalizeValue(aiEntry);
    if (normalizedValue === null) {
      continue;
    }
    const currentEntry = nextRequiredData[field];
    const hasExistingValue = Boolean(currentEntry?.value && String(currentEntry.value).trim().length > 0);
    const shouldInsert = !!normalizedValue && (!hasExistingValue || aiEntry.confidence >= CONFIDENCE_THRESHOLD);

    if (shouldInsert) {
      nextRequiredData[field] = {
        value: normalizedValue,
        confidence: aiEntry.confidence,
        source: aiEntry.source
      };
      (nextOnboarding as Record<string, any>)[field] = normalizedValue ?? undefined;
      updated = true;
      continue;
    }

  }

  if (!updated) {
    return session;
  }

  return { ...session, onboarding: nextOnboarding };
}

function createDefaultAIClient(): AIClient {
  const endpoint = process.env.DROIDFORGE_AI_ENDPOINT;
  if (!endpoint) {
    return {
      async completePrompt() {
        throw new Error('DROIDFORGE_AI_ENDPOINT not configured for parseOnboardingResponse.');
      }
    };
  }

  if (typeof fetch !== 'function') {
    return {
      async completePrompt() {
        throw new Error('Global fetch API is not available. Please run on Node 18+ or provide a custom aiClient.');
      }
    };
  }

  const apiKey = process.env.DROIDFORGE_AI_KEY;
  const model = process.env.DROIDFORGE_AI_MODEL ?? 'json-extractor';

  return {
    async completePrompt(request) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify({
          model,
          system: request.systemPrompt,
          user: request.userPrompt,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`AI endpoint responded with ${response.status}`);
      }

      return response.text();
    }
  };
}

function buildDefaultDeps(): ParseOnboardingDeps {
  return {
    aiClient: createDefaultAIClient(),
    mergeSession: mergeAIResponse,
    logger: logEvent
  };
}

let activeDeps: ParseOnboardingDeps = buildDefaultDeps();

export function configureParseOnboardingDeps(overrides: Partial<ParseOnboardingDeps>): void {
  activeDeps = { ...activeDeps, ...overrides };
}

export function resetParseOnboardingDeps(): void {
  activeDeps = buildDefaultDeps();
}

function buildSystemPrompt(): string {
  const instructions = `You are an AI intake specialist helping collect project onboarding data for software teams. ` +
    `Extract the following fields and respond with JSON ONLY (no prose). Each field must be an object with keys { "value", "confidence", "source" }.
Fields: ${REQUIRED_FIELDS.join(', ')}.
Rules:
- Confidence is a number between 0 and 1.
- Source must explain whether the information came directly from the user, was inferred, or came from prior context.
- If you cannot determine a field, set value to null and confidence below 0.4.`;
  return instructions;
}

function buildUserPrompt(userInput: string, session: OnboardingSession): string {
  const collected = Object.entries(session.onboarding.requiredData ?? {})
    .map(([key, entry]) => `${key}: ${entry.value ?? 'unknown'} (confidence ${entry.confidence ?? 0})`)
    .join('\n');
  const contextBlock = collected ? `Known session data so far:\n${collected}\n\n` : '';
  return `${contextBlock}User input:\n${userInput.trim()}`.trim();
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function parseAIExtractionMap(raw: string): AIExtractionMap {
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`AI response is not valid JSON: ${(error as Error).message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('AI response must be a JSON object.');
  }

  const map: AIExtractionMap = {};
  for (const field of REQUIRED_FIELDS) {
    const entry = parsed[field];
    if (!entry || typeof entry !== 'object') {
      map[field] = { value: null, confidence: 0, source: 'ai' };
      continue;
    }
    map[field] = {
      value: entry.value ?? null,
      confidence: normalizeConfidence(entry.confidence),
      source: typeof entry.source === 'string' ? entry.source : 'ai'
    };
  }
  return map;
}

/**
 * Parse freeform onboarding responses with the MCP AI client.
 */
export async function parseOnboardingResponse(
  userInput: string,
  currentSession: OnboardingSession
): Promise<OnboardingSession> {
  if (!userInput?.trim()) {
    return currentSession;
  }

  const prompt: AIPromptRequest = {
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(userInput, currentSession)
  };

  const rawResponse = await activeDeps.aiClient.completePrompt(prompt);
  const extracted = parseAIExtractionMap(rawResponse);
  const merged = activeDeps.mergeSession(currentSession, extracted);

  activeDeps.logger({
    timestamp: new Date().toISOString(),
    event: 'parse_onboarding_response',
    sessionId: currentSession.sessionId,
    userInput,
    rawAIResponse: rawResponse,
    extractedData: extracted,
    mergedSession: merged
  });

  return merged;
}
