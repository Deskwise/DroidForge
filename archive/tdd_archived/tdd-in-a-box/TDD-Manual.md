# TDD-in-a-Box User Manual

**Version:** 1.2  
**Last Updated:** November 2025  
**Audience:** Project managers, non-developers, and anyone managing AI coding agents

---

## Executive Summary

### What is TDD-in-a-Box?

TDD-in-a-Box is a workflow system that enables non-developers to safely manage AI coding agents working on software projects. It enforces strict guardrails that prevent agents from autonomously making changes without your approval, while ensuring all work follows Test-Driven Development (TDD) best practices.

### Why Does This Exist?

AI agents are powerful but can be unpredictable. Without guardrails, they may:
- Start working on the wrong task
- Make changes without approval
- Leave repositories in broken states when they crash
- Create conflicting changes when multiple agents work simultaneously
- **Lie about test results** (Hallucinate success)

TDD-in-a-Box solves these problems by requiring explicit approval before any work begins, providing deterministic recovery when things go wrong, and enforcing a **Hostile Auditor** phase to verify work.

### What You Get

- **Approval gates:** Agents must ask permission before starting work
- **Crash recovery:** Single command to clean up after agent failures
- **Task tracking:** Integration with Task Master ensures all work is tracked
- **Git protection:** Prevents commits during active sessions
- **TDD enforcement:** All code changes follow test-first discipline
- **Antagonistic Audit:** A mandatory verification phase where the agent (or a fresh one) rigorously checks the work against standards.

---

## Quick Start

If you're impatient and want to see it work:

1. **Install prerequisites:**
   ```bash
   npm install -g task-master-ai
   ```

2. **Start a new agent session** (point agent to `AGENTS.md` only)

3. **Agent will report:** "I've been assigned Task X. Shall I proceed?"

4. **You say:** "yes" or "no"

5. **Agent Works:** It follows RED -> GREEN -> COMMIT cycle.

6. **Audit:** When finished, you say: "Audit Task X". The agent switches to Auditor mode, runs tests, and generates a report.

7. **If crash occurs, run:**
   ```bash
   ./scripts/recovery-helper.sh
   ```

That's it. The rest of this manual explains the details.

---

## System Architecture

### Components

TDD-in-a-Box consists of six main components that work together:

1. **Task Master (TM)** - Task tracking system
   - Stores tasks in `.taskmaster/tasks/tasks.json`
   - Tracks status: `pending`, `in-progress`, `review`, `done`
   - Provides CLI: `npx task-master list`, `npx task-master update`, etc.

2. **Autopilot (AP)** - TDD workflow driver
   - Manages RED → GREEN → COMMIT cycle
   - Runs tests automatically
   - Guides agents through implementation
   - Integrates with Task Master for status updates

3. **The Auditor** - Quality Assurance
   - Defined by `tdd-in-a-box/AUDITOR.md`
   - Verifies implementation against requirements
   - Checks for "production readiness"
   - Generates audit reports in `docs/audits/`
   - **Authority:** Can FAIL a task and require rework.

4. **Session Management** - Prevents conflicts
   - Session lock: `~/.taskmaster/<project>/sessions/current-task.json`
   - Records which task/subtask is active
   - Blocks new work if session exists
   - Cleared by wrapup or reset scripts

5. **Git Guardrails** - Commit protection
   - `scripts/tm-commit.sh` - refuses commits during active sessions
   - Ensures task status syncs with git history
   - Prevents out-of-sync states

6. **Entry Protocol** - Agent approval gate
   - Defined in `AGENTS.md`
   - Forces agent to claim task and wait for approval
   - Prevents autonomous work

### State Machine

```
┌─────────┐
│  IDLE   │  No active session, repo clean
└────┬────┘
     │ start-agent-work.sh
     ↓
┌─────────┐
│ CLAIMED │  Task marked in-progress, session lock created
└────┬────┘
     │ User approves → agent runs autopilot command
     ↓
┌─────────┐
│ WORKING │  Autopilot driving TDD cycle (Red/Green/Commit)
└────┬────┘
     │ autopilot completes
     ↓
┌─────────┐
│ REVIEW  │  Task marked for review
└────┬────┘
     │ User invokes Audit
     ↓
┌─────────┐
│ AUDITING│  Agent verifies work against standards
└────┬────┘
     │ Pass -> Commit Report / Fail -> Remediate
     ↓
┌─────────┐
│ CLOSED  │  Task Audit Report committed
└─────────┘

     CRASH? → Run recovery-helper.sh
        ├─ Tests pass? → Keep work (wrapup) or discard (reset)
        └─ Tests fail? → Auto-discard (reset)
```

### File Locations

```
repo-root/
├── .taskmaster/
│   └── tasks/
│       └── tasks.json          # Task definitions
├── docs/
│   └── audits/                 # Audit reports stored here
├── scripts/
│   ├── start-agent-work.sh      # Entry point
│   ├── autopilot-wrapup.sh      # Clean finish
│   ├── autopilot-reset.sh       # Abort/crash cleanup
│   ├── recovery-helper.sh       # Automated crash recovery
│   └── agent-check-in.sh        # Helper for new agents
├── TDD-Manual.md               # This document
├── AGENTS.md                   # Implementation Agent instructions
└── .taskmaster/AUDITOR.md      # Auditor Agent instructions
└── ~/.taskmaster/<project>/sessions/
    └── current-task.json       # Active session lock (external to repo)
```

---

## Workflows

### 1. The Implementation Workflow (The Builder)
This is the standard TDD cycle driven by `start-agent-work.sh`.

1.  **Start:** Agent reads `AGENTS.md`.
2.  **Claim:** Agent runs `start-agent-work.sh`.
3.  **Approve:** You say "Yes".
4.  **Execute:** Agent uses Autopilot (`autopilot_start` -> `autopilot_complete_phase`).
5.  **Finish:** Agent runs `autopilot-wrapup.sh`.
6.  **Status:** Task is marked `review` (or `done` if no audit requested yet).

### 2. The Audit Workflow (The Inspector)
This ensures quality *after* implementation but *before* final sign-off.

1.  **Trigger:** You start a new session (or continue) and say: **"Audit Task [ID]"**.
2.  **Context:** Agent reads `TASK_MASTER_AUDITOR.md`.
3.  **Verify:** Agent checks:
    *   Do the files exist?
    *   Do the tests pass? (`npm test`)
    *   Is the code safe (no secrets)?
    *   Is it production ready?
4.  **Report:** Agent creates `docs/audits/audit-task-[ID].md`.
5.  **Outcome:**
    *   **Pass:** Agent commits the report. You are free to merge/push.
    *   **Fail:** Agent fixes the issues immediately (if feasible) or lists **Critical Issues** for rework.

---

## Installation Guide

### Prerequisites

Before installing TDD-in-a-Box, ensure you have:

1. **Node.js and npm** (version 16 or higher)
   ```bash
   node --version  # Should show v16.x or higher
   npm --version
   ```

2. **Git** (initialized repository)
   ```bash
   git --version
   git status  # Should not error
   ```

3. **Task Master CLI** (installed globally)
   ```bash
   npm install -g task-master-ai
   npx task-master --version  # Should show version number
   ```

### Step-by-Step Installation

#### 1. Copy TDD-in-a-Box to Your Repository

From an existing repo with TDD-in-a-Box:

```bash
# Copy the tdd-in-a-box directory
cp -r /path/to/source/repo/tdd-in-a-box /path/to/your/repo/

# Copy tm-commit helper into tdd-in-a-box bundle
cp /path/to/source/repo/tdd-in-a-box/scripts/tm-commit.sh /path/to/your/repo/tdd-in-a-box/scripts/

# Copy AGENTS.md and TASK_MASTER_AUDITOR.md
cp /path/to/source/repo/AGENTS.md /path/to/your/repo/
cp /path/to/source/repo/TASK_MASTER_AUDITOR.md /path/to/your/repo/
```

#### 2. Make Scripts Executable

```bash
cd /path/to/your/repo
chmod +x tdd-in-a-box/scripts/*.sh
chmod +x tdd-in-a-box/scripts/tm-commit.sh
```

#### 3. Initialize Task Master

```bash
# Initialize Task Master in your repo
npx task-master init

# Verify .taskmaster directory was created
ls -la .taskmaster/tasks/tasks.json
```

#### 4. Configure Testing Infrastructure (Required for Audit)

For the Auditor to work, your project **must** have a working test command. We recommend Jest for JavaScript/TypeScript projects.

```bash
# Install Jest (example for TS project)
npm install -D jest ts-jest @types/jest ts-node

# Initialize Jest config
npx ts-jest config:init
```

Update `package.json`:
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

#### 5. Create Audit Directory

```bash
mkdir -p docs/audits
```

---

## Daily Workflow (Normal Usage)

### Your Role as a Non-Developer

You don't write code. Your job is simple:
1. Start an AI agent session.
2. Point the agent to `AGENTS.md`.
3. Approve the work.
4. **Request an Audit.**
5. Approve the final commit.

### Complete Agent Session Walkthrough

#### Step 1: Start a New Agent
Open a new agent session (e.g., Claude 3.7, GPT-5.1, or another AI assistant).

#### Step 2: Point Agent to AGENTS.md
Your first message to the agent:
```
Please read /AGENTS.md in this repository and follow the instructions.
```

#### Step 3: Agent Reports Task Assignment
The agent will run `start-agent-work.sh` and ask for approval.

#### Step 4: You Approve
```
Yes, proceed.
```

#### Step 5: Agent Works Through TDD Cycle
The agent runs Autopilot. You wait.

#### Step 6: Agent Completes Work
Agent reports: "Task complete. Running wrapup..."

#### Step 7: The Audit Phase
You say:
```
Please audit this task. Read TASK_MASTER_AUDITOR.md and generate the report.
```

The agent will:
1. Run tests.
2. Inspect code.
3. Generate `docs/audits/audit-task-X.md`.
4. Report the score.

**If Score > 90:**
"Audit passed. Report committed. Ready for next task."

**If Score < 90:**
"Audit failed. Critical issues found: [List]. Please fix."
You then tell the agent: "Fix the critical issues."

---

## Recovery & Edge Cases

### When Agents Crash
(Same as previous manual - use `recovery-helper.sh`)

### Automated Crash Recovery
(Same as previous manual)

---

## Script Reference
(Same as previous manual)

---

## Common Gotchas & Solutions

### 1. Audit Fails "No Tests Found"
**Cause:** `npm test` didn't run any tests.
**Fix:** Ensure you have created integration tests or at least one unit test file. The implementation agent *should* have done this in the TDD cycle.

### 2. Agent tries to modify TASK_MASTER_AUDITOR.md
**Cause:** Agent thinks it needs to improve the instructions.
**Fix:** "Do not modify instructions. Only follow them."

---

## Appendix

### File Locations Reference

| File/Directory | Location | Purpose |
|---------------|----------|---------|
| Task definitions | `.taskmaster/tasks/tasks.json` | Task Master database |
| Entry protocol | `AGENTS.md` | Implementation Agent instructions |
| Audit protocol | `TASK_MASTER_AUDITOR.md` | Auditor Agent instructions |
| Audit Reports | `docs/audits/` | Committed audit records |
| Start script | `tdd-in-a-box/scripts/start-agent-work.sh` | Begin new work |
| Recovery script | `tdd-in-a-box/scripts/recovery-helper.sh` | Crash recovery |

**End of TDD-in-a-Box User Manual**