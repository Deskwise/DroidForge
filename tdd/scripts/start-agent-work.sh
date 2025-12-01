#!/bin/bash
# Fully Automated Agent Work Initiation
# Tells agent EXACTLY what task to work on next

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
TASKS_FILE="$REPO_ROOT/.taskmaster/tasks/tasks.json"

# Get active tag from config (defaults to "master")
CONFIG_FILE="$REPO_ROOT/.taskmaster/config.json"
if [ -f "$CONFIG_FILE" ]; then
  ACTIVE_TAG=$(jq -r '.global.defaultTag // "master"' "$CONFIG_FILE")
else
  ACTIVE_TAG="master"
fi

# Ensure repo is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "🚫 WORKING TREE DIRTY"
  echo "====================="
  echo ""
  echo "Autopilot refuses to start because uncommitted changes exist."
  echo ""
  echo "Suggested fixes:"
  echo "  • git status --short"
  echo "  • git stash -u    # keep work for later"
  echo "  • git add/commit  # if work is ready"
  echo ""
  exit 1
fi

# Check for stale Autopilot session
SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_FILE="$SESSION_ROOT/$PROJECT_KEY/sessions/workflow-state.json"

if [ -f "$SESSION_FILE" ]; then
  echo "[0/3] Checking existing Autopilot session..."
  CURRENT_INDEX=$(jq '.context.currentSubtaskIndex' "$SESSION_FILE")
  if [ "$CURRENT_INDEX" != "null" ]; then
    CURRENT_STATUS=$(jq -r ".context.subtasks[$CURRENT_INDEX].status" "$SESSION_FILE")
    if [ "$CURRENT_STATUS" = "completed" ]; then
      echo ""
      echo "🚫 STALE AUTOPILOT SESSION"
      echo "=========================="
      echo ""
      echo "Run ./tdd/scripts/autopilot-reset.sh to clear, then retry."
      exit 1
    fi
  fi
fi

echo "🎯 AGENT WORK INITIATION"
echo "========================"
echo ""

# Query using active tag
echo "[1/3] Checking for available tasks (tag: $ACTIVE_TAG)..."

if [ ! -f "$TASKS_FILE" ]; then
  echo "❌ No tasks.json found at $TASKS_FILE"
  exit 1
fi

# Find first pending top-level task
AVAILABLE_TASK=$(jq -r --arg tag "$ACTIVE_TAG" '.[$tag].tasks[]? | select(.status == "pending") | .id' "$TASKS_FILE" 2>/dev/null | head -1)

if [ -n "$AVAILABLE_TASK" ]; then
  TASK_TITLE=$(jq -r --arg tag "$ACTIVE_TAG" --arg id "$AVAILABLE_TASK" '.[$tag].tasks[] | select(.id == ($id | tonumber)) | .title' "$TASKS_FILE" 2>/dev/null)
  echo ""
  echo "✅ TASK AVAILABLE"
  echo "================="
  echo ""
  echo "Task ID: $AVAILABLE_TASK"
  echo "Title: $TASK_TITLE"
  echo ""
  echo "🎯 EXACT COMMAND TO RUN:"
  echo ""
  echo "   npx task-master autopilot start $AVAILABLE_TASK"
  echo ""
  exit 0
fi

# Check for in-progress tasks with pending subtasks
echo "[2/3] Checking in-progress tasks for pending subtasks..."
IN_PROGRESS_TASK=$(jq -r --arg tag "$ACTIVE_TAG" '.[$tag].tasks[]? | select(.status == "in-progress") | .id' "$TASKS_FILE" 2>/dev/null | head -1)

if [ -n "$IN_PROGRESS_TASK" ]; then
  echo "[3/3] Checking subtasks in Task $IN_PROGRESS_TASK..."
  PENDING_SUBTASK=$(jq -r --arg tag "$ACTIVE_TAG" --arg id "$IN_PROGRESS_TASK" '.[$tag].tasks[] | select(.id == ($id | tonumber)) | .subtasks[]? | select(.status == "pending") | .id' "$TASKS_FILE" 2>/dev/null | head -1)
  
  if [ -n "$PENDING_SUBTASK" ]; then
    echo ""
    echo "✅ SUBTASK AVAILABLE"
    echo "==================="
    echo ""
    echo "Parent Task: $IN_PROGRESS_TASK"
    echo "Subtask ID: $IN_PROGRESS_TASK.$PENDING_SUBTASK"
    echo ""
    echo "🎯 EXACT COMMAND TO RUN:"
    echo ""
    echo "   npx task-master autopilot start $IN_PROGRESS_TASK"
    echo ""
    exit 0
  fi
fi

echo ""
echo "🚨 NO AVAILABLE TASKS"
echo "===================="
echo ""
echo "All tasks are completed or blocked."
echo "Run: npx task-master list --with-subtasks"
exit 0

