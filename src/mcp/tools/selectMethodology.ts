import { appendLog } from '../logging.js';
import type { SessionStore } from '../sessionStore.js';
import type { SelectMethodologyInput, SelectMethodologyOutput, ToolDefinition, OnboardingSession } from '../types.js';

interface Deps {
  sessionStore: SessionStore;
}

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

const CORE_FIELDS: Array<keyof OnboardingSession> = [
  'projectVision',
  'targetAudience',
  'timelineConstraints',
  'qualityVsSpeed',
  'teamSize',
  'experienceLevel'
];

const DELIVERY_FIELDS: Array<keyof OnboardingSession> = [
  'budgetConstraints',
  'deploymentRequirements',
  'securityRequirements',
  'scalabilityNeeds'
];

const FIELD_LABELS: Record<string, string> = {
  projectVision: 'project vision',
  targetAudience: 'target audience',
  timelineConstraints: 'timeline',
  qualityVsSpeed: 'quality vs speed preference',
  teamSize: 'team size',
  experienceLevel: 'experience level',
  budgetConstraints: 'budget constraints',
  deploymentRequirements: 'deployment requirements',
  securityRequirements: 'security requirements',
  scalabilityNeeds: 'scalability needs'
};

/**
 * Enhanced pattern matching for methodology selection based on user context
 * This is sophisticated pattern matching, NOT AI intelligence
 */
function recommendMethodology(session: OnboardingSession): string {
  const text = (field: keyof OnboardingSession) => {
    const value = session[field];
    return typeof value === 'string' ? value.toLowerCase() : '';
  };
  const vision = text('projectVision');
  const timeline = text('timelineConstraints');
  const qualitySpeed = text('qualityVsSpeed');
  const teamSize = text('teamSize');
  const experience = text('experienceLevel');
  const budget = text('budgetConstraints');
  const security = text('securityRequirements');
  const deployment = text('deploymentRequirements');

  // Senior developer with complex domain
  if (experience.includes('senior') || experience.includes('experienced') || experience.includes('years')) {
    if (vision.includes('domain') || vision.includes('complex') || vision.includes('system')) {
      return 'ddd'; // Domain-Driven Design for complex domains
    }
    if (vision.includes('api') || vision.includes('platform') || vision.includes('infrastructure')) {
      return 'devops'; // DevOps for infrastructure-heavy projects
    }
    return 'agile'; // Default for experienced developers
  }

  // Quality-focused projects
  if (qualitySpeed.includes('quality') || qualitySpeed.includes('robust') || qualitySpeed.includes('solid')) {
    if (vision.includes('financial') || vision.includes('payment') || vision.includes('banking')) {
      return 'tdd'; // TDD for financial/sensitive data
    }
    if (vision.includes('healthcare') || vision.includes('medical') || security.includes('hipaa')) {
      return 'bdd'; // BDD for regulated industries
    }
    return 'tdd'; // Default to TDD for quality focus
  }

  // Speed-focused projects
  if (qualitySpeed.includes('speed') || qualitySpeed.includes('fast') || qualitySpeed.includes('quick')) {
    if (timeline.includes('week') || timeline.includes('month') || timeline.includes('asap')) {
      return 'rapid'; // Rapid for urgent timelines
    }
    return 'lean'; // Lean for speed but with learning focus
  }

  // Timeline-driven decisions
  if (timeline.includes('demo') || timeline.includes('pitch') || timeline.includes('investor')) {
    return 'rapid'; // Rapid prototyping for demos
  }
  if (timeline.includes('series') || timeline.includes('funding') || timeline.includes('deadline')) {
    return 'lean'; // Lean for funding-related timelines
  }

  // Team size considerations
  if (teamSize.includes('solo') || teamSize.includes('just me') || teamSize.includes('alone')) {
    if (qualitySpeed.includes('learn') || experience.includes('learning') || experience.includes('beginner')) {
      return 'agile'; // Agile for solo learning
    }
    return 'rapid'; // Rapid for solo speed
  }

  if (teamSize.includes('team') || teamSize.includes('developers') || teamSize.includes('multiple')) {
    return 'agile'; // Agile for team coordination
  }

  // Budget constraints
  if (budget.includes('bootstrap') || budget.includes('minimal') || budget.includes('free')) {
    return 'lean'; // Lean for cost-conscious projects
  }

  // Security/compliance requirements
  if (security.includes('hipaa') || security.includes('pci') || security.includes('compliance')) {
    return 'bdd'; // BDD for compliance requirements
  }

  // Enterprise contexts
  if (vision.includes('enterprise') || vision.includes('corporate') || vision.includes('internal')) {
    if (teamSize.includes('large') || teamSize.includes('many')) {
      return 'waterfall'; // Waterfall for large enterprise teams
    }
    return 'enterprise'; // Enterprise methodology
  }

  // Default fallbacks
  if (vision.includes('startup') || vision.includes('mvp') || vision.includes('validate')) {
    return 'lean'; // Lean for startups
  }

  return 'agile'; // Safe default
}

function collectMissingDelivery(session: OnboardingSession): string[] {
  const have = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const missing: string[] = [];
  for (const field of DELIVERY_FIELDS) {
    const value = (session as any)[field];
    if (!have(value)) {
      missing.push(FIELD_LABELS[field] ?? field);
    }
  }
  return missing;
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
        // Load session to analyze context
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
          // Use enhanced pattern matching instead of simple quality/speed check
          finalChoice = recommendMethodology(session);
        }
      }

      // If not delegated and not recognized, accept as custom instead of hard-failing
      if (!finalChoice || !ALLOWED.has(finalChoice)) {
        // Treat unknown methodology as 'other' and preserve user's text for research/briefing
        const original = choice; // what user/AI sent
        finalChoice = 'other';
        otherText = otherText && otherText.trim().length > 0 ? otherText : original;
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

      const coreMissing = CORE_FIELDS.filter(fieldName => {
        const value = (session as any)[fieldName];
        return typeof value !== 'string' || value.trim().length === 0;
      });
      if (coreMissing.length > 0) {
        throw new Error(`Core discovery incomplete. Please collect: ${coreMissing.map(name => FIELD_LABELS[name] ?? name).join(', ')} before selecting a methodology.`);
      }

      if (session.state !== 'collecting-goal') {
        throw new Error(`Methodology cannot be selected while state is '${session.state}'. Resume onboarding with /forge-start.`);
      }

      const deliveryMissing = collectMissingDelivery(session);
      if (deliveryMissing.length > 0) {
        await appendLog(repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'select_methodology_pending_delivery',
          status: 'ok',
          payload: { sessionId: session.sessionId, missing: deliveryMissing }
        });
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
