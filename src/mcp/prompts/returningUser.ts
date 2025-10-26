import type { PromptScript } from './types.js';

export function createReturningUserScript(repoRoot: string): PromptScript {
  return {
    name: 'returning_user',
    repoRoot,
    segments: [
      { kind: 'tool', name: 'get_status', input: { repoRoot: { literal: repoRoot } } },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'DroidForge ready. Your team is warmed up and waiting.'
      },
      {
        kind: 'summary',
        title: 'Quick Commands',
        lines: [
          '1. `/forge-task <task>` — Get routing advice for your task',
          '2. Invoke specialists: `/df-frontend`, `/df-backend`, `/df-auth`, etc.',
          '3. Read handbook: docs/DroidForge_user_guide_en.md',
          '4. `/forge-removeall` — Remove all DroidForge data'
        ]
      }
    ]
  };
}
