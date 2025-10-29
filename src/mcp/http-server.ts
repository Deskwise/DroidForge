/**
 * HTTP wrapper for DroidForge MCP Server
 * Exposes MCP tools via HTTP/HTTPS for Factory.ai Streamable HTTP transport
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from './server.js';
import { ensureRipgrep } from './utils/ensureRipgrep.js';
import type { ToolInvocation } from './types.js';
import { ExecutionManager } from './execution/manager.js';
import { ExecutionEventBus } from './execution/eventBus.js';
import { MetricsCollector } from './execution/metrics.js';
import { HealthChecker, type ExecutionSnapshot } from './execution/healthCheck.js';
import { appendLog } from './logging.js';

const app = express();
const PORT = process.env.PORT || 3897;
const API_KEY = process.env.DROIDFORGE_API_KEY;

// Initialize execution infrastructure
const executionManager = new ExecutionManager();
const metricsCollector = new MetricsCollector();
const healthChecker = new HealthChecker();

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
  const startTime = Date.now();
  const clientIp = (req.headers['x-real-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
  
  try {
    const { tool, input, repoRoot } = req.body;

    // Validate request
    if (!tool || typeof tool !== 'string') {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        ip: clientIp || 'unknown',
        action: 'tool_invocation',
        success: false,
        error: 'Missing or invalid tool parameter'
      });
      return res.status(400).json({
        error: 'Missing or invalid "tool" parameter'
      });
    }

    if (!input || typeof input !== 'object') {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        ip: clientIp || 'unknown',
        tool,
        action: 'tool_invocation',
        success: false,
        error: 'Missing or invalid input parameter'
      });
      return res.status(400).json({
        error: 'Missing or invalid "input" parameter'
      });
    }

    // Default repoRoot if not provided
    const effectiveRepoRoot = repoRoot || input.repoRoot || process.cwd();

    // Validate path to prevent directory traversal attacks
    const pathValidation = validateRepoRoot(effectiveRepoRoot);
    if (!pathValidation.valid) {
      logAuditEvent({
        timestamp: new Date().toISOString(),
        ip: clientIp || 'unknown',
        tool,
        path: effectiveRepoRoot,
        action: 'path_validation_failed',
        success: false,
        error: pathValidation.error
      });
      return res.status(403).json({
        error: 'Invalid repoRoot path',
        message: pathValidation.error
      });
    }

    // Ensure ripgrep (rg) is available or provide a local fallback shim
    try { ensureRipgrep(); } catch (_e) { void _e; }

    // Create MCP server instance
    const mcpServer = createServer({ repoRoot: effectiveRepoRoot });

    // Invoke the tool
    const invocation: ToolInvocation = {
      name: tool,
      input: { ...input, repoRoot: effectiveRepoRoot }
    };

    const result = await mcpServer.invoke(invocation);

    // Log successful invocation
    const duration = Date.now() - startTime;
    logAuditEvent({
      timestamp: new Date().toISOString(),
      ip: clientIp || 'unknown',
      tool,
      path: effectiveRepoRoot,
      action: 'tool_invocation',
      success: true
    });

    // Return result
    res.json({
      success: true,
      tool,
      result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('MCP tool invocation error:', error);
    
    logAuditEvent({
      timestamp: new Date().toISOString(),
      ip: clientIp || 'unknown',
      tool: req.body.tool,
      action: 'tool_invocation',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      error: 'Tool invocation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// List available tools
app.get('/mcp/tools', authMiddleware, (req: Request, res: Response) => {
  try {
    // Ensure ripgrep (rg) is available or provide a local fallback shim
    try { ensureRipgrep(); } catch (_e) { void _e; }
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
      'install_global_commands',
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
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Execution stream endpoint (SSE)
app.get('/api/executions/:id/stream', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Send initial comment to establish connection
  res.write(': connected\n\n');
  
  // Get event bus from execution manager
  const eventBus = (executionManager as any).eventBus as ExecutionEventBus;
  if (!eventBus) {
    res.write(`data: ${JSON.stringify({ error: 'Event bus not available' })}\n\n`);
    res.end();
    return;
  }
  
  // Set up event listener
  const listener = (event: any) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('Error writing SSE event:', error);
    }
  };
  
  eventBus.onExecution(id, listener);
  
  // Clean up on close
  req.on('close', () => {
    eventBus.off('*', listener);
    res.end();
  });
});

// Metrics endpoint
app.get('/api/metrics', authMiddleware, (req: Request, res: Response) => {
  try {
    const { executionId } = req.query;
    
    if (executionId && typeof executionId === 'string') {
      const metrics = metricsCollector.getMetrics(executionId);
      if (!metrics) {
        return res.status(404).json({
          error: 'Metrics not found',
          executionId
        });
      }
      res.json(metrics);
    } else {
      const allMetrics = metricsCollector.getAllMetrics();
      res.json({
        metrics: allMetrics,
        count: allMetrics.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint for execution system
app.get('/api/health', authMiddleware, (req: Request, res: Response) => {
  try {
    // Get execution snapshots
    const executions = executionManager.list();
    const snapshots: ExecutionSnapshot[] = executions.map(exec => ({
      id: exec.id,
      status: exec.status,
      lastUpdated: exec.lastUpdated,
      runningNodes: exec.runningNodes.size,
      readyQueue: exec.readyQueue.length
    }));
    
    // Check health
    const health = healthChecker.check(snapshots);
    
    // Return appropriate status code
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      healthy: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint for execution details
app.get('/api/executions/:id/debug', authMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get execution snapshot
    const snapshot = executionManager.poll(id);
    
    // Get metrics
    const metrics = metricsCollector.getMetrics(id);
    
    // Get lock state (if available)
    const lockState = (executionManager as any).getResourceLockManager ? 
      (executionManager as any).getResourceLockManager(id)?.getLockState() : 
      null;
    
    res.json({
      snapshot,
      metrics,
      lockState: lockState ? Array.from(lockState.entries()).map((entry: any) => {
        const [resource, lock] = entry;
        return {
          resource,
          mode: lock.mode,
          owners: lock.owners
        };
      }) : null,
      timeline: snapshot.timeline.slice(-50), // Last 50 events
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    res.status(500).json({
      error: 'Failed to fetch debug info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Utility functions
/**
 * Log HTTP audit event for security and monitoring.
 * Fire-and-forget: Does not block request handling.
 * Writes to both console (development) and persistent log file.
 */
function logAuditEvent(event: any) {
  // Log to console in development for immediate visibility
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(event));
  }

  // Always write to audit log file for persistent record (non-blocking)
  (async () => {
    try {
      // Use the effective repoRoot if available, otherwise use cwd
      const repoRoot = event.path || process.cwd();
      
      await appendLog(repoRoot, {
        timestamp: event.timestamp || new Date().toISOString(),
        event: 'http_audit',
        status: event.success !== false ? 'ok' : 'error',
        payload: {
          ip: event.ip,
          tool: event.tool,
          action: event.action,
          duration: event.duration,
          error: event.error,
          ...event
        }
      });
    } catch (error) {
      // Fallback to console if logging fails - don't throw
      console.error('[AUDIT] Failed to write audit log:', error);
    }
  })();
}

function validateRepoRoot(path: string): { valid: boolean; error?: string } {
  // Basic path validation
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }

  // Prevent directory traversal
  if (path.includes('..')) {
    return { valid: false, error: 'Path cannot contain ..' };
  }

  return { valid: true };
}

// Start server
app.listen(PORT, () => {
  console.log(`DroidForge MCP HTTP Server running on port ${PORT}`);
  console.log(`Authentication: ${API_KEY ? 'ENABLED' : 'DISABLED (development mode)'}`);
});
