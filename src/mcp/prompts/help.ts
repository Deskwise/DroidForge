import type { PromptScript } from './types.js';

export function createHelpScript(): PromptScript {
  return {
    name: 'help',
    segments: [
      {
        kind: 'summary',
        title: 'DroidForge Cheatsheet',
        lines: [
          '`/forge-start` — onboard or show quick dashboard.',
          '`/forge-resume` — continue an unfinished forge.',
          '`/df <goal>` — talk to the orchestrator (primary command).',
          '`/forge-add-droid` — craft a custom specialist.',
          'Read the handbook: docs/DroidForge_user_guide_en.md',
          '`/forge-logs` — see recent activity.',
          '`/forge-removeall` — remove DroidForge artifacts.',
          '`/forge-restore` — restore a snapshot.'
        ]
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Need something else? Just describe it with `/df` and I’ll route it.'
      }
    ]
  };
}
