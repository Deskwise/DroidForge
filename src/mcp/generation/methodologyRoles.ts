export const METHODOLOGY_ROLES: Record<string, { name: string; purpose: string }> = {
  agile: {
    name: 'Sprint Coordinator',
    purpose: 'Keeps delivery moving in short sprints and adapts to shifting priorities.'
  },
  tdd: {
    name: 'Test-First Lead',
    purpose: 'Prevents regressions by requiring tests before code lands.'
  },
  bdd: {
    name: 'Story Facilitator',
    purpose: 'Aligns stakeholders and engineers with shared behavior stories.'
  },
  waterfall: {
    name: 'Requirements Architect',
    purpose: 'Locks the plan upfront for teams that need strict stage gates.'
  },
  kanban: {
    name: 'Flow Manager',
    purpose: 'Maintains steady throughput by limiting work in progress.'
  },
  lean: {
    name: 'Experiment Designer',
    purpose: 'Finds product-market fit with quick experiments and small releases.'
  },
  ddd: {
    name: 'Domain Architect',
    purpose: 'Clarifies complex domains with shared language and boundaries.'
  },
  devops: {
    name: 'Pipeline Engineer',
    purpose: 'Automates pipelines so releases stay fast and reliable.'
  },
  rapid: {
    name: 'Iteration Specialist',
    purpose: 'Prototypes ideas fast to learn before investing heavily.'
  },
  enterprise: {
    name: 'Compliance Officer',
    purpose: 'Satisfies compliance, reviews, and governance requirements.'
  }
};
