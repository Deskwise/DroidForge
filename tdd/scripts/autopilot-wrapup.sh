#!/bin/bash
# Clean finish for Autopilot session

set -euo pipefail

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
SESSION_FILE="$SESSION_DIR/workflow-state.json"

echo "🏁 Autopilot Session Wrapup"
echo "==========================="
echo ""

if [ -f "$SESSION_FILE" ]; then
  TASK_ID=$(jq -r '.context.taskId // "unknown"' "$SESSION_FILE" 2>/dev/null || echo "unknown")
  echo "Closing session for Task $TASK_ID..."
  rm -f "$SESSION_FILE"
  echo "✅ Session file removed."
else
  echo "No active session found."
fi

echo ""
echo "📋 Current task status:"
npx task-master list --with-subtasks 2>/dev/null | head -30 || echo "(task-master not available)"

echo ""
echo "📂 Git status:"
git status -sb

echo ""
echo "✅ Wrapup complete."
echo ""
echo "Next steps:"
echo "  • Review and commit any remaining changes"
echo "  • Run ./tdd/scripts/start-agent-work.sh for next task"

