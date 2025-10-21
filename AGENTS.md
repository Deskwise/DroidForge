# Repository Guidelines

This guide helps contributors work efficiently on DroidForge.

## Produce concise responses to user, use bullet points and reduce development jargon.
## Project Structure & Modules
- `src/` TypeScript sources (CLI, detectors, orchestrator, writers). Entry: `src/index.ts`.
- `bin/` Node entry wrapper for the published CLI (`droidforge`).
- `dist/` Compiled JS output from TypeScript.
- `docs/` Project docs; contributor-facing guides live here.
- `examples/`, `templates/` Sample inputs and mustache templates.
- Tests (if added) should live under `src/**/__tests__/`.

## Build, Test, and Development
- Build TypeScript to `dist/`
  bash
  npm run build
  # uses `tsc -p .`
- Run in dev (TS via ts-node)
  bash
  npm run dev
  # runs `src/index.ts` with ESM loader
- Invoke the CLI (built)
  bash
  node bin/droidforge.mjs <command>
  # or after global install: `droidforge <command>`
- Useful commands
  - `droidforge init` — install orchestrator and bootstrap docs
  - `droidforge scan` — print repo signals + discovered scripts (JSON)
  - `droidforge synthesize` — generate/update droids and docs
  - `droidforge add-script <path>` — wrap one script

## Coding Style & Naming
- TypeScript, ESM modules. Indent with 2 spaces.
- File names: `kebab-case` for CLI files, `camelCase` for modules.
- Exports use named exports; avoid default exports.
- Prefer pure functions; keep I/O at CLI layer.
- Run `tsc` cleanly (no implicit any). Prettier not configured—keep concise imports and consistent spacing.

## Testing Guidelines
- Framework: add Jest or Vitest when tests are introduced.
- Place tests beside code in `__tests__/` with `*.test.ts` suffix.
- Aim for coverage on detectors, writers, and orchestrator logic.
- Example (Vitest):
  bash
  npx vitest run

## Commit & PR Guidelines
- Commits: concise imperative subject (≤72 chars), e.g., "add detectors for scripts".
- Group logical changes; avoid unrelated churn.
- PRs should include:
  - Summary, rationale, and scope
  - Steps to validate (commands and expected output)
  - Linked issue (if applicable) and screenshots for docs changes

## Security & Configuration Tips
- No network secrets committed. Use env vars for tokens.
- Do not write outside repo on synthesize; respect `process.cwd()`.
- Verify template paths before rendering to avoid overwrites.

## Architecture Overview
- CLI (`src/cli.ts`) wires commands → detectors (`src/detectors`) → orchestrator (`src/orchestrator`) → writers (`src/writers`).
- `scan` collects signals; `synthesize` converts signals/templates to output and refreshes docs.
