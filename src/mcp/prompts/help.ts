import type { PromptScript } from './types.js';

export function createHelpScript(): PromptScript {
  return {
    name: 'help',
    segments: [
      {
        kind: 'summary',
        title: 'DroidForge Cheatsheet',
        lines: [
          '`/forge-start` — Set up DroidForge and create your specialist team',
          '`/forge-task <task>` — Get routing advice for which specialist to use',
          '`/forge-removeall` — Remove all DroidForge data from repository',
          'Read the handbook: docs/DroidForge_user_guide_en.md',
          'Invoke specialists: `/df-frontend`, `/df-backend`, `/df-auth`, etc.'
        ]
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Need routing advice? Use `/forge-task` to find the right specialist.'
      }
    ]
  };
}
