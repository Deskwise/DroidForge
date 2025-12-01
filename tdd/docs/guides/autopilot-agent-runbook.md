# Autopilot Agent Runbook

Daily operating procedure for agents using the TDD workflow.

## Session Start

```bash
# 1. Check task tree
npx task-master list --with-subtasks

# 2. Verify clean state
git status -sb

# 3. Get next task
./tdd/scripts/start-agent-work.sh

# 4. Run the exact command printed
npx task-master autopilot start <taskId>
```

## TDD Cycle (RED → GREEN → COMMIT)

### RED Phase
1. Write a failing test for the feature
2. Run tests: `npm test`
3. Verify test fails for the right reason
4. Call: `autopilot_complete_phase` with test results

### GREEN Phase
1. Write minimal code to make test pass
2. Run tests: `npm test`
3. Verify all tests pass
4. Call: `autopilot_complete_phase` with test results

### COMMIT Phase
1. Stage changes: `git add -A`
2. Call: `autopilot_commit`
3. Move to next subtask or major task checkpoint

## Subtask Completion

After each subtask:
```bash
# Document what was done
npx task-master update-subtask --id=X.Y --prompt="Completed: ..."

# Get next action
npx task-master autopilot next
```

## Major Task Completion

After all subtasks done:
1. Mark task done: `npx task-master set-status --id=X --status=done`
2. Post HITL announcement (see `human-in-the-loop-workflow.md`)
3. **STOP and wait for human approval**

## Crash Recovery

```bash
./tdd/scripts/recovery-helper.sh
```

This will:
- Check for crashed session
- Run tests on partial work
- Help decide: keep or discard

## Quick Reference

| Action | Command |
|--------|---------|
| List tasks | `npx task-master list --with-subtasks` |
| Start work | `./tdd/scripts/start-agent-work.sh` |
| Next subtask | `npx task-master autopilot next` |
| Mark done | `npx task-master set-status --id=X --status=done` |
| Clean finish | `./tdd/scripts/autopilot-wrapup.sh` |
| Abort/reset | `./tdd/scripts/autopilot-reset.sh` |
| Crash recovery | `./tdd/scripts/recovery-helper.sh` |

