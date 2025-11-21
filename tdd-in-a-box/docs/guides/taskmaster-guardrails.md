---
title: "Task-master Workflow Guardrails"
description: "Locked-down operating procedure for agents working in DroidForge"
---

# Task-master Workflow Guardrails

These guardrails keep Task-master as the single source of truth and are mandatory for every agent session.

## 1. Pre-session ritual

1. Read `AGENTS.md` and skim the relevant editor rules (e.g., `.windsurf/rules/taskmaster.md`, `.windsurf/rules/dev_workflow.md`).
2. Run:
   ```bash
   task-master list --with-subtasks
   ```
   Do **not** open editors or touch code until you review the live task tree.
3. Select work strictly via `task-master next` and `task-master show <id>`.

## 2. Subtask lifecycle (no exceptions)

For every subtask:

1. `task-master show <subtaskId>` – confirm requirements.
2. `task-master update-subtask --id=<subtaskId> --prompt="Plan…"` – log the concrete plan *(files, diffs, risks)* before coding.
3. `task-master set-status --id=<subtaskId> --status=in-progress` – only then begin edits.
4. During implementation, append discoveries using `update-subtask`.
5. When done, append the outcomes (what worked, what failed) with `update-subtask`, then `task-master set-status --id=<subtaskId> --status=done`.
6. Mark the parent task complete only when all subtasks are done.

All external research must flow through `task-master research …`; append findings to the same subtask immediately.

## 3. Tag discipline

- Operate in the default `master` tag unless the user explicitly approves a new tag.
- Proposed tags follow the patterns in your workflow rules (branch mirroring, experiments, etc.) and **must** be acknowledged by the user before execution.

## 4. Drift detection after every work block

After each coding block (and before any commit):

```bash
task-master list --with-subtasks
git status -sb
```

If `.taskmaster/tasks/tasks.json` or `git status` shows unexpected changes, stop and reconcile using Task-master commands before continuing.

## 5. Commit gatekeeper helper

Use the `tm-commit` helper to prevent committing when Task-master state is out of sync. Add the following shell function to your environment (e.g., `~/.bashrc`):

```bash
tm-commit() {
  task-master list >/dev/null || return 1
  git diff --cached --quiet -- .taskmaster/tasks/tasks.json || \
    { echo "[WARN] tasks.json changed without Task-master"; return 1; }
  git commit "$@"
}
```

Invoke `tm-commit` instead of `git commit`. The helper aborts if Task-master cannot respond or if `tasks.json` was modified outside the CLI.

## 6. Session handoff

Before finishing:

1. `task-master list --with-subtasks` – ensure statuses reflect reality.
2. `git status -sb` – repository must be clean (or staged for the next change set).
3. Record any outstanding work inside Task-master (never in external notes).

With these guardrails in place, every future agent inherits a Task-master-only workflow and cannot drift into ad-hoc tracking.
