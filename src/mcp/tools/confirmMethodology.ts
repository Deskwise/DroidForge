import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition } from '../types.js';

interface ConfirmMethodologyInput {
  repoRoot: string;
  sessionId: string;
  methodology: string;
}

interface ConfirmMethodologyOutput {
  confirmed: boolean;
  methodology: string;
}

interface ConfirmMethodologyDeps {
  sessionStore: SessionStore;
}

export function createConfirmMethodologyTool(
  deps: ConfirmMethodologyDeps
): ToolDefinition<ConfirmMethodologyInput, ConfirmMethodologyOutput> {
  return {
    name: 'confirm_methodology',
    description: 'Mark that the user has explicitly confirmed their methodology choice. Call this BEFORE select_methodology.',
    handler: async input => {
      const { repoRoot, sessionId, methodology } = input;
      
      const sanitize = (s?: string) => (s ?? '')
        .replace(/\x1b\[\?2004[hl]/g, '')
        .replace(/\x1b\[200~|\x1b\[201~/g, '')
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\r/g, '')
        .trim();
      
      const cleanMethodology = sanitize(methodology);
      
      if (!cleanMethodology) {
        throw new Error('Methodology confirmation requires a methodology value.');
      }
      
      let session = null;
      if (sessionId) {
        session = await deps.sessionStore.load(repoRoot, sessionId);
      } else {
        session = await deps.sessionStore.loadActive(repoRoot);
      }

      if (!session) {
        throw new Error('No active onboarding session found. Please run /forge-start first.');
      }

      if (session.state !== 'collecting-goal') {
        throw new Error(`Methodology cannot be confirmed while state is '${session.state}'. Resume onboarding with /forge-start.`);
      }

      // Mark methodology as confirmed
      session.methodologyConfirmed = true;
      await deps.sessionStore.save(repoRoot, session);
      
      await appendLog(repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'confirm_methodology',
        status: 'ok',
        payload: { 
          sessionId: session.sessionId, 
          methodology: cleanMethodology 
        }
      });
      
      return {
        confirmed: true,
        methodology: cleanMethodology
      };
    }
  };
}
