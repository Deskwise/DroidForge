import type { PromptScript } from './types.js';

export function createShowGuideScript(repoRoot: string): PromptScript {
  return {
    name: 'show_guide',
    repoRoot,
    segments: [
      {
        kind: 'tool',
        name: 'generate_user_guide',
        input: { repoRoot }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Guide refreshed. Scroll above to read it again. Type `/df` whenever you want to give a new goal.'
      }
    ]
  };
}
