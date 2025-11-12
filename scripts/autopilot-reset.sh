#!/bin/bash
set -euo pipefail

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
STATE_FILE="${SESSION_DIR}/workflow-state.json"
BACKUP_DIR="${SESSION_DIR}/backups"

mkdir -p "$SESSION_DIR" "$BACKUP_DIR"

if [ -f "$STATE_FILE" ]; then
  timestamp=$(date -Iseconds)
  backup_path="${BACKUP_DIR}/workflow-state.${timestamp}.json"
  mv "$STATE_FILE" "$backup_path"
  echo "Saved stale workflow state to $backup_path"
else
  echo "No workflow-state.json found. Nothing to reset."
fi

LOG_FILE="${SESSION_ROOT}/$PROJECT_KEY/logs/activity.jsonl"
if [ -f "$LOG_FILE" ]; then
  echo "Logs preserved at $LOG_FILE"
fi

echo "Autopilot session cleared. Run ./scripts/start-agent-work.sh to begin fresh."
