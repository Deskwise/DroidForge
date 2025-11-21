#!/usr/bin/env bash
# Helper to enforce Task-master state before committing

set -euo pipefail

if ! task-master list >/dev/null 2>&1; then
  echo "tm-commit: task-master CLI unavailable; aborting." >&2
  exit 1
fi

if ! git diff --cached --quiet -- .taskmaster/tasks/tasks.json 2>/dev/null; then
  echo "tm-commit: .taskmaster/tasks/tasks.json staged without Task-master. Resolve before committing." >&2
  exit 1
fi

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
SESSION_TASK_FILE="$SESSION_DIR/current-task.json"

if [ -f "$SESSION_TASK_FILE" ]; then
  ACTIVE_TASK_ID="$(jq -r '.taskId // "unknown"' "$SESSION_TASK_FILE" 2>/dev/null || echo "unknown")"
  echo "tm-commit: active agent session for Task $ACTIVE_TASK_ID; run ./tdd-in-a-box/scripts/autopilot-wrapup.sh or ./tdd-in-a-box/scripts/autopilot-reset.sh before committing." >&2
  exit 1
fi

exec git commit "$@"
