# DroidForge MCP Server

DroidForge is now a **Model Context Protocol (MCP)** server that lives entirely inside the Droid CLI experience. It forges a coordinated droid team for any repository, installs repo-scoped slash commands, and keeps `df-orchestrator` as the single point of contact for everyday work.

This repository contains:
- The MCP server runtime and tool handlers (TypeScript).
- Shared detectors for repo scanning and signal extraction.
- Documentation and specs for flows, slash commands, and data formats.

For the full contract, see [`docs/droidforge_full_cli_spec.md`](docs/droidforge_full_cli_spec.md). For safe multi-droid concurrency, consult the companion [`docs/droidforge_parallel_orchestration_spec.md`](docs/droidforge_parallel_orchestration_spec.md).

---

## What the MCP server delivers

- **In-chat onboarding** — `/forge-start` runs SmartScan, collects the project goal, selects a methodology, proposes droids, and forges the team with live boot logs.
- **Auto-installed slash commands** — the server writes `.factory/commands/*.md` so teammates share `/forge-start`, `/forge-guide`, `/forge-removeall`, `/df`, and more.
- **Writable artifacts** — droid definitions (`.droidforge/droids/*.json`), manifests, docs (`docs/DroidForge_user_guide_en.md`), optional `DROIDS.md`, and session snapshots.
- **Return-friendly experience** — repeat `/forge-start` shows a dashboard with quick options and inserts `/df ` so users jump straight to the orchestrator.
- **Extensible tools** — hooks for snapshots, cleanup, log retrieval, and future task gates are built in.
- **Parallel orchestration (opt-in)** — `/df` can run multiple specialists at once with safe locking (see parallel spec for details).

---

## User quick start (inside Droid CLI)

1. Type `/forge-start`.  
   - New repo → full onboarding flow.  
   - Existing repo → returning-user dashboard.
2. Follow the prompts (project sentence, methodology, roster tweaks).  
3. After boot logs finish, read the custom guide (auto-opened) and press Enter.  
4. Run `/df Make this Windows 11 compatible` (or any request). df-orchestrator handles the rest.

Key slash commands installed by the server:

| Command | Purpose |
|---------|---------|
| `/forge-start` | Onboard or show the returning-user dashboard. |
| `/forge-resume` | Resume an unfinished onboarding session. |
| `/forge-guide` | Reprint the latest guide (points to `docs/DroidForge_user_guide_en.md`). |
| `/forge-add-droid` | Design and add a new specialist. |
| `/forge-removeall` | Double-confirm cleanup of all DroidForge data. |
| `/forge-restore` | Restore a snapshot (when backups exist). |
| `/forge-logs` | View recent actions. |
| `/forge-help` | Cheat sheet for all commands. |
| `/df <request>` | Talk to df-orchestrator directly (primary workflow). |

---

## Generated files & directories

| Location | Description |
|----------|-------------|
| `.droidforge/droids/*.json` | Canonical droid definitions. |
| `.droidforge/droids-manifest.json` | Roster summary, methodology, timestamps, primary command. |
| `.droidforge/session/<id>.json` | Temporary onboarding context (removed on completion). |
| `.droidforge/backups/<timestamp>/…` | Snapshot archives (when created). |
| `docs/DroidForge_user_guide_en.md` | Custom guide surfaced after forging and via `/forge-guide`. |
| `docs/DROIDS.md` *(optional)* | Team table for humans. |
| `.factory/commands/*.md` | Slash command definitions installed by the MCP server. |
| `.droidforge/logs/events.jsonl` | Structured log appended by every tool. |

All writes are atomic (write → rename) to avoid partial updates.

---

## Developing the MCP server

### Prerequisites
- Node.js ≥ 18
- npm ≥ 8

### Install & build
```bash
npm install
npm run build       # emits dist/mcp/server.js
```

During development, run:
```bash
npm run dev         # executes src/mcp/server.ts via ts-node
```

> **Note:** `tsc` currently expects the new MCP modules only. The legacy CLI has been removed.

### Project layout
```
src/
  detectors/…            # repo scanning utilities (reused by MCP tools)
  mcp/
    server.ts            # server entrypoint + tool registry
    sessionStore.ts      # persistent onboarding context
    tools/
      smartScan.ts       # implements the smart_scan tool
      index.ts           # helper to build tool registry
  types.ts               # shared DTOs (PRD content, scripts)
  utils/…                # reusable utilities (diff preview, cache helpers)
docs/
  droidforge_full_cli_spec.md   # canonical behavior spec
```

---

## Roadmap

- Implement remaining MCP tools and prompts from the spec (`select_methodology`, `forge_roster`, `generate_user_guide`, etc.).
- Generate slash-command files during onboarding and cleanup automatically.
- Port logging, snapshots, and guide rendering to the new JSON/Markdown formats.
- Add automated tests that exercise the full `/forge-start` → `/df` path.
- Roll out parallel orchestration scheduler (see parallel spec) with feature-flagged rollout.

If you contribute changes, update the spec first, keep the README in sync, and add checklist entries in `docs/droidforge_full_cli_spec.md` where relevant.
