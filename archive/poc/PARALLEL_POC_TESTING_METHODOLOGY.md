# 🧪 Parallel Orchestration POC: Testing Methodology

## Purpose

This document describes how to test the parallel orchestration proof-of-concept, including:
- What we're testing and why
- Our thought process and design decisions
- Success criteria
- How to run the tests
- What to observe and measure

---

## 🎯 What Are We Testing?

### Core Hypothesis
**"Can multiple `droid exec` processes work in parallel on the same codebase without conflicts, coordinated through shared files?"**

### Secondary Questions
1. Can file-based coordination prevent conflicts?
2. Does Factory.ai's rate limiting allow 4 concurrent droids?
3. Is the speed improvement significant (4x faster)?
4. Does this work on Windows/Linux/macOS?
5. Can droids self-coordinate without real-time communication?

---

## 💭 Thought Process & Design Decisions

### Why File-Based Coordination?

**Decision:** Use shared files (PROGRESS.md, TODO lists) instead of HTTP server or database.

**Reasoning:**
1. **Simplicity** - No additional infrastructure needed
2. **Cross-platform** - Files work everywhere
3. **Debuggable** - Can inspect state by reading files
4. **Git-friendly** - Progress is version-controlled
5. **Fail-safe** - If a droid crashes, files preserve state

**Trade-offs:**
- ⚠️ No real-time updates (need to poll files)
- ⚠️ Potential race conditions (multiple writes)
- ✅ Can add HTTP layer later if needed

### Why Node.js Instead of Bash?

**Decision:** Write orchestration script in Node.js, not bash.

**Reasoning:**
1. **Cross-platform** - Works on Windows without WSL
2. **Better error handling** - Async/await, try/catch
3. **JSON parsing** - Native support for reading PROGRESS.md
4. **Process management** - `child_process` module is robust

**Trade-offs:**
- ⚠️ Requires Node.js installed
- ✅ Most developers already have it

### Why 4 Workstreams?

**Decision:** Split work into 4 parallel streams (Core, Isolation, Infrastructure, Tests).

**Reasoning:**
1. **File isolation** - Each owns different files (no conflicts)
2. **Logical separation** - Natural boundaries between components
3. **Optimal parallelism** - 4 is sweet spot for API limits
4. **Resource balance** - Each workstream is similar size

**Trade-offs:**
- ⚠️ More than 4 might hit API rate limits
- ⚠️ Fewer than 4 underutilizes parallelism

### Why Staggered Starts?

**Decision:** Start droids 30 seconds apart, not all at once.

**Reasoning:**
1. **Rate limit prevention** - Avoid all 4 hitting API simultaneously
2. **Load distribution** - Spread API calls over time
3. **Error isolation** - If startup fails, easier to debug

**Trade-offs:**
- ⚠️ 1.5 minute delay to full parallelism
- ✅ More reliable overall

### Why Explicit File Ownership?

**Decision:** Create FILE_OWNERSHIP.md that strictly defines who touches what.

**Reasoning:**
1. **Conflict prevention** - Clear boundaries
2. **Droid clarity** - Each knows their scope
3. **Debugging** - Easy to find who changed what
4. **Accountability** - Violations are detectable

**Trade-offs:**
- ⚠️ Rigid - hard to change mid-execution
- ✅ Safety over flexibility

---

## 📋 Test Plan

### Test 1: Single Droid Baseline
**Purpose:** Establish baseline speed for sequential work.

**Steps:**
1. Run one droid: `droid exec --auto medium "Implement Phase 1"`
2. Measure time to completion
3. Check quality (tests pass, code works)

**Expected:**
- ~6-8 hours per phase
- All tests pass
- No errors

**Success Criteria:**
- ✅ Phase completes successfully
- ✅ Tests pass
- ✅ Code follows interfaces

### Test 2: Two Droids in Parallel (Smoke Test)
**Purpose:** Test basic parallelism with minimal complexity.

**Steps:**
1. Start 2 droids on independent files:
   - Droid 1: Phase 1 (manager.ts, synchronization.ts)
   - Droid 2: Phase 5 (staging.ts, merger.ts)
2. Monitor for conflicts
3. Measure completion time vs sequential

**Expected:**
- ~6-8 hours total (vs 12-16 sequential)
- No file conflicts
- Both complete successfully

**Success Criteria:**
- ✅ Both droids finish
- ✅ No git merge conflicts
- ✅ Tests pass for both phases
- ✅ ~50% time savings vs sequential

### Test 3: Four Droids Full Parallel (Main Test)
**Purpose:** Test full parallel orchestration capability.

**Steps:**
1. Run `node parallel-droids.js`
2. Monitor PROGRESS.md every 30 minutes
3. Check for conflicts, errors, API limits
4. Measure total completion time
5. Run integration tests at end

**Expected:**
- ~24-48 hours total (vs 7-10 days sequential)
- No conflicts (thanks to FILE_OWNERSHIP.md)
- All 4 complete successfully
- 4x speed improvement

**Success Criteria:**
- ✅ All 4 droids finish
- ✅ Zero merge conflicts
- ✅ All tests pass (90%+ coverage)
- ✅ Integration works
- ✅ 70-90% time savings

### Test 4: Failure Recovery (Robustness Test)
**Purpose:** Test resilience to failures.

**Steps:**
1. Start 4 droids
2. Kill one droid mid-execution (Ctrl+C)
3. Check if others continue
4. Restart killed droid
5. Verify it resumes from last checkpoint

**Expected:**
- Other droids continue unaffected
- Killed droid can be restarted
- Work resumes from TODO list checkpoint
- Final integration succeeds

**Success Criteria:**
- ✅ 3 droids unaffected by 1 failure
- ✅ Failed droid can restart
- ✅ No duplicate work
- ✅ Final result correct

### Test 5: Cross-Platform (Compatibility Test)
**Purpose:** Verify works on different operating systems.

**Steps:**
1. Run on Linux (WSL or native)
2. Run on macOS (if available)
3. Run on Windows (native PowerShell)
4. Compare results

**Expected:**
- Same behavior on all platforms
- Same performance characteristics
- Same coordination mechanism works

**Success Criteria:**
- ✅ Works on at least 2 platforms
- ✅ No platform-specific bugs
- ✅ File paths handled correctly

---

## 📊 Metrics to Track

### Performance Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **Total Time** | Start to finish | <4 days (vs 6 weeks) |
| **Speedup Factor** | Sequential time / Parallel time | 3-5x |
| **Droid Utilization** | % time each droid is working | >80% |
| **API Calls** | Count from Factory.ai logs | <rate limit |

### Quality Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **Test Coverage** | `npm run test -- --coverage` | >90% |
| **Merge Conflicts** | `git status` after completion | 0 |
| **Build Success** | `npm run build` | Pass |
| **Lint Errors** | `npm run lint` | 0 |

### Reliability Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **Success Rate** | Completed / Started | 100% |
| **Retry Count** | Failed attempts before success | <2 |
| **Crash Recovery** | Can restart failed droid | Yes |

---

## 🔬 How to Run Tests

### Prerequisites

```bash
# Check Node.js installed
node --version  # Should be >=16.0.0

# Check Factory.ai CLI
droid --version

# Check you're in the right directory
pwd  # Should be /home/richard/code/DroidForge

# Ensure git is clean
git status  # Should show no uncommitted changes
```

### Running Test 1: Single Droid Baseline

```bash
# Create a test branch
git checkout -b test/parallel-poc-baseline

# Run single droid
time droid exec --auto medium -f prompts/phase1-prompt.txt

# Note the completion time
echo "Baseline time: [RECORD HERE]"

# Check results
npm test
git diff
```

### Running Test 2: Two Droids

```bash
# Create test branch
git checkout -b test/parallel-poc-two-droids

# Start first droid (background)
droid exec --auto medium -f prompts/phase1-prompt.txt > logs/phase1.log 2>&1 &
PID1=$!

# Wait 30 seconds
sleep 30

# Start second droid (background)
droid exec --auto medium -f prompts/phase5-prompt.txt > logs/phase5.log 2>&1 &
PID2=$!

# Monitor progress
while kill -0 $PID1 2>/dev/null || kill -0 $PID2 2>/dev/null; do
  echo "Status: Phase1=$(kill -0 $PID1 2>/dev/null && echo 'running' || echo 'done'), Phase5=$(kill -0 $PID2 2>/dev/null && echo 'running' || echo 'done')"
  sleep 60
done

echo "Both complete!"
```

### Running Test 3: Four Droids (Main Test)

```bash
# Create test branch
git checkout -b test/parallel-poc-full

# Run the orchestration script
node parallel-droids.js

# Script will:
# 1. Spawn 4 droids
# 2. Monitor progress
# 3. Report completion
# 4. Run integration tests
```

### Running Test 4: Failure Recovery

```bash
# Start full test
node parallel-droids.js &
MAIN_PID=$!

# Wait 30 minutes
sleep 1800

# Kill one random droid (simulate failure)
ps aux | grep "droid exec" | head -1 | awk '{print $2}' | xargs kill

# Wait for main script to detect and handle
wait $MAIN_PID

# Check if others completed
cat PROGRESS.md
```

---

## 🎯 Success Criteria

### Must-Have (Test FAILS if any fail)

- [ ] All 4 droids complete their assigned phases
- [ ] Zero merge conflicts in git
- [ ] All tests pass (`npm test` succeeds)
- [ ] Build succeeds (`npm run build` passes)
- [ ] No lint errors (`npm run lint` passes)
- [ ] Each droid only modified files in FILE_OWNERSHIP.md
- [ ] PROGRESS.md shows 100% completion for all phases
- [ ] Total time <5 days (vs 6 weeks baseline)

### Should-Have (Nice to have, not blocking)

- [ ] 4x speedup vs sequential
- [ ] <5% API rate limit errors
- [ ] Works on 2+ platforms (Windows/Linux/macOS)
- [ ] Failed droid can restart and resume
- [ ] Real-time progress visible in PROGRESS.md
- [ ] Clear logs for debugging

### Nice-to-Have (Bonus points)

- [ ] 5x+ speedup
- [ ] Zero API errors
- [ ] Works on all 3 platforms
- [ ] Automatic conflict resolution
- [ ] Beautiful progress UI

---

## 📝 Observation Checklist

During the test, observe and document:

### Every 30 Minutes
- [ ] Check PROGRESS.md for updates
- [ ] Check `ps aux | grep droid` for running processes
- [ ] Check logs/ directory for errors
- [ ] Check `git status` for changes

### Every 2 Hours
- [ ] Run `git diff` to see what's changed
- [ ] Check TODO lists for completion %
- [ ] Monitor Factory.ai API usage
- [ ] Check system resources (CPU, memory)

### At Completion
- [ ] Total time elapsed
- [ ] Number of conflicts (should be 0)
- [ ] Test results
- [ ] Build results
- [ ] Lint results
- [ ] Git diff size (lines changed)
- [ ] Any errors or warnings

---

## 🐛 Known Issues & Mitigations

### Issue 1: Race Condition on PROGRESS.md
**Symptom:** Multiple droids write to PROGRESS.md simultaneously, corrupting file.

**Mitigation:**
- Each droid has its own section in PROGRESS.md
- Use atomic write operations
- If corrupted, can reconstruct from TODO lists

### Issue 2: API Rate Limits
**Symptom:** Factory.ai returns 429 errors after many requests.

**Mitigation:**
- Stagger droid starts (30 sec apart)
- Use --model claude-haiku for less critical tasks
- Retry with exponential backoff

### Issue 3: Git Conflicts Despite FILE_OWNERSHIP.md
**Symptom:** Merge conflict on shared files (package.json, tsconfig.json).

**Mitigation:**
- Identify conflicting file
- Determine which droid should own it
- Update FILE_OWNERSHIP.md
- Restart affected droids

### Issue 4: Droid Gets Stuck
**Symptom:** Droid stops making progress for 2+ hours.

**Mitigation:**
- Check logs for errors
- Kill and restart that droid
- It resumes from TODO list checkpoint

---

## 📈 What Good Looks Like

### Successful Run Example

```
[2024-10-23 10:00:00] Starting parallel orchestration...
[2024-10-23 10:00:00] ✓ CoreDev starting (PID 12345)
[2024-10-23 10:00:30] ✓ IsolationDev starting (PID 12346)
[2024-10-23 10:01:00] ✓ InfraDev starting (PID 12347)
[2024-10-23 10:01:30] ✓ TestDev starting (PID 12348)

[2024-10-23 12:30:00] Progress: CoreDev 25%, IsolationDev 30%, InfraDev 40%, TestDev 15%
[2024-10-23 18:00:00] Progress: CoreDev 60%, IsolationDev 70%, InfraDev 85%, TestDev 45%
[2024-10-24 00:00:00] Progress: CoreDev 90%, IsolationDev 100%, InfraDev 100%, TestDev 80%

[2024-10-24 08:30:00] ✓ IsolationDev complete
[2024-10-24 09:15:00] ✓ InfraDev complete
[2024-10-24 11:45:00] ✓ TestDev complete
[2024-10-24 14:20:00] ✓ CoreDev complete

[2024-10-24 14:20:00] Running integration tests...
[2024-10-24 14:25:00] ✓ All tests pass (127/127)
[2024-10-24 14:25:00] ✓ Build successful
[2024-10-24 14:25:00] ✓ Lint passed
[2024-10-24 14:25:00] ✓ Zero merge conflicts

Total time: 52 hours (vs ~1000 hours sequential)
Speedup: 19.2x
Success! 🎉
```

---

## 🔄 Iteration Plan

### If Test Succeeds
1. Document learnings
2. Measure actual speedup
3. Identify bottlenecks
4. Plan Phase 2 (HTTP coordination)
5. Write PRD for full feature

### If Test Fails
1. Document failures
2. Identify root causes
3. Determine if fixable
4. Decide: retry, pivot, or abandon
5. Update hypothesis

### If Test Partially Succeeds
1. Document what worked
2. Identify what didn't
3. Adjust approach
4. Retry with fixes

---

## 📚 Data to Collect

Create a spreadsheet or doc with:

| Timestamp | Event | Droid | Status | Notes |
|-----------|-------|-------|--------|-------|
| 10:00:00 | Start | CoreDev | Running | Phase 1 starting |
| 10:00:30 | Start | IsolationDev | Running | Phase 5 starting |
| 12:30:00 | Progress | CoreDev | 25% | Created synchronization.ts |
| ... | ... | ... | ... | ... |

This will help analyze:
- Which droid was fastest
- Where bottlenecks occurred
- If any droid blocked others
- Optimal concurrency level

---

## 🎓 Learning Objectives

By running this test, we'll learn:

1. **Feasibility** - Can this actually work?
2. **Performance** - How much faster is it really?
3. **Reliability** - Does it work consistently?
4. **Usability** - Is it easy enough for others?
5. **Scalability** - Could we do 10 droids? 20?

---

## 🚀 Next Steps After Testing

### If Successful (>3x speedup, zero conflicts)
1. Clean up and polish code
2. Write PRD for full feature
3. Add HTTP server for real-time coordination
4. Integrate into DroidForge MCP
5. Launch as `/forge-parallel` command

### If Partially Successful (2-3x speedup, some issues)
1. Identify and fix issues
2. Retry with improvements
3. Consider simpler version
4. Document limitations

### If Unsuccessful (<2x speedup or many conflicts)
1. Document why it failed
2. Analyze root causes
3. Consider alternatives
4. Decide if worth continuing

---

## 🎯 Final Checklist Before Running

- [ ] All coordination files created
- [ ] parallel-droids.js tested and working
- [ ] Git is clean (no uncommitted changes)
- [ ] Factory.ai API key is set
- [ ] Node.js >=16 is installed
- [ ] Logs directory exists
- [ ] Test branch created
- [ ] Success criteria are clear
- [ ] Observation checklist ready
- [ ] Time tracking started

**Ready to run? LET'S GO!** 🚀
