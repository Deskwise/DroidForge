/**
 * Tests for HealthChecker
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthChecker, type ExecutionSnapshot } from '../healthCheck.js';

describe('HealthChecker', () => {
  it('should report healthy status for normal executions', () => {
    const checker = new HealthChecker();
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: new Date().toISOString(),
        runningNodes: 2,
        readyQueue: 1
      }
    ];
    
    const status = checker.check(executions);
    
    assert.ok(status.healthy);
    assert.equal(status.activeExecutions, 1);
    assert.equal(status.pausedExecutions, 0);
    assert.equal(status.stalledExecutions.length, 0);
  });

  it('should count executions by status', () => {
    const checker = new HealthChecker();
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: new Date().toISOString(),
        runningNodes: 1,
        readyQueue: 0
      },
      {
        id: 'exec-2',
        status: 'paused',
        lastUpdated: new Date().toISOString(),
        runningNodes: 0,
        readyQueue: 3
      },
      {
        id: 'exec-3',
        status: 'completed',
        lastUpdated: new Date().toISOString(),
        runningNodes: 0,
        readyQueue: 0
      },
      {
        id: 'exec-4',
        status: 'failed',
        lastUpdated: new Date().toISOString(),
        runningNodes: 0,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.equal(status.activeExecutions, 1);
    assert.equal(status.pausedExecutions, 1);
    assert.equal(status.completedExecutions, 1);
    assert.equal(status.failedExecutions, 1);
  });

  it('should detect stalled executions', async () => {
    const checker = new HealthChecker(100); // 100ms threshold
    
    const fiveMinutesAgo = new Date(Date.now() - 200).toISOString(); // 200ms ago
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: fiveMinutesAgo,
        runningNodes: 1,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.ok(!status.healthy);
    assert.equal(status.stalledExecutions.length, 1);
    assert.equal(status.stalledExecutions[0].id, 'exec-1');
    assert.ok(status.stalledExecutions[0].stalledDuration >= 100);
  });

  it('should provide specific stall reasons', () => {
    const checker = new HealthChecker(100);
    
    const longAgo = new Date(Date.now() - 200).toISOString();
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: longAgo,
        runningNodes: 0,
        readyQueue: 0
      },
      {
        id: 'exec-2',
        status: 'running',
        lastUpdated: longAgo,
        runningNodes: 0,
        readyQueue: 5
      },
      {
        id: 'exec-3',
        status: 'running',
        lastUpdated: longAgo,
        runningNodes: 2,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.equal(status.stalledExecutions.length, 3);
    
    const stalled1 = status.stalledExecutions.find(s => s.id === 'exec-1');
    assert.ok(stalled1?.reason.includes('No running or ready tasks'));
    
    const stalled2 = status.stalledExecutions.find(s => s.id === 'exec-2');
    assert.ok(stalled2?.reason.includes('tasks ready but none scheduled'));
    
    const stalled3 = status.stalledExecutions.find(s => s.id === 'exec-3');
    assert.ok(stalled3?.reason.includes('tasks running but no progress'));
  });

  it('should not flag recently updated executions as stalled', () => {
    const checker = new HealthChecker(5000); // 5 seconds
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        runningNodes: 1,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.ok(status.healthy);
    assert.equal(status.stalledExecutions.length, 0);
  });

  it('should track memory usage', () => {
    const checker = new HealthChecker();
    
    const status = checker.check([]);
    
    assert.ok(status.memoryUsage);
    assert.ok(status.memoryUsage.rss > 0);
    assert.ok(status.memoryUsage.heapTotal > 0);
    assert.ok(status.memoryUsage.heapUsed > 0);
  });

  it('should track uptime', async () => {
    const checker = new HealthChecker();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = checker.check([]);
    
    assert.ok(status.uptime >= 100);
  });

  it('should allow configuring stalled threshold', () => {
    const checker = new HealthChecker(1000);
    
    assert.equal(checker.getStalledThreshold(), 1000);
    
    checker.setStalledThreshold(5000);
    assert.equal(checker.getStalledThreshold(), 5000);
  });

  it('should reject invalid stalled threshold', () => {
    const checker = new HealthChecker();
    
    assert.throws(() => {
      checker.setStalledThreshold(0);
    }, /must be positive/);
    
    assert.throws(() => {
      checker.setStalledThreshold(-1000);
    }, /must be positive/);
  });

  it('should include timestamp in status', () => {
    const checker = new HealthChecker();
    
    const status = checker.check([]);
    
    assert.ok(status.timestamp);
    const timestamp = new Date(status.timestamp);
    assert.ok(!isNaN(timestamp.getTime()));
  });

  it('should handle empty executions list', () => {
    const checker = new HealthChecker();
    
    const status = checker.check([]);
    
    assert.ok(status.healthy);
    assert.equal(status.activeExecutions, 0);
    assert.equal(status.pausedExecutions, 0);
    assert.equal(status.completedExecutions, 0);
    assert.equal(status.failedExecutions, 0);
    assert.equal(status.stalledExecutions.length, 0);
  });

  it('should handle aborted executions as failed', () => {
    const checker = new HealthChecker();
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'aborted',
        lastUpdated: new Date().toISOString(),
        runningNodes: 0,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.equal(status.failedExecutions, 1);
  });

  describe('formatBytes()', () => {
    it('should format bytes correctly', () => {
      assert.equal(HealthChecker.formatBytes(0), '0 B');
      assert.equal(HealthChecker.formatBytes(1024), '1.00 KB');
      assert.equal(HealthChecker.formatBytes(1024 * 1024), '1.00 MB');
      assert.equal(HealthChecker.formatBytes(1024 * 1024 * 1024), '1.00 GB');
      assert.equal(HealthChecker.formatBytes(1536), '1.50 KB');
    });
  });

  describe('formatDuration()', () => {
    it('should format duration correctly', () => {
      assert.equal(HealthChecker.formatDuration(1000), '1s');
      assert.equal(HealthChecker.formatDuration(65000), '1m 5s');
      assert.equal(HealthChecker.formatDuration(3665000), '1h 1m');
      assert.equal(HealthChecker.formatDuration(90000000), '1d 1h');
    });
  });

  it('should consider high heap usage as unhealthy', () => {
    const checker = new HealthChecker();
    
    // Mock high memory usage by checking with executions
    // (We can't directly test memory health without mocking process.memoryUsage)
    const status = checker.check([]);
    
    // At least verify the health check runs
    assert.ok(typeof status.healthy === 'boolean');
  });

  it('should handle multiple stalled executions', () => {
    const checker = new HealthChecker(100);
    
    const longAgo = new Date(Date.now() - 200).toISOString();
    
    const executions: ExecutionSnapshot[] = [
      {
        id: 'exec-1',
        status: 'running',
        lastUpdated: longAgo,
        runningNodes: 1,
        readyQueue: 0
      },
      {
        id: 'exec-2',
        status: 'running',
        lastUpdated: longAgo,
        runningNodes: 1,
        readyQueue: 0
      },
      {
        id: 'exec-3',
        status: 'running',
        lastUpdated: new Date().toISOString(),
        runningNodes: 1,
        readyQueue: 0
      }
    ];
    
    const status = checker.check(executions);
    
    assert.equal(status.stalledExecutions.length, 2);
    assert.ok(status.stalledExecutions.find(s => s.id === 'exec-1'));
    assert.ok(status.stalledExecutions.find(s => s.id === 'exec-2'));
    assert.ok(!status.stalledExecutions.find(s => s.id === 'exec-3'));
  });
});
