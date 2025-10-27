import { randomUUID } from 'node:crypto';
import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { RecordProjectGoalInput, RecordProjectGoalOutput, ToolDefinition } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createRecordProjectGoalTool(deps: Deps): ToolDefinition<RecordProjectGoalInput, RecordProjectGoalOutput> {
  return {
    name: 'record_project_goal',
    description: 'Persist the user\'s goal description gathered during onboarding.',
    handler: async input => {
      const { repoRoot, sessionId, description } = input;
      // Generate a sessionId if not provided
      const finalSessionId = sessionId || randomUUID();
      const session = await deps.sessionStore.load(repoRoot, finalSessionId);
      if (!session) {
        throw new Error(`No active onboarding session for ${finalSessionId}`);
      }
      session.description = description?.trim() || '';
      session.state = 'methodology';
      await deps.sessionStore.save(repoRoot, session);
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'record_project_goal',
        status: 'ok',
        payload: { sessionId: finalSessionId }
      });
      return { ack: true } as const;
    }
  };
}
