import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition } from '../types.js';

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
      if (!sessionId) {
        throw new Error('select_methodology requires a sessionId from smart_scan');
      }
      if (!ALLOWED.has(choice)) {
        throw new Error(`Unsupported methodology choice: ${choice}`);
      }
      const session = await deps.sessionStore.load(repoRoot, sessionId);
      if (!session) {
        throw new Error(`No active onboarding session for ${sessionId}`);
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
        payload: { sessionId, methodology: resolved }
      });
      return { methodology: resolved };
    }
  };
}
