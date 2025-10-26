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
 * Get the Factory config directory
 */
function getFactoryDir() {
  return path.join(homedir(), '.factory');
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
      console.warn(`WARNING: Could not set permissions for ${filePath}:`, error.message);
    }
  }
  // Windows doesn't need explicit executable permissions for these files
}

/**
 * Prompt user for yes/no input with timeout for non-interactive environments
 */
async function promptUser(question, timeoutMs = 10000) {
  // Check for skip flag
  if (process.env.DROIDFORGE_SKIP_MCP_PROMPT === 'true') {
    return false; // Skip registration
  }

  // If not in a TTY, don't prompt
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null; // Non-interactive, return null
  }

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    let answered = false;
    
    // Set timeout for automated installs
    const timeout = setTimeout(() => {
      if (!answered) {
        answered = true;
        rl.close();
        console.log('\nNo response received, skipping MCP registration');
        resolve(false);
      }
    }, timeoutMs);

    rl.question(question, (answer) => {
      if (!answered) {
        answered = true;
        clearTimeout(timeout);
        rl.close();
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

/**
 * Register DroidForge MCP server in ~/.factory/mcp.json
 */
async function registerMCPServer() {
  try {
    const factoryDir = getFactoryDir();
    const mcpJsonPath = path.join(factoryDir, 'mcp.json');
    
    // Ensure .factory directory exists
    await fs.mkdir(factoryDir, { recursive: true });
    
    // Read existing mcp.json or create new structure
    let mcpConfig;
    try {
      const content = await fs.readFile(mcpJsonPath, 'utf8');
      mcpConfig = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid, create new structure
      mcpConfig = { mcpServers: {} };
    }
    
    // Check if DroidForge is already registered
    if (mcpConfig.mcpServers && mcpConfig.mcpServers.droidforge) {
      console.log('DroidForge: MCP server already registered');
      return;
    }
    
    // Ask user for permission
    const userResponse = await promptUser('\nAdd DroidForge MCP server to ~/.factory/mcp.json? (y/n): ');
    
    if (userResponse === null) {
      // Non-interactive mode - skip registration
      console.log('Non-interactive install detected - skipping MCP registration');
      console.log('Run this to register later: DROIDFORGE_SKIP_MCP_PROMPT=false node <path-to-scripts>/install-global-commands.js');
      return;
    } else if (!userResponse) {
      // User said no or timeout
      console.log('Skipping MCP server registration');
      console.log('   You can manually add it to ~/.factory/mcp.json later');
      return;
    }
    
    // Find the droidforge-mcp-server command path
    const { execSync } = await import('child_process');
    let serverCommand;
    
    try {
      // Try to find the globally installed binary
      serverCommand = execSync('which droidforge-mcp-server', { encoding: 'utf8' }).trim();
    } catch {
      // Fallback: construct path based on npm global root
      try {
        const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
        serverCommand = path.join(npmRoot, 'droidforge', 'dist', 'mcp', 'stdio-server.js');
      } catch {
        console.warn('WARNING: Could not locate droidforge-mcp-server binary');
        return;
      }
    }
    
    // Add DroidForge MCP server configuration
    if (!mcpConfig.mcpServers) {
      mcpConfig.mcpServers = {};
    }
    
    mcpConfig.mcpServers.droidforge = {
      command: 'node',
      args: [serverCommand],
      env: {}
    };
    
    // Write updated configuration
    await fs.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    console.log('DroidForge: MCP server registered in ~/.factory/mcp.json');
    
  } catch (error) {
    console.warn('WARNING: Could not register MCP server:', error.message);
    console.warn('   You can manually add it to ~/.factory/mcp.json later');
  }
}

async function installGlobalCommands() {
  try {
    const platformName = platform();
    console.log('DroidForge: Installing global commands...');
    console.log(`Platform: ${platformName} (${process.arch})`);
    
    // Validate platform support
    const supportedPlatforms = ['win32', 'darwin', 'linux', 'freebsd', 'openbsd'];
    if (!supportedPlatforms.includes(platformName)) {
      console.warn(`WARNING: Platform ${platformName} not explicitly supported, attempting installation anyway`);
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
    
    console.log(`Installing to: ${globalCommandsDir}`);
    
    // Check if commands already exist
    let commandsAlreadyExist = false;
    try {
      await fs.access(forgeStartPath);
      console.log('DroidForge: Global commands already exist, skipping installation');
      commandsAlreadyExist = true;
    } catch {
      // Commands don't exist, proceed with installation
    }
    
    // Install commands if they don't exist
    if (!commandsAlreadyExist) {
      // Create directory with proper error handling
      try {
        await fs.mkdir(globalCommandsDir, { recursive: true });
        console.log(`Created directory: ${globalCommandsDir}`);
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
      
      console.log(`DroidForge: Installed ${installedCount} global commands to ~/.factory/commands/`);
      console.log('Ready! You can now use /forge-start in any directory');
    }
    
    // Register MCP server in mcp.json
    await registerMCPServer();
    
  } catch (error) {
    const platformName = platform();
    console.warn('WARNING: DroidForge: Could not install global commands:', error.message);
    console.warn(`   Platform: ${platformName}`);
    console.warn('   Commands will be auto-installed on first use instead');
    console.warn('   This does not affect DroidForge functionality');
    // Don't fail the npm install if this fails - graceful degradation
  }
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for --mcp-only flag
  if (process.argv.includes('--mcp-only')) {
    registerMCPServer();
  } else {
    installGlobalCommands();
  }
}

export { installGlobalCommands, registerMCPServer };
