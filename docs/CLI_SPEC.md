# 📘 DroidForge MCP Server & Slash Command Specification

This specification defines the end-to-end architecture and implementation plan for the **DroidForge** experience inside Droid CLI. It replaces the legacy standalone CLI flow. Every requirement below must be met so that an AI agent (or engineering team) can implement the system without additional clarification. For guidance on safe multi-droid concurrency, see the companion document [`docs/droidforge_parallel_orchestration_spec.md`](./droidforge_parallel_orchestration_spec.md).

---

## 1. Purpose & Scope

- Deliver a first-class **in-chat onboarding and operations experience** for DroidForge using the Model Context Protocol (MCP).
- Generate, manage, and remove droid teams, docs, and supporting assets directly from the MCP server.
- Auto-install repo-scoped **slash commands** so the workflow is accessible from Droid CLI with one keystroke.
- Ensure **df-orchestrator** remains the only human-facing droid; all other specialists stay behind that interface.
- Provide hooks for future features (snapshots, task gates) without breaking the current contract.

Out of scope: UI styling inside Droid CLI, authenticator plumbing, or Factory cloud configuration.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Droid CLI (chat UI)                                      │
│  • Slash command palette                                 │
│  • Streams messages/logs                                 │
└──────────────▲───────────────────────────────────────────┘
               │ MCP calls (tools/prompts/resources)
┌──────────────┴───────────────────────────────────────────┐
│ DroidForge MCP Server                                    │
│  • Tool handlers (scan, forge, guide, cleanup, etc.)     │
│  • Session context store                                 │
│  • File writer (repo + home scope)                       │
│  • Logging + status channels                             │
└──────────────▲───────────────────────────────────────────┘
               │ Filesystem writes
┌──────────────┴───────────────────────────────────────────┐
│ User repo                                                 │
│  • .droidforge/… (manifests, droid files, backups)       │
│  • docs/… (guides)                                       │
│  • .factory/commands/… (slash commands)                  │
└──────────────────────────────────────────────────────────┘
```

State is primarily persisted in repo files; transient progress lives in the MCP session context keyed by `sessionId`.

---

## 3. Directory & File Contract

| Path | Creation Trigger | Description |
|------|------------------|-------------|
| `.droidforge/droids/df-*.json` | Forge completion | Canonical droid definitions. JSON (not YAML). |
| `.droidforge/droids-manifest.json` | Forge completion | Summary of team, methodology, timestamps. |
| `.droidforge/session/<session-id>.json` | During onboarding | Temporary context, removed after success/fail. |
| `.droidforge/backups/<ISO8601>/…` | Snapshot tool | Optional backup copy of manifests and droids. |
| `docs/DroidForge_user_guide_en.md` | Forge completion & updates | Custom guide; overwritten atomically. |
| `docs/DROIDS.md` *(optional)* | Forge completion | Tabular summary for humans. |
| `.factory/commands/*.md` | Forge completion or refresh | Slash commands described in §8. |
| `.factory/commands/df` | Primary orchestrator shortcut (alias) | Markdown file with `/df` command. |

All writes must be **atomic** (write to temp file + rename) to survive abrupt terminations.

---

## 4. MCP Capabilities

### 4.1 Tools

Each tool uses JSON input/output. All fields marked “required” must be validated; return a structured error if missing.

| Tool | Purpose | Input Schema | Output Schema | Side Effects |
|------|---------|--------------|---------------|--------------|
| `smart_scan` | Analyze repo to seed onboarding. | ```json { "repoRoot": "string", "sessionId": "string" } ``` | ```json { "summary": "string", "signals": ["string"], "primaryLanguage": "string", "hints": ["string"] } ``` | None. Stores lightweight context in session file. |
| `record_project_goal` | Save the user’s one-line project description. | ```json { "sessionId": "string", "description": "string" } ``` | ```json { "ack": true } ``` | Session context update. |
| `select_methodology` | Persist methodology choice (supports “other”). | ```json { "sessionId": "string", "choice": "string", "otherText": "string?" } ``` | ```json { "methodology": "string" } ``` | Session context update. |
| `recommend_droids` | Propose roster based on scan + methodology. | ```json { "sessionId": "string" } ``` | ```json { "suggestions": [ { "id": "df-builder", "label": "string", "summary": "string", "default": true } ], "mandatory": { "id": "df-orchestrator", "summary": "string" } } ``` | None. |
| `forge_roster` | Persist selected droids. | ```json { "sessionId": "string", "selected": [ { "id": "string", "label": "string", "abilities": ["string"], "goals": "string" } ], "custom": [ … ] } ``` | ```json { "bootLog": ["string"], "outputPaths": ["string"], "manifestPath": "string" } ``` | Writes `.droidforge/…` files, ensures directories exist, generates manifest. |
| `generate_user_guide` | Produce Markdown guide text. | ```json { "sessionId": "string", "roster": [ "df-builder", … ] } ``` | ```json { "markdown": "string", "savePath": "docs/DroidForge_user_guide_en.md" } ``` | Writes guide file; returns path. |
| `install_commands` | Create/update slash commands. | ```json { "sessionId": "string", "commands": [ { "slug": "forge-start", "type": "markdown", "body": "string" }, ... ] } ``` | ```json { "installed": ["forge-start", …] } ``` | Writes to `.factory/commands/`. |
| `cleanup_repo` | Remove DroidForge artifacts with preview and confirmation. | ```json { "repoRoot": "string", "confirmationString": "string?", "keepGuide": "boolean?" } ``` | ```json { "removed": ["path", …], "preview": { "droids": […], "filesToRemove": […], "droidCount": number, "fileCount": number }, "error": { "code": "string", "message": "string" }, "message": "string" } ``` | Without confirmation: returns preview. With correct confirmation "remove all droids": deletes files. With wrong confirmation: returns error. |
| `create_snapshot` | Backup current droids & manifest. | ```json { "repoRoot": "string", "label": "string?" } ``` | ```json { "snapshotId": "string", "paths": ["string"] } ``` | Copies to `.droidforge/backups/<timestamp>/`. |
| `restore_snapshot` | Replace current droids with snapshot. | ```json { "repoRoot": "string", "snapshotId": "string" } ``` | ```json { "restored": ["string"] } ``` | Overwrites droid + manifest files. |
| `fetch_logs` | Summaries for `/forge-logs`. | ```json { "repoRoot": "string", "limit": 25 } ``` | ```json { "entries": [ { "timestamp": "ISO8601", "event": "string", "details": "string" } ] } ``` | None. |
| `get_status` | Used by `/forge-start` when onboarding completed. | ```json { "repoRoot": "string" } ``` | ```json { "status": "ready|needs-onboarding|incomplete", "activeDroids": ["string"], "lastRun": "ISO8601?" } ``` | None. |

### 4.2 Resources

| URI | Description |
|-----|-------------|
| `droidforge/templates/methodologies` | JSON list of methodologies with ids, emoji, description. |
| `droidforge/templates/droid-archetypes` | JSON definitions for standard droids (abilities, default goals, hints). |
| `droidforge/templates/guide-base` | Markdown skeleton with substitution tokens (e.g., `{{roster_table}}`, `{{primary_command}}`). |
| `droidforge/snapshots/<id>` | Snapshot metadata for UI listing. |

### 4.3 Prompts

Prompts orchestrate multi-step flows for clients that support them.

| Prompt | Purpose | Steps |
|--------|---------|-------|
| `onboarding` | Wraps Steps 1–5. | Calls `smart_scan`, asks goal input, renders methodology menu, collects roster, invokes `forge_roster`, `generate_user_guide`, `install_commands`, displays guide, clears session. |
| `returning_user` | Summary on `/forge-start` when onboarding done. | Calls `get_status`, prints quick menu, suggests `/df`. |
| `cleanup` | Handles `/forge-removeall`. | Confirm → secondary confirm (DELETE) → call `cleanup_repo`. |
| `resume_onboarding` | `/forge-resume` integration. | Loads `.droidforge/session/<session>.json`, jumps to next incomplete step. |

Prompts must emit numbered options wherever a decision is required (1-based indices).

---

## 5. Session Lifecycle

1. `sessionId` generated by client on first `/forge-start` call when repo has no `.droidforge/droids-manifest.json`.
2. MCP server writes `.droidforge/session/<sessionId>.json` with fields:
   ```json
   {
     "sessionId": "...",
     "createdAt": "ISO8601",
     "repoRoot": "/abs/path",
     "state": "collecting-goal|methodology|roster|forging|complete|aborted",
     "scan": { ... },
     "description": "string?",
     "methodology": "string?",
     "selectedDroids": [...]
   }
   ```
3. After successful forge + command install, delete the session file.
4. If session aborted, `/forge-resume` loads the latest `.json`, resumes from `state`.

---

## 6. Detailed User Flows

### 6.1 First-Time Forge (`/forge-start`)

| Step | Client Message | MCP Action | Output |
|------|----------------|------------|--------|
| 1 | “🤖 Smart-scanning your folder…” | `smart_scan` | Summary plus signals. |
| 2 | Display summary & ask for one-sentence goal. | `record_project_goal` | Store text. |
| 3 | Show methodology menu (numbered). | `select_methodology` | Save selection. |
| 4 | Show droid suggestions with toggles (default on). | `recommend_droids` | Provide list. |
| 5 | Collect custom droids (optional). | (client-managed) | Build payload. |
| 6 | Display irreversible warning before forging. | `forge_roster` | Boot log lines, file paths. |
| 7 | Render boot log sequentially (start with orchestrator). | — | Live output. |
| 8 | Generate guide. | `generate_user_guide` | Markdown path returned. |
| 9 | Install slash commands. | `install_commands` | Confirm list. |
| 10 | Display guide excerpt (with `/df` instructions). | — | Wait for Enter. |
| 11 | Print “Ready to try your first command? Type `/df …`”. | — | End flow. |

### 6.2 Returning User (`/forge-start` when manifest exists)

1. Call `get_status`.
2. If `status = needs-onboarding` → redirect to `/forge-resume`.
3. Otherwise print:
   - Headline + last run timestamp.
   - Count of active droids (list first 4, `+N more` if needed).
   - Quick commands list:
     1. Talk to orchestrator (`/df ` prefilled).
     2. Add new droid (`/forge-add-droid`).
     3. Review logs (`/forge-logs`).
     4. Guide (link path + `/forge-guide`).
     5. Remove team (`/forge-removeall`).
   - Idle >30 days: append “Refresh training? (y/n)” logic (call `smart_scan` if yes).

### 6.3 `/forge-resume`

- Loads session context.
- Skips completed steps, jumps to current state.
- If session stale (>24h), prompt user to restart.

### 6.4 `/forge-add-droid`

1. Prompt for name + purpose.
2. MCP synthesizes default `df-` slug, goal, abilities from description.
3. Display editable summary; allow confirm or revise.
4. On confirm:
   - Update manifest & droid files.
   - Regenerate guide snippet (only the roster section).
   - Reinstall slash commands if new ones required.
5. Announce boot log for the new droid.

### 6.5 `/forge-removeall`

**Safe deletion with preview and string confirmation:**

1. Call `cleanup_repo` without confirmation → returns preview with:
   - List of droids (id, uuid, displayName, purpose)
   - List of files/directories to be removed
   - Counts (X droids, Y files)

2. Display preview to user with clear instructions:
   - "Type exactly: `remove all droids` to confirm"
   - Note that confirmation is case-insensitive

3. Prompt for text input

4. Call `cleanup_repo` with `confirmationString` parameter:
   - If correct: deletes files and returns success message
   - If wrong: returns error with cancellation message
   - If empty: returns error requiring confirmation

5. Display the result message from the tool (success or cancellation)

### 6.6 `/forge-guide`

- Fetch from disk; if missing, regenerate via `generate_user_guide` using manifest.
- Display in paginated block, same as onboarding.
- Conclude with `/df` reminder.

### 6.7 `/forge-restore`

- List snapshots sorted by timestamp (call `create_snapshot` lazily if none).
- Accept numeric input.
- Confirm before overwriting.
- Call `restore_snapshot`, then regenerate guide + commands.
- Announce “Restored snapshot <id>. Run `/forge-guide` to review.”

### 6.8 `/forge-logs`

- Call `fetch_logs`.
- Render last N events (e.g., “2024-05-01 — Added df-doc”, “2024-05-02 — Forge removeall executed”).
- Provide hint: “Run `/forge-help` for command summary.”

---

## 7. Slash Command Specifications

All commands live in `.factory/commands/`. Use Markdown frontmatter with `description` and `argument-hint` when relevant. Files must be UTF-8 ASCII.

### 7.1 `/forge-start` (`forge-start.md`)
```markdown
---
description: Launch DroidForge onboarding or show the returning-user dashboard
---
{{mcp-call "droidforge:prompts/onboarding"}}
```
Client interprets the `{{mcp-call …}}` directive (or equivalent script) to invoke the prompt. If templating not available, generate a shell script that invokes the MCP JSON RPC directly.

### 7.2 `/forge-resume` (`forge-resume.md`)
```markdown
---
description: Resume an unfinished DroidForge onboarding session
---
{{mcp-call "droidforge:prompts/resume_onboarding"}}
```

### 7.3 `/forge-guide` (`forge-guide.md`)
```markdown
---
description: Reopen your DroidForge team guide
---
{{mcp-call "droidforge:prompts/show_guide"}}
```
`show_guide` prompt should call `generate_user_guide` if the doc is missing.

### 7.4 `/forge-add-droid` (`forge-add-droid.md`)
```markdown
---
description: Design and add a new specialist droid to your roster
---
{{mcp-call "droidforge:prompts/add_droid"}}
```

### 7.5 `/forge-removeall` (`forge-removeall.md`)
```markdown
---
description: Remove all DroidForge data from this repo
---
{{mcp-call "droidforge:prompts/cleanup"}}
```

### 7.6 `/forge-restore` (`forge-restore.md`)
```markdown
---
description: Restore a previous DroidForge snapshot
---
{{mcp-call "droidforge:prompts/restore_snapshot"}}
```

### 7.7 `/forge-logs` (`forge-logs.md`)
```markdown
---
description: Show recent DroidForge actions
---
{{mcp-call "droidforge:prompts/logs"}}
```

### 7.8 `/forge-help` (`forge-help.md`)
```markdown
---
description: Quick cheat sheet for DroidForge commands
---
{{mcp-call "droidforge:prompts/help"}}
```

### 7.9 `/df` (primary orchestrator alias) (`df`)
```markdown
---
description: Talk to your DroidForge orchestrator
argument-hint: <request>
---
{{mcp-call "droidforge:tools/route_to_orchestrator" input="$ARGUMENTS"}}
```
If the client cannot handle direct MCP binding from Markdown, fallback to a small executable script that shells into the MCP JSON RPC CLI.

The MCP server must ensure these files are created (or updated) during onboarding and after any cleanup/restore operations.

---

## 8. Data Models

### 8.1 Droid Definition (`.droidforge/droids/df-*.json`)
```json
{
  "id": "df-builder",
  "displayName": "Rapid Builder",
  "purpose": "Generate scaffolding and accelerate implementation.",
  "abilities": [
    "Create boilerplate modules aligned with repo patterns",
    "Work with df-tester to keep coverage high"
  ],
  "tools": [
    { "type": "filesystem", "paths": ["src/**", "docs/**"] },
    { "type": "command", "value": "npm run build" }
  ],
  "owner": "droidforge",
  "createdAt": "ISO8601",
  "methodology": "startup"
}
```

### 8.2 Manifest (`.droidforge/droids-manifest.json`)
```json
{
  "methodology": "startup",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "primaryCommand": "/df",
  "droids": [
    { "id": "df-orchestrator", "role": "coordinator", "status": "active" },
    { "id": "df-builder", "role": "implementation", "status": "active" }
  ],
  "customDroids": [],
  "snapshots": [
    { "id": "2024-05-04T12-30-00Z", "label": "post-windows-forge" }
  ]
}
```

### 8.3 Guide Tokens

The base template should expose these placeholders:
- `{{project_summary}}`
- `{{primary_command}}` (always `/df`)
- `{{roster_table}}` (auto-generated Markdown table)
- `{{quick_actions}}` (list referencing slash commands)
- `{{examples}}` (array of `/df` usage samples)
- `{{maintenance_tips}}` (includes `/forge-removeall`, `/forge-restore`, `/forge-add-droid`)

---

## 9. Logging & Telemetry

- All tool invocations must append a structured line to `.droidforge/logs/events.jsonl`:
  ```json
  { "timestamp": "ISO8601", "event": "forge_roster", "payload": { "count": 5 }, "status": "ok" }
  ```
- `/forge-logs` simply tails that file (last N entries).
- Failed operations should log `status: "error"` with `errorCode` and `message`.

---

## 10. Error Handling

- **Missing repo permissions** → Fail fast with `errorCode: "E_REPO_ACCESS"`.
- **Invalid selection** (e.g., missing `df-` prefix) → Prompt user to correct.
- **Concurrent sessions** → If a `.droidforge/session/*.json` exists with `state != complete`, `/forge-start` should offer to resume or discard.
- **Filesystem conflicts** → Use atomic writes; if rename fails, rollback and report `E_WRITE_CONFLICT`.
- **Slash command generation** → If `.factory/commands/` doesn’t exist, create directory with `0o755` permissions.

---

## 11. Security & Permissions

- No network calls to third parties; analysis stays local.
- Ensure slash command files do not include secrets. For executable commands (if ever needed), restrict to repo operations.
- When deleting directories, guard against path traversal by validating they are inside `repoRoot`.

---

## 12. Implementation Roadmap

1. **MCP server bootstrap**
   - Scaffold project with tool/prompt/resource handlers.
   - Implement context storage and file I/O helpers.
2. **Core onboarding tools** (`smart_scan`, `record_project_goal`, `select_methodology`, `recommend_droids`, `forge_roster`, `generate_user_guide`, `install_commands`).
3. **Prompts** (`onboarding`, `returning_user`, `resume_onboarding`, `cleanup`, `add_droid`, `restore_snapshot`, `show_guide`, `logs`, `help`).
4. **Slash command templates** — store as static strings in server, write during forge.
5. **Returning-user logic & `/df` routing**.
6. **Cleanup + Snapshot tools**.
7. **Logging subsystem**.
8. **Validation & tests** — simulate full onboarding, reruns, cleanup, restore.

---

## 13. Example `/df` Conversation

```
User: /df Make this repo Windows 11 compatible, including installer.

MCP server → route_to_orchestrator:
{
  "command": "Make this repo Windows 11 compatible, including installer.",
  "context": {
    "manifestPath": ".droidforge/droids-manifest.json"
  }
}

Result streamed back:
[orchestrator] Planning tasks…
[orchestrator] Assigned df-architect to adjust build layout.
[orchestrator] Assigned df-builder to author PowerShell installer script.
[orchestrator] Assigned df-tester to add regression checks (tests/windows_build.test.ts).
[orchestrator] Progress updates will appear here. Type `pause`, `resume`, or `stop` anytime.
```

Orchestrator responses are pass-through; MCP server simply forwards to chat.

---

## 14. Testing Checklist

- [ ] `/forge-start` end-to-end run creates all expected files and commands.
- [ ] `/forge-start` after completion shows returning-user menu.
- [ ] `/forge-resume` handles mid-flow interruption.
- [ ] `/forge-add-droid` updates manifest and guide without breaking existing entries.
- [ ] `/forge-removeall` removes everything (with and without guide retention).
- [ ] `/forge-restore` restores previous state and regenerates commands.
- [ ] `/df` routes to orchestrator successfully and logs event.
- [ ] Slash command files idempotent (rerunning install overwrites cleanly).
- [ ] Logs appended for success and failure paths.
- [ ] All prompts use numbered options and friendly tone matching the original spec.

This document is the single source of truth for implementing the DroidForge MCP server and the accompanying slash-command experience. Any change to behavior must update this spec before implementation.
