import { Mutex } from 'async-mutex';
import type { ResourceLockMode } from './manager.js';

interface ResourceLock {
  mode: ResourceLockMode;
  owners: Set<string>; // nodeIds holding the lock
  queue: Array<{ nodeId: string; mode: ResourceLockMode; resolve: () => void }>;
}

/**
 * ResourceLockManager manages locks on resources with support for different lock modes.
 * Supports multiple readers or single writer per resource.
 */
export class ResourceLockManager {
  private locks = new Map<string, ResourceLock>();
  private mutex = new Mutex();

  /**
   * Try to acquire locks on multiple resources.
   * Uses canonical ordering to prevent deadlocks.
   * 
   * @param resources Array of resource paths to lock
   * @param mode Lock mode (read, write, or analysis)
   * @param nodeId ID of the node requesting the lock
   * @returns true if all locks were acquired, false otherwise
   */
  async tryAcquire(resources: string[], mode: ResourceLockMode, nodeId: string): Promise<boolean> {
    return this.mutex.runExclusive(() => {
      // Sort resources for canonical ordering (prevents deadlock)
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
   * Release locks on multiple resources.
   * 
   * @param resources Array of resource paths to unlock
   * @param nodeId ID of the node releasing the lock
   */
  async release(resources: string[], nodeId: string): Promise<void> {
    return this.mutex.runExclusive(() => {
      for (const resource of resources) {
        const lock = this.locks.get(resource);
        if (lock) {
          lock.owners.delete(nodeId);
          if (lock.owners.size === 0) {
            this.locks.delete(resource);
          }
        }
      }
    });
  }

  /**
   * Get the current lock state for all resources.
   * 
   * @returns Map of resource path to lock state
   */
  getLockState(): Map<string, { mode: ResourceLockMode; owners: string[] }> {
    return new Map(
      Array.from(this.locks.entries()).map(([resource, lock]) => [
        resource,
        { mode: lock.mode, owners: Array.from(lock.owners) }
      ])
    );
  }

  /**
   * Check if a resource is locked.
   * 
   * @param resource Resource path
   * @returns true if locked, false otherwise
   */
  isLocked(resource: string): boolean {
    return this.locks.has(resource);
  }

  /**
   * Get the owners of a resource lock.
   * 
   * @param resource Resource path
   * @returns Array of node IDs that own the lock
   */
  getOwners(resource: string): string[] {
    const lock = this.locks.get(resource);
    return lock ? Array.from(lock.owners) : [];
  }

  /**
   * Check if a lock can be acquired for a resource.
   * 
   * @param resource Resource path
   * @param mode Lock mode
   * @param nodeId Node requesting the lock
   * @returns true if lock can be acquired, false otherwise
   */
  private canAcquire(resource: string, mode: ResourceLockMode, nodeId: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return true; // No lock exists

    if (lock.owners.has(nodeId)) return true; // Already own it

    // Multiple readers allowed
    if (mode === 'read' && lock.mode === 'read') return true;
    
    // Analysis mode can coexist with read mode
    if (mode === 'analysis' && (lock.mode === 'read' || lock.mode === 'analysis')) return true;
    if (lock.mode === 'analysis' && (mode === 'read' || mode === 'analysis')) return true;

    return false; // Write locks are exclusive
  }

  /**
   * Acquire a lock on a resource.
   * Assumes canAcquire has already been checked.
   * 
   * @param resource Resource path
   * @param mode Lock mode
   * @param nodeId Node acquiring the lock
   */
  private acquire(resource: string, mode: ResourceLockMode, nodeId: string): void {
    if (!this.locks.has(resource)) {
      this.locks.set(resource, { 
        mode, 
        owners: new Set([nodeId]), 
        queue: [] 
      });
    } else {
      const lock = this.locks.get(resource)!;
      lock.owners.add(nodeId);
    }
  }

  /**
   * Clear all locks (useful for testing or cleanup).
   */
  clear(): void {
    this.locks.clear();
  }

  /**
   * Get the number of resources currently locked.
   * 
   * @returns Number of locked resources
   */
  getLockedResourceCount(): number {
    return this.locks.size;
  }
}
