import { createToolRegistry } from './tools/index.js';
import { SessionStore } from './sessionStore.js';
import type { ToolDefinition, ToolInvocation } from './types.js';
import { createPromptRegistry, type PromptBuilderContext } from './prompts/registry.js';
import { PromptRunner } from './prompts/runner.js';

export interface DroidForgeServerOptions {
  repoRoot: string;
}

export class DroidForgeServer {
  private readonly sessionStore = new SessionStore();
  private readonly tools: Map<string, ToolDefinition>;
  private readonly prompts = createPromptRegistry({ sessionStore: this.sessionStore });

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

  listPrompts(): string[] {
    return Array.from(this.prompts.keys());
  }

  async createPromptRunner(name: string, ctx: PromptBuilderContext): Promise<PromptRunner> {
    const builder = this.prompts.get(name);
    if (!builder) {
      throw new Error(`Prompt not registered: ${name}`);
    }
    const repoRoot = ctx.repoRoot ?? this.options.repoRoot;
    const script = await builder({ ...ctx, repoRoot });
    const runner = new PromptRunner(script, invocation => this.invoke(invocation));
    return runner;
  }

  /**
   * Graceful shutdown for the server to allow tests to cleanup resources.
   * Currently waits for subsystems that expose shutdown semantics.
   */
  async shutdown(): Promise<void> {}
}

/**
 * Placeholder bootstrap for environments that expect a default export.
 * Real MCP harnesses will call into the class directly.
 */
export function createServer(options: DroidForgeServerOptions): DroidForgeServer {
  return new DroidForgeServer(options);
}
