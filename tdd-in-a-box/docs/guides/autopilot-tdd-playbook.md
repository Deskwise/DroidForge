---
title: "Autopilot TDD Playbook"
description: "Hands-off workflow for Task-master Autopilot"
---

# Autopilot TDD Playbook

Use this playbook to execute every coding task through Task-master Autopilot with zero ambiguity. Complete these steps in order before writing or running any code.

## 1. Verify MCP environment (per workspace boot)

1. Ensure your editor’s MCP configuration (e.g., `~/.codeium/windsurf/mcp_config.json`) includes the `task-master-ai` server entry with `TASK_MASTER_TOOLS="all"` and any available API keys (`ANTHROPIC_API_KEY`, etc.).
2. Restart the editor so the MCP registry reloads the configuration.
3. Open the MCP panel and confirm `task-master-ai` is listed with tools enabled (>0).
   ```bash
   # Optional CLI sanity check (do not leave running)
   task-master models list
   ```

## 2. Prepare the repository

1. Pull latest `main`, then verify a clean working tree:
   ```bash
   git status -sb
   ```
2. Run the guardrails pre-session ritual:
   ```bash
   task-master list --with-subtasks
   ```
3. Identify the assigned task (from the user or `task-master next`).

## 3. Start the Autopilot workflow

1. Ensure you are on a clean branch, or checkout `main` and pull latest changes.
2. Launch Autopilot for the task:
   ```bash
   task-master autopilot start <taskId>
   ```
3. Observe the RED-phase instructions printed by `task-master autopilot next`. Autopilot creates a feature branch (e.g., `master/task-<id>-...`) automatically.

## 4. RED phase – write the failing test

1. Follow `task-master autopilot next` to receive the RED assignment (usually writing or updating a failing test).
2. Before editing files, log the plan:
   ```bash
   task-master update-subtask --id=<taskId.subId> --prompt="Plan: …"
   ```
3. Implement only enough test code to fail for the right reason.
4. Record the failing result via Autopilot:
   ```bash
   task-master autopilot complete --phase=RED --tests="npm test -- <scope>"
   ```
   - Always scope tests to the relevant file/suite to avoid long runs.
   - Autopilot captures the output and ensures the failure is logged.

## 5. GREEN phase – make the test pass

1. Run `task-master autopilot next` to enter GREEN.
2. Implement the minimal code required to satisfy the failing test.
3. Re-run the scoped command through Autopilot:
   ```bash
   task-master autopilot complete --phase=GREEN --tests="npm test -- <scope>"
   ```
4. If the test still fails, Autopilot guides you back to adjust implementation; repeat until GREEN succeeds.

## 6. COMMIT phase – structured commit & logging

1. After GREEN succeeds, Autopilot transitions to COMMIT.
2. Document outcomes:
   ```bash
   task-master update-subtask --id=<taskId.subId> --prompt="Outcome: …"
   ```
3. Let Autopilot commit with metadata:
   ```bash
   task-master autopilot commit
   ```
   - Autopilot ensures the branch is clean, includes test output summaries, and associates the commit with the task/subtask.
4. Use `task-master autopilot next` to advance to the next subtask or finish the workflow **only after** the user approves moving on.

## 7. Handling interruptions & resumes

- To check progress:
  ```bash
  task-master autopilot status
  ```
- To resume after editor restart or branch switch:
  ```bash
  task-master autopilot resume
  ```
- To abort (only when necessary and after logging rationale):
  ```bash
  task-master autopilot abort
  ```
  Restore any stashed work with `git stash pop` before retrying.

## 8. Test execution safeguards

- **Never run raw `npm test`**. Always scope through Autopilot or run targeted suites:
  ```bash
  npm test -- src/mcp/__tests__/sessionStore.test.ts
  ```
- Prefer `node --test --loader ts-node/esm <file>` for single-suite runs if Autopilot requests manual validation.
- For long-running suites, use:
  ```bash
  task-master autopilot complete --tests="npm test -- <scope> --runInBand"
  ```
  to serialize execution.

## 9. Workflow completion checklist

1. `task-master list --with-subtasks` – ensure statuses reflect RED/GREEN/COMMIT completion.
2. `git status -sb` – repository must be clean.
3. Post summary in Task-master if required:
   ```bash
   task-master update-task --id=<taskId> --prompt="Verification: Autopilot completed on <date>."
   ```
4. Move to the next task via `task-master next` and repeat this playbook.

Following this playbook guarantees every agent executes a consistent RED → GREEN → COMMIT cycle and avoids terminal freezes by channeling all test runs through Autopilot.
