## DroidForge — Copilot instructions

This file provides concise, actionable guidance for an AI coding agent to be immediately productive in the DroidForge codebase.

Keep guidance short and specific. Prefer editing TypeScript in `src/mcp/*` and `src/detectors/*` unless the change explicitly targets docs or packaging.

Core architecture (big picture)
- The code is an MCP (Model Context Protocol) server implemented in TypeScript (ES modules). Entry points:
  - `src/mcp/server.ts` — central class that registers tools and prompts and exposes `invoke()` and `createPromptRunner()`.
  - `src/mcp/http-server.ts` — lightweight HTTP wrapper used for local/dev transport (POST `/mcp`, GET `/mcp/tools`).
- Tools are first-class units. See `src/mcp/tools/index.ts` which builds the tool registry from `src/mcp/tools/*.ts`. Each tool is a `ToolDefinition` with `name`, `description` and `handler(input)`.
- Prompts are assembled via prompt builders in `src/mcp/prompts/registry.ts`. Use `createPromptRunner()` which compiles a script and executes tool invocations via the server.
- Execution orchestration and concurrency lives in `src/mcp/execution/manager.ts` (plan/start/requestNext/completeNode). It models resource locks and node dependencies.
- Persistent onboarding data is stored under `.droidforge/` in the repo. Session files live in `.droidforge/session/*.json` and are managed by `src/mcp/sessionStore.ts` (atomic write via tmp+rename).

Developer workflows & commands
- Install & build: `npm install` then `npm run build` (emits `dist/`).
- Dev run: `npm run dev` — starts `src/mcp/server.ts` with ts-node (ESM loader). Modify environment variables to test HTTP wrapper:
  - `PORT` — port for `src/mcp/http-server.ts` (default 3000)
  - `DROIDFORGE_API_KEY` — when set, `POST /mcp` requires `Authorization: Bearer <key>`
- Tests: `npm run test` (uses `tsx --test` for the TypeScript tests under `src/mcp/**/*.test.ts`).
- Lint/format: `npm run lint` / `npm run format`.

Conventions & patterns to follow
- Tool naming: tools are registered by string name (snake_case like `smart_scan`). Tools should validate required input params and throw on invalid input (see `smartScan.ts`).
- Handler shape: tool handler receives a single `input` object and returns a Promise of the output. Keep handlers pure-ish; side-effects should be performed intentionally and documented.
- Prompt builders: prompts return a `PromptScript` (see `src/mcp/prompts`). Prompt builders must validate required context (e.g. `sessionId`). Use `createPromptRegistry` as the pattern.
- Filesystem writes: all repo writes are atomic (write to `.tmp` then rename). Use `SessionStore.save()` as the canonical example.
- Execution lifecycle: ExecutionManager uses `plan`, `start`, `requestNext`, `completeNode`, `poll`. Respect resourceClaims and concurrency. Follow existing events and timeline shape when adding instrumentation.

Integration points & interfaces
- HTTP API: POST `/mcp` expects JSON { tool: string, input: object, repoRoot?: string }. Response format: { success, tool, result, duration, timestamp }.
- Internal invocation: use `DroidForgeServer.invoke({ name, input })` or create a prompt runner and call its `run()` (see `src/mcp/prompts/runner.ts`).
- Detectors: repo analysis helpers live in `src/detectors/` (e.g. `repoSignals.ts`). Use these for repo scanning and signal extraction.

Quick examples (copyable snippets for authors)
- Minimal tool invocation (JS/TS):
  const server = createServer({ repoRoot: process.cwd() });
  const result = await server.invoke({ name: 'smart_scan', input: { sessionId: 'sess-1', repoRoot: process.cwd() } });

- HTTP example body (POST /mcp):
  { "tool": "smart_scan", "input": { "sessionId": "sess-1" }, "repoRoot": "/path/to/repo" }

Files to inspect for examples and patterns
- `src/mcp/server.ts` — server lifecycle and prompt/tool wiring
- `src/mcp/tools/index.ts` and `src/mcp/tools/smartScan.ts` — canonical tool registration and implementation
- `src/mcp/prompts/registry.ts` — prompt registration and parameter validation
- `src/mcp/execution/manager.ts` — execution model, locks, and event timeline
- `src/mcp/sessionStore.ts` — session persistence and atomic writes
- `src/detectors/*` — repo analysis utilities used by onboarding tools
- `README.md` and `docs/*.md` — user-facing spec and parallel orchestration details

Safety & quick-check rules for edits
- Do not modify global file-system outside the repo root unless change is explicitly required. Prefer writing under `.droidforge/` or `.factory/` when adding generated artifacts.
- Validate `repoRoot` inputs on any HTTP-facing code. Follow `http-server.ts` approach (there is a `validateRepoRoot()` used in that file).
- Preserve event/timeline shapes when adding instrumentation: timeline entries are objects with timestamp, executionId, event and optional detail.

If anything in this file is unclear or you want more examples (unit tests, prompt scripts, or typical tool inputs), ask for a specific area and I will add short, concrete examples or tests.
