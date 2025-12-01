import { createToolRegistry } from './tools/index.js';
import { SessionStore } from './sessionStore.js';
import type { ToolDefinition, ToolInvocation } from './types.js';
import { createPromptRegistry, type PromptBuilderContext } from './prompts/registry.js';
import { PromptRunner } from './prompts/runner.js';
import { ExecutionManager } from './execution/manager.js';
import { flushLogs, clearAllFlushTimers } from './logging.js';

export interface DroidForgeServerOptions {
  repoRoot: string;
}

export class DroidForgeServer {
  private readonly sessionStore = new SessionStore();
  private readonly executionManager = new ExecutionManager();
  private readonly tools: Map<string, ToolDefinition>;
  private readonly prompts = createPromptRegistry({ 
    sessionStore: this.sessionStore,
    executionManager: this.executionManager
  });

  constructor(private readonly options: DroidForgeServerOptions) {
    this.tools = createToolRegistry({ 
      sessionStore: this.sessionStore,
      executionManager: this.executionManager
    });
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
   * Waits for all pending ExecutionManager operations to complete and flushes logs.
   * Aggressively cleans up all handles to ensure process can exit.
   */
  async shutdown(): Promise<void> {
    // Flush logs for this repoRoot
    await flushLogs(this.options.repoRoot).catch(() => {
      // Ignore errors during shutdown
    });

    // Shutdown execution manager (clears all timers and resources)
    await this.executionManager.shutdown();

    // Clear any remaining logging timers (defensive cleanup)
    clearAllFlushTimers();

    // Aggressively unref all handles to allow process exit
    const anyProc = process as any;
    const handles: any[] = anyProc._getActiveHandles?.() ?? [];
    for (const h of handles) {
      try {
        // Skip stdio handles
        if (h === process.stdout || h === process.stderr || h === process.stdin) continue;
        // Unref to allow process exit
        h?.unref?.();
        // Destroy sockets that aren't stdio
        if (h?.destroy && typeof h.destroy === 'function') {
          try {
            h.destroy();
          } catch {
            // Ignore destroy errors
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }
}

/**
 * Placeholder bootstrap for environments that expect a default export.
 * Real MCP harnesses will call into the class directly.
 */
export function createServer(options: DroidForgeServerOptions): DroidForgeServer {
  return new DroidForgeServer(options);
}
