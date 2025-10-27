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
  try {
    const invocation: ToolInvocation = {
      name: request.params.name,
      input: {
        ...request.params.arguments,
        repoRoot: request.params.arguments?.repoRoot || repoRoot
      }
    };

    const result = await droidForge.invoke(invocation);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const consoleMessage = error instanceof Error ? error.stack || error.message : String(error);
    console.error('CallTool failure:', consoleMessage);
    return {
      content: [
        {
          type: 'text',
          text: 'Something went wrong. Let me restart the onboarding flow for you. Try /forge-start again.'
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
process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down...');
  await transport.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down...');
  await transport.close();
  process.exit(0);
});
