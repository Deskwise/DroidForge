#!/bin/bash
# TDD-in-a-Box Crash Recovery
# Automates crash recovery decisions

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PROJECT_NAME=$(basename "$REPO_ROOT")
SESSION_ROOT="$HOME/.taskmaster"
PROJECT_KEY="$(pwd | sed 's#/#-#g')"
SESSION_FILE="$SESSION_ROOT/$PROJECT_KEY/sessions/workflow-state.json"

echo "🔍 TDD-in-a-Box Crash Recovery"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if session lock exists
if [ ! -f "$SESSION_FILE" ]; then
  echo "✅ No crashed session detected."
  echo "   Repository is ready for new work."
  echo ""
  echo "Run ./tdd/scripts/start-agent-work.sh to begin."
  exit 0
fi

# Load session info
TASK_ID=$(jq -r '.context.taskId // "unknown"' "$SESSION_FILE" 2>/dev/null || echo "unknown")

echo "⚠️  Found crashed session:"
echo "   Task: $TASK_ID"
echo ""
echo "Analyzing partial work..."
echo "────────────────────────────────────────────────────────"
echo ""

# Check git status
echo "📂 Git Status:"
git status -sb || true
echo ""

# Run tests to validate partial work
echo "🧪 Running tests to validate partial work..."
echo ""

TEST_EXIT=0
npm test 2>&1 || TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
  echo ""
  echo "✅ Tests PASSED"
  echo ""
  echo "The partial work appears valid. Changed files:"
  echo ""
  git diff --stat 2>/dev/null || true
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "DECISION: Tests pass. You can keep or discard this work."
  echo ""
  echo "Options:"
  echo "  1) Keep work:    ./tdd/scripts/autopilot-wrapup.sh"
  echo "  2) Discard work: ./tdd/scripts/autopilot-reset.sh"
  echo ""
  read -p "Keep this work? (y/n): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "✅ Keeping work. Running wrapup..."
    ./tdd/scripts/autopilot-wrapup.sh
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git diff"
    echo "2. Commit: git add -A && git commit -m 'your message'"
  else
    echo ""
    echo "🔄 Discarding work..."
    git restore . 2>/dev/null || git checkout -- . 2>/dev/null || true
    ./tdd/scripts/autopilot-reset.sh
    echo ""
    echo "✅ Recovery complete. Repository reset."
  fi
else
  echo ""
  echo "❌ Tests FAILED"
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "DECISION: Tests failed. Discarding partial work."
  echo ""
  read -p "Press Enter to discard and reset..."
  echo ""
  git restore . 2>/dev/null || git checkout -- . 2>/dev/null || true
  ./tdd/scripts/autopilot-reset.sh
  echo ""
  echo "✅ Recovery complete. Repository reset."
  echo "   Run ./tdd/scripts/start-agent-work.sh to begin."
fi

