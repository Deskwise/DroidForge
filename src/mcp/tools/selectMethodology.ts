import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition, OnboardingSession } from '../types.js';

const ALLOWED = new Set([
  'agile',
  'tdd',
  'bdd',
  'waterfall',
  'kanban',
  'lean',
  'ddd',
  'devops',
  'rapid',
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
      let { repoRoot, sessionId, choice, otherText } = input;
      
      // Map numbers to methodology names (user picks 1-10 to save typing)
      const numberMap: Record<string, string> = {
        '1': 'agile',
        '2': 'tdd',
        '3': 'bdd',
        '4': 'waterfall',
        '5': 'kanban',
        '6': 'lean',
        '7': 'ddd',
        '8': 'devops',
        '9': 'rapid',
        '10': 'enterprise'
      };
      
      // Accept numbers OR natural methodology names - NO AUTO-PATTERN MATCHING
      const mappedChoice = numberMap[choice] || choice.toLowerCase().trim();
      
      if (!mappedChoice || !ALLOWED.has(mappedChoice)) {
        throw new Error(`Please enter a number between 1-10, or a methodology name like "agile", "tdd", "rapid", etc. Examples: "2" or "agile"`);
      }
      
      choice = mappedChoice as typeof choice;
      
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
