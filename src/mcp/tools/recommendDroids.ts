import { appendLog } from '../logging.js';
import { buildSuggestions } from '../suggestions.js';
import type { SessionStore } from '../sessionStore.js';
import type {
  RecommendDroidsInput,
  RecommendDroidsOutput,
  ToolDefinition,
  OnboardingSession,
  DroidSuggestion
} from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createRecommendDroidsTool(deps: Deps): ToolDefinition<RecommendDroidsInput, RecommendDroidsOutput> {
  return {
    name: 'recommend_droids',
    description: 'Propose an initial roster based on scan + methodology.',
    handler: async input => {
      // Try to load by sessionId first (if provided), otherwise load the active session
      let session: OnboardingSession | null = null;
      if (input.sessionId) {
        session = await deps.sessionStore.load(input.repoRoot, input.sessionId);
      } else {
        session = await deps.sessionStore.loadActive(input.repoRoot);
      }

      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }
      const suggestions = buildSuggestions(session);
      session.state = 'roster';
      await deps.sessionStore.saveSnapshot(session);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'recommend_droids',
        status: 'ok',
        payload: { sessionId: input.sessionId, count: suggestions.length }
      });

      const introText = buildIntroductions(session, suggestions);
      const coverageRecap = buildCoverageRecap(session, suggestions);
      return {
        suggestions,
        mandatory: {
          id: 'df-orchestrator',
          summary: 'Routes tasks, tracks progress, and remains the primary user contact.'
        },
        introText,
        coverageRecap
      };
    }
  };
}

function buildIntroductions(session: OnboardingSession, suggestions: DroidSuggestion[]): string {
  const vision = session.onboarding.projectVision ?? session.description ?? 'your project';
  const audience = session.onboarding.targetAudience ? ` for ${session.onboarding.targetAudience}` : '';
  const methodology = session.methodology ? ` I\'ll run ${session.methodology} so every playbook stays aligned.` : '';
  const timeline = session.onboarding.timelineConstraints ? ` Timeline focus: ${session.onboarding.timelineConstraints}.` : '';
  const quality = session.onboarding.qualityVsSpeed ? ` You told me "${session.onboarding.qualityVsSpeed}", so I\'ll keep that front of mind.` : '';

  const lines = suggestions.map(suggestion => {
    const label = suggestion.label ?? suggestion.id;
    const slug = suggestion.id.startsWith('df-') ? `/${suggestion.id}` : `/${suggestion.id}`;
    const summary = suggestion.summary.endsWith('.') ? suggestion.summary : `${suggestion.summary}.`;
    return `${label}: I\'m here for ${vision}${audience}. ${summary} Ping me with ${slug}.${methodology}${timeline}${quality}`.trim();
  });

  return `Here\'s your specialist roster:` + lines.map(line => `\n• ${line}`).join('');
}

function buildCoverageRecap(session: OnboardingSession, suggestions: DroidSuggestion[]): string {
  const experience = session.onboarding.experienceLevel ? `You mentioned you\'re ${session.onboarding.experienceLevel}. ` : '';
  const team = session.onboarding.teamSize ? `Team context: ${session.onboarding.teamSize}. ` : '';
  const budget = session.onboarding.budgetConstraints ? `Budget lens: ${session.onboarding.budgetConstraints}. ` : '';
  const deployment = session.onboarding.deploymentRequirements ? `Deployment plan: ${session.onboarding.deploymentRequirements}. ` : '';
  const security = session.onboarding.securityRequirements ? `Security guardrails: ${session.onboarding.securityRequirements}. ` : '';
  const scalability = session.onboarding.scalabilityNeeds ? `Scale target: ${session.onboarding.scalabilityNeeds}. ` : '';
  const coverage = suggestions.map(suggestion => suggestion.label ?? suggestion.id).join(', ');

  const recap = `${experience}${team}${budget}${deployment}${security}${scalability}`.trim();
  const contextPrefix = recap.length > 0 ? `${recap} ` : '';
  return `${contextPrefix}This roster covers ${coverage} so every angle is handled.`.trim();
}

