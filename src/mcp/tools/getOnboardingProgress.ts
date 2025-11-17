import type { ToolDefinition, GetOnboardingProgressInput, GetOnboardingProgressOutput, OnboardingSession } from '../types.js';
import type { SessionStore } from '../sessionStore.js';

interface Deps {
  sessionStore: SessionStore;
}

const REQUIRED_KEYS = [
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

function isFilled(val: unknown): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

export function createGetOnboardingProgressTool(deps: Deps): ToolDefinition<GetOnboardingProgressInput, GetOnboardingProgressOutput> {
  return {
    name: 'get_onboarding_progress',
    description: 'Return which onboarding data points (10 required) are collected or missing for the active session.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }
      if (!session) {
        return {
          collected: Object.fromEntries(REQUIRED_KEYS.map(k => [k, false])),
          missing: REQUIRED_KEYS.map(String),
          collectedCount: 0,
          complete: false
        };
      }

      // Accept description as projectVision fallback and prefer nested requiredData entries
      const collectedFlags: Record<string, boolean> = {};
      const requiredData = (session.onboarding as any).requiredData || {};

      for (const key of REQUIRED_KEYS) {
        const nestedValue = requiredData[key]?.value as unknown;

        if (isFilled(nestedValue)) {
          collectedFlags[key] = true;
          continue;
        }

        if (key === 'projectVision') {
          collectedFlags[key] = isFilled(session.onboarding.projectVision || session.description);
        } else {
          collectedFlags[key] = isFilled((session.onboarding as any)[key] ?? (session as any)[key]);
        }
      }
      const missing = REQUIRED_KEYS.filter(k => !collectedFlags[k]).map(String);
      const collectedCount = REQUIRED_KEYS.length - missing.length;
      const complete = missing.length === 0;
      return { collected: collectedFlags, missing, collectedCount, complete };
    }
  };
}

