#!/usr/bin/env bash
set -euo pipefail

log_dir=".taskmaster/logs"
log_file="${log_dir}/autopilot-wrapup.log"

mkdir -p "${log_dir}"

timestamp=$(date -Iseconds)

status_output=$(node_modules/.bin/task-master autopilot status || true)

if [[ -z "${status_output}" ]]; then
  echo "Autopilot status returned no data." >&2
  exit 1
fi

phase=$(echo "${status_output}" | sed -n 's/^[[:space:]]*phase:[[:space:]]*//p' | head -n 1 | tr -d '\r')
current=$(echo "${status_output}" | sed -n 's/^[[:space:]]*currentSubtask:[[:space:]]*//p' | head -n 1 | tr -d '\r')
progress=$(echo "${status_output}" | sed -n 's/^[[:space:]]*progress:[[:space:]]*//p' | head -n 1 | tr -d '\r')

{
  echo "[${timestamp}] phase=${phase:-unknown} current=${current:-unknown} progress=${progress:-n/a}"
  echo "${status_output}"
  echo "----"
} >> "${log_file}"

echo "${status_output}"
echo
printf 'Logged snapshot to %s\n' "${log_file}"

# Clear per-repo agent session marker so new work can start cleanly
SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
SESSION_TASK_FILE="$SESSION_DIR/current-task.json"

if [ -f "$SESSION_TASK_FILE" ]; then
  TASK_ID="$(jq -r '.taskId // "unknown"' "$SESSION_TASK_FILE" 2>/dev/null || echo "unknown")"
  rm -f "$SESSION_TASK_FILE"
  echo
  echo "Cleared active agent session marker for Task $TASK_ID."
  echo "Ensure Task Master status for this task reflects reality (pending/done) before starting new work."
else
  echo
  echo "No active agent session marker found (current-task.json)."
fi
