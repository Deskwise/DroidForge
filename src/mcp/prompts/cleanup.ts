import type { PromptScript } from './types.js';

export function createCleanupScript(repoRoot: string): PromptScript {
  return {
    name: 'cleanup',
    repoRoot,
    segments: [
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'WARNING: This will remove all DroidForge data from your repository.'
      },
      {
        kind: 'tool',
        name: 'cleanup_repo',
        input: { repoRoot: { literal: repoRoot } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Preview above shows what will be removed.\n\nTo proceed with deletion, type exactly: remove all droids\n\n(Or press Ctrl+C to cancel)'
      },
      {
        kind: 'input',
        id: 'confirmation-string',
        label: 'Type confirmation to proceed',
        placeholder: 'remove all droids',
        helper: 'Type exactly "remove all droids" to confirm deletion'
      },
      {
        kind: 'tool',
        name: 'cleanup_repo',
        input: {
          repoRoot: { literal: repoRoot },
          confirmationString: { fromInput: 'confirmation-string' }
        }
      }
    ]
  };
}
