import { appendLog } from '../logging.js';
import type { ExecutionManager } from '../execution/manager.js';
import type { PollExecutionInput, PollExecutionOutput, ToolDefinition } from '../types.js';

interface Deps {
  executionManager: ExecutionManager;
}

export function createPollExecutionTool(deps: Deps): ToolDefinition<PollExecutionInput, PollExecutionOutput> {
  return {
    name: 'poll_execution',
    description: 'Retrieve the latest snapshot for a running execution.',
    handler: async input => {
      const snapshot = deps.executionManager.poll(input.executionId);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'poll_execution',
        status: 'ok',
        payload: { executionId: input.executionId, status: snapshot.status }
      });
      return snapshot;
    }
  };
}
