import { Mutex } from 'async-mutex';
import type { ResourceLockMode } from './manager.js';

interface LockRequest {
  nodeId: string;
  mode: ResourceLockMode;
  resources: string[];
  resolve: () => void;
  reject: (error: LockTimeoutError) => void;
  timeout: number;
  timer?: NodeJS.Timeout;
}

interface ResourceLock {
  mode: ResourceLockMode;
  owners: Set<string>;
  queue: LockRequest[];
}

export class LockTimeoutError extends Error {
  constructor(
    public nodeId: string,
    public resources: string[],
    timeout: number
  ) {
    super(`Lock timeout for node ${nodeId} on resources ${resources.join(', ')} after ${timeout}ms`);
    this.name = 'LockTimeoutError';
  }
}

/**
 * LockManager manages resource locks with queuing and timeout support.
 * Supports read/write lock modes and automatic deadlock prevention.
 */
export class LockManager {
  private locks = new Map<string, ResourceLock>();
  private mutex = new Mutex();

  /**
   * Try to acquire locks immediately without queuing.
   * 
   * @param resources Array of resource paths to lock
   * @param mode Lock mode (read, write, or analysis)
   * @param nodeId ID of the node requesting the lock
   * @returns true if all locks were acquired, false otherwise
   */
  async tryAcquire(resources: string[], mode: ResourceLockMode, nodeId: string): Promise<boolean> {
    return this.mutex.runExclusive(() => {
      const sorted = [...resources].sort();
      
      // Check if all can be acquired
      for (const resource of sorted) {
        if (!this.canAcquire(resource, mode, nodeId)) {
          return false;
        }
      }
      
      // Acquire all
      for (const resource of sorted) {
        this.acquire(resource, mode, nodeId);
      }
      return true;
    });
  }

  /**
   * Acquire locks with queuing and timeout support.
   * 
   * @param resources Array of resource paths to lock
   * @param mode Lock mode (read, write, or analysis)
   * @param nodeId ID of the node requesting the lock
   * @param timeout Timeout in milliseconds
   * @returns Promise that resolves when locks are acquired
   */
  async acquireLock(
    resources: string[], 
    mode: ResourceLockMode, 
    nodeId: string, 
    timeout: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request: LockRequest = {
        nodeId,
        mode,
        resources: [...resources].sort(),
        resolve,
        reject,
        timeout
      };

      // Set timeout
      request.timer = setTimeout(() => {
        this.removeFromQueue(request);
        request.timer = undefined; // Mark as timed out
        reject(new LockTimeoutError(nodeId, request.resources, timeout));
      }, timeout);

      this.mutex.runExclusive(() => {
        // Try immediate acquisition first
        if (this.canAcquireAll(request.resources, mode, nodeId)) {
          this.acquireAll(request.resources, mode, nodeId);
          if (request.timer) clearTimeout(request.timer);
          request.timer = undefined;
          resolve();
          return;
        }

        // Add to queues
        for (const resource of request.resources) {
          let lock = this.locks.get(resource);
          if (!lock) {
            lock = { mode: 'read', owners: new Set(), queue: [] };
            this.locks.set(resource, lock);
          }
          lock.queue.push(request);
        }
      });
    });
  }

  /**
   * Release locks held by a node.
   * 
   * @param resources Array of resource paths to unlock
   * @param nodeId ID of the node releasing the locks
   */
  async release(resources: string[], nodeId: string): Promise<void> {
    await this.mutex.runExclusive(() => {
      const sorted = [...resources].sort();
      
      for (const resource of sorted) {
        const lock = this.locks.get(resource);
        if (lock && lock.owners.has(nodeId)) {
          lock.owners.delete(nodeId);
          
          // Clean up empty locks
          if (lock.owners.size === 0 && lock.queue.length === 0) {
            this.locks.delete(resource);
          }
        }
      }
      
      // Process queue for all released resources
      for (const resource of sorted) {
        this.processQueue(resource);
      }
    });
  }

  /**
   * Check if a resource is currently locked.
   * 
   * @param resource Resource path to check
   * @returns true if locked, false otherwise
   */
  isLocked(resource: string): boolean {
    const lock = this.locks.get(resource);
    return lock ? lock.owners.size > 0 : false;
  }

  /**
   * Get current owners of a resource.
   * 
   * @param resource Resource path to check
   * @returns Array of node IDs that own the resource
   */
  getOwners(resource: string): string[] {
    const lock = this.locks.get(resource);
    return lock ? Array.from(lock.owners) : [];
  }

  /**
   * Get the current lock state for all resources.
   * 
   * @returns Map of resource to lock state (mode and owners)
   */
  getLockState(): Map<string, { mode: ResourceLockMode; owners: string[] }> {
    return new Map(
      Array.from(this.locks.entries()).map(([resource, lock]) => [
        resource,
        { mode: lock.mode, owners: Array.from(lock.owners) }
      ])
    );
  }

  private canAcquire(resource: string, mode: ResourceLockMode, nodeId: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return true;
    
    // Read locks can coexist
    if (mode === 'read') {
      return lock.mode === 'read' && !lock.owners.has(nodeId);
    }
    
    // Write/analysis locks require exclusive access
    return lock.owners.size === 0;
  }

  private canAcquireAll(resources: string[], mode: ResourceLockMode, nodeId: string): boolean {
    for (const resource of resources) {
      if (!this.canAcquire(resource, mode, nodeId)) {
        return false;
      }
    }
    return true;
  }

  private acquire(resource: string, mode: ResourceLockMode, nodeId: string): void {
    let lock = this.locks.get(resource);
    if (!lock) {
      lock = { mode, owners: new Set(), queue: [] };
      this.locks.set(resource, lock);
    }
    lock.mode = mode;
    lock.owners.add(nodeId);
  }

  private acquireAll(resources: string[], mode: ResourceLockMode, nodeId: string): void {
    for (const resource of resources) {
      this.acquire(resource, mode, nodeId);
    }
  }

  private processQueue(resource: string): void {
    const lock = this.locks.get(resource);
    if (!lock || lock.queue.length === 0) return;

    // Try to satisfy queued requests in order
    const toRemove: LockRequest[] = [];
    
    for (let i = 0; i < lock.queue.length; i++) {
      const request = lock.queue[i];
      
      // Skip if this request has already been processed (timed out)
      if (request.timer === undefined) continue;
      
      // Check if this request can be satisfied
      if (this.canAcquireAll(request.resources, request.mode, request.nodeId)) {
        // Check if it's queued for all required resources
        const canSatisfy = request.resources.every(r => {
          const rLock = this.locks.get(r);
          return rLock && rLock.queue.some(req => 
            req.nodeId === request.nodeId && 
            req.resources.length === request.resources.length &&
            req.resources.every((res, idx) => res === request.resources[idx])
          );
        });
        
        if (canSatisfy) {
          // Acquire all resources
          this.acquireAll(request.resources, request.mode, request.nodeId);
          
          // Clear timeout and resolve
          if (request.timer) clearTimeout(request.timer);
          request.timer = undefined; // Mark as processed
          request.resolve();
          
          // Mark for removal from all queues
          toRemove.push(request);
        }
      }
    }
    
    // Remove satisfied requests from all queues
    for (const request of toRemove) {
      this.removeFromQueue(request);
    }
  }

  private removeFromQueue(request: LockRequest): void {
    for (const resource of request.resources) {
      const lock = this.locks.get(resource);
      if (lock) {
        const index = lock.queue.findIndex(r => 
          r.nodeId === request.nodeId && 
          r.resources.length === request.resources.length &&
          r.resources.every((res, idx) => res === request.resources[idx])
        );
        if (index !== -1) {
          lock.queue.splice(index, 1);
        }
      }
    }
  }

  /**
   * Shutdown the lock manager, clearing all pending timers and rejecting queued requests.
   * This is crucial for tests to ensure clean teardown.
   */
  shutdown(): void {
    // Clear all pending timers and reject queued requests
    for (const lock of this.locks.values()) {
      for (const request of lock.queue) {
        if (request.timer) {
          clearTimeout(request.timer);
          request.timer = undefined;
        }
        // Reject pending requests
        try {
          request.reject(new LockTimeoutError(request.nodeId, request.resources, request.timeout));
        } catch {
          // Ignore errors if already rejected/resolved
        }
      }
      lock.queue.length = 0;
    }
    this.locks.clear();
  }
}
