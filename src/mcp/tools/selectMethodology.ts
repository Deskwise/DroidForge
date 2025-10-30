import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition, OnboardingSession } from '../types.js';
import { METHODOLOGIES } from '../generation/methodologyDefinitions.js';

type MethodologyId = SelectMethodologyInput['choice'];

interface Deps {
  sessionStore: SessionStore;
}

const CORE_FIELDS: Array<keyof OnboardingSession> = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel'
];

const DELIVERY_FIELDS: Array<keyof OnboardingSession> = [
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
];

const FIELD_LABELS: Record<string, string> = {
  projectVision: 'project vision',
  targetAudience: 'target audience',
  timelineConstraints: 'timeline',
  qualityVsSpeed: 'quality vs speed preference',
  teamSize: 'team size',
  experienceLevel: 'experience level',
  budgetConstraints: 'budget constraints',
  deploymentRequirements: 'deployment requirements',
  securityRequirements: 'security requirements',
  scalabilityNeeds: 'scalability needs'
};

const DELEGATION_PHRASES = ['you decide', 'you choose', 'decide for me', 'pick for me', 'up to you', 'your call'];

const NUMBER_TO_ID: Record<string, MethodologyId> = {
  '1': 'agile',
  '2': 'tdd',
  '3': 'bdd',
  '4': 'waterfall',
  '5': 'kanban',
  '6': 'lean',
  '7': 'ddd',
  '8': 'devops',
  '9': 'rapid',
  '10': 'enterprise'
};

const NAME_TO_ID = new Map<string, MethodologyId>();
for (const methodology of METHODOLOGIES) {
  const id = methodology.id as MethodologyId;
  const lowerName = methodology.name.toLowerCase();
  NAME_TO_ID.set(lowerName, id);

  const parts = lowerName
    .replace(/[()]/g, '')
    .split(/[\/,-]/)
    .map(part => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    NAME_TO_ID.set(part, id);
  }
}

function sanitize(input?: string | MethodologyId): string {
  return (input ?? '')
    .toString()
    .replace(/\x1b\[\?2004[hl]/g, '')
    .replace(/\x1b\[200~|\x1b\[201~/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\r/g, '')
    .trim();
}

function collectMissingDelivery(session: OnboardingSession): string[] {
  const have = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const missing: string[] = [];
  for (const field of DELIVERY_FIELDS) {
    const value = (session as any)[field];
    if (!have(value)) {
      missing.push(FIELD_LABELS[field] ?? field);
    }
  }
  return missing;
}

export function createSelectMethodologyTool(deps: Deps): ToolDefinition<SelectMethodologyInput, SelectMethodologyOutput> {
  return {
    name: 'select_methodology',
    description: 'Record the methodology selection from onboarding.',
    handler: async input => {
      const repoRoot = input.repoRoot;
      let { sessionId } = input;

      const rawChoice = sanitize(input.choice);
      const rawOther = sanitize(input.otherText);

      if (!rawChoice) {
        throw new Error('No methodology provided. Ask the user to pick or delegate a methodology explicitly.');
      }

      const delegation = DELEGATION_PHRASES.some(phrase => rawChoice.toLowerCase().includes(phrase));
      if (delegation) {
        throw new Error('Methodology was delegated without a final choice. Decide on a methodology with the user and call select_methodology again with the chosen approach.');
      }

      let resolvedChoice: string | null = null;
      let customText: string | undefined;

      const numberResolved = NUMBER_TO_ID[rawChoice.toLowerCase()];
      if (numberResolved) {
        resolvedChoice = numberResolved;
      } else {
        const lowered = rawChoice.toLowerCase();
        const nameResolved = NAME_TO_ID.get(lowered);
        if (nameResolved) {
          resolvedChoice = nameResolved;
        } else if ((rawChoice as MethodologyId) === 'other' || lowered === 'other') {
          resolvedChoice = 'other';
          customText = rawOther || rawChoice;
        } else if ((rawChoice as MethodologyId) === 'none' || lowered === 'none') {
          throw new Error('Methodology selection is required. Choose an approach or provide a short note about the style you prefer.');
        } else {
          resolvedChoice = 'other';
          customText = rawOther || rawChoice;
        }
      }

      if (resolvedChoice === 'other') {
        if (!customText) {
          throw new Error('Custom methodology provided without details. Please include a short description so we can brief the team.');
        }
      }

      const session: OnboardingSession | null = sessionId
        ? await deps.sessionStore.load(repoRoot, sessionId)
        : await deps.sessionStore.loadActive(repoRoot);

      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }

      const coreMissing = CORE_FIELDS.filter(fieldName => {
        const value = (session as any)[fieldName];
        return typeof value !== 'string' || value.trim().length === 0;
      });

      if (coreMissing.length > 0) {
        const labels = coreMissing.map(name => FIELD_LABELS[name] ?? name).join(', ');
        throw new Error(`Core discovery incomplete. Collect: ${labels} before selecting a methodology.`);
      }

      if (session.state !== 'collecting-goal') {
        throw new Error(`Methodology cannot be selected while state is '${session.state}'. Resume onboarding with /forge-start.`);
      }

      const deliveryMissing = collectMissingDelivery(session);
      if (deliveryMissing.length > 0) {
        await appendLog(repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'select_methodology_pending_delivery',
          status: 'ok',
          payload: { sessionId: session.sessionId, missing: deliveryMissing }
        });
      }

      const storedChoice = resolvedChoice === 'other' ? customText!.trim() : resolvedChoice;

      session.methodology = storedChoice;
      session.state = 'roster';
      await deps.sessionStore.save(repoRoot, session);

      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'select_methodology',
        status: 'ok',
        payload: { sessionId: session.sessionId, methodology: storedChoice }
      });

      return { methodology: storedChoice };
    }
  };
}
