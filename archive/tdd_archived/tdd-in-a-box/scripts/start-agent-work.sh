#!/bin/bash

# Fully Automated Agent Work Initiation
# This script removes all ambiguity - tells agent EXACTLY what to do next
# Includes guardrails for stale Autopilot sessions and dirty working trees

set -euo pipefail

# Ensure repo is clean before starting Autopilot
if [ -n "$(git status --porcelain)" ]; then
  echo "🚫 WORKING TREE DIRTY"
  echo "====================="
  echo ""
  echo "Autopilot refuses to start because uncommitted changes or untracked files are present."
  echo "Stash, commit, or back up your work before launching a new session."
  echo ""
  echo "Suggested fixes:"
  echo "  • git status --short"
  echo "  • git stash -u    # if you want to keep work for later"
  echo "  • git add/commit  # if the work is ready"
  echo ""
  echo "Once the working tree is clean, re-run ./tdd-in-a-box/scripts/start-agent-work.sh."
  exit 1
fi

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
SESSION_FILE="$SESSION_DIR/workflow-state.json"
SESSION_TASK_FILE="$SESSION_DIR/current-task.json"

# Check for stale Autopilot session
if [ -f "$SESSION_FILE" ]; then
  echo "[0/5] Checking existing Autopilot session..."
  CURRENT_INDEX=$(jq '.context.currentSubtaskIndex' "$SESSION_FILE")
  if [ "$CURRENT_INDEX" != "null" ]; then
    CURRENT_STATUS=$(jq -r ".context.subtasks[$CURRENT_INDEX].status" "$SESSION_FILE")
    CURRENT_ID=$(jq -r ".context.subtasks[$CURRENT_INDEX].id" "$SESSION_FILE")
    if [ "$CURRENT_STATUS" = "completed" ]; then
      echo ""
      echo "🚫 STALE AUTOPILOT SESSION DETECTED"
      echo "===================================="
      echo ""
      echo "The persisted workflow points to subtask $CURRENT_ID,"
      echo "but it is already marked as completed."
      echo ""
      echo "Run ./tdd-in-a-box/scripts/autopilot-reset.sh to clear the old session"
      echo "and then retry this command."
      exit 1
    fi
  fi
fi

# Check for active agent session
if [ -f "$SESSION_TASK_FILE" ]; then
  ACTIVE_TASK_ID="$(jq -r '.taskId // "unknown"' "$SESSION_TASK_FILE" 2>/dev/null || echo "unknown")"
  echo "🚫 ACTIVE AGENT SESSION DETECTED"
  echo "================================"
  echo ""
  echo "A previous agent session is still recorded for Task $ACTIVE_TASK_ID."
  echo "Run ./tdd-in-a-box/scripts/autopilot-wrapup.sh or ./tdd-in-a-box/scripts/autopilot-reset.sh"
  echo "before starting new work."
  exit 1
fi

echo "🎯 AGENT WORK INITIATION"
echo "========================"
echo ""

# Step 1: Find the next pending task using Task Master CLI
echo "[1/5] Finding next pending task..."

# Support TM_TAG env var override
TAG_FLAG=""
if [ ! -z "${TM_TAG:-}" ]; then
  TAG_FLAG="--tag $TM_TAG"
  echo "🏷️  Using tag: $TM_TAG"
fi

# Use task-master next to find the best task (handles dependencies and priorities)
NEXT_TASK_JSON=$(task-master next --json $TAG_FLAG 2>/dev/null || echo "")

if [ -z "$NEXT_TASK_JSON" ] || [ "$NEXT_TASK_JSON" = "null" ]; then
  echo ""
  echo "🚨 NO AVAILABLE TASKS"
  echo "==================="
  echo ""
  echo "Status: No tasks or subtasks ready to work on"
  echo "Tag Context: ${TM_TAG:-default}"
  echo ""
  echo "Action needed: All work is completed or in-progress."
  echo "If you believe this is an error, check your tag context or add new tasks."
  echo ""
  exit 0
fi

NEXT_TASK_ID=$(echo "$NEXT_TASK_JSON" | jq -r '.id')
NEXT_TASK_TITLE=$(echo "$NEXT_TASK_JSON" | jq -r '.title')
NEXT_TASK_TYPE=$(echo "$NEXT_TASK_JSON" | jq -r '.type // "task"')

echo "[2/5] Found candidate: $NEXT_TASK_ID - $NEXT_TASK_TITLE"

# Step 2: Claim the task
echo "[3/5] Claiming $NEXT_TASK_TYPE $NEXT_TASK_ID via Task-master..."
task-master set-status --id="$NEXT_TASK_ID" --status=in-progress $TAG_FLAG >/dev/null

# Step 3: Create session lock
echo "[4/5] Creating session lock..."
mkdir -p "$SESSION_DIR"
printf '{ "taskId": "%s", "startedAt": "%s" }\n' "$NEXT_TASK_ID" "$(date -Iseconds)" > "$SESSION_TASK_FILE"

# Step 4: Output instructions
echo ""
echo "✅ TASK CLAIMED & READY"
echo "======================="
echo ""
echo "Task ID: $NEXT_TASK_ID"
echo "Title:   $NEXT_TASK_TITLE"
echo "Tag:     ${TM_TAG:-default}"
echo ""
echo "🎯 EXACT NEXT COMMAND TO RUN:"
echo ""
echo "   task-master autopilot start $NEXT_TASK_ID $TAG_FLAG"
echo ""
echo "⚠️  DO NOT run any other commands first"
echo "⚠️  DO NOT try to interpret the situation"
echo "⚠️  Just copy and paste the command above"
echo ""
echo "This will start an Autopilot session and guide you through the work."
exit 0
