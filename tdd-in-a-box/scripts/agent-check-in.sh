#!/bin/bash
# New Agent Check-In Helper
# This script helps new agents follow the mandatory entry protocol

set -euo pipefail

echo "🤖 NEW AGENT CHECK-IN"
echo "===================="
echo ""
echo "Running start-agent-work.sh to get task assignment..."
echo ""

# Run start-agent-work and capture output
WORK_OUTPUT=$(./tdd-in-a-box/scripts/start-agent-work.sh 2>&1)
EXIT_CODE=$?

echo "$WORK_OUTPUT"
echo ""

if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ start-agent-work.sh failed. Address the issues above before proceeding."
  exit 1
fi

# Extract task ID from output (look for "Task ID:" or "Subtask ID:")
TASK_ID=$(echo "$WORK_OUTPUT" | grep -E "(Task ID:|Subtask ID:)" | head -1 | awk '{print $NF}')

if [ -z "$TASK_ID" ]; then
  echo "⚠️  Could not extract task ID from output."
  echo "Review the output above and manually report to the user."
  exit 0
fi

# Extract the autopilot command
AUTOPILOT_CMD=$(echo "$WORK_OUTPUT" | grep "npx task-master autopilot start" | head -1 | xargs)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 REPORT THIS TO THE USER (copy the text below):"
echo ""
echo "───────────────────────────────────────────────────────"
echo "I've been assigned Task $TASK_ID"
echo ""
echo "Task details are shown above. This task has been marked"
echo "as 'in-progress' in Task Master."
echo ""
echo "Shall I proceed with this task?"
echo "───────────────────────────────────────────────────────"
echo ""
echo "⏸️  WAITING FOR USER APPROVAL"
echo ""
echo "If user says YES, run this command:"
echo "  $AUTOPILOT_CMD"
echo ""
echo "If user says NO, run this command to reset:"
echo "  ./tdd-in-a-box/scripts/autopilot-reset.sh"
echo ""
