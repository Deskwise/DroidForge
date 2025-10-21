# DroidForge (working name)

DroidForge is a Node CLI that:

- Installs a **global Orchestrator** droid at `~/.factory/droids/orchestrator.md` (model: `gpt-5-high`).
- Scans any repo’s **PRD/README + scripts** and generates **project droids** in `./.factory/droids/`.
- Updates **AGENTS.md** and creates **/docs/droid-guide.md** for usage.

> Scope: **interactive Factory CLI only**. No `droid exec`, no CI/headless.

## Quick start

```bash
npx droidforge init         # install global orchestrator and project docs
npx droidforge scan         # analyze PRD/README + scripts
npx droidforge synthesize   # create/refresh .factory/droids/* from findings
npx droidforge add-script scripts/build.sh   # wrap one script as a droid
npx droidforge reanalyze    # months later: rescan and propose new/retired droids
```
