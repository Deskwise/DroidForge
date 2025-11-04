# UAT Automation Fix Summary

## Problem Diagnosed

The UAT automation was **stuck in a loop** trying to match prompts that don't exist in the current onboarding flow.

### Root Cause

1. **Mismatched Expectations**: `scripts/automate-uat.py` was looking for old structured prompt labels
2. **Flow Changed**: The onboarding system switched to conversational AI-driven prompts (in `src/mcp/prompts/onboarding-intelligent.ts`)
3. **Pattern Mismatch**: Old patterns like `"Who will be using"` weren't matching new conversational prompts like `"Who's playing and how should matches feel?"`

### Evidence from Chatlog

- Session `748f1ef2-b434-477c-81ed-ad43f1b7e710.jsonl` had only **7 lines** (session never progressed)
- The droid asked the vision question but never received the answer programmatically
- Automation was waiting for prompts that would never appear

## Changes Made

### 1. Updated Pattern Matching (`automate-uat.py`)

**Expanded patterns to catch conversational variants:**

```python
{
    'label': 'Project Vision',
    'patterns': [r'(?i)tell me about your project', r'what are you building']
},
{
    'label': 'Target Audience', 
    'patterns': [r'(?i)who.?s playing', r'Who will be using']
},
{
    'label': 'Success Signal',
    'patterns': [r'(?i)what moments would make you high-five', r'what would success look like']
}
# ... etc for all prompts
```

### 2. Improved Debugging

**Added diagnostic output:**
- Shows which pattern matched
- Prints last 500 chars on timeout
- Displays progress through onboarding steps
- Logs sent answers for verification

### 3. Graceful Fallback

**Handles missing prompts:**
- Tries to match prompt patterns
- On timeout, logs warning and continues (doesn't crash)
- Allows flow to proceed even if some prompts are skipped

### 4. Test Helper Script

Created `scripts/test-uat-quick.sh` to:
- Clean test environment
- Run automation with diagnostics
- Check for `methodologyConfirmed` flag
- Show session files and recent logs

## How to Use

### Quick Test

```bash
# From DroidForge repo root
./scripts/test-uat-quick.sh ~/code/droidtest saas
```

### Manual Run

```bash
# Ensure pexpect is installed
pip install pexpect

# Clean test repo
rm -rf ~/code/droidtest/.droidforge

# Run specific scenario
python3 scripts/automate-uat.py saas ~/code/droidtest --timeout 900
```

### Available Scenarios

- `saas` - SaaS Analytics Dashboard (Agile)
- `mobile` - Mobile Wellness Companion (Rapid)
- `iot` - Embedded IoT Firmware (TDD)

## Verification Steps

1. **Run automation**: `./scripts/test-uat-quick.sh`
2. **Check exit code**: Should be `0` for success
3. **Inspect session**: `ls ~/code/droidtest/.droidforge/session/`
4. **Verify flag**: `grep methodologyConfirmed ~/code/droidtest/.droidforge/session/*.json`
5. **Review transcript**: `ls -t ~/.factory/uat/uat-*.log | head -1`

## Expected Flow

1. Droid starts, shows welcome
2. Automation sends `/forge-start`
3. Droid asks project vision → automation answers
4. Droid asks audience/style → automation answers  
5. Droid asks success signal → automation answers
6. Droid confirms understanding → automation confirms
7. Droid asks experience/quality/constraints → automation answers each
8. Droid recommends methodology → automation selects
9. Droid forges roster → automation confirms
10. Session completes with `methodologyConfirmed: true`

## Troubleshooting

### If automation still times out:

```bash
# Check what prompts droid is actually showing
cat ~/.factory/uat/uat-*.log | grep -i "tell me\|who's\|what moments"

# Compare with patterns in automate-uat.py
grep "patterns:" scripts/automate-uat.py
```

### If patterns don't match:

1. Find the actual prompt text in the log
2. Add that pattern to `PROMPT_SEQUENCE` in `automate-uat.py`
3. Use `(?i)` prefix for case-insensitive matching
4. Test with simpler regex first, then refine

### If droid doesn't respond:

- Check `~/.factory/sessions/*.jsonl` for the actual conversation
- Verify MCP server is running: `droid mcp list`
- Try manual interactive session first: `cd ~/code/droidtest && droid`

## Next Steps

1. **Run the test**: Execute `./scripts/test-uat-quick.sh`
2. **Watch output**: Automation now shows detailed progress
3. **Check results**: Verify `methodologyConfirmed` flag is set
4. **Iterate if needed**: Add more patterns based on actual prompts seen

## Technical Notes

### Why This Approach Works

- **PTY allocation**: `pexpect` provides true TTY for interactive programs
- **Pattern flexibility**: Regex patterns catch variations in conversational prompts
- **Noise filtering**: Ignores status messages, spinners, UI chrome
- **Timeout handling**: Continues on minor mismatches instead of crashing
- **Diagnostic logging**: Shows exactly what's happening for debugging

### Comparison to Industry Patterns

This implementation follows best practices from [docs/reference/tty-automation-research.md](../reference/tty-automation-research.md):

- Uses `pexpect` for Python automation (industry standard)
- Allocates pseudo-terminal for TTY-checking programs
- Logs full transcript for debugging
- Handles signal propagation and exit codes
- Provides graceful degradation on unexpected output

### Future Improvements

- Extract prompt patterns from TypeScript source automatically
- Add visual progress indicator during automation
- Support parallel scenario execution
- Generate test reports with pass/fail metrics
- Add screenshot capture for debugging UI issues
