#!/bin/bash

# Fully Automated Agent Work Initiation
# This script removes all ambiguity - tells agent EXACTLY what to do next
# Includes guardrails for stale Autopilot sessions and dirty working trees

set -euo pipefail

# Instruction and role gates
ACK_ROOT="$HOME/.factory/tdd-box/acks"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
ACK_DIR="$ACK_ROOT/$PROJECT_KEY"
ACK_FILE="$ACK_DIR/docs.sha"
ROLE_FILE="$ACK_DIR/role.txt"
AGENT_DOCS=("AGENTS.md" "tdd-in-a-box/AGENTS.md" "tdd-in-a-box/new-spec/TDD-in-a-box-New-Specification.md")
ALLOWED_ROLES=("implement" "audit" "remediate")

require_instruction_ack() {
  mkdir -p "$ACK_DIR"

  for doc in "${AGENT_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
      echo "❌ Missing required instruction file: $doc"
      echo "Ensure the TDD-in-a-Box bundle is intact before starting work."
      exit 1
    fi
  done

  local digest
  digest=$(cat "${AGENT_DOCS[@]}" | sha256sum | awk '{print $1}')

  if [ ! -f "$ACK_FILE" ] || [ "$(cat "$ACK_FILE")" != "$digest" ]; then
    echo "📘 Instruction acknowledgment required"
    echo "You must read these files before coding:"
    printf ' - %s\n' "${AGENT_DOCS[@]}"
    echo ""
    printf "Type 'ack' after reading all files to continue: "
    read -r RESPONSE
    if [ "$RESPONSE" != "ack" ]; then
      echo "Acknowledgment not confirmed. Aborting startup."
      exit 1
    fi
    echo "$digest" > "$ACK_FILE"
  fi
}

require_role_gate() {
  mkdir -p "$ACK_DIR"
  local role="${TDD_AGENT_ROLE:-}"

  if [ -z "$role" ]; then
    echo "❌ TDD_AGENT_ROLE not set."
    echo "Set TDD_AGENT_ROLE to one of: ${ALLOWED_ROLES[*]}"
    exit 1
  fi

  local allowed=false
  for r in "${ALLOWED_ROLES[@]}"; do
    if [ "$role" = "$r" ]; then
      allowed=true
      break
    fi
  done

  if [ "$allowed" != true ]; then
    echo "❌ Invalid TDD_AGENT_ROLE: $role"
    echo "Allowed values: ${ALLOWED_ROLES[*]}"
    exit 1
  fi

  echo "$role" > "$ROLE_FILE"
  echo "🔒 Role locked for this session: $role"
}

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

require_instruction_ack
require_role_gate

SESSION_ROOT="$HOME/.taskmaster"
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
