import { appendLog } from '../logging.js';
import { buildSuggestions } from '../suggestions.js';
import type { SessionStore } from '../sessionStore.js';
import type {
  RecommendDroidsInput,
  RecommendDroidsOutput,
  ToolDefinition
} from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createRecommendDroidsTool(deps: Deps): ToolDefinition<RecommendDroidsInput, RecommendDroidsOutput> {
  return {
    name: 'recommend_droids',
    description: 'Propose an initial roster based on scan + methodology.',
    handler: async input => {
      if (!input.sessionId) {
        throw new Error('recommend_droids requires a sessionId');
      }
      const session = await deps.sessionStore.load(input.repoRoot, input.sessionId);
      if (!session) {
        throw new Error(`No active onboarding session for ${input.sessionId}`);
      }
      const suggestions = buildSuggestions(session);
      session.state = 'roster';
      await deps.sessionStore.save(input.repoRoot, session);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'recommend_droids',
        status: 'ok',
        payload: { sessionId: input.sessionId, count: suggestions.length }
      });
      return {
        suggestions,
        mandatory: {
          id: 'df-orchestrator',
          summary: 'Routes tasks, tracks progress, and remains the primary user contact.'
        }
      };
    }
  };
}
