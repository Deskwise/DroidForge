# Agent Operating Agreement

Welcome! Follow every step below before touching code. These rules keep the Autopilot + Task-master workflow sane.

## First-time setup (run once per fresh repo)

If the TDD-in-a-Box assets were just copied into this repository, run the automation plan in `auto-install/setup4agents.json`. It mirrors the steps below so agents can either execute the JSON or follow this manual checklist:

1. Copy the bundle contents into the repo root (skip if already done):
   ```bash
   cp -R tdd-in-a-box/* ./
   ```
2. Install Task-master and scaffold its state:
   ```bash
   npm install --save-dev task-master-ai
   npx task-master initf
   ```
3. Make the helper scripts executable:
   ```bash
   chmod +x scripts/start-agent-work.sh
   chmod +x scripts/autopilot-reset.sh
   chmod +x scripts/autopilot-wrapup.sh
   ```
4. Smoke-test the guardrails:
   ```bash
   npx task-master list --with-subtasks
   ./scripts/start-agent-work.sh || true
   npx task-master autopilot status || true
   ```
5. If you want Autopilot branches prefixed with something other than `master`, edit `.taskmaster/config.json` and change `"defaultTag"` to your preferred prefix (for example `"tdd"`), then run:
   ```bash
   npx task-master add-tag <prefix> --copy-from-current || true
   npx task-master use-tag <prefix>
   ```

For drift checks after setup, use `auto-install/repo_guidance.json` as a machine-readable validator.

## Mandatory pre-session ritual

1. Read `docs/guides/taskmaster-guardrails.md` (rituals, subtask lifecycle, drift checks).
2. Run:
   ```bash
   task-master list --with-subtasks
   ```
   Do not open editors or edit files until you inspect the live task tree.
3. Keep this repo clean: `git status -sb` must show no changes before launching Autopilot.

## How to start work

1. Run the helper:
   ```bash
   ./scripts/start-agent-work.sh
   ```
2. Copy the exact `npx task-master autopilot start …` command it prints. No freelancing.
3. If the script refuses to proceed (dirty tree or stale session), fix the warning (stash/commit, or run `./scripts/autopilot-reset.sh`) and rerun it.
4. Autopilot must start on a task that already has subtasks (e.g., start on `16`, not leaf `16.5`). Expanding a leaf won’t help—expand the parent (`npx task-master expand --id=16`) and run `npx task-master autopilot start 16` so it can walk 16.1–16.5.

## During each subtask

- Log your plan first: `task-master update-subtask --id=<id> --prompt="Plan: …"`.
- Only then set the subtask in progress: `task-master set-status --id=<id> --status=in-progress`.
- Follow Autopilot’s RED → GREEN → COMMIT loop exactly. Use `task-master autopilot next` only when prompted.
- Document discoveries/outcomes with `task-master update-subtask` as you go.

## Human-in-the-loop checkpoint

After Autopilot commits a subtask:
- Announce completion using the template in `docs/guides/human-in-the-loop-workflow.md`.
- Stop. Wait for explicit approval before running `task-master autopilot next`.

## Session wrap-up

1. Run `./scripts/autopilot-wrapup.sh` to log status.
2. `task-master list --with-subtasks` – ensure statuses are correct.
3. `git status -sb` – repo must be clean for the next agent.
4. Record remaining work via `task-master update-subtask`/`update-task` if needed.

## Honesty clause

Be brutally honest about blockers or mistakes. Report anomalies immediately (stale pointers, failing tests, dirty tree you can’t resolve). Never guess.

## Audit Protocol (Mandatory for "Audit" Requests)

When asked to "Audit Task X" or verify completion:
1.  **Read Instructions:** You MUST read `tdd-in-a-box/AUDITOR.md` immediately.
2.  **Verify Artifacts:** Do not trust the previous agent's summary. Check for actual files and tests.
3.  **Run Verification:** Execute the test suite (`npm test`) yourself.
4.  **Generate Report:** Create `docs/audits/audit-task-[ID].md` using the template in `tdd-in-a-box/AUDITOR.md`.
5.  **Outcome:**
    *   **Pass:** Commit the report (`chore: add audit report`).
    *   **Fail:** You (the Auditor) must fix the issues (missing tests, broken integration) if feasible, OR fail the task if fundamental rework is needed.

Following this agreement keeps Autopilot, Task-master, and the human review loop in sync for every agent who follows you.
