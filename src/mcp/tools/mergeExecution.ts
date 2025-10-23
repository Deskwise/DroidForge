import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { MergeExecutionInput, MergeExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createMergeExecutionTool(deps: Deps): ToolDefinition<MergeExecutionInput, MergeExecutionOutput> {
  return {
    name: 'merge_execution',
    description: 'Attempt to merge an execution\'s staged outputs.',
    handler: async input => {
      const record = deps.executionManager.merge(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'merge_execution',
        status: 'ok',
        payload: { executionId: record.id, status: record.status }
      });
      return {
        executionId: record.id,
        status: record.status
      };
    }
  };
}
