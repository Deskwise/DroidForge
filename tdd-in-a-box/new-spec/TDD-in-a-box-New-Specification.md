# TDD-in-a-Box: New Specification

This specification defines a hardened, low-touch Test-Driven Development (TDD) workflow that any agent can execute reliably in a new repository. It prioritizes clear gates, automated guardrails, and documentation that makes the workflow self-describing. The design assumes Task-master drives task state and Autopilot executes subtasks end-to-end.

## Goals

1. **Immediate onboarding:** A new agent can run a single documented entry point and be productive without tribal knowledge.
2. **Strict instruction awareness:** Agents must acknowledge project instructions (`AGENTS.md` scopes) before they can start work.
3. **Role isolation:** Agents may only operate in one of three roles—**Implement**, **Audit**, or **Remediate**—with tooling that enforces the choice.
4. **Hands-off orchestration:** Task-master and Autopilot coordinate task selection, execution, and handoff with minimal manual steps.
5. **Doc-first TDD:** Every task produces auditable artifacts: tests first, code second, documentation always.

## Core Principles

- **RED → GREEN → REFACTOR is mandatory:** Every change begins with a failing test, then minimal code to pass, then cleanup.
- **Task-master as single source of truth:** All work starts from `task-master list --with-subtasks`, moves through `task-master autopilot start <id>`, and is recorded back via Task-master updates.
- **Documentation is an artifact, not an afterthought:** Each main task gets a documentation folder capturing implementation notes, audit outcomes, and remediation details.
- **Audit then remediate:** Audits are not optional; remediation executes every finding or clearly defers it in Task-master.
- **No freeform coding:** Agents cannot touch code unless operating under a declared role for a specific task/subtask.

## Roles and Responsibilities

### Implement (primary development)
- Create or refine tests before code changes.
- Keep Autopilot in lockstep: accept prompts, do not skip steps.
- Produce a short implementation log in the task folder noting test cases added, design decisions, and constraints.

### Audit (verification)
- Follow `tdd-in-a-box/AUDITOR.md` plus this spec.
- Re-run the relevant test suite independently of previous agents’ results.
- Create an audit report under `docs/audits/` and mirror the summary into the task folder.
- If a failure is found, immediately queue a remediation subtask in Task-master.

### Remediate (fix audit findings)
- Start from the latest audit report; treat findings as requirements.
- Write failing tests that mirror each audit issue before fixing behavior.
- Update the audit report with remediation notes and cross-link to the implementation log.

## Automation and Guardrails

1. **Instruction acknowledgment gate:**
   - `tdd-in-a-box/scripts/start-agent-work.sh` now hashes `AGENTS.md`, `tdd-in-a-box/AGENTS.md`, and this specification.
   - The first run (or after any of these files change) pauses until the agent confirms they have read them; the acknowledgment is stored under `~/.factory/tdd-box/acks/` for the current repository.
2. **Role gate:**
   - `TDD_AGENT_ROLE` must be set to `implement`, `audit`, or `remediate` before work starts. The start script refuses to launch otherwise and records the chosen role for traceability.
3. **Task-master/Autopilot orchestration:**
   - Work begins with `task-master list --with-subtasks`, then `./tdd-in-a-box/scripts/start-agent-work.sh` to claim and lock a task.
   - Autopilot drives each subtask; agents respond only to its prompts and log plan/outcomes through Task-master commands.
4. **Session hygiene:**
   - Dirty working trees halt Autopilot startup; cleanup or commit before proceeding.
   - Stale sessions are blocked until `./tdd-in-a-box/scripts/autopilot-reset.sh` resolves them.
5. **Documentation automation:**
   - Every main task gets a folder (see below) with templated markdown files. Templates can be pre-populated via a lightweight generator script (future work) or copied manually from this spec.

## Standard Workflow

1. **Prerequisites (user responsibility):** Install Node.js, Task-master CLI, and Autopilot. Ensure `task-master` is on `PATH`.
2. **Repo prep:** Follow `tdd-in-a-box/new-spec/tdd-install.md` to install dependencies, set executable bits, and scaffold Task-master state.
3. **Pre-session checks:**
   - Export `TDD_AGENT_ROLE` (`implement` | `audit` | `remediate`).
   - Run `task-master list --with-subtasks` to sync context (expected to succeed once Task-master is installed).
   - Run `./tdd-in-a-box/scripts/start-agent-work.sh` to enforce instruction acknowledgment, apply the role gate, validate cleanliness, and obtain the exact `task-master autopilot start <id>` command.
4. **Execution loop (per subtask):**
   - Autopilot proposes the next action; agents only perform that action.
   - For implementation: add/adjust a failing test, run it, write minimal code to pass, then refactor safely.
   - For audits: run the suite, record findings, and open remediation subtasks immediately.
   - For remediation: reproduce failures with explicit tests, fix them, and update audit notes.
5. **Documentation:**
   - Update the task folder with: implementation log, audit report link/summary, remediation notes, and decision records.
   - Keep entries concise (bullet lists, timestamps, commands run) so the next agent can continue without guesswork.
6. **Handoff:**
   - Run drift checks (`task-master list --with-subtasks`, `git status -sb`).
   - Use `./tdd-in-a-box/scripts/autopilot-wrapup.sh` to close sessions and log status.

## Documentation Layout per Main Task

For each main task `TASK-XYZ`, create `docs/tasks/TASK-XYZ/` containing:

- `README.md`: Brief scope, links to Task-master task/subtasks, and the assigned role(s).
- `implementation.md`: TDD notes (tests added, design decisions, risks).
- `audit.md`: Summary of audit steps, test commands, pass/fail matrix, and generated artifacts (link to `docs/audits/` when applicable).
- `remediation.md`: Each finding, the failing test that reproduced it, and how it was fixed.
- `handoff.md`: Open questions, deferred items, and next steps.

This structure keeps all subtask documentation anchored to the parent task while allowing direct links in Task-master.

## Simplifications and Reliability Improvements

- **Single entrypoint:** `tdd-in-a-box/new-spec/tdd-install.md` is the only onboarding document agents need. It links back to this specification and the guardrail scripts.
- **Role clarity:** Environment-variable gate prevents accidental context switching between implementation and audit duties.
- **Instruction enforcement:** Hash-based acknowledgments eliminate the recurring issue of agents skipping `AGENTS.md`.
- **Autopilot-first execution:** By forcing task claims and command generation through the start script, agents avoid ad-hoc task selection.
- **Documented defaults:** The standard task-folder layout removes ambiguity about where to store TDD evidence.

## Gap Analysis (Residual Risks and Mitigations)

1. **Task-master availability:** If Task-master is not installed or reachable, the workflow cannot start. Mitigation: `tdd-install.md` emphasizes installation steps and expected validation commands; consider adding a preflight CI check in the future.
2. **Human approval latency:** Autopilot pauses for human approval between subtasks; delays can stall progress. Mitigation: keep approvals asynchronous (comment templates in `docs/guides/human-in-the-loop-workflow.md`) and document pending approvals in the task folder.
3. **Documentation drift:** Agents might forget to update task folders. Mitigation: add a lightweight checklist to `autopilot-wrapup.sh` (future work) or enforce a pre-commit hook that checks for updated task docs when code changes touch tests.
4. **Tooling entropy across repos:** New repositories might tweak paths or scripts. Mitigation: keep this spec co-located in `tdd-in-a-box/new-spec/` for copy/paste portability, and update the hash gate whenever instructions change.
5. **Audit completeness:** Automated audits still rely on human diligence. Mitigation: require explicit mapping from each audit finding to a remediation test case in `remediation.md`, and flag missing mappings in reviews.

With these guardrails, any agent can enter the repo, declare their role, acknowledge instructions once, and let Task-master + Autopilot drive a predictable TDD cycle.
