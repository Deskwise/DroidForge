# ⚡ Quick Start: Run the Parallel Orchestration POC

## Prerequisites

```bash
# 1. Check Node.js (need >=16.0.0)
node --version

# 2. Check Factory.ai Droid CLI
droid --version

# 3. Check you're in the right directory
cd /home/richard/code/DroidForge
pwd  # Should show .../DroidForge

# 4. Ensure git is clean
git status  # No uncommitted changes

# 5. Create test branch
git checkout -b test/parallel-poc
```

## Run the POC

```bash
# Install dependencies (if not already done)
npm install

# Create logs directory
mkdir -p logs

# Run the parallel orchestration
node parallel-droids.js
```

That's it! The script will:
1. Check all required files exist
2. Spawn 4 droids (staggered 30s apart)
3. Monitor progress
4. Run integration tests when complete
5. Report results

## Monitor Progress

### Real-Time Monitoring

```bash
# Terminal 1: Watch overall progress
watch -n 30 cat PROGRESS.md

# Terminal 2: Watch droid logs
tail -f logs/*.log

# Terminal 3: See running droids
watch -n 10 'ps aux | grep "droid exec"'

# Terminal 4: Watch git changes
watch -n 60 'git status --short'
```

### Manual Checks

```bash
# Check progress summary
cat PROGRESS.md

# Check individual TODO lists
cat TODO_WS1_CORE.md
cat TODO_WS2_ISOLATION.md
cat TODO_WS3_INFRA.md
cat TODO_WS4_TESTS.md

# See what's changed
git diff --stat
git diff src/mcp/execution/

# Check logs for errors
grep -i error logs/*.log
```

## What to Expect

### Timeline
- **Startup:** 2 minutes (staggered starts)
- **Execution:** 24-72 hours (droids work autonomously)
- **Integration:** 15-30 minutes (tests + build)
- **Total:** 1-3 days

### Output
```
[2024-10-23 10:00:00] Starting CoreDev...
[2024-10-23 10:00:30] Starting IsolationDev...
[2024-10-23 10:01:00] Starting InfraDev...
[2024-10-23 10:01:30] Starting TestDev...

[Monitoring progress...]

[2024-10-24 14:20:00] ✓ CoreDev completed
[2024-10-24 09:15:00] ✓ IsolationDev completed
[2024-10-24 11:45:00] ✓ TestDev completed
[2024-10-24 14:20:00] ✓ InfraDev completed

Running integration tests...
✓ All tests passed
✓ Build successful
✓ Lint passed

🎉 SUCCESS!
```

## Troubleshooting

### Droid Not Starting
```bash
# Check Factory.ai API key
echo $FACTORY_API_KEY

# Check droid CLI works
droid exec "echo test"

# Check logs
cat logs/orchestrator.log
```

### Droid Gets Stuck
```bash
# Find the stuck droid
ps aux | grep "droid exec"

# Check its log
cat logs/CoreDev.log  # Or whichever is stuck

# Option 1: Wait (might be thinking)
# Option 2: Kill and restart
kill <PID>
# Then restart that specific droid manually
```

### API Rate Limits
```bash
# If you see 429 errors in logs
# Wait 1 hour, then retry
# Or use cheaper model
```

### File Conflicts
```bash
# Check for conflicts
git status

# Should show no conflicts
# If conflicts appear, check FILE_OWNERSHIP.md
# Figure out who violated boundaries
```

## Stop/Pause Execution

### Graceful Stop
```bash
# Ctrl+C in terminal running parallel-droids.js
# Droids continue in background

# To stop droids too:
pkill -f "droid exec"
```

### Resume After Stop
```bash
# Droids track progress in TODO files
# Just restart:
node parallel-droids.js

# They'll resume from checkpoints
```

## Success Criteria

Check these when complete:

```bash
# 1. All droids finished
cat PROGRESS.md | grep "Complete"

# 2. No merge conflicts
git status  # Should be clean

# 3. Tests pass
npm test

# 4. Build works
npm run build

# 5. Lint clean
npm run lint

# 6. Only owned files modified
git diff --name-only
# Compare to FILE_OWNERSHIP.md
```

## After Completion

### If Successful
```bash
# Review changes
git diff

# Create detailed commit
git add .
git commit -m "feat: Implement parallel orchestration POC

Implemented via 4 parallel droids:
- CoreDev: Synchronization, locks, deadlock detection, persistence
- IsolationDev: Staging directories and atomic merging  
- InfraDev: Event bus, resource matching, observability
- TestDev: Comprehensive test suite

Results:
- Total time: X hours (vs ~1000 hours sequential)
- Speedup: Xx
- Tests: 127/127 passing
- Coverage: 92%
- Zero merge conflicts

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"

# Document learnings
# Update docs/PARALLEL_POC_TESTING_METHODOLOGY.md with results
```

### If Failed
```bash
# Document what went wrong
# Check logs/
# Update PROGRESS.md with issues
# Decide: fix and retry, or pivot
```

## Tips

1. **Don't micromanage** - Let droids work for several hours before checking
2. **Check logs for errors** - Catch issues early
3. **Trust the process** - File-based coordination works
4. **Monitor API usage** - Watch for rate limits
5. **Have patience** - AI development takes time

## Help & Support

- Check `docs/PARALLEL_POC_TESTING_METHODOLOGY.md` for detailed methodology
- Check `docs/FEASIBILITY_ANALYSIS.md` for architecture details
- Check `PARALLELIZATION_ROADMAP.md` for phase details
- Check `INTERFACES.md` for contract definitions

## Questions?

If something's unclear:
1. Check the docs above
2. Review logs in `logs/` directory
3. Check PROGRESS.md for status
4. Ask in GitHub discussions

---

**Good luck! Let's prove parallel orchestration works!** 🚀
