# DroidForge — Product Requirements Document (PRD)

> **One‑liner:** DroidForge is an interactive CLI companion for Factory.ai that **creates and evolves a repo’s droid army**, starting from zero or enhancing an existing project, by fusing **user intent**, **repo signals** (scripts/configs/deps/tests), and **PRD context**.

---

## 0. Goals & Non‑Goals

### Goals
- Turn any repo (including blank) into a working **droid army** under Factory CLI (interactive only).
- Use **three inputs**: (1) user interview, (2) repo signal scan, (3) PRD/README — PRD is **not** the only input.
- Generate/maintain **project droids** in `.factory/droids/*.md` with least‑privilege tools and explicit Proof.
- Install/refresh a **global Orchestrator** at `~/.factory/droids/orchestrator.md` (model: `gpt-5-high`).
- Support **four modes**: `bootstrap` (new), `feature` (add capability), `action` (refactor/maintenance), `maintenance` (reanalyze + evolve).
- Keep everything **interactive** (no `droid exec`), provide clear diffs, and require confirmation at guardrails.

### Non‑Goals
- No task manager/PM system; no CI/headless flows.
- No auto‑PRD generation; users provide PRD/briefs (when they exist). DroidForge **uses** PRD; it doesn’t author it.
- No vendor‑specific cloud setup or deployment automation.

---

## 1. Personas & Autonomy Levels

### Personas
- **Vibe Coder (Beginner)**: wants guidance and simple flows; minimal jargon.
- **Pragmatic Builder (Intermediate)**: knows stack; wants speed; moderate hand‑holding.
- **Pro Dev (Expert)**: terse outputs; surgical changes; prefers manual checkpoints.

### Autonomy Levels
- **L1 Hands‑on:** confirm every material step.
- **L2 Balanced:** confirm at checkpoints (plan → create droids → finalize).
- **L3 Agent‑driven:** show diffs; minimal pauses.

Autonomy and persona impact **explanations**, **tool widening**, and **default confirmations**.

---

## 2. Operating Modes

1) **Bootstrap (new repo):**
   - Interview → initialize `.factory/droids/` with core + inferred droids; write `AGENTS.md` and `docs/droid-guide.md`.
2) **Feature (add capability):**
   - Ask feature brief → scan signals → synthesize only the droids relevant to that feature (e.g., `ui-ux`, `api`, `qa-e2e`).
3) **Action (refactor/maintenance):**
   - Ask target area + risk → propose short‑lived or scoped droids (e.g., `refactor-auth`, `dep-upgrade-guard`).
4) **Maintenance (reanalyze):**
   - Rescan repo → compare to `droids-manifest` → propose add/retire/merge/narrow + Proof refreshes.

---

## 3. Inputs & Signal Fusion

### 3.1 User Interview (interactive)
- Scenario: bootstrap / feature / action / maintenance.
- Domain & goals; tech stack hints; autonomy; skill level.

### 3.2 Repo Signals (detectors)
- **Scripts**: `scripts/*.sh`, `*.py`, `Makefile`, `package.json` scripts.
- **Frameworks**: dependencies (frontend/back‑end/testing/motion/etc.).
- **Configs**: `jest*`, `vitest*`, `playwright*`, `cypress*`, `pytest.ini`, linters, formatters.
- **Structure**: `src/`, `app/`, `pages/`, `api/`, `migrations/`, `docs/`.

### 3.3 PRD/README Context
- Vision, features, acceptance criteria, KPIs.

### 3.4 Fusion Logic
- Merge (user intent + repo signals + PRD) → produce a **Droid Plan** with:
  - Roles, scopes, tools, procedures, Proof commands, Output schema.
  - Conflicts avoided by **file/module claims**.

---

## 4. Core Features (Functional Requirements)

1) **Install Global Orchestrator**
   - Writes `~/.factory/droids/orchestrator.md` from template; pins model `gpt-5-high`.
   - Idempotent: overwrite only with user consent.

2) **Scan**
   - Parse PRD/README + discover scripts/configs/deps.
   - Emit `signals.json` (internal) for the current run.

3) **Synthesize**
   - Generate/refresh project droids in `.factory/droids/*.md`:
     - **Script Droids**: wrap important scripts with Shell+Read; add Proof (exit code, artifact exists).
     - **Core Droids** (minimal, opt‑in): `planner`, `dev`, `reviewer`, `qa`, `auditor` (start read‑only; widen on approval).
     - **Contextual Droids** (dynamic): `ui-ux`, `api`, `domain-specialist`, `explainer` as needed.
   - Update `AGENTS.md` (map of roles) and `docs/droid-guide.md` (how to use).

4) **Reanalyze**
   - Rescan → compare with current droids (by metadata: scope, proof, last reviewed).
   - Propose: add new, retire stale, merge overlaps, narrow tools, refresh Proof.
   - Apply on approval with 3‑way merge safeguards.

5) **Add‑Script**
   - Wrap a single script into a new droid with least privilege and Proof.

6) **Safety & Guardrails**
   - Start read‑only; widen tools per autonomy or explicit approval.
   - Show diffs before writing; require confirmation at L1/L2.
   - Keep prompts short and structured.

---

## 5. Orchestration Protocol (Interactive Only)

- **Confirm mode → Draft Droid Plan → Confirm → Generate → Validate.**
- Parallelism: generate independent droids concurrently; require **file claims** to avoid collisions.
- Maker/Checker: coding droid pairs with verifier droid to run Proof; failures route back with context.
- Morphing: orchestrator may take trivial edits itself (still logs structured output) then hand back.

---

## 6. Output Artifacts
- `.factory/droids/*.md` (YAML + body; least‑privilege tools; Procedure; Proof; Output schema).
- `AGENTS.md` (concise map of droids, scopes, how to run them in Factory CLI).
- `docs/droid-guide.md` (human guide: invocation patterns, autonomy toggles, Proof expectations).
- Optional internal: `signals.json`, `droids-manifest.json` (summary of roles/scopes/proofs/last reviewed).

---

## 7. UX Flows (Happy Paths)

### 7.1 Bootstrap (blank repo)
1. User runs `npx droidforge init` → installs global orchestrator, writes docs.
2. `npx droidforge synthesize` → interview; no scripts found → propose minimal core droids; write files; done.

### 7.2 Feature (existing repo)
1. `npx droidforge synthesize` → detect feature mode; scan scripts/configs; read PRD section.
2. Propose `ui-ux` + `api` + `qa` droids (if stack present); confirm → write; update docs.

### 7.3 Action/Maintenance
1. `npx droidforge reanalyze` → rescan; propose add/retire/narrow/refresh proofs.
2. Confirm → apply; regenerate docs.

---

## 8. Non‑Functional Requirements
- **Simplicity:** one‑command flows; minimal questions.
- **Safety:** least‑privilege by default; explicit tool widening.
- **Speed:** scans complete in < 3s on medium repos; synthesis < 2s/file.
- **Portability:** Node 18+; no native deps.
- **Observability:** clear console logs; optional verbose mode.

---

## 9. Security & Privacy
- Never run scripts without explicit user approval.
- Never write outside declared files (`.factory/droids`, `AGENTS.md`, `docs/droid-guide.md`).
- Do not exfiltrate PRD or code; all processing local unless user opts into LLM calls (future).

---

## 10. Open Questions
- Should we add an optional local LLM/Ai layer for intent inference (offline)?
- Do we maintain a persistent `droids-manifest.json`, or infer from filesystem each time?
- How fine‑grained should Proof be for script wrappers (exit code vs artifact checks vs smoke tests)?

---

## 11. Rollout Plan
- **v0.1**: Deterministic synthesis (no LLM), global orchestrator install, scan/synthesize/reanalyze/add-script, docs writers.
- **v0.2**: Smarter reanalysis (diff heuristics), optional domain droids, better Proof templates.
- **v0.3**: Optional LLM reasoning (on-device or user‑selected), richer detectors, conflict resolution UI.

---

## 12. Acceptance Criteria (v0.1)
- `init`, `scan`, `synthesize`, `add-script`, `reanalyze` commands function as specified.
- `.factory/droids/*.md` created with valid YAML and sensible defaults.
- `AGENTS.md` and `docs/droid-guide.md` generated and updated.
- No writes outside allowed paths; diffs previewed before confirm at L1/L2.
- Runs on a blank repo and on the included `examples/sample-repo/` successfully.

