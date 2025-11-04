# DroidForge Product Requirements Document (PRD)

## 1. Document Control
- **Product:** DroidForge
- **Version:** 0.1 (Initial draft)
- **Authors:** Cascade (referencing core specs)
- **Stakeholders:** Factory.ai Droid team, Deskwise engineering, Product, Security review board
- **Related Specs:** `docs/specifications/onboarding-spec.md`, `docs/specifications/implementation-plan.md`, `docs/SPEC-METHODOLOGY-RECOMMENDATIONS.md`, `docs/project/audit-log.md`

## 2. Executive Summary
DroidForge forges custom AI specialist teams that understand a repository's tech stack and conventions. Phase 1 delivers intelligent onboarding and safe serial orchestration; Phase 2 extends the proven architecture to safe parallel execution. This PRD captures end-to-end requirements across onboarding, methodology guidance, roster generation, execution management, and operational safeguards to reach production readiness.

## 3. Background & Problem Statement
- **Current State:** Scripted onboarding with partial context capture; serial execution manager with staging/locking foundations. Documentation highlights gaps versus the intelligent onboarding vision, especially around data collection and methodology recommendations.
- **User Problems:**
  - Generic AI agents lack project-specific knowledge, producing rework.
  - Coordinating multi-scope features manually is slow and error-prone.
  - Teams need reliable automation that respects compliance and auditability.
- **Business Opportunity:** Provide a differentiated AI development experience that scales from solo builders to enterprise teams, delivering trustworthy automation with clear controls.

## 4. Product Vision & Goals
- **Vision:** "Forge AI teams that understand your project as well as you do, orchestrating work safely from discovery to deployment."
- **Primary Goals:**
  1. Deliver intelligent conversational onboarding capturing all required project context without burdening users.
  2. Assemble methodology-aligned AI specialists that produce consistent, reviewable outputs.
  3. Guarantee safe, auditable automation with reversible changes.
  4. Harden the execution framework to enable future parallelism without regressions.

## 5. Success Metrics & KPIs
- **Onboarding Completion Rate:** ≥95% of sessions capture all 10 mandatory data points within 7 minutes.
- **Recommendation Satisfaction:** ≥80% of users accept one of the top 3 methodology recommendations on first presentation.
- **Execution Reliability:** 99% of orchestrated runs complete without manual intervention or unhandled errors.
- **Adoption:** ≥70% of new installations trigger `/forge-start` within their first two sessions.
- **Audit Coverage:** 100% of executions emit manifest, lock, and snapshot entries for traceability.

## 6. Target Users & Personas
1. **Solo Builder (Beginner–Intermediate):** Seeks guidance, constrained budget, values automation that explains itself.
2. **Team Lead / Tech Lead:** Coordinates multiple contributors, needs methodology enforcement, wants predictable hand-offs.
3. **Enterprise Platform Owner:** Responsible for compliance, change management, and audit trails; requires deterministic automation.

## 7. User Scenarios & Use Cases
- Start a new project, describe goals, and receive methodology-driven roster tailored to context.
- Resume onboarding after interruption, confirm collected data, adjust methodology selection.
- Delegate a feature via `/df`, observe staged changes, review diffs, approve merge.
- Add or remove custom specialists as scope evolves while maintaining manifest integrity.
- Audit past executions using logs, manifests, and lock history to satisfy compliance reviews.

## 8. Scope
### 8.1 In Scope
- Intelligent onboarding with AI parsing, adaptive follow-ups, and methodology recommendations.
- Methodology-aware roster generation, command installation, and user guide authoring.
- Execution manager enforcing resource locks, staging worktrees, progress reporting, and cleanup tooling.
- Observability, logging, and documentation updates aligned with delivered capabilities.

### 8.2 Out of Scope
- Live parallel execution (Phase 2 deliverable).
- GUI dashboards beyond terminal/CLI output.
- Third-party integrations outside Factory.ai Droid CLI and npm distribution.
- Maintenance of legacy archives under `docs/_archive_legacy/`.

## 9. Functional Requirements

### 9.1 Onboarding Experience
1. Capture and persist the 10 mandatory data points (vision, audience, timeline, quality vs speed, team size, experience, budget, deployment, security, scalability).
2. Use AI reasoning—no keyword pattern matching—to extract structured data and confidence levels from freeform answers.
3. Ask follow-up questions conversationally, one at a time, only for missing or low-confidence fields.
4. Present a summary for confirmation before progressing to methodology selection.
5. Allow resuming sessions with validation of outstanding fields and state continuity.

### 9.2 Methodology Recommendations
1. Recommend exactly three methodologies with explicit “because you said …” reasoning tied to collected context.
2. Display a curated top-six list, denoting primary recommendations.
3. Accept flexible inputs (numbers, names, intent phrases, delegation) when users choose methodologies.
4. Persist final selection, reasoning, and any user edits in session state and manifests.

### 9.3 Droid Roster Generation
1. Generate specialist definitions (JSON + Markdown) under `.factory/` and `.droidforge/` with methodology-specific narratives.
2. Ensure roster names, abilities, and purposes mirror collected project language and chosen methodology.
3. Support optional custom droids entered as freeform text, deriving slug, role, and description via AI parsing.
4. Trigger command installation and user guide generation that summarize roster usage and available slash commands.

### 9.4 Execution Management
1. Execute specialists sequentially (Phase 1) using isolated staging worktrees with atomic merge semantics.
2. Enforce resource-level locks with read/write semantics; detect and prevent overlapping claims across glob patterns.
3. Maintain execution plans, progress updates, and completion summaries for each request.
4. Provide cleanup tooling (`/forge-removeall`, scripts) that reverses roster artifacts and resets sessions safely.

### 9.5 Observability & Operations
1. Emit structured logs for onboarding, forging, execution, snapshotting, and cleanup events.
2. Persist manifests, snapshots, and lock state for auditing; retain history in `.factory/sessions/` JSONL streams.
3. Present user-facing summaries that hide implementation internals (no tool names, session IDs, or raw JSON).
4. Supply automated UAT scripts and documentation to reproduce and verify flows locally.

## 10. Non-Functional Requirements
- **Security:** Maintain staging isolation, enforce permissioned command installation, follow security review controls.
- **Performance:** AI parsing responses within ≤5 seconds average; onboarding session total ≤7 minutes for 95th percentile.
- **Reliability:** Guarantee rollback on merge failures; detect deadlocks and surface actionable errors.
- **Usability:** Conversational tone, one question at a time, contextual examples, no jargon leakage.
- **Compliance:** Provide auditable logs, manifests, and summaries sufficient for enterprise review.
- **Maintainability:** TypeScript-only implementation, ESLint/Prettier enforced, unit + E2E coverage, `npm run build` / `npm test` gates prior to release.

## 11. Dependencies & Integrations
- Factory.ai Droid CLI for registration, command execution, and session lifecycle.
- Model Context Protocol SDK and associated prompt/transport utilities.
- Desktop Commander MCP for file and process operations in automation workflows.
- Node.js 16+, TypeScript toolchain, npm distribution pipeline (`npm version`, `npm publish`).

## 12. Constraints & Assumptions
- Phase 1 functionality must remain stable while Phase 2 features are developed behind feature flags.
- Pattern matching for methodology recommendations is prohibited; rely on AI reasoning with traceable prompts.
- Documentation follows Diátaxis structure; new guides belong under appropriate subdirectories.
- Agents may run `npm test`; ensure the workspace is ready so the suite can complete cleanly.
- Repo may operate in dirty worktrees; tooling must report warnings rather than failing silently.

## 13. Acceptance Criteria
- Onboarding flow captures all 10 data points, records confidence, and surfaces confirmation summary.
- Methodology recommendations display to the user with explicit reasoning and allow conversational adjustments.
- Roster generation produces methodology-aligned artifacts, installs commands, and updates manifests without conflict.
- Execution manager runs requests with enforced locks, staged branches, and atomic merges; failures roll back cleanly.
- Observability suite logs every onboarding, forging, and execution event with traceable identifiers while hiding internals from end users.
- Documentation (README, QUICKSTART, audit log) and change log accurately describe shipped capabilities.
- `npm run build`, `npm test`, and UAT scripts complete successfully prior to release.

## 14. Release & Rollout Plan
1. **Milestone A – Intelligent Onboarding (Phase 1.1):** Ship AI parsing, follow-ups, recommendation visibility, and documentation updates.
2. **Milestone B – Methodology-Linked Roster:** Align specialist definitions, guides, and manifests with methodology; add regression tests.
3. **Milestone C – Observability Upgrade:** Harden logging, cleanup, and audit outputs; document operational runbooks.
4. **Milestone D – Parallel Foundations Hardening:** Validate resource locking, deadlock detection, and staging behaviors in preparation for Phase 2.
5. **Milestone E – GA Release:** Run `npm version` / `npm publish`, update CHANGELOG, announce availability.

## 15. Risks & Mitigations
- **AI Misinterpretation:** Confidence tracking plus fallback prompts and regression suites.
- **Exposure of Internals:** Enforce UX rules, add automated checks for tool names/session IDs in outputs.
- **Execution Deadlocks:** Expand lock diagnostics, add deadlock detector tests and manual overrides.
- **Documentation Drift:** Maintain audit log, require PR checklist for spec/doc alignment.
- **Security Regression:** Continuous review of staging isolation, command permissions, and dependency scans before releases.

## 16. Open Questions
- Should users customize methodology catalogs or weights beyond the curated ten?
- Do we introduce optional advanced fields (analytics, localization, compliance tiers)?
- What telemetry, if any, is acceptable for product analytics without violating privacy expectations?
- How will users opt into Phase 2 parallel execution, and what gating criteria are needed?

## 17. Appendix
- **Specifications:** See referenced documents for detailed flows and prompts.
- **Testing Assets:** `scripts/automated-uat2.exp`, `test-methodology-flow.mjs`, `src/mcp/__tests__/` suites.
- **Operational References:** `docs/project/audit-log.md`, `docs/project/automated-uat-guide.md`, `docs/project/uat-onboarding-scenarios.md`.
