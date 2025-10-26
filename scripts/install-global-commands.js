#!/usr/bin/env node
/**
 * Post-install script to automatically install DroidForge commands globally
 * This runs after 'npm install -g droidforge' to make commands immediately available
 */

import path from 'path';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function installGlobalCommands() {
  try {
    console.log('🔧 DroidForge: Installing global commands...');
    
    // Import the command templates
    const { buildDefaultCommands } = await import(path.join(__dirname, '../dist/mcp/templates/commands.js'));
    
    // Global commands directory
    const globalCommandsDir = path.join(homedir(), '.factory', 'commands');
    const forgeStartPath = path.join(globalCommandsDir, 'forge-start.md');
    
    // Check if commands already exist
    try {
      await fs.access(forgeStartPath);
      console.log('✅ DroidForge: Global commands already exist, skipping installation');
      return;
    } catch {
      // Commands don't exist, proceed with installation
    }
    
    // Create directory
    await fs.mkdir(globalCommandsDir, { recursive: true });
    
    // Generate commands (use current working directory as dummy repoRoot)
    const commands = await buildDefaultCommands(process.cwd());
    
    // Install each command
    let installedCount = 0;
    for (const command of commands) {
      const filename = command.slug.replace(/^\/+/, '');
      const ext = command.type === 'markdown' ? '.md' : '';
      const fullPath = path.join(globalCommandsDir, `${filename}${ext}`);
      
      await fs.writeFile(fullPath, command.body, 'utf8');
      
      if (command.type === 'executable') {
        const mode = command.permissions ?? 0o755;
        await fs.chmod(fullPath, mode);
      }
      
      installedCount++;
    }
    
    console.log(`✅ DroidForge: Installed ${installedCount} global commands to ~/.factory/commands/`);
    console.log('🎉 Ready! You can now use /forge-start in any directory');
    
  } catch (error) {
    console.warn('⚠️  DroidForge: Could not install global commands:', error.message);
    console.warn('   Commands will be auto-installed on first use instead');
    // Don't fail the npm install if this fails
  }
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  installGlobalCommands();
}

export { installGlobalCommands };
