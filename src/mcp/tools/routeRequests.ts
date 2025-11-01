import { appendLog } from '../logging.js';
import type { ExecutionPlan, RouteRequestInput, RouteRequestOutput, ToolDefinition } from '../types.js';
import { ExecutionManager } from '../execution/manager.js';

interface RouteDeps {
  manager: ExecutionManager;
}

async function ensureExecution(deps: RouteDeps, input: RouteRequestInput, routedTo: string): Promise<string> {
  if (input.executionId) {
    deps.manager.enqueue({
      executionId: input.executionId,
      droidId: routedTo,
      request: input.request,
      repoRoot: input.repoRoot
    });
    return input.executionId;
  }

  const nodeId = `node-${Date.now()}`;
  const plan: ExecutionPlan = {
    nodes: [
      {
        nodeId,
        droidId: routedTo,
        title: (input.request || 'untitled request').slice(0, 60),
        description: input.request || 'No request description provided'
      }
    ],
    edges: []
  };
  const record = deps.manager.plan(input.repoRoot, plan);
  deps.manager.enqueue({ executionId: record.id, droidId: routedTo, request: input.request, repoRoot: input.repoRoot });
  deps.manager.start(record.id);
  const schedule = await deps.manager.requestNext(record.id);
  if (schedule) {
    await deps.manager.completeNode(record.id, schedule.nodeId, { request: input.request });
  }
  return record.id;
}

function buildRouteTool(name: string, defaultDroid: string, deps: RouteDeps): ToolDefinition<RouteRequestInput, RouteRequestOutput> {
  return {
    name,
    description: 'Proxy user instructions to the orchestrator or a specialist.',
    handler: async input => {
      if (!input.request || input.request.trim().length === 0) {
        throw new Error('Please provide a request or instruction for the droid.');
      }
      const routedTo = input.droidId ?? defaultDroid;
      const executionId = await ensureExecution(deps, input, routedTo);
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: name,
        status: 'ok',
        payload: { routedTo, executionId, snippet: input.request.slice(0, 120) }
      });
      return {
        acknowledged: true,
        routedTo,
        executionId
      };
    }
  };
}

export function createRouteTools(deps: RouteDeps) {
  return {
    routeOrchestratorTool: buildRouteTool('route_orchestrator', 'df-orchestrator', deps),
    routeSpecialistTool: buildRouteTool('route_specialist', 'df-specialist', deps)
  };
}
