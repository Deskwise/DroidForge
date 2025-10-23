import path from 'node:path';
import { promises as fs } from 'node:fs';
import { removeIfExists } from '../fs.js';
import { appendLog } from '../logging.js';
import type { CleanupRepoInput, CleanupRepoOutput, ToolDefinition } from '../types.js';

const TARGETS = [
  '.droidforge',
  'docs/DroidForge_user_guide_en.md',
  'docs/DROIDS.md',
  '.factory/commands/forge-start.md',
  '.factory/commands/forge-resume.md',
  '.factory/commands/forge-guide.md',
  '.factory/commands/forge-add-droid.md',
  '.factory/commands/forge-removeall.md',
  '.factory/commands/forge-restore.md',
  '.factory/commands/forge-logs.md',
  '.factory/commands/forge-help.md',
  '.factory/commands/df'
];

function toBoolean(value: string | boolean | undefined, truthyValues: string[]): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return truthyValues.includes(value.toLowerCase());
  }
  return false;
}

export function createCleanupRepoTool(): ToolDefinition<CleanupRepoInput, CleanupRepoOutput> {
  return {
    name: 'cleanup_repo',
    description: 'Remove all DroidForge data from the repository, optionally keeping the guide.',
    handler: async input => {
      const confirmed = toBoolean(input.confirm, ['yes', 'y', '1', 'true']);
      if (!confirmed) {
        return { removed: [] };
      }

      const keepGuide = toBoolean(input.keepGuide, ['keep', 'yes', 'y', 'true']);

      const removed: string[] = [];
      for (const rel of TARGETS) {
        if (keepGuide && rel === 'docs/DroidForge_user_guide_en.md') {
          continue;
        }
        const abs = path.join(input.repoRoot, rel);
        const wasRemoved = await removeIfExists(abs);
        if (wasRemoved) {
          removed.push(rel);
        }
      }

      // If commands directory becomes empty, clean it up
      const commandsDir = path.join(input.repoRoot, '.factory', 'commands');
      try {
        const remaining = await fs.readdir(commandsDir);
        if (remaining.length === 0) {
          await fs.rmdir(commandsDir);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'cleanup_repo',
        status: 'ok',
        payload: { removed }
      });

      return { removed };
    }
  };
}
