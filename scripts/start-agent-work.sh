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
  echo "Once the working tree is clean, re-run ./scripts/start-agent-work.sh."
  exit 1
fi

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_FILE="$SESSION_ROOT/$PROJECT_KEY/sessions/workflow-state.json"

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
      echo "Run ./scripts/autopilot-reset.sh to clear the old session"
      echo "and then retry this command."
      exit 1
    fi
  fi
fi

echo "🎯 AGENT WORK INITIATION"
echo "========================"
echo ""

# Step 1: Check for any available top-level tasks
echo "[1/5] Checking for available tasks..."
AVAILABLE_TASK=$(jq -r '.master.tasks[] | select(.status == "pending") | .id' < .taskmaster/tasks/tasks.json | head -1)

if [ -n "$AVAILABLE_TASK" ]; then
  echo ""
  echo "✅ TASK AVAILABLE"
  echo "=================="
  echo ""
  echo "Task ID: $AVAILABLE_TASK"
  echo ""
  echo "🎯 EXACT NEXT COMMAND TO RUN:"
  echo ""
  echo "   npx task-master autopilot start $AVAILABLE_TASK"
  echo ""
  echo "⚠️  DO NOT run any other commands first"
  echo "⚠️  DO NOT try to interpret the situation"
  echo "⚠️  Just copy and paste the command above"
  echo ""
  echo "This will start an Autopilot session and guide you through the work."
  exit 0
fi

# Step 2: Check for available subtasks within in-progress tasks
echo "[2/5] No top-level tasks available. Checking in-progress tasks..."
IN_PROGRESS_TASK=$(jq -r '.master.tasks[] | select(.status == "in-progress") | .id' < .taskmaster/tasks/tasks.json | head -1)

if [ -n "$IN_PROGRESS_TASK" ]; then
  echo "[3/5] Checking for available subtasks in Task $IN_PROGRESS_TASK..."
  AVAILABLE_SUBTASK=$(jq -r ".master.tasks[] | select(.id == \"$IN_PROGRESS_TASK\") | .subtasks[] | select(.status == \"pending\") | .id" < .taskmaster/tasks/tasks.json | head -1)

  if [ -n "$AVAILABLE_SUBTASK" ]; then
    echo ""
    echo "✅ SUBTASK AVAILABLE"
    echo "==================="
    echo ""
    echo "Parent Task: $IN_PROGRESS_TASK"
    echo "Subtask ID: $IN_PROGRESS_TASK.$AVAILABLE_SUBTASK"
    echo ""
    echo "🎯 EXACT NEXT COMMAND TO RUN:"
    echo ""
    echo "   npx task-master autopilot start $IN_PROGRESS_TASK.$AVAILABLE_SUBTASK"
    echo ""
    echo "⚠️  DO NOT run any other commands first"
    echo "⚠️  DO NOT try to interpret the situation"
    echo "⚠️  Just copy and paste the command above"
    echo ""
    echo "This will start an Autopilot session and guide you through the work."
    exit 0
  fi
fi

echo ""
echo "🚨 NO AVAILABLE TASKS"
echo "==================="
echo ""
echo "Status: No tasks or subtasks ready to work on"
echo ""
echo "Action needed: All work is completed or in-progress."
echo "If you believe this is an error, notify the user."
echo ""
exit 0
