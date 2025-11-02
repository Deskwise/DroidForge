# Automated UAT Guide

## Overview

Automated UAT harness using `pexpect` to drive the DroidForge onboarding flow with PTY allocation. This bypasses the `[[ -t 0 ]]` guard while capturing full transcripts.

## Quick Start

```bash
# Install dependencies (one-time)
pip install pexpect

# Ensure dev build is linked
npm run build
scripts/dev-link.sh

# Run automated UAT
scripts/run-uat-automated saas
```

## Available Scenarios

| Scenario | Project Type | Methodology | Duration |
|----------|-------------|-------------|----------|
| `saas` | SaaS Analytics Dashboard | Agile | ~3 min |
| `mobile` | Mobile Wellness Companion | Rapid | ~3 min |
| `iot` | Embedded IoT Firmware | TDD | ~3 min |

Each scenario exercises all 10 onboarding fields plus methodology confirmation.

## Usage

### Basic Invocation

```bash
# Use default test repo (~/code/droidtest)
scripts/run-uat-automated <scenario>

# Specify custom test repo
scripts/run-uat-automated <scenario> /path/to/test-repo
```

### Examples

```bash
# SaaS scenario with default repo
scripts/run-uat-automated saas

# IoT scenario with custom repo
scripts/run-uat-automated iot ~/tmp/firmware-test

# Mobile scenario with custom log directory
LOG_DIR=/tmp/uat-logs scripts/run-uat-automated mobile
```

## Output Files

### Transcript
Full PTY transcript captured to:
```
~/.factory/uat/uat-<scenario>-<timestamp>.log
```

### Session File
Onboarding session persisted to:
```
<test-repo>/.droidforge/session/<session-id>.json
```

### Droid Logs
Main Droid logs with MCP tool execution:
```
~/.factory/logs/droid-log-single.log
```

## Verification Steps

After running automated UAT, verify the persistence fix:

```bash
# 1. Check session file for methodologyConfirmed flag
grep 'methodologyConfirmed' ~/code/droidtest/.droidforge/session/*.json

# Expected: "methodologyConfirmed": true

# 2. Search logs for confirmation events
grep 'confirm_methodology_session_state' ~/.factory/logs/droid-log-single.log | tail -20

# Expected: confirm_methodology_session_state_after shows methodologyConfirmed: true

# 3. Verify no "missing confirmation" errors
grep 'select_methodology_missing_confirmation' ~/.factory/logs/droid-log-single.log | tail -5

# Expected: No new entries (or entries from before the persistence fix)
```

## How It Works

1. **PTY Allocation**: `pexpect.spawn()` creates a pseudo-terminal, satisfying the `[[ -t 0 ]]` guard
2. **Pattern Matching**: `child.expect()` waits for specific prompts before sending answers
3. **Transcript Logging**: All I/O is captured to timestamped log files
4. **Clean Exit**: Automation sends 'exit' command and waits for EOF

## Architecture

```
scripts/run-uat-automated (bash wrapper)
  ├─ Validates dependencies (python3, pexpect, droid)
  ├─ Sets up test repository
  └─ Invokes automate-uat.py

scripts/automate-uat.py (pexpect automation)
  ├─ Spawns droid with PTY
  ├─ Waits for prompts using pattern matching
  ├─ Sends canned scenario answers
  ├─ Confirms methodology
  ├─ Selects methodology
  └─ Waits for roster generation
```

## Troubleshooting

### "pexpect not installed"
```bash
pip install pexpect
# or
pip3 install pexpect
```

### "droid not found in PATH"
```bash
npm run build
scripts/dev-link.sh
```

### Timeout Waiting for Prompt
```bash
# Increase timeout
TIMEOUT=1200 scripts/run-uat-automated saas

# Check transcript for last output
cat ~/.factory/uat/uat-saas-*.log | tail -50
```

### Pattern Matching Failed
Check the transcript to see what prompt was actually shown:
```bash
# View full transcript
cat ~/.factory/uat/uat-<scenario>-<timestamp>.log
```

## Advanced Usage

### Custom Timeout
```bash
TIMEOUT=1200 scripts/run-uat-automated saas
```

### Custom Log Directory
```bash
LOG_DIR=/tmp/my-uat-logs scripts/run-uat-automated mobile
```

### Run All Scenarios
```bash
for scenario in saas mobile iot; do
  echo "Running $scenario..."
  scripts/run-uat-automated "$scenario"
  echo "---"
done
```

### Analyze Methodologies Across Scenarios
```bash
for scenario in saas mobile iot; do
  scripts/run-uat-automated "$scenario"
  echo "$scenario session:"
  cat ~/code/droidtest/.droidforge/session/*.json | jq '{methodologyConfirmed, methodology}'
  rm -rf ~/code/droidtest/.droidforge
  echo "---"
done
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: UAT Regression

on: [push, pull_request]

jobs:
  uat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm ci
          pip install pexpect
      
      - name: Build and link
        run: |
          npm run build
          scripts/dev-link.sh
      
      - name: Run automated UAT
        run: |
          scripts/run-uat-automated saas
      
      - name: Verify persistence
        run: |
          # Check methodologyConfirmed stayed true
          grep '"methodologyConfirmed": true' ~/code/droidtest/.droidforge/session/*.json
          
          # No missing confirmation errors
          ! grep 'select_methodology_missing_confirmation' ~/.factory/logs/droid-log-single.log
      
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: uat-logs
          path: |
            ~/.factory/uat/
            ~/.factory/logs/droid-log-single.log
```

## Related Documentation

- [TTY Automation Research](../reference/tty-automation-research.md) - Industry approaches
- [UAT Onboarding Scenarios](uat-onboarding-scenarios.md) - Canned prompts
- [Methodology Confirmation Test](../../src/mcp/tools/__tests__/methodologyConfirmation.test.ts) - Unit test coverage

## Contributing

When adding new UAT scenarios:

1. Add scenario definition to `automate-uat.py` `SCENARIOS` dict
2. Update scenario list in this guide
3. Test with `scripts/run-uat-automated <new-scenario>`
4. Verify session persistence as documented above
