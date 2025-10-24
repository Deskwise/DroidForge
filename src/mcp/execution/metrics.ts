/**
 * Metrics collection for execution observability
 * Tracks performance and resource usage across parallel executions
 */

/**
 * Execution metrics interface
 */
export interface ExecutionMetrics {
  executionId: string;
  startedAt: string;
  finishedAt?: string;
  duration: number;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  averageNodeDuration: number;
  maxNodeDuration: number;
  minNodeDuration: number;
  lockContentionEvents: number;
  peakConcurrency: number;
  currentConcurrency: number;
}

/**
 * Node-level metrics
 */
interface NodeMetrics {
  nodeId: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
}

/**
 * Internal execution metrics tracking
 */
interface ExecutionMetricsInternal {
  executionId: string;
  startedAt: string;
  finishedAt?: string;
  nodeCount: number;
  completedNodes: number;
  failedNodes: number;
  lockContentionEvents: number;
  peakConcurrency: number;
  currentConcurrency: number;
  nodes: Map<string, NodeMetrics>;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  recordExecutionStart(executionId: string, nodeCount: number): void;
  recordExecutionComplete(executionId: string): void;
  recordTaskStart(executionId: string, nodeId: string): void;
  recordTaskComplete(executionId: string, nodeId: string, duration: number): void;
  recordTaskFailed(executionId: string, nodeId: string): void;
  recordLockContention(executionId: string): void;
  updateConcurrency(executionId: string, concurrency: number): void;
  getMetrics(executionId: string): ExecutionMetrics | null;
  getAllMetrics(): ExecutionMetrics[];
  clearMetrics(executionId: string): void;
}

/**
 * MetricsCollector provides observability into execution performance
 * Tracks timing, concurrency, and resource contention
 */
export class MetricsCollector implements IMetricsCollector {
  private metrics = new Map<string, ExecutionMetricsInternal>();

  /**
   * Record the start of an execution
   * @param executionId Execution identifier
   * @param nodeCount Total number of nodes in the execution
   */
  recordExecutionStart(executionId: string, nodeCount: number): void {
    this.metrics.set(executionId, {
      executionId,
      startedAt: new Date().toISOString(),
      nodeCount,
      completedNodes: 0,
      failedNodes: 0,
      lockContentionEvents: 0,
      peakConcurrency: 0,
      currentConcurrency: 0,
      nodes: new Map()
    });
  }

  /**
   * Record the completion of an execution
   * @param executionId Execution identifier
   */
  recordExecutionComplete(executionId: string): void {
    const metrics = this.metrics.get(executionId);
    if (metrics) {
      metrics.finishedAt = new Date().toISOString();
      metrics.currentConcurrency = 0;
    }
  }

  /**
   * Record the start of a task
   * @param executionId Execution identifier
   * @param nodeId Node identifier
   */
  recordTaskStart(executionId: string, nodeId: string): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) {
      return;
    }

    // Track node start time
    metrics.nodes.set(nodeId, {
      nodeId,
      startedAt: new Date().toISOString()
    });

    // Update concurrency
    metrics.currentConcurrency++;
    if (metrics.currentConcurrency > metrics.peakConcurrency) {
      metrics.peakConcurrency = metrics.currentConcurrency;
    }
  }

  /**
   * Record the completion of a task
   * @param executionId Execution identifier
   * @param nodeId Node identifier
   * @param duration Task duration in milliseconds
   */
  recordTaskComplete(executionId: string, nodeId: string, duration: number): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) {
      return;
    }

    // Update node metrics
    const nodeMetrics = metrics.nodes.get(nodeId);
    if (nodeMetrics) {
      nodeMetrics.finishedAt = new Date().toISOString();
      nodeMetrics.duration = duration;
    }

    // Update execution metrics
    metrics.completedNodes++;
    metrics.currentConcurrency = Math.max(0, metrics.currentConcurrency - 1);
  }

  /**
   * Record a task failure
   * @param executionId Execution identifier
   * @param nodeId Node identifier
   */
  recordTaskFailed(executionId: string, nodeId: string): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) {
      return;
    }

    // Update node metrics
    const nodeMetrics = metrics.nodes.get(nodeId);
    if (nodeMetrics) {
      nodeMetrics.finishedAt = new Date().toISOString();
    }

    // Update execution metrics
    metrics.failedNodes++;
    metrics.currentConcurrency = Math.max(0, metrics.currentConcurrency - 1);
  }

  /**
   * Record a lock contention event
   * @param executionId Execution identifier
   */
  recordLockContention(executionId: string): void {
    const metrics = this.metrics.get(executionId);
    if (metrics) {
      metrics.lockContentionEvents++;
    }
  }

  /**
   * Update current concurrency level
   * @param executionId Execution identifier
   * @param concurrency Current concurrency level
   */
  updateConcurrency(executionId: string, concurrency: number): void {
    const metrics = this.metrics.get(executionId);
    if (!metrics) {
      return;
    }

    metrics.currentConcurrency = concurrency;
    if (concurrency > metrics.peakConcurrency) {
      metrics.peakConcurrency = concurrency;
    }
  }

  /**
   * Get metrics for a specific execution
   * @param executionId Execution identifier
   * @returns Execution metrics or null if not found
   */
  getMetrics(executionId: string): ExecutionMetrics | null {
    const internal = this.metrics.get(executionId);
    if (!internal) {
      return null;
    }

    return this.computeMetrics(internal);
  }

  /**
   * Get metrics for all executions
   * @returns Array of execution metrics
   */
  getAllMetrics(): ExecutionMetrics[] {
    return Array.from(this.metrics.values()).map(internal => this.computeMetrics(internal));
  }

  /**
   * Clear metrics for a specific execution
   * @param executionId Execution identifier
   */
  clearMetrics(executionId: string): void {
    this.metrics.delete(executionId);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Compute final metrics from internal state
   * @param internal Internal metrics state
   * @returns Computed execution metrics
   */
  private computeMetrics(internal: ExecutionMetricsInternal): ExecutionMetrics {
    // Calculate duration
    const startTime = new Date(internal.startedAt).getTime();
    const endTime = internal.finishedAt ? new Date(internal.finishedAt).getTime() : Date.now();
    const duration = endTime - startTime;

    // Calculate node duration statistics
    const nodeDurations = Array.from(internal.nodes.values())
      .map(node => node.duration)
      .filter((d): d is number => d !== undefined);

    const averageNodeDuration = nodeDurations.length > 0
      ? nodeDurations.reduce((sum, d) => sum + d, 0) / nodeDurations.length
      : 0;

    const maxNodeDuration = nodeDurations.length > 0
      ? Math.max(...nodeDurations)
      : 0;

    const minNodeDuration = nodeDurations.length > 0
      ? Math.min(...nodeDurations)
      : 0;

    return {
      executionId: internal.executionId,
      startedAt: internal.startedAt,
      finishedAt: internal.finishedAt,
      duration,
      nodeCount: internal.nodeCount,
      completedNodes: internal.completedNodes,
      failedNodes: internal.failedNodes,
      averageNodeDuration,
      maxNodeDuration,
      minNodeDuration,
      lockContentionEvents: internal.lockContentionEvents,
      peakConcurrency: internal.peakConcurrency,
      currentConcurrency: internal.currentConcurrency
    };
  }
}
