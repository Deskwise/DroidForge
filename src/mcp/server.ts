import { createToolRegistry } from './tools/index.js';
import { SessionStore } from './sessionStore.js';
import type { ToolDefinition, ToolInvocation } from './types.js';

export interface DroidForgeServerOptions {
  repoRoot: string;
}

export class DroidForgeServer {
  private readonly sessionStore = new SessionStore();
  private readonly tools: Map<string, ToolDefinition>;

  constructor(private readonly options: DroidForgeServerOptions) {
    this.tools = createToolRegistry({ sessionStore: this.sessionStore });
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  async invoke<TInput, TOutput>(invocation: ToolInvocation<TInput>): Promise<TOutput> {
    const tool = this.getTool(invocation.name);
    if (!tool) {
      throw new Error(`Tool not registered: ${invocation.name}`);
    }
    return tool.handler(invocation.input) as Promise<TOutput>;
  }
}

/**
 * Placeholder bootstrap for environments that expect a default export.
 * Real MCP harnesses will call into the class directly.
 */
export function createServer(options: DroidForgeServerOptions): DroidForgeServer {
  return new DroidForgeServer(options);
}
