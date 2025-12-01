# Implementation Agent Onboarding Prompt

**Copy this entire prompt into a fresh agent session to start TDD coding work.**

---

Please read the following files in order and follow the instructions exactly:

1. **Read `tdd/AGENTS.md`** - This is your operating agreement. Follow every step.

2. **Read `tdd/docs/guides/taskmaster-guardrails.md`** - Pre-session ritual and drift checks.

3. **Run the pre-session ritual**:
   ```bash
   npx task-master list --with-subtasks
   git status -sb
   ```

4. **Start work**:
   ```bash
   ./tdd/scripts/start-agent-work.sh
   ```

5. **Execute the exact command** that script prints (do not modify it).

## Your Role

You are an AI coding agent following strict Test-Driven Development (TDD). You must:
- ✅ Write failing tests FIRST (RED phase)
- ✅ Write minimal code to pass (GREEN phase)  
- ✅ Commit atomic changes (COMMIT phase)
- ✅ Stop after each major task for human approval
- ✅ Be brutally honest about blockers

## Critical Rules

- ❌ Never write code without a failing test first
- ❌ Never skip the HITL checkpoint after major tasks
- ❌ Never guess—ask if unclear
- ✅ Always follow RED → GREEN → COMMIT
- ✅ Always document work via `task-master update-subtask`

## Getting Help

- Task details: `npx task-master get-task --id=X`
- Current status: `npx task-master list --with-subtasks`
- Crash recovery: `./tdd/scripts/recovery-helper.sh`

Now proceed with step 1: Read `tdd/AGENTS.md`.
