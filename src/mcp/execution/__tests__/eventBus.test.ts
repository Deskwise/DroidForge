/**
 * Tests for ExecutionEventBus
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionEventBus, type ExecutionEvent } from '../eventBus.js';

describe('ExecutionEventBus', () => {
  it('should emit events to type-specific listeners', () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];

    bus.on('task.started', (event: ExecutionEvent) => {
      receivedEvents.push(event);
    });

    const testEvent: ExecutionEvent = {
      type: 'task.started',
      executionId: 'exec-1',
      nodeId: 'node-1',
      timestamp: new Date().toISOString(),
      payload: { droidId: 'droid-1' }
    };

    bus.emit(testEvent);

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].type, 'task.started');
    assert.equal(receivedEvents[0].executionId, 'exec-1');
    assert.equal(receivedEvents[0].nodeId, 'node-1');
  });

  it('should emit events to wildcard listeners', () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];

    bus.onAny((event: ExecutionEvent) => {
      receivedEvents.push(event);
    });

    const event1: ExecutionEvent = {
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    };

    const event2: ExecutionEvent = {
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    };

    bus.emit(event1);
    bus.emit(event2);

    assert.equal(receivedEvents.length, 2);
    assert.equal(receivedEvents[0].type, 'task.started');
    assert.equal(receivedEvents[1].type, 'task.completed');
  });

  it('should filter events by executionId', () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];

    bus.onExecution('exec-1', (event: ExecutionEvent) => {
      receivedEvents.push(event);
    });

    const event1: ExecutionEvent = {
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    };

    const event2: ExecutionEvent = {
      type: 'task.started',
      executionId: 'exec-2',
      timestamp: new Date().toISOString()
    };

    const event3: ExecutionEvent = {
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    };

    bus.emit(event1);
    bus.emit(event2);
    bus.emit(event3);

    // Should only receive events for exec-1
    assert.equal(receivedEvents.length, 2);
    assert.equal(receivedEvents[0].executionId, 'exec-1');
    assert.equal(receivedEvents[1].executionId, 'exec-1');
  });

  it('should remove listeners correctly', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;

    const listener = (event: ExecutionEvent) => {
      callCount++;
    };

    bus.on('task.started', listener);

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    assert.equal(callCount, 1);

    bus.off('task.started', listener);

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    // Should not increase after removal
    assert.equal(callCount, 1);
  });

  it('should handle multiple listeners for same event', () => {
    const bus = new ExecutionEventBus();
    let count1 = 0;
    let count2 = 0;

    bus.on('task.started', () => count1++);
    bus.on('task.started', () => count2++);

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    assert.equal(count1, 1);
    assert.equal(count2, 1);
  });

  it('should support once listeners', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;

    bus.once('task.started', () => {
      callCount++;
    });

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    // Should only be called once
    assert.equal(callCount, 1);
  });

  it('should handle concurrent event emissions', () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];

    bus.onAny((event: ExecutionEvent) => {
      receivedEvents.push(event);
    });

    // Emit multiple events in quick succession
    const promises = Array.from({ length: 100 }, (_, i) => {
      return Promise.resolve().then(() => {
        bus.emit({
          type: 'task.started',
          executionId: `exec-${i}`,
          timestamp: new Date().toISOString()
        });
      });
    });

    return Promise.all(promises).then(() => {
      assert.equal(receivedEvents.length, 100);
    });
  });

  it('should return correct listener count', () => {
    const bus = new ExecutionEventBus();

    assert.equal(bus.listenerCount('task.started'), 0);

    bus.on('task.started', () => {});
    assert.equal(bus.listenerCount('task.started'), 1);

    bus.on('task.started', () => {});
    assert.equal(bus.listenerCount('task.started'), 2);
  });

  it('should remove all listeners when requested', () => {
    const bus = new ExecutionEventBus();
    let count = 0;

    bus.on('task.started', () => count++);
    bus.on('task.completed', () => count++);

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    assert.equal(count, 1);

    bus.removeAllListeners();

    bus.emit({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });

    // Count should not increase
    assert.equal(count, 1);
  });

  it('should handle events with payload data', () => {
    const bus = new ExecutionEventBus();
    let receivedPayload: Record<string, unknown> | undefined;

    bus.on('task.completed', (event: ExecutionEvent) => {
      receivedPayload = event.payload;
    });

    bus.emit({
      type: 'task.completed',
      executionId: 'exec-1',
      nodeId: 'node-1',
      timestamp: new Date().toISOString(),
      payload: {
        duration: 1500,
        result: 'success',
        filesModified: ['file1.ts', 'file2.ts']
      }
    });

    assert.ok(receivedPayload);
    assert.equal(receivedPayload.duration, 1500);
    assert.equal(receivedPayload.result, 'success');
    assert.deepEqual(receivedPayload.filesModified, ['file1.ts', 'file2.ts']);
  });
});
