import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { CompleteExecutionTaskInput, CompleteExecutionTaskOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createCompleteExecutionTaskTool(deps: Deps): ToolDefinition<CompleteExecutionTaskInput, CompleteExecutionTaskOutput> {
  return {
    name: 'complete_execution_task',
    description: 'Mark a task as completed or failed, releasing locks and promoting dependents.',
    handler: async input => {
      if (input.outcome === 'failed') {
        deps.executionManager.failNode(input.executionId, input.nodeId, input.detail);
      } else {
        deps.executionManager.completeNode(input.executionId, input.nodeId, input.detail);
      }
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'complete_execution_task',
        status: input.outcome === 'failed' ? 'error' : 'ok',
        payload: { executionId: input.executionId, nodeId: input.nodeId, outcome: input.outcome }
      });
      const snapshot = deps.executionManager.poll(input.executionId);
      return {
        executionId: input.executionId,
        status: snapshot.status
      };
    }
  };
}
