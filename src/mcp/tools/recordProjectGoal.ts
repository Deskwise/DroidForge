import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { RecordProjectGoalInput, RecordProjectGoalOutput, ToolDefinition, OnboardingSession } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

export function createRecordProjectGoalTool(deps: Deps): ToolDefinition<RecordProjectGoalInput, RecordProjectGoalOutput> {
  return {
    name: 'record_project_goal',
    description: 'Persist the user\'s goal description gathered during onboarding.',
    handler: async input => {
      const { repoRoot, sessionId } = input;
      // Sanitize description for common terminal paste artifacts (bracketed paste, ANSI)
      const raw = (input.description ?? '').toString();
      const sanitized = raw
        // Strip bracketed paste enable/disable and paste markers
        .replace(/\x1b\[\?2004[hl]/g, '')
        .replace(/\x1b\[200~|\x1b\[201~/g, '')
        // Strip generic ANSI CSI sequences
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        // Normalize newlines and trim stray carriage returns
        .replace(/\r/g, '')
        .trim();
      
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
      session.description = sanitized;
      session.state = 'methodology';
      await deps.sessionStore.save(repoRoot, session);
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'record_project_goal',
        status: 'ok',
        payload: { sessionId: session.sessionId }
      });
      return { ack: true } as const;
    }
  };
}
