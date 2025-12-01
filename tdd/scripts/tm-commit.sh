#!/usr/bin/env bash
# Commit guardrail: blocks commits during active Autopilot sessions

set -euo pipefail

# Check task-master CLI is available
if ! command -v npx &>/dev/null; then
  echo "tm-commit: npx not found; aborting." >&2
  exit 1
fi

# Block if tasks.json is staged without going through task-master
if ! git diff --cached --quiet -- .taskmaster/tasks/tasks.json 2>/dev/null; then
  echo "tm-commit: .taskmaster/tasks/tasks.json staged manually." >&2
  echo "         Use task-master commands to modify tasks." >&2
  exit 1
fi

# Check for active Autopilot session
SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_FILE="$SESSION_ROOT/$PROJECT_KEY/sessions/workflow-state.json"

if [ -f "$SESSION_FILE" ]; then
  TASK_ID=$(jq -r '.context.taskId // "unknown"' "$SESSION_FILE" 2>/dev/null || echo "unknown")
  echo "tm-commit: active Autopilot session for Task $TASK_ID" >&2
  echo "         Run ./tdd/scripts/autopilot-wrapup.sh or autopilot-reset.sh first." >&2
  exit 1
fi

# All checks passed, proceed with commit
exec git commit "$@"

