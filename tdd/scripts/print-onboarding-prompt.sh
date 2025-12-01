#!/bin/bash
# Print the deterministic agent onboarding prompt

cat << 'EOF'
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

## If Asked to Audit

If the user says "Audit Task [ID]":
1. Read `tdd/AUDITOR.md` immediately
2. Run `npm test` yourself (don't trust previous agent's claims)
3. Verify files actually exist
4. Generate report in `docs/audits/audit-task-[ID].md`

**Important**: If you're auditing, you should be in a FRESH session (not the one that implemented the code) to avoid shared hallucinations.

## Getting Help

- Task details: `npx task-master get-task --id=X`
- Current status: `npx task-master list --with-subtasks`
- Crash recovery: `./tdd/scripts/recovery-helper.sh`

Now proceed with step 1: Read `tdd/AGENTS.md`.
EOF

