# Implementation Notes

Technical requirements and conventions for DroidForge development.

---

## Droid Naming Conventions

### The `df-` Prefix

**All DroidForge-created droids MUST use the `df-` prefix.**

**Rationale:**
1. **Clear Identification** - Users can instantly identify DroidForge droids
2. **Easy Cleanup** - When running `/forge-removeall`, we can find all `df-*` droids
3. **Namespace Separation** - Prevents conflicts with user's existing droids or other tools
4. **Consistency** - Professional, predictable naming

**Examples:**
```
df-orchestrator    ✅ Correct
df-frontend        ✅ Correct
df-backend         ✅ Correct
df-test            ✅ Correct

frontend           ❌ Wrong - missing prefix
droidforge-api     ❌ Wrong - use df- not droidforge-
```

**Special Cases:**
- The orchestrator is always named `df-orchestrator` (never just `orchestrator`)
- Multi-word specialists use hyphens: `df-react-web`, `df-ios-ui`, `df-ml-pipeline`
- Keep names concise but descriptive

---

## Droid Unique Identifiers

### Requirement: Every droid MUST have a unique ID

**Status:** ✅ IMPLEMENTED

Each droid definition (`.droidforge/droids/*.json`) must include a unique identifier that persists even if the droid is renamed.

### Schema Addition

```typescript
interface DroidDefinition {
  // Existing fields
  id: string;               // slug (e.g., "df-frontend") - kept for backward compatibility
  displayName?: string;     // human-friendly label
  role?: string;
  description?: string;
  capabilities?: string[];

  // NEW: Unique identifier and schema version (optional for backward compatibility)
  uuid?: string;            // UUID generated once at creation (persists across renames)
  version?: string;         // Schema version (e.g., "1.0")
  createdAt: string;        // ISO timestamp

  // ... rest of definition
}
```

### Example

```json
{
  "id": "df-frontend",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "version": "1.0",
  "displayName": "df-frontend",
  "role": "Frontend Development",
  "description": "Expert in React 18, TypeScript, Tailwind, Vite",
  "createdAt": "2024-10-24T10:30:00Z",
  "capabilities": ["React components", "State management", "Styling"],
  "filePatterns": ["src/components/**", "src/pages/**"],
  "guidelines": ["Follow React best practices", "Use TypeScript"]
}
```

Note: `uuid` and `version` are optional in the schema to preserve backward compatibility. New droids created after this change include `uuid` and `version` automatically.

### Use Cases

**1. Safe Rename Detection**
```typescript
// User renames df-frontend to df-ui
// We can still identify it by UUID
const droidId = "df-550e8400-e29b-41d4-a716-446655440000";
// Track that this is the same droid with a new name
```

**2. Conflict Prevention**
```typescript
// User tries to create a new df-frontend
// We check if UUID exists, not just name
if (existingDroidWithId) {
  warn("A droid with this configuration already exists (renamed from df-frontend)");
}
```

**3. Migration Tracking**
```typescript
// Track droid evolution over time
// Even if renamed or updated, maintain identity
const history = getDroidHistory(droidId);
```

---

## Cleanup Safety: Confirmation Before Removal

### Requirement: `/forge-removeall` must confirm before deletion

**Status:** 🚧 TO BE IMPLEMENTED

### Current Behavior (UNSAFE)
```
User: /forge-removeall
→ Deletes everything immediately
```

### Required Behavior (SAFE)

```
User: /forge-removeall

DroidForge: 
⚠️  WARNING: This will permanently remove all DroidForge data:

📦 Droids to be removed:
  - df-orchestrator (id: df-550e8400...)
  - df-frontend (id: df-661f9511...)
  - df-backend (id: df-772fa622...)
  - df-test (id: df-883fb733...)

📁 Directories to be removed:
  - .droidforge/
  - .factory/commands/ (DroidForge commands only)

📄 Files to be removed:
  - docs/DroidForge_user_guide_en.md

Type 'remove all droids' to confirm:
```

**User must type exact confirmation string**

### Implementation Requirements

1. **List All Droids**
   - Show all `df-*` droids by name and ID
   - Include count (e.g., "4 droids")

2. **List All Files/Directories**
   - `.droidforge/` directory
   - DroidForge slash commands in `.factory/commands/`
   - Generated documentation

3. **Require Exact Confirmation**
   - User must type: `remove all droids`
   - Case-insensitive match
   - If anything else, abort with message

4. **Show What Would Be Kept**
   ```
   ✅ Your code and project files are safe
   ✅ Git history is preserved
   ✅ Other (non-df-*) droids are not affected
   ```

5. **Confirmation Variations**
   ```
   "remove all droids"     ✅ Accepted
   "REMOVE ALL DROIDS"     ✅ Accepted (case insensitive)
   "yes"                   ❌ Rejected - not specific enough
   "remove droids"         ❌ Rejected - not exact match
   ""                      ❌ Rejected - empty
   ```

### Error Handling

**If user cancels:**
```
Removal cancelled. No changes made.
Your DroidForge team is still active.
```

**If confirmation doesn't match:**
```
Confirmation did not match. Removal cancelled.
Your DroidForge team is still active.

To remove, type exactly: remove all droids
```

**After successful removal:**
```
✅ DroidForge removed successfully

Removed:
  - 4 droids
  - .droidforge/ directory
  - 3 slash commands
  - User guide documentation

To set up DroidForge again, run: /forge-start
```

---

### Safety Features Checklist

### Before Implementation
- [x] Droids have unique UUIDs
- [x] UUIDs persist across renames
- [x] `/forge-removeall` shows detailed preview
- [x] Requires exact confirmation string
- [x] Lists all droids by name + ID
- [x] Shows directories/files to remove
- [x] Confirmation is case-insensitive
- [x] Rejects partial matches
- [x] Shows success/failure message
- [x] Provides instructions to restore

### Testing Checklist
- [ ] Test rename detection via UUID (needs E2E test)
- [x] Test confirmation with exact match (unit tests complete)
- [x] Test confirmation with case variations (unit tests complete)
- [x] Test confirmation rejection (wrong string) (unit tests complete)
- [x] Test cancellation (unit tests complete)
- [x] Test listing all droids (unit tests complete)
- [x] Test that non-df- droids are excluded (unit tests complete)
- [x] Test post-removal state (unit tests complete)
- [ ] Test re-initialization after removal (needs E2E test)


---

## Related Files

**Droid Definition Schema:**
- `src/types.ts` - Add UUID field to DroidDefinition interface

**Cleanup Tool:**
- `src/mcp/tools/cleanupRepo.ts` - Implement confirmation flow

**Droid Generation:**
- `src/mcp/generation/droids.ts` - Generate UUIDs for new droids


**Tests:**
- `src/mcp/tools/__tests__/cleanupRepo.test.ts` - Add confirmation tests

---

## Migration Plan

### Phase 1: Add UUID Support (Non-Breaking) — Status: ✅ COMPLETE

Summary: Phase 1 is complete. New droids created after this change include `uuid` and `version` automatically. Phase 2 ensures these UUIDs persist across re-forging by checking for existing files before overwriting them.

1. Add `id`, `version`, `createdAt` to DroidDefinition interface
2. Update droid generation to create UUIDs
3. Make UUIDs optional for backward compatibility
4. Existing droids without UUIDs continue working

### Phase 2: UUID Preservation in forgeDroids() — Status: ✅ IMPLEMENTED

Implementation: The `forgeDroids()` function in `src/mcp/generation/droids.ts` now checks if droid files already exist before creating them. When a file exists and has a `uuid` field, it preserves that UUID and the `createdAt` timestamp. Only new droids or droids without UUIDs receive freshly generated identifiers. This makes `forgeDroids()` idempotent and ensures UUID persistence across re-forging.

1. When `forgeDroids()` processes each droid, it first checks if the file exists using `readJsonIfExists()`
2. If the file exists and has a `uuid`, preserve the `uuid` and `createdAt` timestamp
3. If the file doesn't exist or lacks a `uuid`, generate new values via `createDroidDefinition()`
4. Write the definition (with preserved or new UUID) using `writeJsonAtomic()`
5. The same logic applies to `addCustomDroid()` for consistency
6. No separate migration function needed—preservation happens naturally during forging

### Phase 3: Confirmation Flow (Breaking for Safety)
1. Update `/forge-removeall` to show preview
2. Require confirmation string
3. List droids by name + UUID
4. Show directories/files to remove
5. Abort if confirmation doesn't match

### Phase 4: UUID Required (Future)
Phase 4 may not be necessary. The optional UUID fields work well and maintain backward compatibility. Consider keeping them optional indefinitely unless there's a strong reason to make them required.

---

## Documentation Updates Needed

- [ ] Update QUICKSTART.md - explain `/forge-removeall` confirmation
- [ ] Update CLI_SPEC.md - document confirmation requirement
- [ ] Update droid-guide.md - mention df- prefix convention
- [ ] Update ARCHITECTURE.md - document UUID system
- [ ] Add migration guide for existing users

---

*This is a living document. Update as implementation progresses.*
