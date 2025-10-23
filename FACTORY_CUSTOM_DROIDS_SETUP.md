# 🤖 Factory.ai Custom Droids Setup for Parallel Development

## What We Discovered

Factory.ai has a **Custom Droids (Subagents)** feature that lets you create specialized AI agents that work in parallel!

**Current Status:** `"enableCustomDroids": false` in your settings
**Location:** `~/.factory/settings.json`

---

## 🚀 How to Enable and Use Custom Droids

### Step 1: Enable Custom Droids

```bash
# Edit your Factory settings
nano ~/.factory/settings.json

# Change this line:
"enableCustomDroids": false,

# To:
"enableCustomDroids": true,
```

Or I can do it for you programmatically!

### Step 2: Create Custom Droid Definitions

Custom droids are defined in Markdown files. I'll create 4 specialized droids for our parallelization work:

```
~/.factory/droids/
  ├── core-concurrency-dev.md
  ├── isolation-dev.md
  ├── infrastructure-dev.md
  └── test-dev.md
```

### Step 3: Spawn Them in Your Session

Once enabled, you can spawn droids with commands like:

```
@CoreDev read the roadmap and implement Phase 1
```

The `@` mentions specific custom droids by name!

---

## 📋 The 4 Custom Droids We'll Create

### 1. CoreConcurrencyDev (@CoreDev)
**Role:** Thread-safety and concurrency expert
**Focus:** Phases 1-4 (synchronization, locks, deadlock detection, persistence)
**Files:** manager.ts, synchronization.ts, resourceLocks.ts, deadlockDetector.ts, persistence.ts
**Model:** Claude Sonnet 4.5 (needs high reasoning for race conditions)

### 2. IsolationDev (@IsolationDev)
**Role:** File system and isolation specialist
**Focus:** Phase 5 (staging directories, atomic merges)
**Files:** staging.ts, merger.ts
**Model:** Claude Sonnet 4.5

### 3. InfraDev (@InfraDev)
**Role:** Infrastructure and observability engineer  
**Focus:** Phases 6, 7, 9 (event bus, resource matching, metrics)
**Files:** eventBus.ts, resourceMatcher.ts, metrics.ts, healthCheck.ts
**Model:** Claude Sonnet 4.5

### 4. TestDev (@TestDev)
**Role:** Testing and quality assurance expert
**Focus:** Phase 8 (comprehensive test suite)
**Files:** __tests__/*.test.ts
**Model:** Claude Sonnet 4.5

---

## 🎯 How Coordination Works

### File-Based Coordination

Each droid reads/writes to shared files:

```
DroidForge/
├── PROGRESS.md          ← All droids update this
├── INTERFACES.md        ← All droids read this (contracts)
├── FILE_OWNERSHIP.md    ← Who owns what files
├── TODO_WS1.md          ← CoreDev's checklist
├── TODO_WS2.md          ← IsolationDev's checklist
├── TODO_WS3.md          ← InfraDev's checklist
└── TODO_WS4.md          ← TestDev's checklist
```

### Communication Pattern

**Option A: All in one chat**
```
You: @CoreDev implement Phase 1 synchronization
You: @IsolationDev implement Phase 5 staging
You: @InfraDev implement Phase 6 event bus
You: @TestDev write concurrency tests

[All 4 droids work simultaneously on different files]

[Check progress]
You: cat PROGRESS.md
```

**Option B: Separate conversations** (if Factory supports multiple tabs)
```
[Tab 1] Talk to @CoreDev
[Tab 2] Talk to @IsolationDev
[Tab 3] Talk to @InfraDev
[Tab 4] Talk to @TestDev
```

---

## 📝 Custom Droid Definition Format

Based on Factory.ai docs, each droid is a Markdown file:

```markdown
# Core Concurrency Developer

## Role
Expert in concurrent programming, race condition prevention, and thread-safe code.

## System Prompt
You are CoreConcurrencyDev, a specialist in building thread-safe parallel systems.
Your mission is to implement Phases 1-4 of the DroidForge parallelization roadmap.

Follow these rules:
1. Read PARALLELIZATION_ROADMAP.md Phases 1-4
2. Follow interfaces defined in src/mcp/execution/INTERFACES.md
3. Only modify files you own (see FILE_OWNERSHIP.md)
4. Update TODO_WS1.md after completing each task
5. Update PROGRESS.md when you finish major milestones
6. Write tests for all concurrency-sensitive code
7. Use async-mutex library for all locking

Your files:
- src/mcp/execution/manager.ts
- src/mcp/execution/synchronization.ts
- src/mcp/execution/resourceLocks.ts
- src/mcp/execution/deadlockDetector.ts
- src/mcp/execution/persistence.ts

Do NOT modify any other files in src/mcp/execution/.

## Tools
- Read, Edit, Create (file operations)
- Execute (for testing)
- Grep, Glob (code search)

## Model
claude-sonnet-4-5-20250929

## Autonomy
medium
```

---

## 🚀 Quick Start Commands

### Enable Custom Droids
```bash
# I'll update your settings
sed -i 's/"enableCustomDroids": false/"enableCustomDroids": true/' ~/.factory/settings.json
```

### Create All 4 Droids
```bash
# I'll create the droid definition files
mkdir -p ~/.factory/droids
# Then create each .md file
```

### Spawn and Work
```bash
# In this Droid CLI session:
@CoreDev start Phase 1
@IsolationDev start Phase 5  
@InfraDev start Phase 6
@TestDev start Phase 8

# Check progress anytime:
cat /home/richard/code/DroidForge/PROGRESS.md
```

---

## 📊 Timeline with Custom Droids

### Week 1 (5 days)
| Droid | Mon | Tue | Wed | Thu | Fri |
|-------|-----|-----|-----|-----|-----|
| @CoreDev | Phase 1 start | Phase 1 done, Phase 2 start | Phase 2 continue | Phase 2 done | Integration |
| @IsolationDev | Phase 5 start | Phase 5 continue | Phase 5 continue | Phase 5 done | Testing |
| @InfraDev | Phase 6 start | Phase 6 done, Phase 7 start | Phase 7 done | Phase 9 start | Phase 9 continue |
| @TestDev | Test harness | Phase 1 tests | Phase 2 tests | Integration tests | Full suite run |

### Week 2 (5 days)
| Droid | Mon | Tue | Wed | Thu | Fri |
|-------|-----|-----|-----|-----|-----|
| @CoreDev | Phase 3 start | Phase 3 done | Phase 4 start | Phase 4 continue | Phase 4 done |
| @IsolationDev | Help integrate | Polish | Documentation | Done ✅ | - |
| @InfraDev | Phase 9 done | SSE streaming | HTTP endpoints | Metrics polish | Done ✅ |
| @TestDev | Phase 3 tests | Phase 4 tests | Stress tests | Load tests | Coverage 90%+ |

### Week 3 (2-3 days)
**All droids:** Final integration, bug fixes, documentation, demo prep

**Total: 2.5 weeks** (vs 6 weeks sequential)

---

## 🎯 Next Steps

Want me to:

**Option 1:** Enable custom droids and create all 4 droid definitions now?
```
"Yes, enable custom droids and create the 4 droid files"
```

**Option 2:** Just create coordination files first, enable later?
```
"Create coordination files (INTERFACES.md, PROGRESS.md, etc.) first"
```

**Option 3:** Try spawning droids in this current chat?
```
"Let's try spawning droids in this session using @mentions"
```

Which do you want?
