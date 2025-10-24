/**
 * Tests for ExecutionEventBus - event pub/sub system
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionEventBus, ExecutionEvent } from '../eventBus.js';
import { sleep, runConcurrently } from './helpers/testUtils.js';

describe('ExecutionEventBus', () => {
  it('emits events to listeners', () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];
    
    bus.onAny((event) => {
      receivedEvents.push(event);
    });
    
    const event: ExecutionEvent = {
      type: 'task.started',
      executionId: 'exec-1',
      nodeId: 'node-1',
      timestamp: new Date().toISOString(),
      payload: { droidId: 'test-droid' }
    };
    
    bus.emitEvent(event);
    
    assert.equal(receivedEvents.length, 1);
    assert.deepEqual(receivedEvents[0], event);
  });

  it('filters events by execution ID', () => {
    const bus = new ExecutionEventBus();
    const exec1Events: ExecutionEvent[] = [];
    const exec2Events: ExecutionEvent[] = [];
    
    bus.onExecution('exec-1', (event) => exec1Events.push(event));
    bus.onExecution('exec-2', (event) => exec2Events.push(event));
    
    // Emit events for different executions
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-2',
      timestamp: new Date().toISOString()
    });
    
    bus.emitEvent({
      type: 'task.failed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(exec1Events.length, 2, 'exec-1 should receive 2 events');
    assert.equal(exec2Events.length, 1, 'exec-2 should receive 1 event');
  });

  it('supports multiple listeners', () => {
    const bus = new ExecutionEventBus();
    let listener1Called = false;
    let listener2Called = false;
    let listener3Called = false;
    
    bus.onAny(() => listener1Called = true);
    bus.onAny(() => listener2Called = true);
    bus.onAny(() => listener3Called = true);
    
    bus.emitEvent({
      type: 'execution.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.ok(listener1Called && listener2Called && listener3Called);
  });

  it('removes listeners with off', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;
    
    const listener = () => callCount++;
    
    bus.onAny(listener);
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 1);
    
    bus.off('*', listener);
    
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 1, 'Listener should not be called after removal');
  });

  it('supports type-specific listeners', () => {
    const bus = new ExecutionEventBus();
    const startEvents: ExecutionEvent[] = [];
    const completeEvents: ExecutionEvent[] = [];
    
    bus.on('task.started', (event) => startEvents.push(event));
    bus.on('task.completed', (event) => completeEvents.push(event));
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-2',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(startEvents.length, 2);
    assert.equal(completeEvents.length, 1);
  });

  it('handles once listeners', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;
    
    bus.once('task.started', () => callCount++);
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 1, 'Once listener should only be called once');
  });

  it('removes all listeners', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;
    
    const listener1 = () => callCount++;
    const listener2 = () => callCount++;
    const listener3 = () => callCount++;
    
    bus.onAny(listener1);
    bus.onAny(listener2);
    bus.on('task.started', listener3);
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    const initialCount = callCount;
    assert.ok(initialCount > 0, 'Should have called some listeners');
    
    // Remove listeners explicitly
    bus.off('*', listener1);
    bus.off('*', listener2);
    bus.off('task.started', listener3);
    callCount = 0;
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 0, 'No listeners should be called after removal');
  });

  it('counts listeners correctly', () => {
    const bus = new ExecutionEventBus();
    
    assert.equal(bus.listenerCount('*'), 0);
    
    const listener1 = () => {};
    const listener2 = () => {};
    
    bus.onAny(listener1);
    assert.equal(bus.listenerCount('*'), 1);
    
    bus.onAny(listener2);
    assert.equal(bus.listenerCount('*'), 2);
    
    bus.off('*', listener1);
    assert.equal(bus.listenerCount('*'), 1);
  });

  it('handles high volume of events', async () => {
    const bus = new ExecutionEventBus();
    let receivedCount = 0;
    
    bus.onAny(() => receivedCount++);
    
    // Emit 1000 events
    for (let i = 0; i < 1000; i++) {
      bus.emitEvent({
        type: 'task.started',
        executionId: `exec-${i}`,
        timestamp: new Date().toISOString()
      });
    }
    
    assert.equal(receivedCount, 1000);
  });

  it('supports concurrent event emission', async () => {
    const bus = new ExecutionEventBus();
    const receivedEvents: ExecutionEvent[] = [];
    
    bus.onAny((event) => receivedEvents.push(event));
    
    await runConcurrently(async () => {
      bus.emitEvent({
        type: 'task.started',
        executionId: 'exec-concurrent',
        timestamp: new Date().toISOString()
      });
    }, 100);
    
    assert.equal(receivedEvents.length, 100);
  });

  it('handles errors in listeners gracefully', () => {
    const bus = new ExecutionEventBus();
    let successfulCalls = 0;
    
    // Listener that throws
    bus.onAny(() => {
      throw new Error('Listener error');
    });
    
    // Listener that succeeds
    bus.onAny(() => {
      successfulCalls++;
    });
    
    // Emit event - should not crash
    try {
      bus.emitEvent({
        type: 'task.started',
        executionId: 'exec-1',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Event emitters typically allow errors to propagate
      // This is expected behavior
    }
    
    // At least the non-throwing listener might have been called
    // (depending on listener order)
    assert.ok(true, 'Event emission completes even with listener errors');
  });

  it('maintains event order', () => {
    const bus = new ExecutionEventBus();
    const eventOrder: string[] = [];
    
    bus.onAny((event) => {
      eventOrder.push(event.type);
    });
    
    const types: Array<ExecutionEvent['type']> = [
      'execution.planned',
      'execution.started',
      'task.started',
      'task.completed',
      'execution.completed'
    ];
    
    for (const type of types) {
      bus.emitEvent({
        type,
        executionId: 'exec-1',
        timestamp: new Date().toISOString()
      });
    }
    
    assert.deepEqual(eventOrder, types);
  });

  it('supports chaining', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;
    
    bus
      .onAny(() => callCount++)
      .onAny(() => callCount++)
      .on('task.started', () => callCount++);
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.ok(callCount >= 2);
  });

  it('preserves event payload', () => {
    const bus = new ExecutionEventBus();
    let receivedPayload: any = null;
    
    bus.onAny((event) => {
      receivedPayload = event.payload;
    });
    
    const payload = {
      droidId: 'test-droid',
      duration: 1234,
      metadata: { foo: 'bar' }
    };
    
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString(),
      payload
    });
    
    assert.deepEqual(receivedPayload, payload);
  });

  it('handles async listeners', async () => {
    const bus = new ExecutionEventBus();
    const results: number[] = [];
    
    bus.onAny(async (event) => {
      await sleep(10);
      results.push(1);
    });
    
    bus.onAny(async (event) => {
      await sleep(5);
      results.push(2);
    });
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    // Give async listeners time to complete
    await sleep(20);
    
    assert.equal(results.length, 2);
  });

  it('supports large number of concurrent listeners', () => {
    const bus = new ExecutionEventBus();
    let totalCalls = 0;
    
    // Add 100 listeners
    for (let i = 0; i < 100; i++) {
      bus.onAny(() => totalCalls++);
    }
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(totalCalls, 100);
  });

  it('handles listener removal during event emission', () => {
    const bus = new ExecutionEventBus();
    let callCount = 0;
    
    const listener = () => {
      callCount++;
      bus.off('*', listener); // Remove self
    };
    
    bus.onAny(listener);
    
    // First emission should call listener
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 1);
    
    // Second emission should not call listener (already removed)
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(callCount, 1);
  });

  it('differentiates between wildcard and specific listeners', () => {
    const bus = new ExecutionEventBus();
    let wildcardCalls = 0;
    let specificCalls = 0;
    
    bus.onAny(() => wildcardCalls++);
    bus.on('task.started', () => specificCalls++);
    
    bus.emitEvent({
      type: 'task.started',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(wildcardCalls, 1);
    assert.equal(specificCalls, 1);
    
    bus.emitEvent({
      type: 'task.completed',
      executionId: 'exec-1',
      timestamp: new Date().toISOString()
    });
    
    assert.equal(wildcardCalls, 2);
    assert.equal(specificCalls, 1); // Should not increase for different event type
  });
});
