# TDD-in-a-Box

TDD-in-a-Box is a ready-to-run starter bundle that wires Task-master task orchestration, Autopilot’s RED→GREEN→COMMIT loop, and mandatory guardrails into any repository so automated agents and humans can ship code safely.

**Top benefits for novice developers**
- Clear guardrails that prevent skipping planning, testing, or review steps.
- Turnkey scripts and documentation so getting from “blank repo” to TDD workflow is copy-paste simple.
- Built-in handoff notes and logging templates that make teamwork transparent.
- Auto installer included "Hey agent install setup4agents.json" and your repo is set up in seconds.

**Top benefits for expert developers**
- Codified RED→GREEN discipline keeps large teams aligned on quality without micromanagement.
- Autopilot-aware scripts remove toil when spinning up new projects or enforcing house rules.
- Portable docs and guardrails make it easy to enforce consistent contributions across multiple repos.

## Contents

```
tdd-in-a-box/
├── README.md                          # This overview
├── docs/
│   └── guides/
│       ├── autopilot-tdd-stack-setup.md   # Full setup instructions
│       ├── autopilot-agent-runbook.md     # Daily operating procedure for agents
│       ├── taskmaster-guardrails.md       # Non-negotiable rules
│       └── human-in-the-loop-workflow.md  # Post-subtask approval policy
└── scripts/
    ├── start-agent-work.sh                # Launches the next Autopilot session
    ├── autopilot-reset.sh                 # Clears stale workflow-state.json safely
    └── autopilot-wrapup.sh                # Logs end-of-session status snapshot
```

## How to use this kit

1. Copy the entire `tdd-in-a-box/` folder into your new repository’s root.
2. Either follow `docs/guides/autopilot-tdd-stack-setup.md` step-by-step, point an agent at `auto-install/setup4agents.json` for shell-based automation, or use `auto-install/repo_guidance.json` when the agent is operating purely through repository edits without direct command execution.
3. After setup, share `docs/guides/autopilot-agent-runbook.md` with every agent. It references the other two guides and scripts so the workflow stays consistent.
4. Commit the copied files so future clones inherit the same process.

Keep this kit versioned: when guardrails or scripts evolve, update the files here and re-tag your downstream repos.

## Git hygiene checklist

> **Autopilot paused:** it spotted files you changed that aren’t saved into Git yet. To move forward, run the following and rerun the helper once nothing is left to save.

After copying the kit or regenerating files, stage everything so git tracks the assets:

```bash
git add -A tdd-in-a-box docs/guides scripts
git status -sb
```

If a file stays untracked, verify it isn’t ignored:

```bash
git check-ignore -v <path>
```
