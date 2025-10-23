import type { PromptScript } from './types.js';

const NUMBERED_METHODS = [
  { value: 'agile', title: '1. Agile / Scrum', description: 'short sprints, fast feedback' },
  { value: 'waterfall', title: '2. Waterfall', description: 'structured phases, detailed planning' },
  { value: 'kanban', title: '3. Kanban', description: 'continuous flow, visual progress' },
  { value: 'tdd', title: '4. Test-Driven (TDD)', description: 'write tests first, then code' },
  { value: 'sdd', title: '5. Spec-Driven (SDD)', description: 'spec as source of truth' },
  { value: 'startup', title: '6. Startup / Rapid Build', description: 'speed over polish' },
  { value: 'enterprise', title: '7. Enterprise / Compliance', description: 'stability, documentation' },
  { value: 'other', title: '8. Other', description: 'describe your own style' },
  { value: 'none', title: '9. None / Not sure yet', description: 'stay neutral for now' }
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
        text: '🤖 Smart-scanning your folder…'
      },
      {
        kind: 'tool',
        name: 'smart_scan',
        input: { sessionId, repoRoot }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: '✅ Scan complete! Based on what I saw, I have a good feel for your repo. Now let me learn what you want from your droids.'
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
        input: { sessionId, repoRoot, description: { fromInput: 'project-goal' } }
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
        options: NUMBERED_METHODS
      },
      {
        kind: 'tool',
        name: 'select_methodology',
        input: { sessionId, repoRoot, choice: { fromChoice: 'methodology-choice' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Here’s the starting roster I recommend. Toggle anything you do not need, rename if you prefer, and add custom specialists if you like.'
      },
      {
        kind: 'tool',
        name: 'recommend_droids',
        input: { sessionId, repoRoot }
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
        input: { sessionId, repoRoot, customInput: { fromInput: 'custom-droids' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Forging your droids now…'
      },
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { sessionId, repoRoot, rosterFrom: 'forge_roster' }
      },
      {
        kind: 'tool',
        name: 'install_commands',
        input: { sessionId, repoRoot, rosterFrom: 'forge_roster' }
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
