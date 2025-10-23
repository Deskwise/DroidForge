/**
 * HTTP wrapper for DroidForge MCP Server
 * Exposes MCP tools via HTTP/HTTPS for Factory.ai Streamable HTTP transport
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from './server.js';
import type { ToolInvocation } from './types.js';

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DROIDFORGE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Authentication middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!API_KEY) {
    // No API key configured - allow all requests (development mode)
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.substring(7);
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'droidforge-mcp-server',
    version: '0.5.0',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint
app.post('/mcp', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tool, input, repoRoot } = req.body;

    // Validate request
    if (!tool || typeof tool !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "tool" parameter'
      });
    }

    if (!input || typeof input !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid "input" parameter'
      });
    }

    // Default repoRoot if not provided
    const effectiveRepoRoot = repoRoot || input.repoRoot || process.cwd();

    // Create MCP server instance
    const mcpServer = createServer({ repoRoot: effectiveRepoRoot });

    // Invoke the tool
    const invocation: ToolInvocation = {
      name: tool,
      input: { ...input, repoRoot: effectiveRepoRoot }
    };

    const result = await mcpServer.invoke(invocation);

    // Return result
    res.json({
      success: true,
      tool,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('MCP tool invocation error:', error);
    
    res.status(500).json({
      error: 'Tool invocation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// List available tools
app.get('/mcp/tools', authMiddleware, (req: Request, res: Response) => {
  try {
    const mcpServer = createServer({ repoRoot: process.cwd() });
    
    // Get tool list from server
    const tools = mcpServer.listTools ? mcpServer.listTools() : [
      'smart_scan',
      'record_project_goal',
      'select_methodology',
      'recommend_droids',
      'forge_roster',
      'generate_user_guide',
      'install_commands',
      'cleanup_repo',
      'create_snapshot',
      'restore_snapshot',
      'fetch_logs',
      'get_status'
    ];

    res.json({
      success: true,
      tools,
      count: tools.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({
      error: 'Failed to list tools',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 DroidForge HTTP MCP Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`🛠️  Tools list: http://localhost:${PORT}/mcp/tools`);
  
  if (API_KEY) {
    console.log('🔒 Authentication: ENABLED');
  } else {
    console.log('⚠️  Authentication: DISABLED (set DROIDFORGE_API_KEY env var)');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export { app, server };
