# 🤖 Parallel Development Using Factory.ai Droid CLI

## Current Situation
- You're IN Factory.ai Droid CLI right now
- DroidForge is the project we're building
- You want to spawn MORE droids to work in parallel
- All droids work in the same repo, coordinated through files

---

## 🎯 How to Spawn Parallel Droids in Factory.ai

### Option 1: Multiple Chat Sessions (RECOMMENDED)

Factory.ai Droid CLI likely supports multiple conversations:

```bash
# In Factory.ai web UI or CLI:
# Open 4 separate chat windows/sessions:

[Chat 1] - You talk to me (orchestrator)
[Chat 2] - CoreDroid (concurrency work)  
[Chat 3] - IsolationDroid (staging/merge)
[Chat 4] - InfraDroid (events/metrics)
[Chat 5] - TestDroid (testing)
```

**Each chat session:**
- Gets its own droid instance
- Can read/write files in `/home/richard/code/DroidForge`
- Coordinates through shared files (PROGRESS.md, TODO lists)
- You switch between chats to orchestrate

### Option 2: Single Orchestrator Pattern (SIMPLER)

If multi-chat isn't available, we do this:

```bash
# You stay in this chat
# I (current droid) coordinate with you to:

1. Create all coordination files (INTERFACES, TODO lists, etc.)
2. Work on Phase 1 together (synchronization)
3. When Phase 1 done, switch to Phase 5 (staging) 
4. Alternate between phases that can be parallel
5. Integrate as we go
```

**Timeline with one droid:**
- Week 1: Phases 1, 2 (critical path)
- Week 2: Phases 3, 4, 5 (staging can be done after locks)
- Week 3: Phases 6, 7, 8, 9
- Week 4: Phase 10, integration

Still 4 weeks, but less coordination overhead.

### Option 3: Batch Instructions (MIDDLE GROUND)

I can work on multiple phases in parallel by:

```bash
# You give me instructions like:

"Work on Phase 1 AND Phase 5 in parallel:
- Phase 1: Add synchronization to manager.ts
- Phase 5: Create staging.ts for isolation

Keep them in separate files so no conflicts.
Update PROGRESS.md when each task completes."

# I'll interleave the work:
# 1. Create synchronization.ts 
# 2. Create staging.ts
# 3. Update manager.ts with mutex
# 4. Continue staging implementation
# 5. etc.
```

---

## 📁 File-Based Coordination System

### Setup (Do This First)

Create files that track progress and prevent conflicts:

```
PROGRESS.md          - Overall status (all droids update this)
INTERFACES.md        - Shared contracts (all droids read this)
FILE_OWNERSHIP.md    - Who works on what (prevent conflicts)

TODO_PHASE1.md       - Phase 1 checklist
TODO_PHASE2.md       - Phase 2 checklist
... etc for all 10 phases
```

### Progress Tracking

**PROGRESS.md** is the central coordination file:

```markdown
# DroidForge Parallelization Progress

Last Updated: 2024-10-23 14:30

## Current Work

### Phase 1: Synchronization [CoreDroid] 🟢 IN PROGRESS
- [x] Install async-mutex
- [x] Create synchronization.ts
- [ ] Wrap ExecutionManager methods
- [ ] Write race condition tests
**Status:** 60% complete
**Next:** Wrap requestNext() and completeNode()

### Phase 5: Staging [IsolationDroid] 🟡 IN PROGRESS  
- [x] Create staging.ts
- [ ] Implement createStaging()
- [ ] Implement collectChanges()
**Status:** 30% complete
**Next:** Implement copy-on-write logic

### Phase 6: Event Bus [InfraDroid] 🔴 NOT STARTED
**Blocked:** Waiting for ExecutionManager interface from Phase 1

### Phase 8: Tests [TestDroid] 🟢 IN PROGRESS
- [x] Create test harness
- [ ] Write concurrency tests
**Status:** 20% complete
**Next:** Write tests for Phase 1

## Completed
None yet

## Blocked
- Phase 2 (blocked by Phase 1)
- Phase 3 (blocked by Phase 2)
- Phase 6 (blocked by Phase 1 interfaces)

## Integration Points Needed
- [ ] Week 1 Day 5: Integrate staging into manager
- [ ] Week 2 Day 2: Integrate event bus
```

**Each droid updates this file** after completing tasks.

---

## 🚀 Practical Workflow

### If You Have Multiple Chats Available

**Step 1: I create coordination files** (this chat)
```
"Create PROGRESS.md, INTERFACES.md, FILE_OWNERSHIP.md, and all TODO files"
```

**Step 2: You open 3 more chat sessions**

**Step 3: You give each droid their assignment:**

**Chat 2 (CoreDroid):**
```
You are CoreDroid, concurrency expert.

READ:
- /home/richard/code/DroidForge/PARALLELIZATION_ROADMAP.md (Phases 1-4)
- /home/richard/code/DroidForge/INTERFACES.md

YOUR FILES (you own these, modify freely):
- src/mcp/execution/manager.ts
- src/mcp/execution/synchronization.ts
- src/mcp/execution/resourceLocks.ts
- src/mcp/execution/deadlockDetector.ts
- src/mcp/execution/persistence.ts

DO NOT MODIFY:
- Any other execution/*.ts files

TASKS:
1. Work through TODO_PHASE1.md, TODO_PHASE2.md, TODO_PHASE3.md, TODO_PHASE4.md
2. Update PROGRESS.md after each task
3. Ask me when you need integration with other droids
4. Run tests before marking complete

START: Implement Phase 1 (synchronization) now.
```

**Chat 3 (IsolationDroid):**
```
You are IsolationDroid, file system expert.

READ:
- /home/richard/code/DroidForge/PARALLELIZATION_ROADMAP.md (Phase 5)
- /home/richard/code/DroidForge/INTERFACES.md

YOUR FILES:
- src/mcp/execution/staging.ts
- src/mcp/execution/merger.ts

TASKS:
1. Work through TODO_PHASE5.md
2. Update PROGRESS.md after each task
3. Use IExecutionManager interface (from INTERFACES.md)
4. Don't wait for real ExecutionManager, use mocks

START: Implement Phase 5 (staging isolation) now.
```

**Chat 4 (InfraDroid):**
```
You are InfraDroid, infrastructure expert.

READ:
- /home/richard/code/DroidForge/PARALLELIZATION_ROADMAP.md (Phases 6, 7, 9)
- /home/richard/code/DroidForge/INTERFACES.md

YOUR FILES:
- src/mcp/execution/eventBus.ts
- src/mcp/execution/resourceMatcher.ts
- src/mcp/execution/metrics.ts
- src/mcp/execution/healthCheck.ts

TASKS:
1. Work through TODO_PHASE6.md, TODO_PHASE7.md, TODO_PHASE9.md
2. Update PROGRESS.md after each task

START: Implement Phase 6 (EventBus) now.
```

**Chat 5 (TestDroid):**
```
You are TestDroid, testing expert.

READ:
- /home/richard/code/DroidForge/PARALLELIZATION_ROADMAP.md (Phase 8)
- All src/mcp/execution/*.ts files

YOUR FILES:
- src/mcp/execution/__tests__/*.test.ts

TASKS:
1. Work through TODO_PHASE8.md
2. Write tests for code as other droids complete it
3. Update PROGRESS.md

START: Create test harness and write concurrency tests now.
```

**Step 4: You monitor progress**

Check every few hours:
```bash
cat PROGRESS.md
git status
git diff
```

**Step 5: You coordinate integrations**

When two droids need to integrate:
```
[Chat 1 to You]: "CoreDroid and IsolationDroid both ready for integration"
[You to CoreDroid]: "Integrate IsolationDroid's staging.ts"
[You to IsolationDroid]: "CoreDroid is integrating your code"
```

---

### If You Only Have This One Chat

We work in waves:

**Wave 1 (Day 1-2): Critical Path Start + Independent Work**
```
"Work on Phase 1 AND Phase 5 AND Phase 6 in parallel:
- Create synchronization.ts (Phase 1)
- Create staging.ts (Phase 5)  
- Create eventBus.ts (Phase 6)

These are independent, separate files. No conflicts possible."
```

**Wave 2 (Day 3-4): Continue Critical Path + Tests**
```
"Continue Phase 1 (add mutex to manager.ts) AND write tests (Phase 8):
- Wrap ExecutionManager methods with locks
- Write concurrency tests for the locking"
```

**Wave 3 (Day 5-7): Phase 2 + More Independent Work**
```
"Phase 2 (resourceLocks.ts) AND Phase 7 (resourceMatcher.ts):
- Implement ResourceLockManager
- Implement ResourceMatcher with glob logic"
```

I'll work on multiple files in each session, updating PROGRESS.md to track.

---

## 📊 Progress Tracking Without Multiple Droids

If it's just me (current droid), you track progress through:

1. **TODO lists per phase** - I check off items as I complete them
2. **PROGRESS.md** - I update after each work session
3. **Git commits** - Each commit = one task complete
4. **You review** - Check progress, give next instructions

**Your commands look like:**
```
"Check TODO_PHASE1.md, complete the next 3 unchecked items, 
update PROGRESS.md, and commit the changes."
```

---

## 🎯 What We Do Right Now

**Tell me which approach:**

### A. Multiple Chats Available
```
"I can open multiple chat sessions. Create all coordination files, 
and give me the 4 droid assignments to paste into each chat."
```

### B. Single Chat (Just You and Me)  
```
"It's just us. Create coordination files and let's work through 
phases strategically, prioritizing critical path but doing 
independent work in parallel when possible."
```

### C. Hybrid (You + Me + Maybe 1-2 More Droids)
```
"I can open 1-2 more chats. Create coordination files optimized 
for 2-3 droids working together."
```

Which is it? **A, B, or C?**
