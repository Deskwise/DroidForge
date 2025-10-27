import { randomUUID } from 'node:crypto';
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
      // Generate a sessionId if not provided
      const finalSessionId = sessionId || randomUUID();
      if (!ALLOWED.has(choice)) {
        throw new Error(`Unsupported methodology choice: ${choice}`);
      }
      const session = await deps.sessionStore.load(repoRoot, finalSessionId);
      if (!session) {
        throw new Error(`No active onboarding session for ${finalSessionId}`);
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
        payload: { sessionId: finalSessionId, methodology: resolved }
      });
      return { methodology: resolved };
    }
  };
}
