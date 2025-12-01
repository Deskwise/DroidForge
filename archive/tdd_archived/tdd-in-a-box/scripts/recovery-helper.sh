#!/bin/bash
# TDD-in-a-Box Recovery Helper
# Automates crash recovery decisions for non-developers
# Run this when an agent crashes mid-work

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
PROJECT_NAME=$(basename "$REPO_ROOT")
SESSION_DIR="$HOME/.taskmaster/$PROJECT_NAME/sessions"
SESSION_FILE="$SESSION_DIR/current-task.json"

echo "🔍 TDD-in-a-Box Crash Recovery"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if session lock exists
if [ ! -f "$SESSION_FILE" ]; then
  echo "✅ No crashed session detected."
  echo "   Repository is clean and ready for new work."
  echo ""
  echo "Run ./tdd-in-a-box/scripts/start-agent-work.sh to begin."
  exit 0
fi

# Load session info
TASK_ID=$(jq -r '.taskId // "unknown"' "$SESSION_FILE")
TASK_TYPE=$(jq -r '.taskType // "unknown"' "$SESSION_FILE")

echo "⚠️  Found crashed session:"
echo "   Task: $TASK_ID ($TASK_TYPE)"
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

TEST_OUTPUT=$(npm test 2>&1 || true)
TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Tests PASSED"
  echo ""
  echo "The partial work appears valid. Changed files:"
  echo ""
  git diff --stat
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "DECISION: Tests pass. You can keep or discard this work."
  echo ""
  read -p "Keep this work and mark task complete? (y/n): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "✅ Keeping work. Running wrapup..."
    ./tdd-in-a-box/scripts/autopilot-wrapup.sh
    echo ""
    echo "Next steps:"
    echo "1. Review the changes: git diff"
    echo "2. Commit if satisfied: git add -A && ./tdd-in-a-box/scripts/tm-commit.sh -m 'your message'"
    echo "3. Update Task Master status if needed"
  else
    echo ""
    echo "🔄 Discarding work. Running reset..."
    git restore . || git reset --hard HEAD
    ./tdd-in-a-box/scripts/autopilot-reset.sh
    echo ""
    echo "✅ Recovery complete. Repository reset to clean state."
    echo "   Run ./tdd-in-a-box/scripts/start-agent-work.sh to begin new work."
  fi
else
  echo "❌ Tests FAILED"
  echo ""
  echo "Test output:"
  echo "$TEST_OUTPUT" | tail -20
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "DECISION: Tests failed. Discarding partial work automatically."
  echo ""
  read -p "Press Enter to discard and reset..."
  echo ""
  git restore . || git reset --hard HEAD
  ./tdd-in-a-box/scripts/autopilot-reset.sh
  echo ""
  echo "✅ Recovery complete. Repository reset to clean state."
  echo "   Run ./tdd-in-a-box/scripts/start-agent-work.sh to begin new work."
fi
