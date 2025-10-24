/**
 * Event Bus for parallel execution coordination
 * Provides real-time event notifications for execution state changes
 */

import { EventEmitter } from 'node:events';

/**
 * Execution event types
 */
export type ExecutionEventType =
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.ready'
  | 'execution.planned'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.paused'
  | 'execution.resumed'
  | 'execution.aborted'
  | 'execution.failed'
  | 'execution.deadlock'
  | 'request.received';

/**
 * Event payload structure
 */
export interface ExecutionEvent {
  type: ExecutionEventType;
  executionId: string;
  nodeId?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

/**
 * Event bus interface for dependency injection
 */
export interface IExecutionEventBus {
  emitEvent(event: ExecutionEvent): boolean;
  onAny(listener: (event: ExecutionEvent) => void): this;
  onExecution(executionId: string, listener: (event: ExecutionEvent) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
}

/**
 * ExecutionEventBus provides pub/sub for execution events
 * Enables real-time monitoring and coordination across parallel droids
 */
export class ExecutionEventBus extends EventEmitter implements IExecutionEventBus {
  constructor() {
    super();
    // Increase max listeners for high concurrency scenarios
    this.setMaxListeners(100);
  }

  /**
   * Emit an execution event to all subscribers
   * @param event The execution event to emit
   * @returns true if event had listeners, false otherwise
   */
  emitEvent(event: ExecutionEvent): boolean {
    // Emit to type-specific listeners
    const typeResult = super.emit(event.type, event);
    
    // Also emit to wildcard listeners
    const wildcardResult = super.emit('*', event);
    
    return typeResult || wildcardResult;
  }

  /**
   * Subscribe to all execution events
   * @param listener Callback function to invoke for each event
   * @returns this for chaining
   */
  onAny(listener: (event: ExecutionEvent) => void): this {
    return this.on('*', listener);
  }

  /**
   * Subscribe to events for a specific execution
   * @param executionId The execution ID to filter events by
   * @param listener Callback function to invoke for matching events
   * @returns this for chaining
   */
  onExecution(executionId: string, listener: (event: ExecutionEvent) => void): this {
    const wrappedListener = (event: ExecutionEvent) => {
      if (event.executionId === executionId) {
        listener(event);
      }
    };
    
    // Store the mapping for cleanup
    if (!this.listenerMap) {
      this.listenerMap = new WeakMap();
    }
    this.listenerMap.set(listener, wrappedListener);
    
    return this.onAny(wrappedListener);
  }

  /**
   * Remove an event listener
   * @param event Event name (or '*' for all)
   * @param listener The listener function to remove
   * @returns this for chaining
   */
  off(event: string, listener: (...args: any[]) => void): this {
    // Check if this is a wrapped listener
    if (this.listenerMap) {
      const wrappedListener = this.listenerMap.get(listener);
      if (wrappedListener) {
        return super.off(event, wrappedListener);
      }
    }
    
    return super.off(event, listener);
  }

  /**
   * Subscribe to a specific event type
   * @param event The event type to listen for
   * @param listener Callback function to invoke when event occurs
   * @returns this for chaining
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  /**
   * Subscribe to a specific event type (once only)
   * @param event The event type to listen for
   * @param listener Callback function to invoke when event occurs
   * @returns this for chaining
   */
  once(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  /**
   * Get the number of listeners for an event
   * @param event The event type
   * @returns Number of listeners
   */
  listenerCount(event: string | symbol): number {
    return super.listenerCount(event);
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   * @param event Optional event type to remove listeners for
   * @returns this for chaining
   */
  removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }

  // WeakMap to track wrapped listeners for cleanup
  private listenerMap?: WeakMap<(...args: any[]) => void, (...args: any[]) => void>;
}
