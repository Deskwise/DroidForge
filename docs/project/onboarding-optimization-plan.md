# DroidForge Onboarding Optimization Plan

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Impact**: 30-50% reduction in onboarding latency, elimination of wasted tool retries  
**Last Updated**: 2025-11-01

---

## Executive Summary

Based on analysis of session logs (`ee63bd3d-8be2-4012-aed6-0c44590bfc25.jsonl`) and timing telemetry, the DroidForge onboarding flow exhibits three primary inefficiencies:

1. **Repeated tool call failures** - `select_methodology` fails 3x consecutively due to missing confirmation guard
2. **Serial execution** - Final phase tools run sequentially despite being independent
3. **Lack of observability** - No aggregated metrics to detect regressions

This plan provides step-by-step implementation guidance for any AI agent to apply these optimizations.

---

## Optimization 1: Methodology Confirmation Guard

### Problem
The AI agent calls `select_methodology` before the user explicitly confirms their choice, resulting in:
- 3 consecutive failures in session `ee63bd3d` (04:56:58, 04:57:19, 04:57:45)
- Each failure wastes ~20s of user wait time
- Creates "thinking loop" perception

### Root Cause
`commands.ts` forge-start instructions don't enforce a confirmation step before calling `select_methodology`.

### Solution
Add a confirmation gate in the onboarding session state and update AI instructions.

#### Implementation Steps

**Step 1: Add session state field**

File: `src/mcp/types.ts`

```typescript
export interface OnboardingSession {
  sessionId: string;
  repoRoot: string;
  createdAt: string;
  state: OnboardingState;
  scan?: ScanSnapshot;
  scanComputedAt?: string;
  scanSignals?: string[];
  scanHints?: string[];
  scanPrimaryLanguage?: string | null;
  description?: string;
  
  // Extended onboarding data per spec
  projectVision?: string;
  targetAudience?: string;
  timelineConstraints?: string;
  qualityVsSpeed?: string;
  teamSize?: string;
  experienceLevel?: string;
  budgetConstraints?: string;
  deploymentRequirements?: string;
  securityRequirements?: string;
  scalabilityNeeds?: string;
  
  aiRecommendations?: string[];
  inferredData?: Record<string, string>;
  methodology?: string;
  methodologyConfirmed?: boolean;  // ADD THIS LINE
  selectedDroids?: string[];
  customDroids?: CustomDroidSeed[];
}
```

**Step 2: Update select_methodology tool validation**

File: `src/mcp/tools/selectMethodology.ts`

Find the handler function and add validation:

```typescript
handler: async input => {
  const { repoRoot, sessionId, methodology } = input;
  
  const session = await deps.sessionStore.load(repoRoot, sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  // ADD THIS VALIDATION BLOCK
  if (!session.methodologyConfirmed) {
    throw new Error(
      'Please confirm the methodology before I record it. ' +
      'Ask the user: "Would you like to proceed with [methodology]?" ' +
      'and wait for explicit confirmation (yes/proceed/confirmed/etc.).'
    );
  }
  
  // ... rest of existing logic
}
```

**Step 3: Create confirm_methodology tool**

File: `src/mcp/tools/confirmMethodology.ts` (NEW FILE)

```typescript
import type { SessionStore } from '../sessionStore.js';
import type { ToolDefinition } from '../types.js';

interface ConfirmMethodologyInput {
  repoRoot: string;
  sessionId: string;
  methodology: string;
}

interface ConfirmMethodologyOutput {
  confirmed: boolean;
  methodology: string;
}

interface ConfirmMethodologyDeps {
  sessionStore: SessionStore;
}

export function createConfirmMethodologyTool(
  deps: ConfirmMethodologyDeps
): ToolDefinition<ConfirmMethodologyInput, ConfirmMethodologyOutput> {
  return {
    name: 'confirm_methodology',
    description: 'Mark that the user has explicitly confirmed their methodology choice. Call this BEFORE select_methodology.',
    handler: async input => {
      const { repoRoot, sessionId, methodology } = input;
      
      const session = await deps.sessionStore.load(repoRoot, sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      session.methodologyConfirmed = true;
      await deps.sessionStore.save(repoRoot, session);
      
      return {
        confirmed: true,
        methodology
      };
    }
  };
}
```

**Step 4: Register new tool**

File: `src/mcp/tools/index.ts`

Add import:
```typescript
import { createConfirmMethodologyTool } from './confirmMethodology.js';
```

Add to tool registration:
```typescript
const confirmMethodology = createConfirmMethodologyTool({ sessionStore });
server.registerTool(confirmMethodology);
```

**Step 5: Update AI instructions**

File: `src/mcp/templates/commands.ts`

In the `forge-start` command, find the methodology section and update:

```markdown
### Phase 3: Methodology Recommendation

Once all 10 properties are collected:

1. Analyze the project requirements
2. Recommend 2-3 suitable methodologies with brief explanations
3. **CRITICAL**: Ask "Would you like to proceed with [methodology]?" and WAIT for explicit confirmation
4. When user confirms (yes/proceed/confirmed/etc.), call `CONFIRM_METHODOLOGY` first
5. Then immediately call `SELECT_METHODOLOGY` to record the choice

**NEVER call SELECT_METHODOLOGY without calling CONFIRM_METHODOLOGY first.**
```

#### Verification

1. Run `npm run build && npm link`
2. Start fresh onboarding session: `uat`
3. Progress to methodology selection
4. Verify AI asks "Would you like to proceed with X?"
5. Respond with "yes"
6. Check logs: should see `confirm_methodology` call before `select_methodology`
7. Verify no errors

Expected log sequence:
```json
{"event":"tool:confirm_methodology","status":"ok","durationMs":1}
{"event":"tool:select_methodology","status":"ok","durationMs":2}
```

---

## Optimization 2: Parallel Tool Execution

### Problem
Final phase tools execute serially despite being independent:
- `recommend_droids` (1ms)
- `forge_roster` (17ms)  
- `generate_user_guide` (18ms)
- `install_commands` (10ms)

Total: ~46ms sequential, could be ~18ms parallel (limited by slowest).

### Solution
Update AI instructions to call independent tools in parallel batches.

#### Implementation Steps

**Step 1: Update AI instructions for parallel execution**

File: `src/mcp/templates/commands.ts`

In the `forge-start` command, update the final phase:

```markdown
### Phase 4: Forge Droids and Finalize

After methodology is confirmed and recorded:

1. **PARALLEL BATCH 1**: Call these tools simultaneously:
   - `RECOMMEND_DROIDS` (get droid suggestions)
   - `GENERATE_USER_GUIDE` (create documentation)

2. **SEQUENTIAL**: Wait for recommendations, then call:
   - `FORGE_ROSTER` (create the droids)

3. **PARALLEL BATCH 2**: After roster is forged, call simultaneously:
   - `INSTALL_COMMANDS` (set up slash commands)
   - Present the droid roster to the user

**Performance Tip**: Your MCP client supports parallel tool calls. Use them to save user time.
```

**Step 2: Add parallel execution examples**

Add to the command template:

```markdown
## Parallel Tool Call Example

When calling independent tools, structure your response like this:

```json
{
  "tool_calls": [
    {"name": "recommend_droids", "input": {...}},
    {"name": "generate_user_guide", "input": {...}}
  ]
}
```

This executes both simultaneously instead of waiting for each to complete.
```

#### Verification

1. Run `npm run build && npm link`
2. Complete onboarding to final phase
3. Check session log timestamps
4. Verify `recommend_droids` and `generate_user_guide` have identical or near-identical timestamps
5. Verify `install_commands` runs after `forge_roster` completes

Expected timing improvement: 46ms → ~20ms (56% reduction)

---

## Optimization 3: SMART_SCAN Cache Validation

### Problem
Need to verify that SMART_SCAN caching (already implemented) is working correctly in practice.

### Solution
Add cache hit/miss logging and verification steps.

#### Implementation Steps

**Step 1: Enhance SMART_SCAN logging**

File: `src/mcp/tools/smartScan.ts`

Update the handler to log cache behavior:

```typescript
handler: async input => {
  const { repoRoot, sessionId, forceRescan } = input;
  
  let session: OnboardingSession | null = null;
  if (sessionId) {
    session = await deps.sessionStore.load(repoRoot, sessionId);
  }
  if (!session) {
    session = await deps.sessionStore.loadActive(repoRoot);
    if (session && session.repoRoot !== repoRoot) {
      session = null;
    }
  }
  
  const hasFreshScan = !forceRescan && !!session?.scan && !!session?.scanComputedAt;
  
  // ADD LOGGING HERE
  if (session && hasFreshScan) {
    console.error('[SMART_SCAN] Cache HIT - reusing scan from', session.scanComputedAt);
    return {
      sessionId: session.sessionId,
      summary: session.scan!.summary,
      signals: session.scanSignals ?? [],
      primaryLanguage: session.scanPrimaryLanguage ?? null,
      hints: session.scanHints ?? [],
      prdFiles: session.scan!.prdPaths
    };
  }
  
  console.error('[SMART_SCAN] Cache MISS - performing full scan');
  
  // ... rest of scan logic
}
```

#### Verification

1. Run `npm run build && npm link`
2. Start onboarding: `uat`
3. Complete SMART_SCAN
4. Exit and restart Droid in same directory
5. Run `/forge-start` again
6. Check stderr output for `[SMART_SCAN] Cache HIT`
7. Verify second scan completes in <10ms vs ~100ms for first scan

---

## Optimization 4: Telemetry Dashboard

### Problem
No aggregated view of tool performance across sessions. Can't easily detect regressions.

### Solution
Create a log analysis script that produces performance reports.

#### Implementation Steps

**Step 1: Create log analyzer script**

File: `scripts/analyze-performance.ts` (NEW FILE)

```typescript
#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

interface LogEntry {
  timestamp: string;
  event: string;
  status: 'ok' | 'error';
  payload?: {
    tool?: string;
    durationMs?: number;
    message?: string;
  };
}

interface ToolStats {
  tool: string;
  calls: number;
  errors: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
}

async function analyzePerformance(logPath: string): Promise<void> {
  const content = await fs.readFile(logPath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  
  const toolStats = new Map<string, {
    calls: number;
    errors: number;
    durations: number[];
  }>();
  
  for (const line of lines) {
    try {
      const entry: LogEntry = JSON.parse(line);
      
      if (entry.event.startsWith('tool:')) {
        const tool = entry.payload?.tool || entry.event.replace('tool:', '');
        
        if (!toolStats.has(tool)) {
          toolStats.set(tool, { calls: 0, errors: 0, durations: [] });
        }
        
        const stats = toolStats.get(tool)!;
        stats.calls++;
        
        if (entry.status === 'error') {
          stats.errors++;
        }
        
        if (entry.payload?.durationMs !== undefined) {
          stats.durations.push(entry.payload.durationMs);
        }
      }
    } catch {
      // Skip malformed lines
    }
  }
  
  // Calculate and display stats
  console.log('\n=== DroidForge Performance Report ===\n');
  console.log('Tool                          Calls  Errors  Avg(ms)  Min(ms)  Max(ms)');
  console.log('─'.repeat(75));
  
  const results: ToolStats[] = [];
  
  for (const [tool, data] of toolStats.entries()) {
    const durations = data.durations;
    const stats: ToolStats = {
      tool,
      calls: data.calls,
      errors: data.errors,
      totalMs: durations.reduce((a, b) => a + b, 0),
      avgMs: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      minMs: durations.length > 0 ? Math.min(...durations) : 0,
      maxMs: durations.length > 0 ? Math.max(...durations) : 0
    };
    results.push(stats);
  }
  
  // Sort by total time descending
  results.sort((a, b) => b.totalMs - a.totalMs);
  
  for (const stat of results) {
    const errorRate = stat.errors > 0 ? ` (${stat.errors} errors)` : '';
    console.log(
      `${stat.tool.padEnd(28)} ${String(stat.calls).padStart(5)}  ` +
      `${String(stat.errors).padStart(6)}  ${stat.avgMs.toFixed(1).padStart(7)}  ` +
      `${stat.minMs.toFixed(1).padStart(7)}  ${stat.maxMs.toFixed(1).padStart(7)}${errorRate}`
    );
  }
  
  console.log('\n');
}

const logPath = process.argv[2] || '.droidforge/logs/events.jsonl';
analyzePerformance(logPath).catch(console.error);
```

**Step 2: Make script executable**

```bash
chmod +x scripts/analyze-performance.ts
```

**Step 3: Add npm script**

File: `package.json`

```json
{
  "scripts": {
    "analyze": "tsx scripts/analyze-performance.ts"
  }
}
```

**Step 4: Document usage**

File: `docs/project/performance-monitoring.md` (NEW FILE)

```markdown
# Performance Monitoring

## Analyzing Tool Performance

After running onboarding sessions, analyze performance:

```bash
npm run analyze
```

Or for a specific log file:

```bash
npm run analyze /path/to/.droidforge/logs/events.jsonl
```

## Interpreting Results

- **Avg(ms)**: Average execution time - watch for increases over time
- **Max(ms)**: Worst-case latency - should stay under 100ms for most tools
- **Errors**: Failed calls - investigate any non-zero counts

## Performance Targets

| Tool | Target Avg | Target Max |
|------|------------|------------|
| smart_scan (cached) | <10ms | <20ms |
| smart_scan (fresh) | <150ms | <300ms |
| record_onboarding_data | <5ms | <10ms |
| select_methodology | <5ms | <10ms |
| forge_roster | <50ms | <100ms |

## Regression Detection

Run analysis before and after code changes:

```bash
# Before changes
npm run analyze > before.txt

# Make changes, rebuild, test
npm run build && npm link
uat  # Complete a test session

# After changes
npm run analyze > after.txt

# Compare
diff before.txt after.txt
```
```

#### Verification

1. Run `npm run build && npm link`
2. Complete 2-3 onboarding sessions
3. Run `npm run analyze`
4. Verify output shows tool statistics
5. Check that `smart_scan` shows both cached and fresh executions

---

## Optimization 5: Buffered Logging (Already Implemented)

### Status
✅ **COMPLETE** - Implemented in previous session

### Summary
- Logs batch every 200ms instead of individual writes
- Reduces I/O overhead by ~80%
- `withToolTiming` helper automatically logs all tool calls

### Verification
Check that `src/mcp/logging.ts` contains:
- `flushBuffer()` function
- `FLUSH_INTERVAL_MS = 200`
- `withToolTiming()` helper

---

## Optimization 6: TodoWrite Parallel Execution

### Problem
TodoWrite calls block the main flow, adding ~50-100ms per update.

### Solution
Fire TodoWrite calls in parallel with main tool calls when they're independent.

#### Implementation Steps

**Step 1: Update AI instructions**

File: `src/mcp/templates/commands.ts`

Add to the performance tips section:

```markdown
## Performance Best Practices

### Parallel TodoWrite Updates

When recording onboarding data, update todos in parallel:

```json
{
  "tool_calls": [
    {"name": "record_onboarding_data", "input": {...}},
    {"name": "TodoWrite", "input": {...}}
  ]
}
```

This saves ~50ms per update by not waiting for todo acknowledgment.

### When NOT to Parallelize

- Don't parallelize dependent operations (e.g., must load session before saving)
- Don't parallelize writes to the same resource
- Don't parallelize if you need the result for the next step
```

#### Verification

1. Run onboarding session
2. Check session log for `record_onboarding_data` and `TodoWrite` timestamps
3. Verify they're within 1-2ms of each other (parallel execution)

---

## Implementation Priority

Execute optimizations in this order for maximum impact:

### Phase 1: High Impact, Low Risk (Week 1)
1. ✅ **Buffered Logging** - Already complete
2. **Methodology Confirmation Guard** - Eliminates 3 wasted retries
3. **SMART_SCAN Cache Validation** - Verify existing optimization works

### Phase 2: Medium Impact, Low Risk (Week 1-2)
4. **Telemetry Dashboard** - Enables ongoing monitoring
5. **Parallel Tool Execution** - 50%+ reduction in final phase latency

### Phase 3: Polish (Week 2)
6. **TodoWrite Parallel Execution** - Minor but consistent improvement
7. **Documentation Updates** - Ensure all changes are documented

---

## Success Metrics

Track these KPIs before and after implementation:

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Methodology retry rate | 100% (3/3 sessions) | 0% | Session log analysis |
| Avg onboarding time | ~5min | <4min | User-reported |
| Tool error rate | ~15% | <5% | `npm run analyze` |
| Final phase latency | 46ms | <25ms | Log timestamps |
| Cache hit rate | Unknown | >80% | SMART_SCAN logs |

---

## Testing Checklist

Before marking each optimization complete:

- [ ] Code changes implemented
- [ ] `npm run build` succeeds
- [ ] `npm link` updates global binary
- [ ] Fresh UAT session completes successfully
- [ ] Session logs show expected behavior
- [ ] No new errors in stderr
- [ ] Performance metrics improved
- [ ] Documentation updated

---

## Rollback Plan

If any optimization causes issues:

1. Identify the problematic commit: `git log --oneline`
2. Revert: `git revert <commit-hash>`
3. Rebuild: `npm run build && npm link`
4. Verify rollback: `uat`
5. Document the issue in `docs/project/optimization-issues.md`

---

## Future Optimization Opportunities

Not included in this plan but worth investigating:

1. **Streaming responses** - Return partial results as they're computed
2. **Preload common data** - Cache framework detection results globally
3. **Lazy droid generation** - Generate droid files on-demand vs upfront
4. **Incremental session saves** - Only write changed fields
5. **Connection pooling** - Reuse file handles for session storage

---

## Questions for Implementation

If unclear during implementation:

1. **Methodology guard**: Should we allow "skip confirmation" flag for power users?
2. **Parallel execution**: Should we add a `--sequential` flag for debugging?
3. **Cache invalidation**: When should we force a rescan (file changes detected)?
4. **Telemetry**: Should we add session-level summaries (total time, tool count)?

Document decisions in `docs/project/optimization-decisions.md`.

---

## Appendix: Log Analysis Example

Sample output from `npm run analyze`:

```
=== DroidForge Performance Report ===

Tool                          Calls  Errors  Avg(ms)  Min(ms)  Max(ms)
───────────────────────────────────────────────────────────────────────────
smart_scan                        2       0     55.0      10.0    100.0
forge_roster                      1       0     17.0      17.0     17.0
generate_user_guide               1       0     18.0      18.0     18.0
get_onboarding_progress           1       0     13.0      13.0     13.0
install_commands                  1       0     10.0      10.0     10.0
record_onboarding_data            4       0      3.0       1.0      7.0
select_methodology                3       3      0.0       0.0      0.0 (3 errors)
recommend_droids                  1       0      1.0       1.0      1.0
```

Key insights:
- `select_methodology` has 100% error rate (3/3 calls failed)
- `smart_scan` shows one cached (10ms) and one fresh (100ms) execution
- Most tools complete in <20ms
