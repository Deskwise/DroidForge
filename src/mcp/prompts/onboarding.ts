import type { PromptScript } from './types.js';
import { recommendMethodologies } from './methodologyRecommendations.js';

const ALL_METHODOLOGIES = [
  { value: 'agile', title: '1. Agile / Scrum', description: 'Ships in short sprints so you can adapt as plans change.' },
  { value: 'tdd', title: '2. Test-Driven Development (TDD)', description: 'Catches bugs early by writing the safety net of tests first.' },
  { value: 'bdd', title: '3. Behavior-Driven Development (BDD)', description: 'Keeps product and engineering aligned with shared behavior examples.' },
  { value: 'waterfall', title: '4. Waterfall', description: 'Locks scope and budget early with a tightly sequenced plan.' },
  { value: 'kanban', title: '5. Kanban / Continuous Flow', description: 'Maintains steady progress with visual queues and WIP limits.' },
  { value: 'lean', title: '6. Lean Startup', description: 'Validates ideas fast with small builds and quick feedback loops.' },
  { value: 'ddd', title: '7. Domain-Driven Design (DDD)', description: 'Untangles complex business rules with a shared domain language.' },
  { value: 'devops', title: '8. DevOps / Platform Engineering', description: 'Automates deploys and keeps environments healthy.' },
  { value: 'rapid', title: '9. Rapid Prototyping', description: 'Spins up throwaway experiments to explore ideas quickly.' },
  { value: 'enterprise', title: '10. Enterprise / Governance', description: 'Meets compliance, review, and audit requirements for large teams.' }
];

export function createOnboardingScript(sessionId: string, repoRoot: string): PromptScript {
  return {
    name: 'onboarding',
    sessionId,
    repoRoot,
    segments: [
      // PHASE 1: Welcome & Context (30 seconds)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Hi! I'm your DroidForge architect. I help you build custom AI specialist droid teams. Let me quickly scan your repository to understand what we're working with...`
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { repoRoot: { literal: repoRoot } }
      },
      // PHASE 2: Project Discovery (1-2 minutes)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Got it. What are you building?

Please describe your project goals and vision. What kind of application or system do you want to create? This will help me recommend the right development methodology and specialist droid team for your needs.

Examples:
  "iOS artillery game with physics"
  "Landing page for a dentist office"`
      },
      {
        kind: 'input',
        id: 'project-goal',
        label: 'Project Description',
        placeholder: 'Example: Landing page for a dentist office with appointment booking'
      },
      {
        kind: 'tool',
        name: 'record_project_goal',
        input: { repoRoot: { literal: repoRoot }, description: { fromInput: 'project-goal' } }
      },
      {
        kind: 'tool',
        name: 'recommend_methodology',
        input: { repoRoot: { literal: repoRoot } }
      },
      
      // PHASE 3: Methodology Consultation (1 minute) - User picks from all 10
      {
        kind: 'choice',
        id: 'methodology-choice',
        label: 'Choose your development approach:',
        options: ALL_METHODOLOGIES
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: { repoRoot: { literal: repoRoot }, choice: { fromChoice: 'methodology-choice' } }
      },
      
      // PHASE 4: Team Assembly (1 minute) - Call them "specialist droids"
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Building your specialist droid team

    Based on your project and chosen methodology, here's a recommended team of specialist droids. Each one focuses on a specific area to help you move faster:`
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'input',
        id: 'custom-droids',
        label: 'Optional: Add Custom Specialist Droids',
        helper: 'Example: SEO Specialist - optimizes for local dental practice search results'
      },
      
      // PHASE 5: Team Creation (30 seconds)
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Building your team now. I'll create the specialist droids so they understand your project context and will follow the methodology you chose.`
      },
      {
        kind: 'tool',
        name: 'forge_roster',
        input: { repoRoot: { literal: repoRoot }, customInput: { fromInput: 'custom-droids' } }
      },
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'tool',
        name: 'install_commands',
        input: { repoRoot: { literal: repoRoot }, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Done. Your specialist droid team is ready and standing by. Each specialist knows your project context and the chosen methodology.`
      },
      {
        kind: 'summary',
        title: 'Get Started with Your Specialist Droids',
        lines: [
          'Try: /forge-task Create a hero section for the homepage - get routing advice',
          'Read the team handbook: docs/DroidForge_user_guide_en.md',
          'Invoke specialists directly: /df-frontend, /df-backend, /df-auth, etc.',
          'All done? Use /forge-removeall to clean up when finished'
        ]
      }
    ]
  };
}
