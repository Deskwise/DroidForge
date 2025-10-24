# 📂 File Ownership: Who Touches What

## Purpose

This document defines **strict boundaries** for parallel development.
Each workstream owns specific files and **MUST NOT** modify others' files.

**Violations = Merge Conflicts = Failed Test**

---

## Ownership Rules

### ✅ You MAY:
- Read any file in the repo
- Modify files you own
- Create new files in your directories
- Update your TODO list
- Update PROGRESS.md (your section only)

### ❌ You MUST NOT:
- Modify files owned by other workstreams
- Delete files you don't own
- Rename files without coordination
- Modify shared files (package.json, tsconfig.json) without asking

---

## Workstream 1: CoreDev (Concurrency & Coordination)

**Owner:** CoreDev droid
**Priority:** CRITICAL_PATH (others depend on this)

###  Owned Files (Full Control)

```
src/mcp/execution/
  ├── manager.ts              ✅ CoreDev owns
  ├── synchronization.ts      ✅ CoreDev owns
  ├── resourceLocks.ts        ✅ CoreDev owns
  ├── deadlockDetector.ts     ✅ CoreDev owns
  └── persistence.ts          ✅ CoreDev owns
```

### Can Also Modify

```
src/mcp/execution/types.ts    ✅ (Add types as needed)
TODO_WS1_CORE.md              ✅
PROGRESS.md (CoreDev section) ✅
```

### Integration with Others

- **IsolationDev:** Export `IExecutionManager` interface
- **InfraDev:** Call `EventBus.emit()` on state changes
- **TestDev:** Ensure all public methods have tests

---

## Workstream 2: IsolationDev (Staging & Merging)

**Owner:** IsolationDev droid
**Priority:** HIGH (enables conflict-free execution)

### Owned Files (Full Control)

```
src/mcp/execution/
  ├── staging.ts              ✅ IsolationDev owns
  └── merger.ts               ✅ IsolationDev owns
```

### Can Also Modify

```
src/mcp/execution/types.ts    ✅ (Add IStagingManager, IMerger types)
TODO_WS2_ISOLATION.md         ✅
PROGRESS.md (IsolationDev section) ✅
```

### Integration with Others

- **CoreDev:** Used by ExecutionManager.requestNext()
- **TestDev:** Needs tests for staging isolation

---

## Workstream 3: InfraDev (Events, Resources, Observability)

**Owner:** InfraDev droid
**Priority:** MEDIUM (enables observability)

### Owned Files (Full Control)

```
src/mcp/execution/
  ├── eventBus.ts             ✅ InfraDev owns
  ├── resourceMatcher.ts      ✅ InfraDev owns
  ├── metrics.ts              ✅ InfraDev owns
  └── healthCheck.ts          ✅ InfraDev owns
```

### Can Also Modify

```
src/mcp/http-server.ts        ✅ (Add SSE endpoints)
src/mcp/execution/types.ts    ✅ (Add event types)
TODO_WS3_INFRA.md             ✅
PROGRESS.md (InfraDev section) ✅
```

### Integration with Others

- **CoreDev:** EventBus used by ExecutionManager
- **CoreDev:** ResourceMatcher used by ResourceLockManager
- **TestDev:** Needs tests for event emission

---

## Workstream 4: TestDev (Testing & Quality)

**Owner:** TestDev droid
**Priority:** HIGH (validates everything)

### Owned Files (Full Control)

```
src/mcp/execution/__tests__/
  ├── manager.test.ts         ✅ TestDev owns
  ├── concurrency.test.ts     ✅ TestDev owns
  ├── resourceLocks.test.ts   ✅ TestDev owns
  ├── deadlock.test.ts        ✅ TestDev owns
  ├── staging.test.ts         ✅ TestDev owns
  ├── merger.test.ts          ✅ TestDev owns
  ├── eventBus.test.ts        ✅ TestDev owns
  ├── resourceMatcher.test.ts ✅ TestDev owns
  ├── metrics.test.ts         ✅ TestDev owns
  └── integration.test.ts     ✅ TestDev owns
```

### Can Also Modify

```
TODO_WS4_TESTS.md             ✅
PROGRESS.md (TestDev section) ✅
```

### Integration with Others

- **All:** Writes tests for all workstreams
- **All:** Validates interfaces match INTERFACES.md

---

## Shared Files (Coordination Required)

These files affect multiple workstreams. **Ask before modifying!**

### Shared Configuration Files

```
package.json                  ⚠️ Ask before modifying
package-lock.json             ⚠️ npm install only
tsconfig.json                 ⚠️ Ask before modifying
.gitignore                    ⚠️ Ask before modifying
```

**Process:**
1. Propose change in PROGRESS.md
2. Wait for acknowledgment from all workstreams
3. Make the change
4. Notify in PROGRESS.md

### Shared Documentation

```
INTERFACES.md                 ⚠️ Read-only (update via process)
FILE_OWNERSHIP.md             ⚠️ This file (read-only)
PROGRESS.md                   ⚠️ Update your section only
PARALLELIZATION_ROADMAP.md    ⚠️ Read-only
```

---

## Conflict Resolution

### If You Accidentally Modify Another's File

1. **Revert immediately:**
   ```bash
   git checkout -- path/to/file
   ```

2. **Notify in PROGRESS.md:**
   ```markdown
   ## Errors
   - [CoreDev] Accidentally modified staging.ts, reverted
   ```

3. **Continue with your files**

### If You Need to Modify Another's File

1. **Ask in PROGRESS.md:**
   ```markdown
   ## Questions
   - [CoreDev] Can I add a method to IStagingManager in staging.ts?
     Need: createTemporaryStaging() for crash recovery
   ```

2. **Wait for response** (check every hour)

3. **Make coordinated change:**
   - They update the interface
   - You use the new interface
   - Both update PROGRESS.md

### If You Find a Bug in Another's Code

1. **Report in PROGRESS.md:**
   ```markdown
   ## Issues
   - [TestDev] Found bug in resourceLocks.ts line 45: doesn't handle null
   ```

2. **File owner fixes it** or gives permission

3. **Don't fix it yourself** unless emergency

---

## File Creation Guidelines

### New Files You Can Create

Each workstream can create new files in their owned directories:

**CoreDev can create:**
- `src/mcp/execution/*Lock*.ts` (lock-related utilities)
- `src/mcp/execution/*Sync*.ts` (sync-related utilities)

**IsolationDev can create:**
- `src/mcp/execution/*Staging*.ts` (staging-related)
- `src/mcp/execution/*Merge*.ts` (merge-related)

**InfraDev can create:**
- `src/mcp/execution/*Event*.ts` (event-related)
- `src/mcp/execution/*Metric*.ts` (metrics-related)
- `src/mcp/execution/*Health*.ts` (health-related)

**TestDev can create:**
- `src/mcp/execution/__tests__/*.test.ts` (any tests)
- `src/mcp/execution/__tests__/fixtures/*.ts` (test fixtures)
- `src/mcp/execution/__tests__/mocks/*.ts` (mocks)

### Notify When Creating

Update PROGRESS.md:
```markdown
## New Files Created
- [CoreDev] Created synchronization.ts (async mutex wrappers)
```

---

## Dependencies Installation

### If You Need a New NPM Package

1. **Check if already installed:**
   ```bash
   npm list <package-name>
   ```

2. **If not, install:**
   ```bash
   npm install <package-name>
   ```

3. **Notify in PROGRESS.md:**
   ```markdown
   ## Dependencies Added
   - [CoreDev] Installed async-mutex@0.4.0 for synchronization
   ```

4. **Others will get it** when they run `npm install`

---

## Directory Structure (Reference)

```
DroidForge/
├── src/mcp/execution/
│   ├── manager.ts              [CoreDev]
│   ├── synchronization.ts      [CoreDev]
│   ├── resourceLocks.ts        [CoreDev]
│   ├── deadlockDetector.ts     [CoreDev]
│   ├── persistence.ts          [CoreDev]
│   ├── staging.ts              [IsolationDev]
│   ├── merger.ts               [IsolationDev]
│   ├── eventBus.ts             [InfraDev]
│   ├── resourceMatcher.ts      [InfraDev]
│   ├── metrics.ts              [InfraDev]
│   ├── healthCheck.ts          [InfraDev]
│   ├── types.ts                [Shared - add types only]
│   └── __tests__/              [TestDev]
│       ├── *.test.ts
│       ├── fixtures/
│       └── mocks/
├── INTERFACES.md               [Read-only]
├── FILE_OWNERSHIP.md           [This file - read-only]
├── PROGRESS.md                 [Update your section]
├── TODO_WS1_CORE.md            [CoreDev]
├── TODO_WS2_ISOLATION.md       [IsolationDev]
├── TODO_WS3_INFRA.md           [InfraDev]
└── TODO_WS4_TESTS.md           [TestDev]
```

---

## Verification

At end of your work, verify file ownership:

```bash
# Show what files you modified
git diff --name-only

# Each file should be in your owned list
# If not, revert unauthorized changes
```

---

## Questions?

If ownership is unclear:
1. Check this document first
2. Ask in PROGRESS.md
3. Wait for clarification
4. Proceed when clear

**When in doubt, ask! Better safe than merge conflicts.**

---

## Success Metrics

**Target: ZERO conflicts**

Check at end:
```bash
git status  # Should show clean merge
```

If you see conflicts, you violated file ownership. Review this document and revert.

---

**Remember:** File ownership is the KEY to successful parallel development. Respect the boundaries!
