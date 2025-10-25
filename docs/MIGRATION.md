# DroidForge Migration Guide

This guide helps existing DroidForge users upgrade to the latest version with UUID support and safe cleanup features.

---

## What's New

### UUID System (v0.5.0+)

Droids now have permanent unique identifiers (UUIDs) that persist across renames and updates.

**Benefits:**
- Track droid identity across renames
- Audit trail of which droids performed actions
- Safer cleanup with clear preview
- Foundation for future features (snapshots, history)

### Safe Cleanup (v0.5.0+)

The `/forge-removeall` command now requires explicit confirmation:
- Shows preview of droids and files before deletion
- Requires typing "remove all droids" to confirm
- Case-insensitive confirmation
- Clear error messages on wrong input

---

## Do I Need to Migrate?

**No manual migration required!** The system is backward compatible.

### If You're a New User

Just install and use DroidForge normally. All droids will have UUIDs from creation.

### If You Have Existing Droids

Your existing droids will continue working without UUIDs. They'll automatically get UUIDs when you next update your roster.

**What happens:**
1. You run `/forge-start` or modify your team
2. DroidForge detects existing droids
3. Preserves their UUIDs if they have them
4. Adds UUIDs if they don't
5. No data loss, no downtime

---

## Upgrade Steps

### 1. Update DroidForge

```bash
# If installed globally
npm update -g droidforge

# Or pull latest if using from source
cd DroidForge
git pull origin main
npm install
npm run build
```

### 2. Verify Installation

```bash
# Check version (should be 0.5.0 or higher)
node dist/mcp/server.js --version
```

Or check your MCP server is running the latest version.

### 3. Test the New Cleanup Flow (Optional)

```bash
# Run the new cleanup command to see the preview
/forge-removeall
```

You'll see:
- List of your droids with their names and purposes
- Files that will be removed
- Clear instructions for confirmation

**Don't worry!** Nothing is deleted unless you type the confirmation string.

---

## What Changes for Existing Users

### Command Changes

#### `/forge-removeall` - Now Safer

**Old behavior:**
```
/forge-removeall
→ Are you sure? (yes/no)
→ yes
→ Deleted immediately
```

**New behavior:**
```
/forge-removeall
→ Shows preview (droids, files, counts)
→ Type confirmation to proceed: ________________
→ Type: remove all droids
→ Deletion proceeds OR error if wrong
```

**Migration:** Update any scripts or documentation that reference `/forge-removeall` to account for the confirmation string.

### Droid File Format

**Old format (still supported):**
```json
{
  "id": "df-frontend",
  "displayName": "Frontend Specialist",
  "purpose": "Build UI components",
  "abilities": ["react", "typescript"],
  "tools": [...],
  "createdAt": "2024-10-20T10:00:00Z",
  "methodology": "agile",
  "owner": "droidforge"
}
```

**New format:**
```json
{
  "id": "df-frontend",
  "uuid": "550e8400-e29b-41d4-a716-446655440000",  // ← NEW
  "version": "1.0",                                 // ← NEW
  "displayName": "Frontend Specialist",
  "purpose": "Build UI components",
  "abilities": ["react", "typescript"],
  "tools": [...],
  "createdAt": "2024-10-20T10:00:00Z",
  "methodology": "agile",
  "owner": "droidforge"
}
```

**Migration:** No action needed. UUIDs are added automatically on next update.

### Logging Changes

**Enhanced logging** now includes:
- Droid UUIDs in audit logs
- Detailed cleanup information
- File counts and lists

**Location:** `.droidforge/logs/events.jsonl`

**Example new log entry:**
```json
{
  "timestamp": "2024-10-24T12:00:00Z",
  "event": "cleanup_repo",
  "status": "ok",
  "payload": {
    "droidCount": 3,
    "droidUUIDs": ["uuid-1", "uuid-2", "uuid-3"],
    "filesRemoved": [".droidforge", "docs/DROIDS.md"],
    "fileCount": 2,
    "keptGuide": false
  }
}
```

---

## Troubleshooting

### "My droids don't have UUIDs"

**This is normal!** Existing droids created before v0.5.0 won't have UUIDs until updated.

**To add UUIDs:**
1. Run `/forge-start` (if you're returning)
2. Or modify your roster in any way
3. UUIDs will be added automatically

**Verify:**
```bash
cat .droidforge/droids/df-orchestrator.json | grep uuid
```

Should show: `"uuid": "550e8400-e29b-41d4-a716-446655440000"`

### "Cleanup confirmation isn't working"

**Common issues:**
- **Wrong string:** Must type exactly "remove all droids" (case-insensitive)
- **Extra spaces:** Spaces are trimmed automatically
- **Partial match:** "remove all" won't work - need the full string

**Debug:**
If you get an error, it will show what you typed vs. what was expected:
```
Expected: "remove all droids"
Received: "delete everything"
```

### "UUID changed after re-forging"

**This shouldn't happen!** UUIDs are designed to persist.

**Check:**
1. Verify the droid `id` (slug) is the same
2. Check if you removed and recreated (that would generate new UUID)
3. Report as a bug if UUID changed without deletion

### "Preview shows empty UUIDs"

**This means those droids were created before v0.5.0.**

They'll get UUIDs on next update. The preview shows empty string `""` for missing UUIDs.

---

## Rollback (If Needed)

If you need to roll back to the previous version:

### 1. Downgrade Package

```bash
# If installed globally
npm install -g droidforge@0.4.x

# Or checkout previous version from source
cd DroidForge
git checkout v0.4.x
npm install
npm run build
```

### 2. No Data Cleanup Needed

The UUID fields are optional and ignored by older versions. Your droids will work normally.

### 3. Remove UUID Fields (Optional)

If you want to clean up the UUID fields:

```bash
cd .droidforge/droids
for file in *.json; do
  # Remove uuid and version fields (requires jq)
  jq 'del(.uuid, .version)' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done
```

---

## FAQ

### Will this break my existing setup?

No. The system is fully backward compatible. Existing droids continue working without UUIDs.

### Do I have to add UUIDs manually?

No. They're added automatically when you next update your roster.

### Can I rename droids?

Yes, but we don't recommend it. The `id` field is used in file names and commands. Renaming requires:
1. Renaming the JSON file
2. Updating the manifest
3. Regenerating commands

The UUID stays the same, so tracking works, but it's easier to create a new droid if you need different functionality.

### What if I delete .droidforge and start over?

All droids will be recreated with new UUIDs. Previous UUIDs are lost (they were deleted with the directory).

### Are UUIDs stored anywhere else?

Only in:
- `.droidforge/droids/*.json` (droid definitions)
- `.droidforge/logs/events.jsonl` (audit logs for operations involving droids)

They're not stored in the manifest or any other location.

---

## Need Help?

- **Documentation:** [docs/](.)
- **Issues:** [GitHub Issues](https://github.com/Deskwise/DroidForge/issues)
- **Community:** [Factory.ai Discord](https://discord.gg/factory-ai)

---

*Last updated: October 2024*
