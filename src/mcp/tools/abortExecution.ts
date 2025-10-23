import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { AbortExecutionInput, AbortExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createAbortExecutionTool(deps: Deps): ToolDefinition<AbortExecutionInput, AbortExecutionOutput> {
  return {
    name: 'abort_execution',
    description: 'Abort an execution and discard staged outputs.',
    handler: async input => {
      const record = deps.executionManager.abort(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'abort_execution',
        status: 'ok',
        payload: { executionId: record.id }
      });
      return {
        executionId: record.id,
        status: record.status
      };
    }
  };
}
