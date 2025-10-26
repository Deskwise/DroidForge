import type { PromptScript } from './types.js';

export function createLogsScript(repoRoot: string, limit = 10): PromptScript {
  return {
    name: 'logs',
    repoRoot,
    segments: [
      {
        kind: 'tool',
        name: 'fetch_logs',
        input: { repoRoot: { literal: repoRoot }, limit: { literal: limit } }
      },
      {
        kind: 'say',
        speaker: 'assistant',
        text: 'Those are the latest entries. Use `/forge-help` if you need a quick command refresher.'
      }
    ]
  };
}
