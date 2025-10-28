# TODO: Fix Methodology Selection Flow

## Problem Statement

The methodology selection during onboarding is completely broken:

1. **SELECT_METHODOLOGY throws generic error** instead of working with user input
2. **User never selects methodology** - system silently defaults to Agile
3. **No top 3 recommendations** based on project type
4. **Generic error handler swallows real errors** - shows "Something went wrong. Try /forge-start again"
5. **Conversation is broken** - should be natural, instead it's silent failure + forced default

## Example of Current Broken Behavior

```
User: "iOS pinball game with latest graphics"

[MCP] DROIDFORGE:SELECT_METHODOLOGY  (/home/richard/code/droidtest)
↳ Error: Something went wrong. Let me restart the onboarding flow for you. Try /forge-start again.

Result: System defaults to Agile without asking user
Result: Shows "df-agile-lead" (Sprint Coordinator) without user consent
```

## What SHOULD Happen

```
User: "iOS pinball game with latest graphics"

AI: "For an iOS game with physics, I recommend:
     1. TDD - Write tests for physics calculations first
     2. Rapid - Fast prototyping to test gameplay feel
     3. Agile - Flexible sprints for iteration
     
     Here are all 10 options: [list]
     
     Which methodology fits your workflow? (Pick 1-10 or name)"

User: "2" or "rapid" or "rapid prototyping"

Result: df-rapid-lead (Iteration Specialist) created
Result: Methodology properly recorded in session
```

## Implementation Tasks

### HIGH PRIORITY

1. **DEBUG: Find why SELECT_METHODOLOGY is throwing generic error**
   - Check what error is actually being thrown
   - Verify it's not the generic error handler in stdio-server.ts
   - Find the real root cause

2. **FIX: Remove generic error handler that swallows real errors**
   - stdio-server.ts line ~88 has generic "Something went wrong" message
   - Should show actual error message to help debug
   - Keep friendly tone but show real error

3. **DESIGN: Methodology recommendation logic based on project type**
   - iOS game → TDD/Rapid/Agile
   - SaaS app → Agile/Lean/Enterprise
   - Landing page → Rapid/Kanban/Waterfall
   - Infrastructure → DevOps/Kanban/Agile
   - Startup MVP → Lean/Rapid/Agile
   - Complex business app → DDD/Agile/Enterprise

4. **UPDATE: Onboarding flow to show ALL 10 methodologies + TOP 3 recommendations**
   - File: src/mcp/prompts/onboarding.ts
   - Show all 10 with numbers
   - Recommend top 3 based on project goal from previous step
   - Use project scan results + user goal to make smart recommendations

5. **FIX: Ensure methodology selection NEVER defaults silently**
   - Must get explicit user input
   - If SELECT_METHODOLOGY fails, STOP and ask user to retry
   - Never proceed with default without consent

6. **TEST: Verify SELECT_METHODOLOGY handles all input types**
   - Numbers: "1", "2", "10"
   - Names: "agile", "tdd", "rapid"
   - Intelligent understanding: "test driven dev", "spec", "rapid prototyping"
   - File: src/mcp/tools/selectMethodology.ts

7. **FIX: Ensure methodology lead droid reflects user's ACTUAL choice**
   - Should be df-tdd-lead if user picked TDD
   - Should be df-rapid-lead if user picked Rapid
   - NOT df-agile-lead by default
   - File: src/mcp/suggestions.ts

8. **VERIFY: stdio-server error handler not swallowing real errors**
   - File: src/mcp/stdio-server.ts around line 88
   - Check if try-catch is too broad
   - Make sure real error details are preserved

### MEDIUM PRIORITY

9. **UPDATE: Error messages to be conversational, not generic**
   - "Something went wrong" → "I couldn't understand that methodology choice. Could you pick from: [list]?"
   - Make errors helpful, not scary

10. **TEST: Full onboarding flow end-to-end with real user inputs**
    - Test with real project descriptions
    - Test with various methodology selection inputs
    - Verify methodology lead droid is correct
    - File: src/mcp/__tests__/server.integration.test.ts

11. **UPDATE: Commands template to show AI how to recommend top 3**
    - File: src/mcp/templates/commands.ts
    - Add guidance on project type → methodology mapping
    - Show examples of how to recommend

12. **DOCUMENT: Add to AGENTS.md - never silently default user choices**
    - Add rule: "Never silently default user choices - always get explicit consent"
    - Add rule: "If a tool fails, STOP and ask user to retry - don't proceed with defaults"

## Files to Check/Modify

1. **src/mcp/tools/selectMethodology.ts** - Main methodology selection logic
2. **src/mcp/prompts/onboarding.ts** - Onboarding conversation flow
3. **src/mcp/templates/commands.ts** - AI guidance for recommendations
4. **src/mcp/suggestions.ts** - Methodology lead droid generation
5. **src/mcp/stdio-server.ts** - Error handler that might be swallowing errors
6. **src/mcp/__tests__/server.integration.test.ts** - Integration tests
7. **AGENTS.md** - Guidelines for AI agents

## Current State

- **Version:** 1.6.10
- **Issue:** SELECT_METHODOLOGY fails but system proceeds with Agile default
- **User Experience:** Broken - no methodology choice presented
- **Impact:** High - violates core UX of user selecting their workflow

## Validation Criteria

After implementation, verify:

1. [ ] SELECT_METHODOLOGY works with numbers (1-10)
2. [ ] SELECT_METHODOLOGY works with names ("agile", "tdd", "rapid")
3. [ ] SELECT_METHODOLOGY works with intelligent understanding ("test driven dev")
4. [ ] User sees ALL 10 methodologies with descriptions
5. [ ] User sees TOP 3 recommendations based on their project type
6. [ ] Methodology lead droid reflects user's ACTUAL choice
7. [ ] No silent defaults - user MUST pick
8. [ ] Error messages are conversational and helpful
9. [ ] Full onboarding flow completes successfully
10. [ ] Tests pass: `npm run build && npm test`

## Notes

- This is a critical UX issue - methodology selection is a core feature
- Don't force users into boxes - allow natural conversation
- Use intelligent understanding, not rigid pattern matching
- CONVERSE with the user - this is an AI program, not a form

## Related Documentation

- docs/UX_SPEC.md - Original UX specification
- docs/IMPLEMENTATION_PLAN.md - Overall implementation plan
- AGENTS.md - Guidelines for AI agent behavior
