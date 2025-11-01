#!/usr/bin/env node
/**
 * stdio transport for DroidForge MCP Server
 * Provides automatic spawning by Droid CLI for local-only workflows
 * 
 * For cloud/remote workspaces, use http-server.ts instead
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server.js';
import { withToolTiming, flushLogs } from './logging.js';
import type { ToolInvocation } from './types.js';

// Get repoRoot from environment or use cwd
const repoRoot = process.env.DROIDFORGE_REPO_ROOT || process.cwd();

// Create core DroidForge server
const droidForge = createServer({ repoRoot });

// Create MCP SDK server wrapper
const server = new Server(
  {
    name: 'droidforge',
    version: '0.5.0'
  },
  {
    capabilities: {
      tools: {},
      prompts: {}
    }
  }
);

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolNames = droidForge.listTools();
  const tools = toolNames.map(name => {
    const tool = droidForge.getTool(name);
    return {
      name,
      description: tool?.description || `DroidForge tool: ${name}`,
      inputSchema: {
        type: 'object',
        properties: {
          repoRoot: {
            type: 'string',
            description: 'Path to repository root'
          }
        }
      }
    };
  });

  return { tools };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  // Log the tool call for debugging
  console.error(`[TOOL CALL] ${toolName}`, JSON.stringify(args, null, 2));

  try {
    const invocation: ToolInvocation = {
      name: toolName,
      input: {
        ...args,
        repoRoot: args?.repoRoot || repoRoot
      }
    };

    const result = await withToolTiming(repoRoot, `tool:${toolName}`, {
      tool: toolName
    }, async () => droidForge.invoke(invocation));

    // Log successful result
    console.error(`[TOOL SUCCESS] ${toolName}`, JSON.stringify(result, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log detailed error for debugging
    console.error(`[TOOL ERROR] ${toolName}:`, errorMessage);
    if (errorStack) {
      console.error(errorStack);
    }

    // Show REAL error to AI so it can fix the problem
    return {
      content: [
        {
          type: 'text',
          text: `Tool call failed: ${errorMessage}\n\nPlease check the parameters and try again. If this is a session-related error, make sure you're passing the sessionId from the SMART_SCAN result.`
        }
      ],
      isError: true
    };
  }
});

// Register prompt listing handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  const promptNames = droidForge.listPrompts();
  const prompts = promptNames.map(name => ({
    name,
    description: `DroidForge prompt: ${name}`,
    arguments: [
      {
        name: 'repoRoot',
        description: 'Path to repository root',
        required: false
      }
    ]
  }));

  return { prompts };
});

// Register prompt execution handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  try {
    const promptName = request.params.name;
    
    // Note: Full prompt execution would involve creating and running a prompt runner
    // This is a simplified implementation for stdio transport
    // For interactive prompts, use HTTP transport instead

    return {
      description: `Executing prompt: ${promptName}`,
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Prompt ${promptName} initialized. This is a stdio transport - full interactive prompts are best used via HTTP transport.`
          }
        }
      ]
    };
  } catch (error) {
    return {
      description: 'Error executing prompt',
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }
      ]
    };
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Connect stdio transport
const transport = new StdioServerTransport();

server.connect(transport).then(() => {
  console.error('DroidForge MCP Server (stdio) started');
  console.error(`Repository root: ${repoRoot}`);
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
let shuttingDown = false;

async function shutdown(reason: 'SIGTERM' | 'SIGINT' | 'beforeExit'): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (reason !== 'beforeExit') {
    console.error(`Received ${reason}, shutting down...`);
  }

  try {
    await transport.close();
  } catch (error) {
    console.error('Failed to close transport:', error);
  }

  await flushLogs(repoRoot).catch(error => console.error('Failed to flush logs:', error));

  if (reason !== 'beforeExit') {
    process.exit(0);
  }
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('beforeExit', () => {
  void shutdown('beforeExit');
});
