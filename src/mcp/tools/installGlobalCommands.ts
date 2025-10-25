import path from 'node:path';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { ensureDir, writeFileAtomic } from '../fs.js';
import { appendLog } from '../logging.js';
import { buildDefaultCommands } from '../templates/commands.js';
import type { ToolDefinition } from '../types.js';

interface InstallGlobalCommandsInput {
  repoRoot: string;
}

interface InstallGlobalCommandsOutput {
  installed: string[];
  location: string;
  alreadyExisted: boolean;
}

export function createInstallGlobalCommandsTool(): ToolDefinition<InstallGlobalCommandsInput, InstallGlobalCommandsOutput> {
  return {
    name: 'install_global_commands',
    description: 'Install DroidForge commands globally to ~/.factory/commands/ for universal access.',
    handler: async input => {
      try {
        const globalCommandsDir = path.join(homedir(), '.factory', 'commands');
        const globalForgeStartPath = path.join(globalCommandsDir, 'forge-start.md');
        
        // Check if commands already exist
        let alreadyExisted = false;
        try {
          await fs.access(globalForgeStartPath);
          alreadyExisted = true;
        } catch {
          // Commands don't exist, proceed with installation
        }
        
        await ensureDir(globalCommandsDir);
        const commands = await buildDefaultCommands(input.repoRoot);
        const installed: string[] = [];
        
        for (const command of commands) {
          const filename = command.slug.replace(/^\/+/, '');
          const ext = command.type === 'markdown' ? '.md' : '';
          const fullPath = path.join(globalCommandsDir, `${filename}${ext}`);
          await writeFileAtomic(fullPath, command.body, 'utf8');
          
          if (command.type === 'executable') {
            const mode = command.permissions ?? 0o755;
            await fs.chmod(fullPath, mode);
          }
          
          installed.push(command.slug);
        }
        
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'install_global_commands',
          status: 'ok',
          payload: { 
            count: installed.length, 
            location: globalCommandsDir,
            alreadyExisted,
            commands: installed
          }
        });
        
        return { 
          installed, 
          location: globalCommandsDir,
          alreadyExisted
        };
      } catch (error) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'install_global_commands',
          status: 'error',
          payload: { message: (error as Error).message }
        });
        throw error;
      }
    }
  };
}
