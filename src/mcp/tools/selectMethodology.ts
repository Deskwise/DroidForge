import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition, OnboardingSession } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

const ALLOWED = new Set([
  'agile',
  'tdd',
  'bdd',
  'waterfall',
  'kanban',
  'lean',
  'ddd',
  'devops',
  'rapid',
  'enterprise',
  'none',
  'other'
]);

const CORE_FIELDS = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel'
] as const;

const DELIVERY_FIELDS = [
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
] as const;

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
      const { repoRoot, sessionId } = input;
      const sanitize = (s?: string) => (s ?? '')
        .replace(/\x1b\[\?2004[hl]/g, '')
        .replace(/\x1b\[200~|\x1b\[201~/g, '')
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\r/g, '')
        .trim();
      let choice = sanitize(input.choice);
      let otherText = sanitize(input.otherText);

      if (!choice) {
        throw new Error('Please confirm the methodology before I record it.');
      }

      const numberMap: Record<string, string> = {
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

      let mappedChoice = numberMap[choice] || choice.toLowerCase();

      const delegationPhrases = ['you decide', 'you choose', 'decide for me', 'pick for me', 'up to you', 'your call'];
      const isDelegated = delegationPhrases.some(phrase => mappedChoice.includes(phrase));
      if (isDelegated) {
        throw new Error('I can only record the methodology once you pick it. Confirm the recommendation in conversation, then call select_methodology with that final choice.');
      }

      if (!mappedChoice || !ALLOWED.has(mappedChoice)) {
        const original = choice;
        mappedChoice = 'other';
        if (!otherText) {
          otherText = original;
        }
      }

      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }

      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }

      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'select_methodology_session_loaded',
        status: 'ok',
        payload: {
          sessionId: session.sessionId,
          methodologyConfirmed: session.methodologyConfirmed ?? false,
          methodology: session.methodology ?? null,
          state: session.state,
          choice: mappedChoice,
          otherText: otherText || null
        }
      });

      const coreMissing = CORE_FIELDS.filter(fieldName => {
        const value = (session as any)[fieldName];
        return typeof value !== 'string' || value.trim().length === 0;
      });
      if (coreMissing.length > 0) {
        throw new Error(`Core discovery incomplete. Please collect: ${coreMissing.map(name => FIELD_LABELS[name] ?? name).join(', ')} before selecting a methodology.`);
      }

      if (session.state !== 'collecting-goal') {
        throw new Error(`Methodology cannot be selected while state is '${session.state}'. Resume onboarding with /forge-start.`);
      }

      if (!session.methodologyConfirmed) {
        await appendLog(repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'select_methodology_missing_confirmation',
          status: 'error',
          payload: {
            sessionId: session.sessionId,
            methodologyConfirmed: session.methodologyConfirmed ?? false,
            methodology: session.methodology ?? null,
            state: session.state,
            choice: mappedChoice,
            otherText: otherText || null
          }
        });
        throw new Error(
          'Please confirm the methodology before I record it. ' +
          'Use the confirm_methodology tool first after asking the user: "Would you like to proceed with [methodology]?" ' +
          'and wait for explicit confirmation (yes/proceed/confirmed/etc.).'
        );
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

      const resolved = mappedChoice === 'other'
        ? (otherText?.trim() || 'custom')
        : mappedChoice;
      session.methodology = resolved;
      session.state = 'roster';
      await deps.sessionStore.save(repoRoot, session);
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'select_methodology',
        status: 'ok',
        payload: { sessionId: session.sessionId, methodology: resolved }
      });
      return { methodology: resolved };
    }
  };
}

