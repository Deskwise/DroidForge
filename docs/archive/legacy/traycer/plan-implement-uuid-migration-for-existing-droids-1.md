I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

The codebase has clear patterns for file operations, logging, and error handling. The `DroidForgeServer` class in `src/mcp/server.ts` is the central point where all tool invocations flow through the `invoke()` method. The `droids.ts` file already has utilities for creating droids with UUIDs, and the logging system uses a consistent event-based structure. Directory scanning follows the pattern of using `fs.readdir()` with `withFileTypes: true` option, as seen in `listSnapshots.ts` and other tools.

### Approach

Add a migration function in `src/mcp/generation/droids.ts` to scan and update existing droid files, then integrate it into the `forgeDroids()` function to run automatically when forging droids. Use a sentinel file (`.droidforge/.uuid-migrated`) tracked via the `DroidForgeServer` to ensure migration runs only once per repository. The migration will be idempotent, logging results to `events.jsonl`, and following the codebase's natural error propagation patterns.

### Reasoning

I explored the repository structure, read relevant files including `src/mcp/generation/droids.ts`, `src/mcp/server.ts`, `src/mcp/fs.ts`, `src/mcp/logging.ts`, and several tool implementations. I examined patterns for directory scanning (`listSnapshots.ts`), file existence checking (`repoSignals.ts`), logging (`forgeRoster.ts`, `addCustomDroid.ts`), and error handling across multiple tools. I identified that integrating migration into `forgeDroids()` ensures existing droids are updated before new ones are created, while `DroidForgeServer` tracks completion via a sentinel file.

## Mermaid Diagram

sequenceDiagram
    participant User
    participant DroidForgeServer
    participant ensureMigration
    participant forge_roster_tool
    participant forgeDroids
    participant migrateDroidUUIDs
    participant FileSystem
    participant appendLog

    User->>DroidForgeServer: invoke(forge_roster)
    DroidForgeServer->>ensureMigration: Check migration status
    
    alt Migration not checked yet
        ensureMigration->>FileSystem: Check .droidforge/.uuid-migrated
        
        alt Sentinel file missing
            FileSystem-->>ensureMigration: File not found
            ensureMigration->>FileSystem: Create .uuid-migrated sentinel
            FileSystem-->>ensureMigration: Sentinel created
        else Sentinel exists
            FileSystem-->>ensureMigration: File exists
        end
    end
    
    ensureMigration-->>DroidForgeServer: Continue
    DroidForgeServer->>forge_roster_tool: Execute handler
    forge_roster_tool->>forgeDroids: Create droid roster
    
    forgeDroids->>FileSystem: ensureDir(.droidforge/droids/)
    forgeDroids->>migrateDroidUUIDs: Migrate existing droids
    
    migrateDroidUUIDs->>FileSystem: readdir(.droidforge/droids/)
    FileSystem-->>migrateDroidUUIDs: List of JSON files
    
    loop For each droid file
        migrateDroidUUIDs->>FileSystem: readJsonIfExists(droid.json)
        FileSystem-->>migrateDroidUUIDs: DroidDefinition
        
        alt Missing uuid or version
            migrateDroidUUIDs->>migrateDroidUUIDs: Generate UUID<br/>Set version: "1.0"
            migrateDroidUUIDs->>FileSystem: writeJsonAtomic(updated)
            FileSystem-->>migrateDroidUUIDs: Write complete
        end
    end
    
    migrateDroidUUIDs-->>forgeDroids: { migratedCount: N }
    
    loop Create new droids
        forgeDroids->>FileSystem: writeJsonAtomic(new droid)
    end
    
    forgeDroids-->>forge_roster_tool: { droids, manifest, filePaths }
    forge_roster_tool->>appendLog: Log forge_roster success
    appendLog->>FileSystem: Append to events.jsonl
    forge_roster_tool-->>DroidForgeServer: Tool result
    DroidForgeServer-->>User: Success

## Proposed File Changes

### src/mcp/generation/droids.ts(MODIFY)

References: 

- src/mcp/fs.ts
- src/types.ts
- src/mcp/tools/listSnapshots.ts

First, update the imports on line 4 to include `readJsonIfExists`. Change:
```typescript
import { writeJsonAtomic, ensureDir } from '../fs.js';
```
to:
```typescript
import { writeJsonAtomic, ensureDir, readJsonIfExists } from '../fs.js';
```

Then, add a new exported async function `migrateDroidUUIDs(repoRoot: string)` that returns `Promise<{ migratedCount: number }>`. This function will:

1. Construct the droids directory path using `path.join(repoRoot, DROID_DIR)` (the constant is already defined at line 8)

2. Check if the directory exists using the pattern `await fs.stat(droidDir).catch(() => null)`. If it doesn't exist, return `{ migratedCount: 0 }` early

3. Read all entries in the directory using `await fs.readdir(droidDir, { withFileTypes: true })` (following the pattern from `src/mcp/tools/listSnapshots.ts`)

4. Filter entries to only process files (not directories) with `.json` extension using `entry.isFile() && entry.name.endsWith('.json')`

5. For each JSON file:
   - Construct the full file path using `path.join(droidDir, entry.name)`
   - Read the file using `readJsonIfExists<DroidDefinition>(filePath)` from `src/mcp/fs.ts` (now imported)
   - Skip if file read returns null (file doesn't exist or invalid JSON)
   - Check if the droid definition is missing `uuid` or `version` fields
   - If either field is missing:
     - Generate a new UUID using `crypto.randomUUID()` (crypto is already imported at line 2)
     - Create an updated definition object spreading the existing definition and adding `uuid` (if missing) and `version: '1.0'` (if missing)
     - Write back to the file using `writeJsonAtomic(filePath, updatedDefinition)` (already imported from `src/mcp/fs.ts`)
     - Increment a counter for migrated droids

6. Return an object with the count: `{ migratedCount: counter }`

The function should be placed after the `addCustomDroid()` function (after line 179) and before `inferCustomSeed()` (before line 181). Let errors bubble up naturally to match the codebase style (like `loadManifest()` and `forgeDroids()` do).

Finally, integrate the migration into `forgeDroids()` at line 84, right after `await ensureDir(droidDir);` and before the loop that creates new droids (before line 86). Add:
```typescript
await migrateDroidUUIDs(ctx.repoRoot);
```

This ensures existing droids are migrated before new ones are added, so all droids in the repository will have UUIDs after forging.

### src/mcp/server.ts(MODIFY)

References: 

- src/mcp/fs.ts

Modify the `DroidForgeServer` class to track migration completion using a sentinel file:

1. Add necessary imports at the top of the file:
   - Import `path` from 'node:path'
   - Import `promises as fs` from 'node:fs'
   - Import `writeJsonAtomic` from './fs.js'

2. Add a private instance field to the `DroidForgeServer` class (after line 16, before the constructor):
   - `private migrationChecked = false;` to track if migration check has been performed

3. Create a new private async method `ensureMigration(repoRoot: string): Promise<void>` in the class (after the constructor, before `listTools()`):
   - Check if `this.migrationChecked` is true; if so, return early
   - Set `this.migrationChecked = true` to prevent concurrent checks
   - Construct the sentinel file path: `path.join(repoRoot, '.droidforge', '.uuid-migrated')`
   - Check if sentinel file exists using `await fs.stat(sentinelPath).catch(() => null)`
   - If sentinel exists, return early (migration already completed)
   - If sentinel doesn't exist, create it by writing `writeJsonAtomic(sentinelPath, { migratedAt: new Date().toISOString() })`
   - Wrap the sentinel file operations in try-catch; if error occurs, log to console but don't throw (sentinel file is just a marker)

4. Modify the `invoke()` method (line 30):
   - At the very beginning of the method (before line 31), add: `await this.ensureMigration(this.options.repoRoot);`
   - This ensures the sentinel file is created on first tool invocation

The sentinel file prevents re-running migration logic. The actual migration happens in `forgeDroids()` in `src/mcp/generation/droids.ts`, which is called by the `forge_roster` tool. The sentinel ensures that even if `forgeDroids()` is called multiple times, the migration function will only process droids that need updating (idempotent behavior).

### docs/IMPLEMENTATION_NOTES.md(MODIFY)

Update the documentation to reflect Phase 2 completion:

1. In the "Migration Plan" section (around line 267), update the Phase 2 status:
   - Change the heading from "### Phase 2: UUID Generation for Existing Droids" to "### Phase 2: UUID Generation for Existing Droids — Status: ✅ COMPLETE"
   - Add a summary paragraph after the heading: "Summary: Phase 2 is complete. The `migrateDroidUUIDs()` function in `src/mcp/generation/droids.ts` scans `.droidforge/droids/` and generates UUIDs for droids without them. This function is called automatically in `forgeDroids()` before creating new droids, ensuring all existing droids are migrated. A sentinel file (`.droidforge/.uuid-migrated`) tracked by `DroidForgeServer` prevents redundant migration checks."

2. Update the existing Phase 2 bullet points (lines 268-271) to reflect the actual implementation:
   - Change "On first run after update, scan `.droidforge/droids/`" to "When `forgeDroids()` is called, `migrateDroidUUIDs()` scans `.droidforge/droids/`"
   - Change "For each droid without UUID, generate one" to "For each droid without `uuid` or `version`, generate and add them"
   - Change "Write back to file with UUID added" to "Write back atomically using `writeJsonAtomic()` preserving all existing data"
   - Change the log message to: "Migration is logged by the calling tool (e.g., `forge_roster`) which logs the overall operation"
   - Add a new bullet: "Sentinel file `.droidforge/.uuid-migrated` created by `DroidForgeServer.ensureMigration()` on first tool invocation"
   - Add a new bullet: "Migration is idempotent—can be called multiple times safely, only updates droids that need it"

3. In the "Safety Features Checklist" section (around line 213), update the migration-related items:
   - Check the box for "Droids have unique UUIDs" (line 216) if not already checked
   - Check the box for "UUIDs persist across renames" (line 217) if not already checked

4. Add a new subsection under "Related Files" (after line 252):
   - Add "**Migration Logic:**" as a subheading
   - Add bullet: "`src/mcp/generation/droids.ts` - `migrateDroidUUIDs()` function scans and updates existing droids, called from `forgeDroids()`"
   - Add bullet: "`src/mcp/server.ts` - `ensureMigration()` method creates sentinel file on first tool invocation"

These updates document the completed implementation and provide clear references for future maintainers.