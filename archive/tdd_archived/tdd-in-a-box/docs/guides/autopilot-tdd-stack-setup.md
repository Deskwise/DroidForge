---
title: "Autopilot + Task-master Stack Setup"
description: "How to bootstrap the DroidForge-style workflow in a fresh repository"
---

# Autopilot + Task-master Stack Setup

This guide reconstructs the exact workflow stack we rely on in DroidForge so you can drop it into any new repository. Follow the steps in order—when you finish, you’ll have:

- **Task-master** orchestrating tasks/subtasks via `.taskmaster/`
- **Autopilot TDD loop** (RED → GREEN → COMMIT) wired through CLI + MCP
- **Guardrails + documentation** ensuring every agent follows the same ritual
- **Helper scripts** (`start-agent-work`, `autopilot-reset`, `autopilot-wrapup`) preventing common failure modes

---

## 1. System prerequisites

1. Node.js **>= 18** (we standardize on 20.x for MCP compatibility)
2. npm **>= 9**
3. Git CLI (Autopilot shell-outs to git for commits)
4. `jq` available on PATH (used by scripts)
5. For MCP-aware editors (e.g., Windsurf, Cursor), ensure the MCP registry can discover local servers

---

## 2. Repository bootstrapping checklist

1. Clone the new repo and `cd` into it
2. Initialize npm if the project doesn’t have a package.json yet:
   ```bash
   npm init -y
   ```
3. Install Task-master as a dev dependency:
   ```bash
   npm install --save-dev task-master-ai
   ```
4. Run Task-master init to scaffold `.taskmaster/`:
   ```bash
   npx task-master init
   ```
   This generates:
   - `.taskmaster/tasks/tasks.json`
   - `.taskmaster/state.json`
   - Base config for CLI operations

---

## 3. Drop-in workflow assets

Copy the `starter-kit/` folder from this repository into the root of your new repo, then promote its contents to the same relative paths. The **TDD-in-a-Box** bundle already includes the hardened defaults:

```
AGENTS.md                             # Agent operating agreement
scripts/start-agent-work.sh           # Finds the exact next Autopilot command
scripts/autopilot-reset.sh            # Clears stale workflow state safely
scripts/autopilot-wrapup.sh           # Captures end-of-session status snapshot
docs/guides/taskmaster-guardrails.md  # Mandatory guardrails ritual
docs/guides/human-in-the-loop-workflow.md
docs/guides/autopilot-agent-runbook.md
docs/guides/autopilot-tdd-playbook.md
docs/project/onboarding-flow-todo.md  # Running log of guardrail work
```

> If you use Windsurf (or another MCP-aware editor), also copy the repo’s `.windsurf/` rules directory so agents inherit the same editor guardrails.

### Ensure AGENTS.md exists at the repo root

1. If your repo does **not** have an `AGENTS.md`, copy the bundle’s version to the root unchanged, then update contact info or project-specific notes.
2. If an `AGENTS.md` already exists, merge the bundle’s content into it so the guardrails in TDD-in-a-Box remain the authoritative front door.

### Make scripts executable
```bash
chmod +x scripts/start-agent-work.sh scripts/autopilot-reset.sh scripts/autopilot-wrapup.sh
```

---

## 4. Configure MCP-enabled editor (optional but recommended)

To give agents the same MCP tooling:

1. Update the editor’s MCP config (example for Windsurf at `~/.codeium/windsurf/mcp_config.json`):
   ```json
   {
     "mcpServers": {
       "task-master-ai": {
         "command": "npx",
         "args": ["task-master", "mcp"],
         "env": {
           "TASK_MASTER_TOOLS": "all",
           "ANTHROPIC_API_KEY": "...",
           "OPENAI_API_KEY": "..."
         }
       }
     }
   }
   ```
2. Restart the editor so it loads the new MCP server definition
3. Verify the `task-master-ai` server appears in the MCP panel with tools exposed

---

## 5. Seed the task graph

Use `.taskmaster/tasks/tasks.json` to define an initial task/subtask tree. Tips:

- Mirror the real deliverables (Task 2, Subtask 1.1, etc.)
- Populate `details`, `testStrategy`, and dependencies so agents know exact expectations
- Mark one task `pending` to simulate the “next assignment” workflow

You can use `npx task-master add-task` / `add-subtask` to build the graph programmatically.

---

## 6. Validate the guardrails

Run the following smoke checks:

```bash
# 1. Task listing works
npx task-master list --with-subtasks

# 2. start-agent-work script refuses dirty trees
./scripts/start-agent-work.sh

# 3. Autopilot CLI is available
npx task-master autopilot status || true
```

If `start-agent-work.sh` warns about a dirty tree, commit/stash or run `git clean` until the repo is clean—this is by design.

---

## 7. Persist best-practice docs

Ensure the top-level docs you copied are linked:

- `AGENTS.md` (included in the kit) is the mandated entry point for agents. Update contact info or repo-specific notes before first use.
- `docs/guides/taskmaster-guardrails.md` describes rituals (pre-session, subtask lifecycle, drift checks)
- `docs/guides/human-in-the-loop-workflow.md` enforces post-subtask approvals before next work begins
- `docs/guides/autopilot-agent-runbook.md` teaches the RED → GREEN → COMMIT flow
- `docs/guides/autopilot-tdd-playbook.md` provides step-by-step TDD execution detail
- Optionally, add further guidance (e.g., taskmaster best practices) once your team develops them

---

## 8. Run a dry-run agent session

1. Ensure `.taskmaster/tasks/tasks.json` has at least one pending subtask
2. Execute the agent startup script:
   ```bash
   ./scripts/start-agent-work.sh
   ```
3. Copy/paste the command printed (e.g., `npx task-master autopilot start <taskId.subId>`)
4. Follow Autopilot prompts to run RED → GREEN → COMMIT for a trivial change
5. Confirm `autopilot status` shows the session progressing correctly
6. After completion, run `task-master list --with-subtasks` to ensure statuses updated

---

## 9. Snapshot the setup branch

Once everything passes the dry run:

1. Commit the setup artifacts:
   ```bash
   git add AGENTS.md docs/ scripts/ .taskmaster/
   git commit -m "chore: bootstrap Autopilot Task-master stack"
   ```
2. Tag the commit or branch (`setup/autopilot-stack`) so you can re-use it in future repos
3. Document any repo-specific adjustments in `docs/project/onboarding-flow-todo.md`

---

## 10. Summary

You now have a repository that mirrors the hardened DroidForge Autopilot environment:

- Task-master provides deterministic task orchestration
- Autopilot enforces TDD flow with persisted state
- Guardrail docs + scripts eliminate ambiguity for agents
- MCP integration (optional) gives agents CLI parity via editor tools

Keep these assets under version control so the workflow remains portable. Whenever the stack evolves (new guardrails, scripts, or doc updates), update this guide and re-tag a reference branch for future clones.
