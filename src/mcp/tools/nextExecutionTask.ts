import { appendLog } from '../logging.js';
import type { ExecutionManager, NodeSchedule } from '../execution/manager.js';
import type { NextExecutionTaskInput, NextExecutionTaskOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createNextExecutionTaskTool(deps: Deps): ToolDefinition<NextExecutionTaskInput, NextExecutionTaskOutput> {
  return {
    name: 'next_execution_task',
    description: 'Retrieve the next ready task for the given execution, if capacity allows.',
    handler: async input => {
      const task: NodeSchedule | null = await deps.executionManager.requestNext(input.executionId);
      if (task) {
        await appendLog(input.repoRoot, {
          timestamp: new Date().toISOString(),
          event: 'next_execution_task',
          status: 'ok',
          payload: { executionId: input.executionId, nodeId: task.nodeId, droidId: task.droidId }
        });
      }
      return {
        executionId: input.executionId,
        task
      };
    }
  };
}
