/**
 * Health monitoring for execution system
 * Detects stalled executions and resource issues
 */

import type { ExecutionStatus } from './manager.js';

/**
 * Health status for the execution system
 */
export interface HealthStatus {
  healthy: boolean;
  activeExecutions: number;
  pausedExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  stalledExecutions: StalledExecution[];
  memoryUsage: MemoryUsageInfo;
  uptime: number;
  timestamp: string;
}

/**
 * Information about a stalled execution
 */
export interface StalledExecution {
  id: string;
  reason: string;
  lastUpdated: string;
  stalledDuration: number;
}

/**
 * Memory usage information
 */
export interface MemoryUsageInfo {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

/**
 * Execution record snapshot for health checking
 */
export interface ExecutionSnapshot {
  id: string;
  status: ExecutionStatus;
  lastUpdated: string;
  runningNodes: number;
  readyQueue: number;
}

/**
 * Health checker interface
 */
export interface IHealthChecker {
  check(executions: ExecutionSnapshot[]): HealthStatus;
  setStalledThreshold(milliseconds: number): void;
  getStalledThreshold(): number;
}

/**
 * HealthChecker monitors execution system health
 * Detects stalled executions and resource issues
 */
export class HealthChecker implements IHealthChecker {
  private stalledThresholdMs: number;
  private startTime: number;

  /**
   * Create a new health checker
   * @param stalledThresholdMs Milliseconds before execution is considered stalled (default: 5 minutes)
   */
  constructor(stalledThresholdMs: number = 5 * 60 * 1000) {
    this.stalledThresholdMs = stalledThresholdMs;
    this.startTime = Date.now();
  }

  /**
   * Check the health of the execution system
   * @param executions Array of execution snapshots
   * @returns Health status
   */
  check(executions: ExecutionSnapshot[]): HealthStatus {
    const now = Date.now();
    
    // Count executions by status
    const active = executions.filter(e => e.status === 'running');
    const paused = executions.filter(e => e.status === 'paused');
    const completed = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed' || e.status === 'aborted');

    // Detect stalled executions
    const stalled = this.detectStalledExecutions(active, now);

    // Get memory usage
    const memoryUsage = this.getMemoryUsage();

    // Determine overall health
    const healthy = stalled.length === 0 && this.isMemoryHealthy(memoryUsage);

    return {
      healthy,
      activeExecutions: active.length,
      pausedExecutions: paused.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      stalledExecutions: stalled,
      memoryUsage,
      uptime: now - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set the stalled execution threshold
   * @param milliseconds Threshold in milliseconds
   */
  setStalledThreshold(milliseconds: number): void {
    if (milliseconds <= 0) {
      throw new Error('Stalled threshold must be positive');
    }
    this.stalledThresholdMs = milliseconds;
  }

  /**
   * Get the current stalled execution threshold
   * @returns Threshold in milliseconds
   */
  getStalledThreshold(): number {
    return this.stalledThresholdMs;
  }

  /**
   * Detect stalled executions
   * @param activeExecutions Active execution snapshots
   * @param currentTime Current timestamp
   * @returns Array of stalled executions
   */
  private detectStalledExecutions(
    activeExecutions: ExecutionSnapshot[],
    currentTime: number
  ): StalledExecution[] {
    const stalled: StalledExecution[] = [];

    for (const execution of activeExecutions) {
      const lastUpdate = new Date(execution.lastUpdated).getTime();
      const stalledDuration = currentTime - lastUpdate;

      // Check if execution has been inactive for too long
      if (stalledDuration > this.stalledThresholdMs) {
        let reason = 'No activity';

        // Provide more specific reasons
        if (execution.runningNodes === 0 && execution.readyQueue === 0) {
          reason = 'No running or ready tasks';
        } else if (execution.runningNodes === 0 && execution.readyQueue > 0) {
          reason = `${execution.readyQueue} tasks ready but none scheduled`;
        } else if (execution.runningNodes > 0) {
          reason = `${execution.runningNodes} tasks running but no progress`;
        }

        stalled.push({
          id: execution.id,
          reason,
          lastUpdated: execution.lastUpdated,
          stalledDuration
        });
      }
    }

    return stalled;
  }

  /**
   * Get current memory usage
   * @returns Memory usage information
   */
  private getMemoryUsage(): MemoryUsageInfo {
    const usage = process.memoryUsage();
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers
    };
  }

  /**
   * Check if memory usage is healthy
   * @param memory Memory usage information
   * @returns true if memory usage is healthy
   */
  private isMemoryHealthy(memory: MemoryUsageInfo): boolean {
    // Consider unhealthy if heap usage exceeds 90% of total
    const heapUsagePercent = memory.heapUsed / memory.heapTotal;
    if (heapUsagePercent > 0.9) {
      return false;
    }

    // Consider unhealthy if RSS exceeds 2GB (reasonable threshold for Node.js)
    const maxRssBytes = 2 * 1024 * 1024 * 1024; // 2GB
    if (memory.rss > maxRssBytes) {
      return false;
    }

    return true;
  }

  /**
   * Format bytes to human-readable string
   * @param bytes Bytes to format
   * @returns Formatted string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format duration to human-readable string
   * @param milliseconds Duration in milliseconds
   * @returns Formatted string
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
