import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition, RecordOnboardingDataInput, RecordOnboardingDataOutput, OnboardingSession } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

const sanitize = (s?: string) => (s ?? '')
  .replace(/\x1b\[\?2004[hl]/g, '')
  .replace(/\x1b\[200~|\x1b\[201~/g, '')
  .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
  .replace(/\r/g, '')
  .trim();

const CANONICAL_FIELDS: Array<keyof RecordOnboardingDataInput> = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel',
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds',
  'inferred'
];

export function createRecordOnboardingDataTool(deps: Deps): ToolDefinition<RecordOnboardingDataInput, RecordOnboardingDataOutput> {
  return {
    name: 'record_onboarding_data',
    description: 'Persist additional onboarding data points (target audience, timeline, etc.) into the active session.',
    handler: async input => {
      const { repoRoot, sessionId } = input;

      // Load session
      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }
      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }

      // Permit updates in any active state; block only after completion or abort
      if (session.state === 'complete' || session.state === 'aborted') {
        throw new Error(`Cannot record onboarding data - onboarding is already ${session.state}.`);
      }

      const payloadKeys = Object.keys(input).filter(key => key !== 'repoRoot' && key !== 'sessionId');
      const unknownKeys = payloadKeys.filter(key => !CANONICAL_FIELDS.includes(key as keyof RecordOnboardingDataInput));
      if (unknownKeys.length > 0) {
        throw new Error(
          `record_onboarding_data accepts only the canonical onboarding fields (${CANONICAL_FIELDS.join(', ')}). ` +
          `Remove unknown field(s): ${unknownKeys.join(', ')}.`
        );
      }

      if (!session.onboarding.projectVision && payloadKeys.some(key => key !== 'projectVision')) {
        throw new Error('Capture projectVision first before recording other onboarding data.');
      }

      const saved: (keyof RecordOnboardingDataInput)[] = [];
      const assign = (key: keyof RecordOnboardingDataInput) => {
        const v = input[key];
        if (typeof v === 'string') {
          const cleaned = sanitize(v);
          if (cleaned) {
            (session.onboarding as any)[key] = cleaned;
            saved.push(key);
          }
        } else if (v && typeof v === 'object' && key === 'inferred') {
          session.onboarding.inferredData = { ...(session.onboarding.inferredData || {}), ...(v as Record<string, string>) };
          saved.push(key);
        }
      };

      assign('projectVision');
      assign('targetAudience');
      assign('timelineConstraints');
      assign('qualityVsSpeed');
      assign('teamSize');
      assign('experienceLevel');
      assign('budgetConstraints');
      assign('deploymentRequirements');
      assign('securityRequirements');
      assign('scalabilityNeeds');
      assign('inferred');

      if (saved.length === 0) {
        throw new Error('No onboarding data provided. Please answer the question before I record it.');
      }

      await deps.sessionStore.save(repoRoot, session);
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'record_onboarding_data',
        status: 'ok',
        payload: { sessionId: session.sessionId, saved }
      });
      return { saved };
    }
  };
}
