never use emojis.
stay out of `docs/_archive_legacy` — everything in there is stale or quarantined. only trust files in `docs/` root, `docs/specifications`, `docs/project/audit-log.md`, and `docs/SPEC-METHODOLOGY-RECOMMENDATIONS.md`.
## CRITICAL UX RULES - USER-FACING OUTPUT

**NEVER SHOW TO USERS:**
- ❌ Lists of numbered questions ("1. What's the main goal? 2. What functionality...")
- ❌ MCP tool names (`[MCP] DROIDFORGE:SMART_SCAN`)
- ❌ SessionIds or execution IDs (`sessionId: "abc-123"`, `exec-xyz`)
- ❌ JSON output blocks (raw data structures)
- ❌ File paths (`/home/user/code/project/.factory/droids/...`)
- ❌ Technical fields (`signals: []`, `primaryLanguage: null`)
- ❌ Repetitive PLAN status updates
- ❌ Boot logs with implementation details
- ❌ Code blocks unless absolutely necessary
- ❌ Empty or null technical fields

**ALWAYS SHOW TO USERS:**
- ✅ Single conversational questions (one at a time)
- ✅ Friendly confirmations ("I've scanned your repository")
- ✅ Simple acknowledgments ("Perfect! An iOS game...")
- ✅ Concise next steps
- ✅ Simplified team roster (not JSON)
- ✅ Available commands (brief list)

**GOLDEN RULE: COMPRESS & BE RELEVANT**
- ONE question at a time (never lists)
- Hide all technical internals
- Informal, friendly, succinct
- If you need multiple pieces of info, ask ONE conversational question that can extract several


## CRITICAL TESTING REQUIREMENTS

After EVERY code change, you MUST verify:

1. **Build always works:**
   ```bash
   npm run build
   ```

2. **Tests always pass:**
   ```bash
   npm test
   ```

3. **Core functionality still works:**
   - MCP server detection
   - Tool invocation 
   - Error handling
   - Session management

4. **Before any commit or publish:**
   - Run full test suite
   - Test the exact feature you modified
   - Verify you didn't break existing functionality

## NO OVER-ADJUSTMENT

- Fix ONLY the specific issue mentioned
- Do NOT change AI attitudes or behavior 
- Keep responses professional and neutral
- No excitement, no condescension, just functional
- **DO NOT remove examples or existing functionality when fixing issues**
- **DO NOT change prompts that the user specifically asked for**
- **REMEMBER all user requirements and don't break them**
- **NO RIGID PATTERN MATCHING. Use your intelligence to understand what users mean:**
  - "tset driven dev" → understand they mean TDD
  - "spec" → understand they mean BDD/Specification-Driven Development
  - "A cross between sdd but each spec should have it's own unit test like TDD" → understand and discuss the hybrid approach
  - CONVERSE WITH THE USER - don't force them into boxes if they don't want that
- **Users CAN use numbers (1-10) OR talk to you naturally. This is an AI program, not a rigid form**

## BREAKING CHANGES REQUIRE SPECIAL CARE

- If modifying core MCP functionality, test tool calls
- If changing error handling, verify error paths
- If updating detection logic, test with both success and failure cases

## WHEN YOU BREAK SOMETHING

- Immediately revert the change
- Identify the root cause
- Fix with minimal scope
- Test thoroughly before re-applying

## COMPLEX FIXES REQUIRE NPM REBUILD

After completing a set of complex fixes or major changes:
1. Build and test locally ✅
2. Commit all changes
3. **REBUILD NPM:** `npm version patch` + `npm publish`
4. Verify the new version is available: `npm view droidforge version`

**MANDATORY:** Any time you make complex fixes or multiple related changes, you MUST rebuild and republish npm. Do not wait for user to ask.

RULE: If you're not 100% sure a change won't break existing functionality, do not make it.
