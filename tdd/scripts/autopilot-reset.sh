#!/bin/bash
# Abort/reset Autopilot session without keeping changes

set -euo pipefail

SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_DIR="$SESSION_ROOT/$PROJECT_KEY/sessions"
SESSION_FILE="$SESSION_DIR/workflow-state.json"

echo "🔄 Autopilot Session Reset"
echo "=========================="
echo ""

if [ -f "$SESSION_FILE" ]; then
  TASK_ID=$(jq -r '.context.taskId // "unknown"' "$SESSION_FILE" 2>/dev/null || echo "unknown")
  echo "Aborting session for Task $TASK_ID..."
  rm -f "$SESSION_FILE"
  echo "✅ Session file removed."
else
  echo "No active session found."
fi

# Also try to abort via task-master if available
npx task-master autopilot abort 2>/dev/null || true

echo ""
echo "📂 Git status:"
git status -sb

echo ""
echo "✅ Reset complete."
echo ""
echo "If you have uncommitted changes to discard:"
echo "  git restore ."
echo "  git clean -fd   # removes untracked files"
echo ""
echo "Run ./tdd/scripts/start-agent-work.sh to begin fresh."

