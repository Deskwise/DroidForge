import type { NodeStatus, ResourceLockMode } from './manager.js';

export interface DeadlockInfo {
  blockedNodes: string[];
  lockDependencies: Array<{
    node: string;
    waitingFor: string[];
    heldBy: string[];
  }>;
  cycle: string[] | null;
}

interface NodeState {
  spec: {
    nodeId: string;
    resourceClaims?: string[];
  };
  status: NodeStatus;
}

/**
 * DeadlockDetector analyzes execution state to detect potential deadlocks.
 * A deadlock occurs when no tasks can proceed because they are all waiting
 * for resources held by other tasks.
 */
export class DeadlockDetector {
  /**
   * Detect if a deadlock situation exists.
   * 
   * @param readyQueue Nodes waiting to be scheduled
   * @param runningNodes Nodes currently running
   * @param nodes Map of all nodes
   * @param lockState Current resource lock state
   * @returns DeadlockInfo if deadlock detected, null otherwise
   */
  detect(
    readyQueue: string[],
    runningNodes: Set<string>,
    nodes: Map<string, NodeState>,
    lockState: Map<string, { mode: ResourceLockMode; owners: string[] }>
  ): DeadlockInfo | null {
    // Deadlock condition: nothing running and something waiting
    if (runningNodes.size === 0 && readyQueue.length > 0) {
      const blockedNodes = [...readyQueue];
      const dependencies = this.analyzeDependencies(blockedNodes, nodes, lockState);
      const cycle = this.findCycle(dependencies);

      return {
        blockedNodes,
        lockDependencies: dependencies,
        cycle
      };
    }

    return null;
  }

  /**
   * Analyze dependencies between blocked nodes and locked resources.
   * 
   * @param blockedNodes Nodes that are blocked
   * @param nodes Map of all nodes
   * @param lockState Current lock state
   * @returns Dependency information for each blocked node
   */
  private analyzeDependencies(
    blockedNodes: string[],
    nodes: Map<string, NodeState>,
    lockState: Map<string, { mode: ResourceLockMode; owners: string[] }>
  ): Array<{ node: string; waitingFor: string[]; heldBy: string[] }> {
    return blockedNodes.map(nodeId => {
      const nodeState = nodes.get(nodeId)!;
      const claims = nodeState.spec.resourceClaims ?? [];

      const waitingFor: string[] = [];
      const heldBy: string[] = [];

      for (const resource of claims) {
        const lock = lockState.get(resource);
        if (lock) {
          waitingFor.push(resource);
          heldBy.push(...lock.owners.filter(owner => owner !== nodeId));
        }
      }

      return {
        node: nodeId,
        waitingFor,
        heldBy: [...new Set(heldBy)] // Remove duplicates
      };
    });
  }

  /**
   * Find circular dependencies in the wait-for graph.
   * Uses depth-first search to detect cycles.
   * 
   * @param dependencies Dependency information
   * @returns Array of node IDs forming a cycle, or null if no cycle
   */
  private findCycle(
    dependencies: Array<{ node: string; heldBy: string[] }>
  ): string[] | null {
    // Build wait-for graph
    const graph = new Map<string, string[]>();
    for (const dep of dependencies) {
      graph.set(dep.node, dep.heldBy);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string, path: string[]): string[] | null => {
      if (recStack.has(node)) {
        // Found cycle - return the cycle portion
        const cycleStart = path.indexOf(node);
        return path.slice(cycleStart);
      }
      if (visited.has(node)) return null;

      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        const cycle = dfs(neighbor, [...path]);
        if (cycle) return cycle;
      }

      recStack.delete(node);
      return null;
    };

    // Try to find a cycle starting from each node
    for (const node of graph.keys()) {
      const cycle = dfs(node, []);
      if (cycle) return cycle;
    }

    return null;
  }

  /**
   * Check if a deadlock is likely to occur given current state.
   * This is a heuristic check that can be used preventively.
   * 
   * @param readyQueue Nodes waiting to be scheduled
   * @param runningNodes Nodes currently running
   * @param nodes Map of all nodes
   * @param lockState Current lock state
   * @returns true if deadlock is likely, false otherwise
   */
  isDeadlockLikely(
    readyQueue: string[],
    runningNodes: Set<string>,
    nodes: Map<string, NodeState>,
    lockState: Map<string, { mode: ResourceLockMode; owners: string[] }>
  ): boolean {
    // If nothing is running and there are queued tasks waiting for locks
    if (runningNodes.size === 0 && readyQueue.length > 0) {
      // Check if any queued task can proceed
      for (const nodeId of readyQueue) {
        const nodeState = nodes.get(nodeId);
        if (!nodeState) continue;

        const claims = nodeState.spec.resourceClaims ?? [];
        
        // If this node has no resource claims, it can proceed
        if (claims.length === 0) return false;

        // Check if all claimed resources are locked
        let allLocked = true;
        for (const resource of claims) {
          if (!lockState.has(resource)) {
            allLocked = false;
            break;
          }
        }

        // If not all resources are locked, this node might be able to proceed
        if (!allLocked) return false;
      }

      // All queued nodes are waiting for locked resources
      return true;
    }

    return false;
  }
}
