#!/usr/bin/env node
/**
 * Cross-platform post-install script to automatically install DroidForge commands globally
 * This runs after 'npm install -g droidforge' to make commands immediately available
 * 
 * Supports: Windows, macOS, Linux
 */

import path from 'path';
import { promises as fs } from 'fs';
import { homedir, platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the correct Factory commands directory for the current platform
 */
function getFactoryCommandsDir() {
  const home = homedir();
  const platformName = platform();
  
  switch (platformName) {
    case 'win32':
      // Windows: Try multiple possible locations
      // 1. %USERPROFILE%\.factory\commands (preferred)
      // 2. %APPDATA%\.factory\commands (alternative)
      const windowsPath = path.join(home, '.factory', 'commands');
      return windowsPath;
      
    case 'darwin':
      // macOS: Standard location
      // ~/.factory/commands is the standard for Factory CLI
      return path.join(home, '.factory', 'commands');
      
    default:
      // Linux and other Unix-like systems
      // ~/.factory/commands
      return path.join(home, '.factory', 'commands');
  }
}

/**
 * Cross-platform file permissions handling
 */
async function setExecutablePermissions(filePath) {
  const platformName = platform();
  
  if (platformName !== 'win32') {
    // Unix-like systems (macOS, Linux) support chmod
    try {
      await fs.chmod(filePath, 0o755);
    } catch (error) {
      // Non-fatal - file permissions not critical for markdown files
      console.warn(`⚠️  Could not set permissions for ${filePath}:`, error.message);
    }
  }
  // Windows doesn't need explicit executable permissions for these files
}

async function installGlobalCommands() {
  try {
    const platformName = platform();
    console.log('🔧 DroidForge: Installing global commands...');
    console.log(`📂 Platform: ${platformName} (${process.arch})`);
    
    // Validate platform support
    const supportedPlatforms = ['win32', 'darwin', 'linux', 'freebsd', 'openbsd'];
    if (!supportedPlatforms.includes(platformName)) {
      console.warn(`⚠️  Platform ${platformName} not explicitly supported, attempting installation anyway`);
    }
    
    // Import the command templates with better error handling
    const templatesPath = path.resolve(__dirname, '../dist/mcp/templates/commands.js');
    
    try {
      await fs.access(templatesPath);
    } catch {
      throw new Error(`Templates not found at ${templatesPath}. Build may be incomplete.`);
    }
    
    const { buildDefaultCommands } = await import(templatesPath);
    
    // Get platform-appropriate commands directory
    const globalCommandsDir = getFactoryCommandsDir();
    const forgeStartPath = path.join(globalCommandsDir, 'forge-start.md');
    
    console.log(`📁 Installing to: ${globalCommandsDir}`);
    
    // Check if commands already exist
    try {
      await fs.access(forgeStartPath);
      console.log('✅ DroidForge: Global commands already exist, skipping installation');
      return;
    } catch {
      // Commands don't exist, proceed with installation
    }
    
    // Create directory with proper error handling
    try {
      await fs.mkdir(globalCommandsDir, { recursive: true });
      console.log(`📁 Created directory: ${globalCommandsDir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error; // Re-throw non-existence errors
      }
    }
    
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
        await setExecutablePermissions(fullPath);
      }
      
      installedCount++;
    }
    
    console.log(`✅ DroidForge: Installed ${installedCount} global commands to ~/.factory/commands/`);
    console.log('🎉 Ready! You can now use /forge-start in any directory');
    
  } catch (error) {
    const platformName = platform();
    console.warn('⚠️  DroidForge: Could not install global commands:', error.message);
    console.warn(`   Platform: ${platformName}`);
    console.warn('   Commands will be auto-installed on first use instead');
    console.warn('   This does not affect DroidForge functionality');
    // Don't fail the npm install if this fails - graceful degradation
  }
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  installGlobalCommands();
}

export { installGlobalCommands };
