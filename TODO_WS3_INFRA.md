# ✅ TODO: Workstream 3 - Infrastructure (InfraDev)

**Owner:** InfraDev  
**Phases:** 6, 7, 9  
**Priority:** MEDIUM  
**Status:** Not Started

---

## Phase 6: Event Bus

- [ ] Create `src/mcp/execution/eventBus.ts`
  - [ ] Import EventEmitter from node:events
  - [ ] Define ExecutionEvent interface
  - [ ] Define IExecutionEventBus interface
  - [ ] Implement ExecutionEventBus class (extends EventEmitter)
  - [ ] Implement emit(event) method
  - [ ] Implement onAny(listener) method
  - [ ] Implement onExecution(executionId, listener) method
  - [ ] Add event filtering logic
- [ ] Write tests in `__tests__/eventBus.test.ts`
  - [ ] Test event emission
  - [ ] Test event filtering by executionId
  - [ ] Test listener management

---

## Phase 7: Resource Matching

- [ ] Create `src/mcp/execution/resourceMatcher.ts`
  - [ ] Import micromatch, path modules
  - [ ] Define IResourceMatcher interface
  - [ ] Implement ResourceMatcher class
  - [ ] Implement overlaps(claim1, claim2) method
    - [ ] Handle exact matches
    - [ ] Handle glob patterns
    - [ ] Handle path hierarchies
  - [ ] Implement isAncestor(ancestor, descendant) helper
  - [ ] Implement expandClaims(repoRoot, claims) method
    - [ ] Use glob to expand patterns
    - [ ] Cache results
- [ ] Write tests in `__tests__/resourceMatcher.test.ts`
  - [ ] Test overlap detection
  - [ ] Test glob matching
  - [ ] Test hierarchy detection
  - [ ] Test normalization

---

## Phase 9: Observability

### MetricsCollector

- [ ] Create `src/mcp/execution/metrics.ts`
  - [ ] Define ExecutionMetrics interface
  - [ ] Define IMetricsCollector interface
  - [ ] Implement MetricsCollector class
  - [ ] Implement recordTaskStart()
  - [ ] Implement recordTaskComplete()
  - [ ] Implement recordLockContention()
  - [ ] Implement getMetrics()
  - [ ] Implement getAllMetrics()

### HealthChecker

- [ ] Create `src/mcp/execution/healthCheck.ts`
  - [ ] Define HealthStatus interface
  - [ ] Implement HealthChecker class
  - [ ] Implement check(manager) method
    - [ ] Count active/paused executions
    - [ ] Detect stalled executions (>5min no updates)
    - [ ] Check memory usage
    - [ ] Return HealthStatus

### HTTP Endpoints

- [ ] Update `src/mcp/http-server.ts`
  - [ ] Add SSE endpoint: GET /api/executions/:id/stream
  - [ ] Add metrics endpoint: GET /api/metrics
  - [ ] Add health endpoint: GET /api/health
  - [ ] Add debug endpoint: GET /api/executions/:id/debug

---

## Testing

- [ ] Write tests in `__tests__/metrics.test.ts`
- [ ] Write tests in `__tests__/healthCheck.test.ts`

---

## Success Criteria

- [ ] All tasks checked off
- [ ] Tests passing (>85% coverage)
- [ ] Events emit correctly
- [ ] Resource matching works
- [ ] Metrics track accurately
- [ ] Only owned files modified
- [ ] PROGRESS.md updated
