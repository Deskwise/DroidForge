import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition, OnboardingSession } from '../types.js';

const ALLOWED = new Set([
  'agile',
  'waterfall',
  'kanban',
  'tdd',
  'sdd',
  'startup',
  'enterprise',
  'none',
  'other'
]);

interface Deps {
  sessionStore: SessionStore;
}

export function createSelectMethodologyTool(deps: Deps): ToolDefinition<SelectMethodologyInput, SelectMethodologyOutput> {
  return {
    name: 'select_methodology',
    description: 'Record the methodology selection from onboarding.',
    handler: async input => {
      const { repoRoot, sessionId, choice, otherText } = input;
      
      if (!ALLOWED.has(choice)) {
        throw new Error(`Unsupported methodology choice: ${choice}`);
      }
      
      // Try to load by sessionId first (if provided), otherwise load the active session
      let session: OnboardingSession | null = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }
      
      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }
      const resolved = choice === 'other'
        ? (otherText?.trim() || 'custom')
        : choice;
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
