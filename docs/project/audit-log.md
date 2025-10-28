# Documentation Audit: Onboarding Implementation Plan vs Current State

**Date:** 2025-10-28  
**Status:** CRITICAL GAPS IDENTIFIED

---

## Executive Summary

The [`implementation-plan.md`](../specifications/implementation-plan.md) describes a comprehensive intelligent onboarding system that is **NOT yet fully implemented**. Multiple documentation files (many now archived under `docs/_archive_legacy/`) incorrectly state the system is complete.

### Critical Finding
**CHANGELOG.md claims v2.0.0 (2025-10-27) implemented "conversational onboarding"** but this does NOT match the comprehensive 10-data-point system specified in the implementation plan.

---

## What the Implementation Plan Specifies

### The 10 Required Data Points
1. Project vision/description
2. Target audience
3. Timeline constraints
4. Quality vs speed preference
5. Team size (solo/team)
6. Technical experience level
7. Budget constraints
8. Deployment requirements
9. Security requirements
10. Scalability needs

### Key Features Required
- **Intelligent parsing**: Extract multiple data points from single responses
- **NO pattern matching**: Use AI intelligence, not keyword rules
- **Conversational flow**: ONE question at a time, never lists
- **AI recommendations**: Top 3 methodology suggestions based on ALL 10 data points
- **Methodology visibility**: Team composition MUST reflect chosen methodology
- **Efficient**: 3-7 minutes total (2-5 questions average)

### Example User Experience
```
AI: "Tell me about your project. What are you building, who's it for, and what's your situation?"

User: "I want to make a weight loss app for my wife and I"

AI extracts:
✅ Project vision: weight loss app
✅ Target audience: my wife and I  
✅ Scalability: minimal (2 users)
✅ Team size: solo
✅ Security: basic (implied)

AI asks ONLY about missing items:
"How much time do you have to build this?"
```

---

## Current Documentation Claims

### CHANGELOG.md (INCORRECT)
**Claims:** v2.0.0 (2025-10-27) - "Conversational onboarding replaces form-style prompts"

**Reality:** The full 10-data-point intelligent parsing system is NOT implemented

### Legacy Status Doc (INCORRECT, now archived)
**Location:** `docs/_archive_legacy/status.md`  
**Claims:** "Conversational Onboarding ✅ Fully implemented and tested"

**Lists as complete:**
- Interactive multi-step conversation ✅
- Methodology selection ✅
- Custom droid creation ✅

**Missing:** No mention of 10 data points, intelligent parsing, or AI recommendations

### UX_SPEC.md (PARTIALLY ALIGNED)
**Contains:**
- ✅ Methodology-specific droid naming requirements
- ✅ Flexible input handling (numbers, names, delegation)
- ✅ Guidance now emphasizes AI reasoning (pattern matching table removed)
- ✅ Explicit section listing the 10 required data points

### onboarding-spec.md (ALIGNED)
**Correctly describes:**
- ✅ All 10 required data points
- ✅ Intelligent parsing examples
- ✅ No pattern matching requirement
- ✅ Conversational flow

**Status:** Matches implementation-plan.md requirements

---

## Specific Documentation Gaps

### README.md
**Current:** Describes onboarding as "Tell DroidForge what you're building"

**Missing:**
- No mention of 10 data points collection
- No description of intelligent parsing
- No explanation of AI-powered recommendations

### QUICKSTART.md
**Current:** Shows example:
```
> What are you building?
"iOS artillery game with physics"
```

**Missing:**
- Not showing the intelligent multi-data-point extraction
- Not showing follow-up question flow
- Not showing AI recommendations with reasoning

### Legacy INDEX.md
**Status:** Historical index (now archived) that didn't address onboarding details

**Action needed:** None (kept only for history)

---

## What Users Currently See (Example Output Analysis)

From the provided app output, users see:

### ❌ PROBLEMS - Should NOT be shown:
1. `[MCP] DROIDFORGE:SMART_SCAN` - Tool names exposed
2. `"sessionId": "af0b34e0-3b94-4f91-9228-4add314b6c82"` - SessionIds visible
3. JSON blocks with `signals: []`, `primaryLanguage: null` - Technical internals
4. Numbered question lists: "1. What's the main goal? 2. What functionality..."
5. PLAN status updates repeating for every step
6. Boot logs: `[BOOT] df-orchestrator online. → Purpose:...`
7. File paths: `/home/richard/code/droidtest/.factory/droids/...`
8. Execution IDs: `exec-515c30d9-8ffb-4fef-a5ce-e9bed9a11fcb`

### ✅ GOOD - Should be shown:
1. "I've scanned your repository"
2. "Perfect! An iOS pinball game..."
3. Team roster (simplified): "df-orchestrator: Coordinates specialists"
4. Available commands: `/df`, `/forge-task`, etc.
5. Next steps suggestions

---

## Documentation That Needs Updating

### Priority 1: CRITICAL (Incorrect Claims)
1. **CHANGELOG.md** - Update v2.0.0 to clarify what's actually implemented vs planned
2. **Legacy status doc** - If restored, remove "✅ Fully implemented" claims for incomplete features

### Priority 2: HIGH (Missing Information)
3. **README.md** - Add description of 10-data-point intelligent collection
4. **QUICKSTART.md** - Show realistic onboarding flow with intelligent parsing
5. **docs/specifications/ux-spec.md** - ✅ Updated to emphasize AI-powered recommendations (no pattern matching)

### Priority 3: MEDIUM (Alignment)
6. **docs/README.md** - Add link to onboarding-implementation-plan.md
7. **AGENTS.md** - ✅ DONE - Added UX rules (NEVER show question lists, hide internals)

---

## Recommendations

### Immediate Actions
1. **Clarify implementation status** in all docs:
   - What's designed: Full 10-data-point intelligent system
   - What's implemented: Basic conversational flow (not intelligent parsing yet)

2. **Update CHANGELOG.md v2.0.0**:
   - Change "Conversational onboarding" to "Basic conversational flow"
   - Add note: "Full intelligent 10-data-point system planned for v2.1.0"

3. **Fix archived status doc (if revived)**:
   - Mark intelligent parsing as "Designed, not implemented"
   - Mark AI recommendations as "Designed, not implemented"
   - Keep basic conversation as "Implemented"

### Before Implementation
4. **Create implementation checklist** from onboarding-implementation-plan.md
5. **Write E2E tests** for 10-data-point collection scenarios
6. **Keep docs/specifications/ux-spec.md** aligned with AI-first guidance (no regressions)

### After Implementation
7. **Update all user-facing docs** to reflect intelligent system
8. **Add examples** showing multi-data-point extraction from single responses
9. **Document AI recommendation logic** (no pattern matching)

---

## Alignment Matrix

| Document | Status | Action Required |
|----------|--------|----------------|
| [`implementation-plan.md`](../specifications/implementation-plan.md) | ✅ Correct | None - this is the spec |
| [`docs/specifications/onboarding-spec.md`](docs/specifications/onboarding-spec.md) | ✅ Aligned | None - matches plan |
| [`AGENTS.md`](../AGENTS.md) | ✅ Updated | None - UX rules added |
| [`CHANGELOG.md`](../CHANGELOG.md) | ❌ Incorrect | Clarify v2.0.0 vs planned features |
| [`status.md`](../_archive_legacy/status.md) | ❌ Incorrect | Mark intelligent features as planned (if restored) |
| [`UX_SPEC.md`](UX_SPEC.md) | ✅ Aligned | Ensure it stays synced with implementation plan |
| [`README.md`](../README.md) | ⚠️ Incomplete | Add 10-data-point description |
| [`QUICKSTART.md`](../QUICKSTART.md) | ⚠️ Incomplete | Show intelligent parsing examples |
| Legacy `INDEX.md` | ⏸ Archived | Only restore if we need a global index again |

---

## Summary

**Answer to "are the docs all updated with this?"**

**NO.** The documentation is NOT aligned with the onboarding-implementation-plan.md:

1. **CHANGELOG.md incorrectly claims** v2.0.0 implemented the full conversational system
2. **Legacy status doc incorrectly states** onboarding is "fully implemented"
3. **README.md and QUICKSTART.md** don't describe the intelligent 10-data-point system
4. **Current user output** exposes technical internals that should be hidden

**Next Steps:**
1. Update documentation to accurately reflect current state vs planned features
2. Implement the intelligent 10-data-point collection system
3. Hide all technical output from users (MCP tool names, sessionIds, JSON, etc.)
4. Ensure conversational flow uses ONE question at a time (never lists)
