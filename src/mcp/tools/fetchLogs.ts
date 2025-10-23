import { appendLog, readLogTail } from '../logging.js';
import type { FetchLogsInput, FetchLogsOutput, LogEntry, ToolDefinition } from '../types.js';

export function createFetchLogsTool(): ToolDefinition<FetchLogsInput, FetchLogsOutput> {
  return {
    name: 'fetch_logs',
    description: 'Return the latest DroidForge log entries.',
    handler: async input => {
      const limit = input.limit ?? 25;
      const lines = await readLogTail(input.repoRoot, limit);
      const entries: LogEntry[] = lines.map(line => {
        const parsed = JSON.parse(line) as { timestamp: string; event: string; status: string; payload?: Record<string, unknown> };
        return {
          timestamp: parsed.timestamp,
          event: `${parsed.status === 'ok' ? '✓' : '⚠️'} ${parsed.event}`,
          details: parsed.payload ? JSON.stringify(parsed.payload) : undefined
        };
      });
      await appendLog(input.repoRoot, {
        timestamp: new Date().toISOString(),
        event: 'fetch_logs',
        status: 'ok',
        payload: { returned: entries.length }
      });
      return { entries };
    }
  };
}
