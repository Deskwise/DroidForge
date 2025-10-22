import { appendLog } from '../logging.js';
import type { RouteRequestInput, RouteRequestOutput, ToolDefinition } from '../types.js';

function buildRouteTool(name: string, defaultDroid: string): ToolDefinition<RouteRequestInput, RouteRequestOutput> {
  return {
    name,
    description: 'Proxy user instructions to the orchestrator or a specialist.',
    handler: async input => {
      const routedTo = input.droidId ?? defaultDroid;
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: name,
        status: 'ok',
        payload: { routedTo, snippet: input.request.slice(0, 120) }
      });
      return {
        acknowledged: true,
        routedTo
      };
    }
  };
}

export const routeOrchestratorTool = buildRouteTool('route_orchestrator', 'df-orchestrator');
export const routeSpecialistTool = buildRouteTool('route_specialist', 'df-specialist');
