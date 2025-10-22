import type { PromptScript } from './types.js';

export function createCleanupScript(repoRoot: string): PromptScript {
  return {
    name: 'cleanup',
    repoRoot,
    segments: [
      {
        kind: 'say',
        speaker: 'assistant',
        text: '⚠️  This will remove all DroidForge configuration from your repo. Nothing else will be touched.'
      },
      {
        kind: 'choice',
        id: 'cleanup-confirm',
        label: 'Are you sure?',
        options: [
          { value: 'yes', title: '1. Yes — remove everything.' },
          { value: 'no', title: '2. No — keep the team.' }
        ]
      },
      {
        kind: 'choice',
        id: 'cleanup-keep-guide',
        label: 'Keep the user guide?',
        options: [
          { value: 'keep', title: '1. Keep the guide for reference.' },
          { value: 'discard', title: '2. Remove the guide as well.' }
        ]
      },
      {
        kind: 'tool',
        name: 'cleanup_repo',
        input: { repoRoot, fromChoice: { confirm: 'cleanup-confirm', keepGuide: 'cleanup-keep-guide' } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: '✅ All DroidForge traces have been removed. Run `/forge-start` if you decide to forge again later.'
      }
    ]
  };
}
