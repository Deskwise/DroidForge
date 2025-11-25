# TDD-in-a-Box Installation (New Repository Drop-In)

This guide bootstraps the “TDD-in-a-Box” workflow for a new repository. Follow the steps in order; they assume you copied the `tdd-in-a-box/` folder into the repo root.

## Prerequisites (user responsibility)

- Node.js 18+ and npm.
- Task-master CLI (`npm install --global task-master-ai` or use `npx task-master`).
- Autopilot runtime shipped with Task-master (no separate install if Task-master is present).
- `jq` for script parsing.

## 1. Prepare the workspace

1. Ensure the repository is clean: `git status -sb` should show no changes.
2. Mark helper scripts executable:
   ```bash
   chmod +x tdd-in-a-box/scripts/*.sh
   ```
3. Install Task-master locally (if not global):
   ```bash
   npm install --save-dev task-master-ai
   ```
4. Initialize Task-master state:
   ```bash
   npx task-master initf
   ```
5. (Optional) Configure a custom tag prefix:
   ```bash
   npx task-master add-tag tdd --copy-from-current || true
   npx task-master use-tag tdd
   ```

## 2. Validate tooling

Run the following to confirm the CLI and guardrails are available:
```bash
npx task-master list --with-subtasks
./tdd-in-a-box/scripts/autopilot-reset.sh || true
./tdd-in-a-box/scripts/autopilot-wrapup.sh || true
```
If any command fails, resolve it before proceeding.

## 3. Enforce instruction awareness

The workflow requires proof that agents read the governing instructions. Before starting work:

1. Open and read:
   - `AGENTS.md`
   - `tdd-in-a-box/AGENTS.md`
   - `tdd-in-a-box/new-spec/TDD-in-a-box-New-Specification.md`
2. Run the start script once to record acknowledgment:
   ```bash
   export TDD_AGENT_ROLE=implement   # or audit | remediate
   ./tdd-in-a-box/scripts/start-agent-work.sh
   ```
   The script stores an acknowledgment hash under `~/.factory/tdd-box/acks/` for this repository. If any of the files above change, the script will prompt again.

## 4. Daily work loop

1. Set your role each session: `export TDD_AGENT_ROLE=implement` (or `audit`/`remediate`).
2. Sync context: `task-master list --with-subtasks`.
3. Launch the gatekeeper: `./tdd-in-a-box/scripts/start-agent-work.sh`.
4. Copy the printed `task-master autopilot start <id>` command and run it.
5. Follow Autopilot prompts. Stick to the declared role: implementation, auditing, or remediation only.
6. Wrap up with `./tdd-in-a-box/scripts/autopilot-wrapup.sh`, ensuring Task-master status and `git status -sb` are clean.

## 5. Documentation drop points

- For each main task, create `docs/tasks/<task-id>/` with `README.md`, `implementation.md`, `audit.md`, `remediation.md`, and `handoff.md` (see the specification for details).
- Store audit reports in `docs/audits/` per `tdd-in-a-box/AUDITOR.md`.
- Keep session artifacts and acknowledgment hashes under `~/.factory/` (already used by the scripts).

After this setup, any new agent only needs to export a role and run the start script to enter a fully guided TDD cycle.
