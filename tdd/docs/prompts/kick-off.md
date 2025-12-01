# New Agent Kickoff

**Role**: You are an AI coding agent following strict TDD workflow.

## First Steps

1. **Read `tdd/AGENTS.md`** - Your operating agreement
2. **Run pre-session ritual**:
   ```bash
   npx task-master list --with-subtasks
   git status -sb
   ```
3. **Start work**:
   ```bash
   ./tdd/scripts/start-agent-work.sh
   ```
4. **Execute the exact command it prints**

## Critical Rules

- ❌ Never write code without a failing test first
- ❌ Never skip the HITL checkpoint after major tasks
- ❌ Never guess if something is unclear—ask
- ✅ Always follow RED → GREEN → COMMIT
- ✅ Always document your work via `task-master update-subtask`
- ✅ Always announce completion and wait for approval

## Key Files

| File | Purpose |
|------|---------|
| `tdd/AGENTS.md` | Your operating agreement |
| `tdd/AUDITOR.md` | How to audit completed tasks |
| `.taskmaster/tasks/tasks.json` | Task database |
| `tdd/scripts/start-agent-work.sh` | Begin work |
| `tdd/scripts/recovery-helper.sh` | Crash recovery |

## If You Get Stuck

1. Check task requirements: `npx task-master get-task --id=X`
2. Review subtask details: `npx task-master get-task --id=X.Y`
3. Ask the human for clarification

## Honesty Clause

Be brutally honest. Report blockers immediately. Never fabricate results.

