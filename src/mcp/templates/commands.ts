import type { InstallCommandPayload } from '../types.js';

/**
 * Build default command definitions for a repository.
 * These are fallback commands installed when none are explicitly provided.
 */
export async function buildDefaultCommands(repoRoot: string): Promise<InstallCommandPayload[]> {
  return [
    {
      slug: '/df',
      type: 'markdown',
      body: `# DroidForge Commands

Welcome to your DroidForge-enabled repository!

Repository: ${repoRoot}

## Available Commands

- \`/df\` - Show this DroidForge information
- Use the MCP server tools to interact with your droids

For more information, visit: https://github.com/Deskwise/DroidForge
`
    }
  ];
}
