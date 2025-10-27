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
      // Try to load by sessionId first (if provided), otherwise load the active session
      let session = null;
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
