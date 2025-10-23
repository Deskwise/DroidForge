import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { ListExecutionsInput, ListExecutionsOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createListExecutionsTool(deps: Deps): ToolDefinition<ListExecutionsInput, ListExecutionsOutput> {
  return {
    name: 'list_executions',
    description: 'List active and recent executions.',
    handler: async input => {
      const executions = deps.executionManager.list().map(record => ({
        executionId: record.id,
        status: record.status,
        createdAt: record.createdAt,
        lastUpdated: record.lastUpdated,
        requestCount: record.requests.length
      }));
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'list_executions',
        status: 'ok',
        payload: { count: executions.length }
      });
      return { executions };
    }
  };
}
