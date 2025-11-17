# DroidForge TODO System

This directory contains structured TODO files that stay in sync with the Task Master task list.

## Structure

- `current-sprint.md` – Current sprint or phase focus and immediate next steps
- `task-master-sync.md` – Synchronization notes between manual TODO and Task Master status
- `completion-metrics.md` – Progress tracking and success metrics
- `dependencies.md` – Task dependencies and blocker tracking

## Synchronization

The TODO system is designed to mirror Task Master status:
- Manual TODO files provide a high-level overview.
- Task Master keeps the detailed task and subtask state.
- Regular sync keeps the two views consistent.

## Usage

1. Use the main TODO overview document for the big picture.
2. Use the Task Master CLI for detailed task management.
3. Use `task-master list --with-subtasks --json` together with `scripts/sync-todo.mjs` to refresh metrics.
4. Check `task-master-sync.md` when you want to reconcile differences between manual docs and Task Master.
