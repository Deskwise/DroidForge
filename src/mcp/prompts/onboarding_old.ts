import type { PromptScript } from './types.js';

const ALL_METHODOLOGIES = [
  { value: 'agile', title: '1. Agile / Scrum', description: 'Short sprints, daily standups, iterative delivery - great for evolving requirements' },
  { value: 'tdd', title: '2. Test-Driven Development (TDD)', description: 'Write tests first, then code to make them pass - ensures quality and prevents bugs' },
  { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', description: 'Write human-readable specs, then build to match - perfect for user-facing features' },
  { value: 'waterfall', title: '4. Waterfall', description: 'Plan everything upfront, build in sequential phases - good for fixed requirements' },
  { value: 'kanban', title: '5. Kanban / Continuous Flow', description: 'Visual workflow, pull-based work, continuous delivery - great for maintenance' },
  { value: 'lean', title: '6. Lean Startup', description: 'Build-Measure-Learn, MVP focus, rapid experimentation - perfect for new products' },
  { value: 'ddd', title: '7. Domain-Driven Design (DDD)', description: 'Model the business domain, ubiquitous language - ideal for complex business logic' },
  { value: 'devops', title: '8. DevOps / Platform Engineering', description: 'Infrastructure as code, CI/CD, monitoring - for production-ready systems' },
  { value: 'rapid', title: '9. Rapid Prototyping', description: 'Quick iterations, throwaway code, speed over polish - great for proofs of concept' },
  { value: 'enterprise', title: '10. Enterprise / Governance', description: 'Documentation, reviews, compliance, standards - for large teams and regulation' }
];

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments: [
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Smart-scanning your folder...'
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Scan complete! Based on what I saw, I have a good feel for your repo. Now let me learn what you want from your droids.'
      },
      {
        kind: 'input',
        id: 'project-goal',
        label: 'In one sentence, what project is this and how should your new droid team help?',
        placeholder: 'Example: React web app; need droids to refactor and write tests.'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, description: { fromInput: 'project-goal' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Great. Let’s tune how your droids like to work. Pick the approach that matches you best:'
      },
      {
        kind: 'choice',
        id: 'methodology-choice',
        label: 'Methodology options',
        options: ALL_METHODOLOGIES
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, choice: { fromChoice: 'methodology-choice' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Here’s the starting roster I recommend. Toggle anything you do not need, rename if you prefer, and add custom specialists if you like.'
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'input',
        id: 'custom-droids',
        label: 'Optional: describe any custom droids you want at launch',
        helper: 'Example: PrimeFinder — locates next prime number for crypto.'
      },
      {
        kind: 'tool',
        name: 'forge_roster',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, customInput: { fromInput: 'custom-droids' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Forging your droids now…'
      },
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'tool',
        name: 'install_commands',
        input: { sessionId: { literal: sessionId }, repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: '📘 Guide printed below. Press Enter when you are ready to continue.'
      },
      {
        kind: 'summary',
        title: 'Next Steps',
        lines: [
          'Type `/df <goal>` to talk to your orchestrator.',
          'Use `/forge-guide` to reopen the handbook anytime.',
          'Need cleanup? Run `/forge-removeall`.',
          'Ready for more? Try `/forge-add-droid` to expand the team.'
        ]
      }
    ]
  };
}
