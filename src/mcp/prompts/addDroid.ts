import type { PromptScript } from './types.js';

export function createAddDroidScript(sessionId: string, repoRoot: string): PromptScript {
  return {
    name: 'add_droid',
    sessionId,
    repoRoot,
    segments: [
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Describe the new droid you have in mind. I’ll infer a `df-` name, goal, and abilities.'
      },
      {
        kind: 'input',
        id: 'custom-droid-description',
        label: 'Name + responsibilities',
        placeholder: 'Example: Windows Whisperer — automates Windows 11 build & installer flow.'
      },
      {
        kind: 'tool',
        name: 'add_custom_droid',
        input: { sessionId, repoRoot, description: { fromInput: 'custom-droid-description' } }
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
        text: 'Done! The new specialist is forged and the handbook updated. Talk to them via `/df` whenever you need.'
      }
    ]
  };
}
