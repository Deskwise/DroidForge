# TDD-in-a-Box

Workflow system for managing AI coding agents with strict TDD enforcement and quality audits.

## State Machine

```
┌─────────┐
│  IDLE   │  No active session, repo clean
└────┬────┘
     │ start-agent-work.sh
     ↓
┌─────────┐
│ CLAIMED │  Task marked in-progress, session created
└────┬────┘
     │ User approves → agent runs autopilot
     ↓
┌─────────┐
│ WORKING │  Autopilot driving RED → GREEN → COMMIT
└────┬────┘
     │ All subtasks complete
     ↓
┌─────────┐
│ REVIEW  │  Major task done, awaiting human review
└────┬────┘
     │ User invokes "Audit Task X"
     ↓
┌─────────┐
│ AUDITING│  Agent verifies work against standards
└────┬────┘
     │ Pass → commit report / Fail → remediate
     ↓
┌─────────┐
│ CLOSED  │  Audit report committed, ready for next task
└─────────┘

     CRASH? → Run recovery-helper.sh
```

## Quick Start

```bash
# 1. Point agent to AGENTS.md
# 2. Agent runs:
./tdd/scripts/start-agent-work.sh

# 3. You approve, agent works through TDD cycle
# 4. When task complete, you say: "Audit Task X"
# 5. If crash: ./tdd/scripts/recovery-helper.sh
```

## File Structure

```
tdd/
├── AGENTS.md              # Implementation agent instructions
├── AUDITOR.md             # Auditor agent instructions
├── scripts/
│   ├── start-agent-work.sh    # Begin new work
│   ├── autopilot-wrapup.sh    # Clean finish
│   ├── autopilot-reset.sh     # Abort/crash cleanup
│   ├── recovery-helper.sh     # Automated crash recovery
│   └── tm-commit.sh           # Commit guardrail
└── docs/
    ├── guides/
    │   ├── taskmaster-guardrails.md
    │   ├── autopilot-agent-runbook.md
    │   ├── autopilot-tdd-playbook.md
    │   └── human-in-the-loop-workflow.md
    └── prompts/
        └── kick-off.md        # New agent onboarding
```

## Key Concepts

- **HITL Checkpoint**: Human approval required after each major task (not subtask)
- **Audit Phase**: Mandatory verification after implementation, before merge
- **Crash Recovery**: `recovery-helper.sh` tests partial work and helps decide keep/discard
- **Commit Guardrail**: `tm-commit.sh` blocks commits during active sessions

