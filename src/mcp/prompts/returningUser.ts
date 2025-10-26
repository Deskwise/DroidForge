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
          '1. `/df <goal>` — talk to your orchestrator (default).',
          '2. `/forge-add-droid` — expand the roster.',
          '3. `/forge-logs` — review recent actions.',
          '4. Read handbook: docs/DroidForge_user_guide_en.md',
          '5. `/forge-removeall` — clean out DroidForge data.'
        ]
      }
    ]
  };
}
