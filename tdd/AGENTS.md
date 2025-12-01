# Agent Operating Agreement

Follow every step below before touching code. These rules keep Autopilot + Task-master in sync.

## Pre-Session Ritual (Mandatory)

1. Read `tdd/docs/guides/taskmaster-guardrails.md`
2. Run:
   ```bash
   npx task-master list --with-subtasks
   ```
3. Verify clean tree: `git status -sb` must show no changes

## Starting Work

1. Run the helper:
   ```bash
   ./tdd/scripts/start-agent-work.sh
   ```
2. Copy the exact `npx task-master autopilot start …` command it prints
3. If script refuses (dirty tree, stale session), fix the issue first

## During Each Subtask

- Log plan first: `task-master update-subtask --id=<id> --prompt="Plan: …"`
- Set in-progress: `task-master set-status --id=<id> --status=in-progress`
- Follow RED → GREEN → COMMIT loop exactly
- Document outcomes with `task-master update-subtask`

## Human-in-the-Loop Checkpoint

After completing **all subtasks** in a major task:
1. Mark task done: `task-master set-status --id=<taskId> --status=done`
2. Announce using template in `tdd/docs/guides/human-in-the-loop-workflow.md`
3. **STOP. Wait for approval** before starting the next major task

## Audit Protocol (Mandatory)

When asked to **"Audit Task [ID]"**:
1. Read `tdd/AUDITOR.md` immediately
2. Run tests yourself: `npm test`
3. Verify actual files exist (don't trust previous agent's summary)
4. Generate report: `docs/audits/audit-task-[ID].md`
5. **If PASS**: Commit the report
6. **If FAIL**: List critical issues; do not commit

## Session Wrap-Up

1. Run `./tdd/scripts/autopilot-wrapup.sh`
2. Verify: `task-master list --with-subtasks`
3. Ensure clean: `git status -sb`

## Crash Recovery

If agent crashes mid-work:
```bash
./tdd/scripts/recovery-helper.sh
```
This runs tests and helps decide whether to keep or discard partial work.

## Honesty Clause

Be brutally honest about blockers or mistakes. Report anomalies immediately. Never guess.

