import type { PromptScript } from './types.js';

export function createRestoreSnapshotScript(repoRoot: string): PromptScript {
  return {
    name: 'restore_snapshot',
    repoRoot,
    segments: [
      {
        kind: 'tool',
        name: 'list_snapshots',
        input: { repoRoot }
      },
      {
        kind: 'choice',
        id: 'snapshot-choice',
        label: 'Pick a snapshot to restore',
        options: []
      },
      {
        kind: 'tool',
        name: 'restore_snapshot',
        input: { repoRoot, fromChoice: 'snapshot-choice' }
      },
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { repoRoot }
      },
      {
        kind: 'tool',
        name: 'install_commands',
        input: { repoRoot }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Snapshot restored. Guide and commands are in sync—use `/df` to pick up where you left off.'
      }
    ]
  };
}
