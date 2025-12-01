# DroidForge Phase 1 MVP TODO

## Executive Summary
Focus: Deliver intelligent onboarding and safe serial orchestration so agents can be created and used reliably today.

**Current Status:** 25% complete (3 of 12 tasks done, 33 of 76 subtasks done)

## New Structured TODO System

Location: documentation under the `docs/todo` directory.

The structured TODO system provides:
- Current sprint focus in `docs/todo/current-sprint.md`.
- Completion metrics in `docs/todo/completion-metrics.md`.
- Sync notes for Task Master in `docs/todo/task-master-sync.md`.
- Dependency tracking in `docs/todo/dependencies.md`.
- A usage guide in `docs/todo/USAGE.md`.

To refresh metrics, run the sync script:
- `node scripts/sync-todo.mjs`

---

## Phase 1 MVP Tasks (Priority Order)

### 1. Intelligent Onboarding (Tasks 1–5)
Goal: capture 10 mandatory data points via AI parsing, conversational follow-ups, and methodology recommendations.

#### Task 1: Core Onboarding Data Model (DONE)
- [x] Define nested onboarding data with required data, collection metadata, methodology, and team.
- [x] Implement deep merge utilities in the session store.
- [x] Update session types and tests.
- [x] Ensure backward compatibility with legacy flat fields.
- [x] All subtasks (1.1–1.4) completed via Task Master.

#### Task 2: AI-Powered Data Extraction (DONE)
- [x] Complete `parseOnboardingResponse` tool implementation.
- [x] Add comprehensive unit tests (happy path, vague input, inference, merging).
- [x] Integrate structured logging for auditability.
- [x] Handle error paths and edge cases.
- [x] All subtasks (2.1–2.4) completed via Task Master.

#### Task 3: Conversational Follow-up Logic (DONE)
- [x] Implement adaptive question asking for missing or low-confidence fields.
- [x] Create a one-question-at-a-time flow.
- [x] Add session resumption with validation.
- [x] Present a confirmation summary before methodology selection.
- [x] All subtasks (3.1–3.4) completed; validation logic fixed and E2E tests passed.

#### Task 4: Methodology Recommendation Engine (PENDING)
- [ ] Build AI reasoning to recommend exactly three methodologies.
- [ ] Display "because you said…" explanations.
- [ ] Support flexible inputs (numbers, names, intent phrases).
- [ ] Persist final selection and reasoning in session state.

#### Task 5: Onboarding Session Management (PENDING)
- [ ] Ensure session persistence across interruptions.
- [ ] Validate outstanding fields on resume.
- [ ] Maintain state continuity.
- [ ] Add progress tracking and completion detection.

### 2. Droid Roster Generation (Task 6)
Goal: generate methodology-aligned specialist definitions and install commands.

#### Task 6: Roster Generation Service (PENDING)
- [ ] Implement template loading utilities per methodology.
- [ ] Create a `forgeRoster` tool with directory management.
- [ ] Build personalized template population logic.
- [ ] Write populated files and update the generation manifest.
- [ ] Add comprehensive integration tests.
- [ ] Ensure roster names and abilities mirror collected project language.

### 3. Safe Serial Execution (Tasks 7–9)
Goal: execute specialists sequentially with atomic merges and proper locking.

#### Task 7: Execution Manager Core (PENDING)
- [ ] Implement the sequential execution loop.
- [ ] Add execution plan tracking and progress reporting.
- [ ] Create completion summaries for each request.
- [ ] Handle specialist coordination and hand-offs.

#### Task 8: Atomic Worktree Management (PENDING)
- [ ] Implement isolated staging worktrees for each specialist.
- [ ] Add atomic merge semantics with rollback on failure.
- [ ] Ensure the primary branch stays clean during execution.
- [ ] Create worktree cleanup utilities.

#### Task 9: Resource Locking System (PENDING)
- [ ] Implement resource-level locks with read/write semantics.
- [ ] Add detection and prevention of overlapping claims.
- [ ] Support glob pattern-based lock scopes.
- [ ] Create deadlock detection and manual overrides.

### 4. Observability and Operations (Tasks 10–11)
Goal: provide structured logging, audit trails, and safe cleanup.

#### Task 10: Structured Logging Framework (PENDING)
- [ ] Emit structured logs for onboarding, forging, and execution events.
- [ ] Persist manifests, snapshots, and lock state for auditing.
- [ ] Create user-facing summaries that hide implementation internals.
- [ ] Add session history in `.factory/sessions` JSONL streams.

#### Task 11: Cleanup and Revert Tools (PENDING)
- [ ] Implement a `/forge-removeall` command.
- [ ] Add safe removal of roster artifacts and session directories.
- [ ] Create rollback capabilities for failed executions.
- [ ] Ensure cleanup respects manifests and does not affect user files.

### 5. UAT and Documentation (Task 12)
Goal: verify end-to-end flows and update user-facing documentation.

#### Task 12: UAT Scripts and Documentation (PENDING)
- [ ] Update automated UAT scripts for conversational onboarding.
- [ ] Add methodology selection and roster generation tests.
- [ ] Create AI reasoning validation scripts.
- [ ] Update README and quickstart documentation with new flows.
- [ ] Update audit-log documentation with onboarding and execution details.
- [ ] Ensure the test suite and UAT scripts pass completely.

## Immediate Next Steps

1. Bring Task 3 (conversational follow-up logic) to completion and reflect that in Task Master.
2. Start Task 4 (methodology recommendation engine) once Task 3 is stable.
3. Begin Task 5 (session management) as soon as methodology selection is reliable.
4. Use the sync script and metrics document to keep progress visible.

## Success Metrics for the Next Work Block

- [ ] Conversational follow-up system is fully working and tested.
- [ ] At least one methodology recommendation path is implemented and validated.
- [ ] Onboarding data model and parsing remain stable under new flows.
- [ ] All changes are covered by tests and reflected in the TODO documentation.
