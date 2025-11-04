# Instructions for Implementing Methodology Recommendations

> **Context:** DroidForge is currently operating in **Phase 1** (serial orchestrator + AI onboarding). Parallel execution is a **Phase 2 roadmap** item; any instructions here apply to the existing Phase 1 flow and must not assume live concurrency.

## Your Task

Add intelligent methodology recommendations to the DroidForge onboarding flow. Users describe their project, and the AI should recommend 3 methodologies that fit their specific situation.

---

## CRITICAL CONSTRAINT: NO PATTERN MATCHING

**You will fail this task if you use pattern matching.**

Pattern matching means:
- Keyword matching (`if (desc.includes('game'))`)
- Predefined mappings (`const types = { game: ['tdd', 'rapid'] }`)
- Any if/else logic based on description content

You must use AI intelligence, not rules.

---

> ❗️ Ignore `docs/_archive_legacy/` unless the user instructs otherwise. It contains stale snapshots.

## Step 1: Read These Files (In Order)

### A. Understanding the Problem
1. **Read:** `docs/SPEC-METHODOLOGY-RECOMMENDATIONS.md`
   - This defines EXACTLY what to do and what NOT to do
   - Pay special attention to the ❌ and ✅ sections
   - Read all examples

2. **Read:** `docs/project/audit-log.md`
   - Documents the known gaps and broken attempts
   - Explains why the last implementation failed the spec

### B. Understanding the Codebase
3. **Read:** `AGENTS.md`
   - Critical rules for this project
   - Testing requirements
   - What breaks things

4. **Read:** `src/mcp/prompts/onboarding.ts`
   - Current onboarding flow
   - Understand the segment structure
   - See how tools are called

5. **Read:** `src/mcp/prompts/runner.ts` (lines 40-70)
   - Understand how prompts execute
   - Notice: tool segments run silently (don't return to user)
   - This is WHY previous implementation failed

6. **Read:** `src/mcp/templates/commands.ts` (lines 140-200)
   - AI guidance for onboarding
   - Update this to guide AI on recommendations

7. **Read:** `src/mcp/tools/selectMethodology.ts`
   - Existing intelligent understanding code
   - This DOES work correctly
   - Shows how to handle user input intelligently

### Log Reference (when debugging your work)

- **Interactive sessions** live under `~/.factory/sessions/<session-id>.jsonl` with companion `.settings.json` files.
- **UAT automation transcripts** are stored in `~/.factory/uat-test-logs/uat2-transcript-<timestamp>.log`.

Review these locally if you need to inspect the latest run before reporting findings.

**Local test shortcut:** run `UAT_SKIP_INSTALL=1 scripts/automated-uat2.exp`. The script auto-runs `scripts/dev-link.sh` so you don’t have to link manually.

---

## Step 2: Understand Why v1.7.0 Failed

The previous agent:
1. ❌ Created `methodologyRecommendations.ts` with keyword matching
2. ❌ Recommendations were calculated but NEVER shown to user
3. ❌ Used rigid if/else pattern matching (violated #1 rule)

**Why recommendations weren't shown:**
- Tool segments execute silently in scripted prompts
- The prompt runner doesn't return tool results as events
- User never saw the recommendations, just the choice menu

---

## Step 3: Choose Your Implementation Approach

### Option A: Update Commands Template (Easiest, Recommended)

**What to do:**
1. Update `src/mcp/templates/commands.ts`
2. Add guidance for AI on HOW to analyze projects
3. Tell AI to present recommendations naturally
4. No code changes to onboarding flow needed

**Pros:**
- No risk of breaking existing code
- AI does the intelligence work naturally
- Easy to test

**Cons:**
- Relies on AI following instructions
- Recommendations may vary

**Implementation:**
```markdown
In commands.ts, add section:

"After user describes their project:

1. Analyze using your intelligence (NOT keywords):
   - What challenges will they face?
   - What matters most: speed, quality, iteration?
   - What's the context: team size, timeline, constraints?

2. Think through which 3 methodologies genuinely fit:
   [List all 10 methodologies with descriptions]
   
3. Present recommendations with specific reasoning:
   'Based on your [specific aspect], I recommend:
   
   1. [Methodology] - Why: [specific reason for their project]
   2. [Methodology] - Why: [specific reason for their project]  
   3. [Methodology] - Why: [specific reason for their project]
   
   Here are all 10 for reference: [list]
   
   Which fits your workflow?'

CRITICAL: Use your intelligence. No keyword matching.
Consider nuance. Allow discussion."
```

### Option B: Non-Scripted Prompt Section (More Work)

**What to do:**
1. Make methodology selection part non-scripted
2. Allow AI to interact freely for recommendations
3. Return to scripted flow after selection

**Pros:**
- More control over conversation
- Can ensure recommendations are shown

**Cons:**
- Requires understanding prompt runner architecture
- Risk of breaking existing flow
- More complex to test

**Not recommended unless you understand the codebase deeply.**

### Option C: Do Nothing (Valid Choice)

Current v1.6.10 works correctly. It has intelligent understanding in `selectMethodology.ts`. Users can ask the AI "what methodology should I use?" and get intelligent recommendations through normal conversation.

---

## Step 4: Implementation Checklist

Before you write ANY code:

- [ ] I have read ALL the files listed in Step 1
- [ ] I understand why v1.7.0 failed
- [ ] I understand what pattern matching means
- [ ] I have chosen an implementation approach
- [ ] I understand how to test my changes

---

## Step 5: Testing Your Implementation

### Test 1: Recommendations Visible to User
```bash
cd /home/richard/code/DroidForge
node test-methodology-flow.mjs
```

**Expected:** User SEES recommendations with reasoning before choice menu

**Failure:** Recommendations calculated but not shown

### Test 2: No Pattern Matching in Code
```bash
grep -r "includes(" src/mcp/prompts/
grep -r "PROJECT_TYPE" src/mcp/
```

**Expected:** No keyword matching code found

**Failure:** Any if/else based on description content

### Test 3: Handles Nuanced Descriptions

Test with: "A game-like training simulator for enterprise compliance"

**Expected:** AI recommends enterprise methodologies (BDD, Enterprise, TDD), not game methodologies

**Failure:** Recommends Rapid/Agile just because of "game" keyword

### Test 4: Conversational

**Expected:** User can say "Actually speed matters more than quality" and AI adjusts

**Failure:** Rigid, no room for discussion

---

## Step 6: Build and Test

```bash
# Always test after changes
npm run build
npm test

# Should see:
# ✅ 2/2 tests passing
# ✅ Build clean
```

---

## Step 7: Commit Guidelines

```bash
git add .
git commit -m "feat: Add intelligent methodology recommendations

- [What you changed]
- [How it works]
- [What was tested]

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

**DO NOT:**
- Commit without testing
- Skip the build/test step
- Break existing functionality

---

## What Success Looks Like

1. User describes project: "iOS pinball game"
2. AI analyzes intelligently (no keyword matching)
3. User SEES: "For physics accuracy, I recommend TDD..."
4. User can discuss or pick
5. No pattern matching code in repo
6. Tests pass

---

## What Failure Looks Like

1. Any `if (description.includes(...))` code
2. Recommendations not shown to user
3. Rigid categorization
4. Tests fail
5. Existing functionality broken

---

## If You Get Stuck

### Problem: "I don't understand how prompts work"
**Solution:** Choose Option A (Commands Template). It's simpler.

### Problem: "I can't figure out how to show recommendations"
**Solution:** That's why v1.7.0 failed. Use Option A instead.

### Problem: "How do I avoid pattern matching?"
**Solution:** Don't write any if/else based on description content. Let the AI's natural language understanding do it.

### Problem: "Tests are failing"
**Solution:** Revert your changes. You probably broke something.

---

## Final Checklist Before Submitting

- [ ] I read the spec completely
- [ ] No pattern matching in my code
- [ ] User sees recommendations (I tested this)
- [ ] npm run build works
- [ ] npm test passes (2/2)
- [ ] I can explain WHY my approach works
- [ ] I tested with nuanced descriptions

---

## Emergency Exit

If at any point you realize you can't implement this without pattern matching:

**STOP. DO NOT IMPLEMENT.**

It's better to have no feature than a broken feature. Current v1.6.10 works correctly. Don't break it.

Inform the user: "I cannot implement this without pattern matching. Recommend Option C: Do Nothing."
