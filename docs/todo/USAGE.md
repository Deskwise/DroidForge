# TODO System Usage Guide

## Overview

The DroidForge TODO system provides structured project tracking that stays aligned with the Task Master task list. It combines a high-level written overview with the live task data managed by Task Master.

## File Structure

```
docs/todo/
├── README.md                 # System overview and quick usage
├── USAGE.md                  # This file – detailed usage guide
├── current-sprint.md         # Current sprint focus and immediate actions
├── task-master-sync.md       # Notes about synchronization between systems
├── completion-metrics.md     # Progress tracking and success metrics
├── dependencies.md           # Task dependencies and blocker tracking
└── ../todo.md                # High-level project overview
```

## Quick Start

### 1. Check Current Status
```bash
# View high-level overview
cat docs/todo.md

# View current sprint focus
cat docs/todo/current-sprint.md

# Check completion metrics
cat docs/todo/completion-metrics.md
```

### 2. Sync with Task Master
```bash
# Refresh metrics and sync notes from the live Task Master data
node scripts/sync-todo.mjs
```

### 3. Update Tasks

#### For High-Level Planning
Edit the main TODO overview for big-picture changes.

#### For Detailed Work
Use the Task Master CLI. Common commands include:
- `task-master list --with-subtasks` – show the full task tree
- `task-master next` – suggest the next task to work on
- `task-master show <id>` – show details for a specific task
- `task-master set-status --id=<id> --status=<status>` – update task status
- `task-master update-task --id=<id> --prompt="<context>"` – append context or notes

## Daily Workflow

### Morning Planning
1. Run `node scripts/sync-todo.mjs` to refresh metrics.
2. Review `current-sprint.md` for the focus areas.
3. Use `task-master next` or `task-master list` to choose concrete work.

### During Work
1. Use Task Master commands to keep task statuses up to date.
2. Log key decisions or context with `task-master update-task`.
3. Mark subtasks as done when they are finished.

### End of Day
1. Run the sync script again if you changed task statuses.
2. Update `current-sprint.md` if priorities shifted.
3. Check `dependencies.md` for upcoming blockers.

## File Purposes

### High-Level Overview (todo.md)
- Executive summary of project phases.
- High-level completion status.
- Immediate next steps and success metrics.

### Sprint Focus (current-sprint.md)
- Current sprint goals and target outcomes.
- Immediate next actions for this session.
- Definition of done for the sprint.

### Progress Tracking (completion-metrics.md)
- Overall project completion percentage.
- Task and subtask counts.
- Recent completions and sprint goal reminders.

### System Sync Notes (task-master-sync.md)
- Comparison between manual TODO docs and Task Master.
- Reconciliation actions when the two are out of sync.
- Last sync timestamp and how sync is performed.

### Dependency Management (dependencies.md)
- Dependency graph and critical path.
- Current and upcoming blockers.
- Mitigation strategies and process.

## Sync Process

### Automatic Sync via Script
The `scripts/sync-todo.mjs` script:
- Calls `task-master list --with-subtasks --json`.
- Computes task and subtask completion percentages.
- Rewrites `completion-metrics.md` with accurate statistics.
- Updates the sync metadata in `task-master-sync.md`.

### Manual Adjustments
When you make manual edits to TODO docs:
1. Ensure you also update Task Master status for the same tasks.
2. Run the sync script to refresh metrics.
3. Use `task-master list --with-subtasks` to verify that the live state and docs are consistent.

## Best Practices

1. Keep Task Master as the source of truth for detailed status.
2. Use the docs under `docs/todo` for communication and planning.
3. Run the sync script after meaningful changes to Task Master.
4. Review dependencies before starting new work.
5. Update sprint focus when priorities change so the next person has an accurate view.

## Troubleshooting

### Sync Script Issues
- Confirm Node.js is available: `node --version`.
- Check script permissions: `ls -la scripts/`.
- Verify the TODO directory exists: `ls -la docs/todo/`.
- Run `task-master list --with-subtasks --json` manually to confirm it works.

### Task Master Issues
- Confirm `.taskmaster/tasks/tasks.json` exists.
- Use `task-master list` to verify the project’s tasks are present.
- Use `task-master help` for a list of available commands.

## Getting Help

1. Start with this usage guide.
2. Review the overview document in this directory.
3. Check the sync status document for discrepancies.
4. Use the Task Master CLI for deeper inspection of tasks and subtasks.
