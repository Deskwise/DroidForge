/**
 * Tests for MetricsCollector
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MetricsCollector } from '../metrics.js';

describe('MetricsCollector', () => {
  it('should record execution start', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 5);
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.executionId, 'exec-1');
    assert.equal(metrics.nodeCount, 5);
    assert.equal(metrics.completedNodes, 0);
    assert.equal(metrics.failedNodes, 0);
  });

  it('should record task start and completion', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordTaskStart('exec-1', 'node-1');
    collector.recordTaskComplete('exec-1', 'node-1', 1000);
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.completedNodes, 1);
    assert.equal(metrics.currentConcurrency, 0);
  });

  it('should track concurrency correctly', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 3);
    
    // Start multiple tasks
    collector.recordTaskStart('exec-1', 'node-1');
    let metrics = collector.getMetrics('exec-1');
    assert.equal(metrics?.currentConcurrency, 1);
    assert.equal(metrics?.peakConcurrency, 1);
    
    collector.recordTaskStart('exec-1', 'node-2');
    metrics = collector.getMetrics('exec-1');
    assert.equal(metrics?.currentConcurrency, 2);
    assert.equal(metrics?.peakConcurrency, 2);
    
    collector.recordTaskStart('exec-1', 'node-3');
    metrics = collector.getMetrics('exec-1');
    assert.equal(metrics?.currentConcurrency, 3);
    assert.equal(metrics?.peakConcurrency, 3);
    
    // Complete one task
    collector.recordTaskComplete('exec-1', 'node-1', 1000);
    metrics = collector.getMetrics('exec-1');
    assert.equal(metrics?.currentConcurrency, 2);
    assert.equal(metrics?.peakConcurrency, 3); // Peak should remain
  });

  it('should track failed tasks', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordTaskStart('exec-1', 'node-1');
    collector.recordTaskFailed('exec-1', 'node-1');
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.failedNodes, 1);
    assert.equal(metrics.completedNodes, 0);
    assert.equal(metrics.currentConcurrency, 0);
  });

  it('should record lock contention events', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordLockContention('exec-1');
    collector.recordLockContention('exec-1');
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.lockContentionEvents, 2);
  });

  it('should calculate average node duration', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 3);
    collector.recordTaskStart('exec-1', 'node-1');
    collector.recordTaskComplete('exec-1', 'node-1', 1000);
    collector.recordTaskStart('exec-1', 'node-2');
    collector.recordTaskComplete('exec-1', 'node-2', 2000);
    collector.recordTaskStart('exec-1', 'node-3');
    collector.recordTaskComplete('exec-1', 'node-3', 3000);
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.completedNodes, 3);
    assert.equal(metrics.averageNodeDuration, 2000); // (1000 + 2000 + 3000) / 3
    assert.equal(metrics.maxNodeDuration, 3000);
    assert.equal(metrics.minNodeDuration, 1000);
  });

  it('should track execution duration', async () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 1);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    collector.recordExecutionComplete('exec-1');
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.ok(metrics.duration >= 100);
    assert.ok(metrics.finishedAt);
  });

  it('should handle multiple executions', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordExecutionStart('exec-2', 3);
    
    collector.recordTaskStart('exec-1', 'node-1');
    collector.recordTaskStart('exec-2', 'node-1');
    
    const metrics1 = collector.getMetrics('exec-1');
    const metrics2 = collector.getMetrics('exec-2');
    
    assert.ok(metrics1);
    assert.ok(metrics2);
    assert.equal(metrics1.nodeCount, 2);
    assert.equal(metrics2.nodeCount, 3);
    assert.equal(metrics1.currentConcurrency, 1);
    assert.equal(metrics2.currentConcurrency, 1);
  });

  it('should return all metrics', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordExecutionStart('exec-2', 3);
    
    const allMetrics = collector.getAllMetrics();
    
    assert.equal(allMetrics.length, 2);
    assert.ok(allMetrics.find(m => m.executionId === 'exec-1'));
    assert.ok(allMetrics.find(m => m.executionId === 'exec-2'));
  });

  it('should return null for unknown execution', () => {
    const collector = new MetricsCollector();
    
    const metrics = collector.getMetrics('unknown');
    assert.equal(metrics, null);
  });

  it('should clear metrics', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    assert.ok(collector.getMetrics('exec-1'));
    
    collector.clearMetrics('exec-1');
    assert.equal(collector.getMetrics('exec-1'), null);
  });

  it('should clear all metrics', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 2);
    collector.recordExecutionStart('exec-2', 3);
    
    assert.equal(collector.getAllMetrics().length, 2);
    
    collector.clearAllMetrics();
    assert.equal(collector.getAllMetrics().length, 0);
  });

  it('should update concurrency explicitly', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 5);
    collector.updateConcurrency('exec-1', 3);
    
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.equal(metrics.currentConcurrency, 3);
    assert.equal(metrics.peakConcurrency, 3);
    
    // Update to lower value shouldn't affect peak
    collector.updateConcurrency('exec-1', 1);
    const metrics2 = collector.getMetrics('exec-1');
    assert.equal(metrics2?.currentConcurrency, 1);
    assert.equal(metrics2?.peakConcurrency, 3);
  });

  it('should handle edge cases gracefully', () => {
    const collector = new MetricsCollector();
    
    // Operations on non-existent execution should not throw
    collector.recordTaskStart('unknown', 'node-1');
    collector.recordTaskComplete('unknown', 'node-1', 1000);
    collector.recordTaskFailed('unknown', 'node-1');
    collector.recordLockContention('unknown');
    collector.updateConcurrency('unknown', 5);
    
    // Should not have created metrics
    assert.equal(collector.getMetrics('unknown'), null);
  });

  it('should calculate duration correctly for in-progress execution', () => {
    const collector = new MetricsCollector();
    
    collector.recordExecutionStart('exec-1', 1);
    
    // Don't complete execution
    const metrics = collector.getMetrics('exec-1');
    assert.ok(metrics);
    assert.ok(metrics.duration >= 0);
    assert.equal(metrics.finishedAt, undefined);
  });
});
