/**
 * Single source of truth for methodology definitions
 * Used across onboarding, commands, and role generation
 */

export interface MethodologyDefinition {
  id: string;
  name: string;
  description: string;
  roleName: string;
  rolePurpose: string;
}

/**
 * All 10 development methodologies supported by DroidForge
 * - name: User-facing methodology name (e.g., "Agile / Scrum")
 * - description: What this methodology does for the user
 * - roleName: Orchestrator job title when this methodology is selected (e.g., "Sprint Coordinator")
 * - rolePurpose: What the orchestrator does in this methodology
 */
export const METHODOLOGIES: MethodologyDefinition[] = [
  {
    id: 'agile',
    name: 'Agile / Scrum',
    description: 'Ships in short sprints so you can adapt as plans change.',
    roleName: 'Sprint Coordinator',
    rolePurpose: 'Keeps delivery moving in short sprints and adapts to shifting priorities.'
  },
  {
    id: 'tdd',
    name: 'Test-Driven Development (TDD)',
    description: 'Catches bugs early by writing the safety net of tests first.',
    roleName: 'Test-First Lead',
    rolePurpose: 'Prevents regressions by requiring tests before code lands.'
  },
  {
    id: 'bdd',
    name: 'Behavior-Driven Development (BDD)',
    description: 'Keeps product and engineering aligned with shared behavior examples.',
    roleName: 'Story Facilitator',
    rolePurpose: 'Aligns stakeholders and engineers with shared behavior stories.'
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    description: 'Locks scope and budget early with a tightly sequenced plan.',
    roleName: 'Requirements Architect',
    rolePurpose: 'Locks the plan upfront for teams that need strict stage gates.'
  },
  {
    id: 'kanban',
    name: 'Kanban / Continuous Flow',
    description: 'Maintains steady progress with visual queues and WIP limits.',
    roleName: 'Flow Manager',
    rolePurpose: 'Maintains steady throughput by limiting work in progress.'
  },
  {
    id: 'lean',
    name: 'Lean Startup',
    description: 'Validates ideas fast with small builds and quick feedback loops.',
    roleName: 'Experiment Designer',
    rolePurpose: 'Finds product-market fit with quick experiments and small releases.'
  },
  {
    id: 'ddd',
    name: 'Domain-Driven Design (DDD)',
    description: 'Untangles complex business rules with a shared domain language.',
    roleName: 'Domain Architect',
    rolePurpose: 'Clarifies complex domains with shared language and boundaries.'
  },
  {
    id: 'devops',
    name: 'DevOps / Platform Engineering',
    description: 'Automates deploys and keeps environments healthy.',
    roleName: 'Pipeline Engineer',
    rolePurpose: 'Automates pipelines so releases stay fast and reliable.'
  },
  {
    id: 'rapid',
    name: 'Rapid Prototyping',
    description: 'Spins up throwaway experiments to explore ideas quickly.',
    roleName: 'Iteration Specialist',
    rolePurpose: 'Prototypes ideas fast to learn before investing heavily.'
  },
  {
    id: 'enterprise',
    name: 'Enterprise / Governance',
    description: 'Meets compliance, review, and audit requirements for large teams.',
    roleName: 'Compliance Officer',
    rolePurpose: 'Satisfies compliance, reviews, and governance requirements.'
  }
];

/**
 * Legacy format for backward compatibility
 * Maps methodology IDs to role names
 */
export const METHODOLOGY_ROLES: Record<string, { name: string; purpose: string }> = 
  METHODOLOGIES.reduce((acc, m) => {
    acc[m.id] = { name: m.roleName, purpose: m.rolePurpose };
    return acc;
  }, {} as Record<string, { name: string; purpose: string }>);

/**
 * Get methodology by ID
 */
export function getMethodology(id: string): MethodologyDefinition | undefined {
  return METHODOLOGIES.find(m => m.id === id);
}

/**
 * Get methodology choices for onboarding
 */
export function getMethodologyChoices() {
  return METHODOLOGIES.map((m, i) => ({
    value: m.id,
    title: `${i + 1}. ${m.name}`,
    description: m.description
  }));
}

/**
 * Format methodology list for display in commands
 */
export function formatMethodologyList(): string {
  return METHODOLOGIES
    .map((m, i) => `   ${i + 1}. ${m.name} - ${m.description}`)
    .join('\n');
}
