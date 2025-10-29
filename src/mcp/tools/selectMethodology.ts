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
      let { repoRoot, sessionId } = input;
      // Sanitize inputs for bracketed paste and ANSI sequences
      const sanitize = (s?: string) => (s ?? '')
        .replace(/\x1b\[\?2004[hl]/g, '')
        .replace(/\x1b\[200~|\x1b\[201~/g, '')
        .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\r/g, '')
        .trim();
      let choice = sanitize(input.choice);
      let otherText = sanitize(input.otherText);
      
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
      
      // Accept numbers, methodology names, or intelligent understanding of user intent
      const mappedChoice = numberMap[choice] || choice.toLowerCase().trim();
      
      // Handle common typos and industry variations intelligently
      let finalChoice = mappedChoice;
      if (!ALLOWED.has(mappedChoice)) {
        const lower = choice.toLowerCase().trim();
        
        // Intelligent understanding of common variations/typos
        if (lower.includes('tset') && lower.includes('driven') || lower.includes('test driven')) {
          finalChoice = 'tdd';
        } else if (lower.includes('spec') || lower.includes('specification')) {
          finalChoice = 'bdd';
        } else if (lower.includes('rapid') || lower.includes('prototype')) {
          finalChoice = 'rapid';
        } else if (lower.includes('agile') || lower.includes('sprint') || lower.includes('scrum')) {
          finalChoice = 'agile';
        } else if (lower.includes('lean') || lower.includes('mvp') || lower.includes('startup')) {
          finalChoice = 'lean';
        } else if (lower.includes('waterfall') || lower.includes('sequential')) {
          finalChoice = 'waterfall';
        } else if (lower.includes('kanban') || lower.includes('flow')) {
          finalChoice = 'kanban';
        } else if (lower.includes('domain') || lower.includes('business') || lower.includes('ddd')) {
          finalChoice = 'ddd';
        } else if (lower.includes('devops') || lower.includes('infrastructure')) {
          finalChoice = 'devops';
        } else if (lower.includes('enterprise') || lower.includes('corporate')) {
          finalChoice = 'enterprise';
        }
      }
      
      if (!finalChoice || !ALLOWED.has(finalChoice)) {
        // If we can't understand, ask for clarification instead of rigid rejection
        if (choice.length > 3) {
          // For longer inputs, try to understand what they mean
          throw new Error(`I'm not sure I understand "${choice}". Could you clarify what development approach you'd like, or pick from: agile, tdd, bdd, waterfall, kanban, lean, ddd, devops, rapid, enterprise? You can also use numbers 1-10.`);
        } else {
          throw new Error(`Please enter a number 1-10, or clarify your approach (e.g., "test-first", "specs-first", "rapid prototyping").`);
        }
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
