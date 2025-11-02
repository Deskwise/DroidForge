#!/usr/bin/env bash
# Quick UAT test runner with helpful diagnostics

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_REPO="${1:-$HOME/code/droidtest}"
SCENARIO="${2:-saas}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DroidForge UAT Quick Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Repo:     $REPO_ROOT"
echo "Test dir: $TEST_REPO"
echo "Scenario: $SCENARIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Ensure test repo exists and is clean
if [[ ! -d "$TEST_REPO" ]]; then
    echo "Creating test repo: $TEST_REPO"
    mkdir -p "$TEST_REPO"
fi

# Clean previous DroidForge state
if [[ -d "$TEST_REPO/.droidforge" ]]; then
    echo "Cleaning previous .droidforge state..."
    rm -rf "$TEST_REPO/.droidforge"
fi

# Ensure pexpect is installed
if ! python3 -c "import pexpect" 2>/dev/null; then
    echo "Installing pexpect..."
    pip install pexpect
fi

# Run automation
echo ""
echo "Starting automation..."
echo ""

cd "$REPO_ROOT"
python3 scripts/automate-uat.py "$SCENARIO" "$TEST_REPO" --timeout 900

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Exit code: $EXIT_CODE"

if [[ $EXIT_CODE -eq 0 ]]; then
    echo "✓ Automation completed successfully"
    
    # Show session files
    if [[ -d "$TEST_REPO/.droidforge/session" ]]; then
        echo ""
        echo "Session files created:"
        ls -lh "$TEST_REPO/.droidforge/session/"
        
        # Check for methodologyConfirmed flag
        echo ""
        echo "Checking methodologyConfirmed flag..."
        for json_file in "$TEST_REPO/.droidforge/session"/*.json; do
            if [[ -f "$json_file" ]]; then
                if grep -q '"methodologyConfirmed"' "$json_file"; then
                    echo "✓ Found methodologyConfirmed in: $(basename "$json_file")"
                    grep '"methodologyConfirmed"' "$json_file"
                fi
            fi
        done
    fi
else
    echo "✗ Automation failed"
    
    # Show recent logs
    echo ""
    echo "Most recent UAT log:"
    LATEST_LOG=$(ls -t ~/.factory/uat/uat-*.log 2>/dev/null | head -1)
    if [[ -n "$LATEST_LOG" ]]; then
        echo "  $LATEST_LOG"
        echo ""
        echo "Last 50 lines:"
        tail -50 "$LATEST_LOG"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $EXIT_CODE
