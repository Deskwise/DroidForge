---
title: "Autopilot Agent Runbook"
description: "Hands-off operating procedure for agents running the Task-master TDD workflow"
---

# Autopilot Agent Runbook

This runbook tells an agent exactly how to run a task end to end in a repository that follows the DroidForge guardrails. Follow every step in order—no interpretation required.

---

## 1. Pre-session ritual

1. Read `AGENTS.md` and `docs/guides/taskmaster-guardrails.md`.
2. Run:
   ```bash
   task-master list --with-subtasks
   ```
   Confirm the task tree matches expectations.
3. Verify a clean working tree:
   ```bash
   git status -sb
   ```
   If dirty, stop and resolve before moving on.

---

## 2. Launch the workflow

1. Execute the helper script:
   ```bash
   ./scripts/start-agent-work.sh
   ```
   - The script refuses to continue if the tree is dirty or an Autopilot session is stale.
   - It prints a single `npx task-master autopilot start …` command—copy it exactly.
2. Paste and run the provided command to start Autopilot for the assigned task or subtask.
3. If the script reports a stale session, run `./scripts/autopilot-reset.sh` and re-run the helper.

---

## 3. Follow the Autopilot TDD loop

Autopilot drives a RED → GREEN → COMMIT cycle. Use `task-master autopilot next` only when prompted.

### RED phase (write failing test)
1. Plan in Task-master:
   ```bash
   task-master update-subtask --id=<id> --prompt="Plan: …"
   ```
2. Implement the minimal failing test(s).
3. Report results through Autopilot:
   ```bash
   task-master autopilot complete --phase=RED --tests="npm test -- <scope>"
   ```

### GREEN phase (make tests pass)
1. Implement code changes that satisfy the failing tests.
2. Rerun the same scoped command via Autopilot:
   ```bash
   task-master autopilot complete --phase=GREEN --tests="npm test -- <scope>"
   ```

### COMMIT phase (structured commit)
1. Record outcomes:
   ```bash
   task-master update-subtask --id=<id> --prompt="Outcome: …"
   ```
2. Let Autopilot commit:
   ```bash
   task-master autopilot commit
   ```
3. Do **not** call `task-master autopilot next` until the user approves the next subtask.

---

## 4. Human-in-the-loop checkpoint

After Autopilot finishes COMMIT for a subtask:
1. Announce completion using the template in `docs/guides/human-in-the-loop-workflow.md`.
2. Stop work. Wait for explicit user approval before proceeding.
3. When directed to continue, run `task-master autopilot next` to fetch instructions for the next subtask.

---

## 5. Handling interruptions

- **Resume sessions**: if the editor or terminal restarts, run `task-master autopilot resume` before continuing.
- **Abort safely**: only with user approval; run `task-master autopilot abort` then document why.
- **Dirty tree warning**: clean the tree (`git status`, `git stash -u`, or commit) before rerunning Autopilot.
- **Stale pointer warning**: execute `./scripts/autopilot-reset.sh` to archive and clear `workflow-state.json`.

---

## 6. Session wrap-up

1. Log the final status snapshot:
   ```bash
   ./scripts/autopilot-wrapup.sh
   ```
2. Confirm Task-master reflects reality:
   ```bash
   task-master list --with-subtasks
   ```
3. Ensure the git tree is clean:
   ```bash
   git status -sb
   ```
4. Document outstanding work (if any) with `task-master update-subtask` or `update-task`.

---

## 7. Ready for the next agent

Once the checklist above is complete:
- The repo is clean.
- Task-master shows accurate statuses.
- Autopilot session state is either complete or reset.
- Wrap-up log captures the latest status.

At this point, handoff is complete—another agent can start from step 1 without additional context.
