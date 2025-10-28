import type { PromptScript } from './types.js';
import { getMethodologyChoices } from '../generation/methodologyDefinitions.js';

const ALL_METHODOLOGIES = getMethodologyChoices();

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
      
      // PHASE 3: Methodology Consultation (1 minute) - Show All 10, Then Recommend
      {
        kind: 'say',
        speaker: 'assistant',
        text: `Development Methodology Selection

Here are all the development approaches I support. Each one shapes how your specialist droids will work together:`
      },
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
