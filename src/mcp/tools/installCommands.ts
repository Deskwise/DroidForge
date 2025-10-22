import path from 'node:path';
import { promises as fs } from 'node:fs';
import { ensureDir, writeFileAtomic } from '../fs.js';
import { appendLog } from '../logging.js';
import { buildDefaultCommands } from '../templates/commands.js';
import type { InstallCommandsInput, InstallCommandsOutput, ToolDefinition } from '../types.js';

const COMMAND_DIR = '.factory/commands';

export function createInstallCommandsTool(): ToolDefinition<InstallCommandsInput, InstallCommandsOutput> {
  return {
    name: 'install_commands',
    description: 'Write slash command definitions into .factory/commands/.',
    handler: async input => {
      try {
        const targetDir = path.join(input.repoRoot, COMMAND_DIR);
        await ensureDir(targetDir);
        const installed: string[] = [];
        const commands = input.commands ?? (await buildDefaultCommands(input.repoRoot));
        for (const command of commands) {
          const filename = command.slug.replace(/^\/+/, '');
          const ext = command.type === 'markdown' ? '.md' : '';
          const fullPath = path.join(targetDir, `${filename}${ext}`);
          await writeFileAtomic(fullPath, command.body, 'utf8');
          if (command.type === 'executable') {
            const mode = command.permissions ?? 0o755;
            await fs.chmod(fullPath, mode);
          }
          installed.push(command.slug);
        }
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'install_commands',
          status: 'ok',
          payload: { count: installed.length }
        });
        return { installed };
      } catch (error) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'install_commands',
          status: 'error',
          payload: { message: (error as Error).message }
        });
        throw error;
      }
    }
  };
}
