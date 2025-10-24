# ✅ TODO: Workstream 2 - Isolation & Merging (IsolationDev)

**Owner:** IsolationDev  
**Phase:** 5  
**Priority:** HIGH  
**Status:** Not Started

---

## Phase 5: Staging Directory Isolation

### StagingManager Implementation

- [ ] Create `src/mcp/execution/staging.ts`
  - [ ] Import required modules (fs, path, glob)
  - [ ] Define IStagingManager interface
  - [ ] Implement StagingManager class
  - [ ] Implement createStaging(repoRoot, executionId, nodeId)
    - [ ] Create `.droidforge/exec/<id>/staging/<nodeId>/` directory
    - [ ] Copy repo files (excluding .droidforge itself)
    - [ ] Return staging path
  - [ ] Implement collectChanges(repoRoot, stagingPath, resourceClaims)
    - [ ] For each resource claim (glob pattern)
    - [ ] Find matching files in staging
    - [ ] Read file contents
    - [ ] Return Map<relPath, content>
  - [ ] Implement cleanStaging(repoRoot, executionId, nodeId)
    - [ ] Remove staging directory
    - [ ] Clean up empty parent dirs

### ExecutionMerger Implementation

- [ ] Create `src/mcp/execution/merger.ts`
  - [ ] Import required modules
  - [ ] Define IExecutionMerger interface
  - [ ] Define MergeResult interface
  - [ ] Implement ExecutionMerger class
  - [ ] Implement merge(repoRoot, executionId, completedNodes, stagingManager)
    - [ ] Collect all changes from staging areas
    - [ ] Group by file path
    - [ ] Detect conflicts (multiple versions of same file)
    - [ ] If no conflicts, apply changes atomically
    - [ ] Create snapshot before merge (optional)
    - [ ] Return MergeResult
  - [ ] Implement detectConflicts(repoRoot, changes)
    - [ ] Check if multiple nodes modified same file
    - [ ] Compare content hashes
    - [ ] Return list of conflicting files

### Integration with ExecutionManager

- [ ] Update integration points
  - [ ] CoreDev will call createStaging() in requestNext()
  - [ ] CoreDev will call collectChanges() in completeNode()
  - [ ] Merge happens via merge_execution tool

---

## Testing

- [ ] Write tests in `__tests__/staging.test.ts`
  - [ ] Test staging directory creation
  - [ ] Test copy-on-write isolation
  - [ ] Test collectChanges with globs
  - [ ] Test cleanup
- [ ] Write tests in `__tests__/merger.test.ts`
  - [ ] Test conflict detection
  - [ ] Test clean merge (no conflicts)
  - [ ] Test merge with conflicts
  - [ ] Test atomic operations

---

## Success Criteria

- [ ] All tasks checked off
- [ ] Tests passing (>85% coverage)
- [ ] Staging directories fully isolated
- [ ] Merge handles conflicts correctly
- [ ] Only owned files modified
- [ ] PROGRESS.md updated
