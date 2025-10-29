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
      
      // Accept numbers or methodology names
      let mappedChoice = numberMap[choice] || choice.toLowerCase().trim();

      // Delegation: allow the user to say "you decide" (and common variants)
      const delegationPhrases = ['you decide', 'you choose', 'decide for me', 'pick for me', 'up to you', 'you-decide'];
      const isDelegated = delegationPhrases.some(p => choice.toLowerCase().includes(p));

      let finalChoice = mappedChoice;
      if (isDelegated) {
        // Resolve based on prior onboarding answers if available
        let session: OnboardingSession | null = null;
        if (sessionId) {
          session = await deps.sessionStore.load(repoRoot, sessionId);
        } else {
          session = await deps.sessionStore.loadActive(repoRoot);
        }
        if (!session) {
          // Fallback default
          finalChoice = 'agile';
        } else {
          const pref = (session.qualityVsSpeed || '').toLowerCase();
          if (pref === 'speed') finalChoice = 'rapid';
          else if (pref === 'quality') finalChoice = 'tdd';
          else finalChoice = 'agile';
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
      // Normalize to final choice
      choice = finalChoice as typeof choice;
      
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
      // Gate: ensure all 10 onboarding items are present before allowing methodology selection
      const have = (k: keyof OnboardingSession) => typeof (session as any)[k] === 'string' && (session as any)[k].trim().length > 0;
      const projectVisionOk = have('projectVision') || have('description');
      const required: (keyof OnboardingSession)[] = [
        'targetAudience',
        'timelineConstraints',
        'qualityVsSpeed',
        'teamSize',
        'experienceLevel',
        'budgetConstraints',
        'deploymentRequirements',
        'securityRequirements',
        'scalabilityNeeds'
      ];
      const missing: string[] = [];
      if (!projectVisionOk) missing.push('projectVision');
      for (const k of required) {
        if (!have(k)) missing.push(String(k));
      }
      if (missing.length) {
        throw new Error(`Onboarding incomplete. Please provide: ${missing.join(', ')}. After answering, run /forge-start again to continue.`);
      }
      // Enforce state progression
      if (session.state !== 'collecting-goal') {
        throw new Error(`Methodology cannot be selected while state is '${session.state}'. Resume onboarding with /forge-start.`);
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
