PROJECT GOAL: Complete DroidForge Implementation - Dynamic AI Team Creator with Safe Parallel Coordination

     OVERVIEW:
     DroidForge is a Model Context Protocol (MCP) server that analyzes codebases,
     dynamically creates custom AI specialist teams, identifies parallel work opportunities,
     and coordinates safe concurrent execution. The core dynamic team creation and
     parallel infrastructure is implemented. We need to complete the safety features
     and production-readiness.

     REPOSITORY CONTEXT:
     - Language: TypeScript
     - Framework: Node.js MCP server for Factory.ai Droid CLI
     - Architecture: MCP tools → Execution Manager → Parallel coordination subsystem
     - Current State: Core parallel orchestration working, safety features documented but not implemented
     - Branch: develop (clean, all docs up to date)

     KEY IMPLEMENTED FEATURES:
     ✅ SmartScan repository analysis (detects frameworks, patterns, tech stack)
     ✅ Dynamic droid team generation (custom specialists per project)
     ✅ Parallel execution infrastructure (synchronization, staging, merging, event bus)
     ✅ Resource locking (glob-aware file conflict prevention)
     ✅ Isolated execution (staging directories, atomic merging)
     ✅ Dependency resolution and deadlock detection
     ✅ Real-time progress tracking and health monitoring
     ✅ Comprehensive test suite (unit, integration, concurrency tests)

     FEATURES TO IMPLEMENT (from docs/IMPLEMENTATION_NOTES.md):

     PHASE 1: UUID System for Droids
     - Add 'uuid' and 'version' fields to DroidDefinition interface (src/types.ts)
       Note: 'id' field already exists (stores droid name like "df-orchestrator")
       Note: 'createdAt' field already exists
     - Generate UUIDs when creating new droids (src/mcp/generation/droids.ts in forgeDroids function)
     - Make 'uuid' field optional initially for backward compatibility (uuid?: string)
     - Track droids even after renaming using persistent UUID

     PHASE 2: UUID Migration for Existing Droids
     - Scan .droidforge/droids/ directory on first run after update
     - For droids without UUIDs, generate and add them
     - Write back to file preserving all existing data
     - Log migration success

     PHASE 3: Safe Removal Confirmation Flow
     - Update cleanup_repo tool (src/mcp/tools/cleanupRepo.ts, function createCleanupRepoTool)
     - BEFORE deletion: Read all droid files from .droidforge/droids/ and show preview
     - Show ALL droids to be removed (displayName + uuid if available)
     - List directories: .droidforge/, .factory/commands/
     - List files: docs/DroidForge_user_guide_en.md, docs/DROIDS.md, all forge commands
     - Current behavior: Just checks 'confirm' boolean - REPLACE with interactive confirmation
     - New behavior: Return preview message, require exact string "remove all droids" (case-insensitive)
     - Reject partial matches ("yes", "y", "ok", etc.), show clear error messages
     - Show success/cancellation messages with list of what was removed

     PHASE 4: Safety Testing
     - Test UUID generation and persistence
     - Test rename detection via UUID
     - Test confirmation flow (exact match, case variations, rejections)
     - Test that non-df- droids are excluded from removal
     - Test post-removal state and re-initialization

     PHASE 5: Documentation Updates
     - Update CLI_SPEC.md with confirmation requirement
     - Update QUICKSTART.md with /forge-removeall safety note
     - Update ARCHITECTURE.md with UUID system docs
     - Add migration guide for existing users

     CONSTRAINTS:
     - All droids MUST use 'df-' prefix (naming convention)
     - Maintain backward compatibility during UUID migration
     - Preserve all existing functionality while adding safety
     - Follow existing code patterns and test structure
     - Zero breaking changes to current users

     SUCCESS CRITERIA:
     - Droids have unique persistent IDs across renames
     - /forge-removeall shows detailed preview before any deletion
     - Confirmation required and validated correctly
     - 100% test coverage for new features
     - Documentation updated and accurate
     - Clean migration path for existing installations

     REFERENCE FILES (critical context):
     - docs/IMPLEMENTATION_NOTES.md - Complete technical specifications
     - README.md - Project overview and value proposition
     - src/types.ts - Type definitions (DroidDefinition interface - currently has id, displayName, purpose, abilities, tools, createdAt, methodology, owner)
     - src/mcp/tools/cleanupRepo.ts - Current cleanup tool (simple confirm boolean, needs replacement)
     - src/mcp/generation/droids.ts - Droid generation (forgeDroids function, createDroidDefinition)
     - src/mcp/execution/ - All parallel coordination code
     - src/mcp/fs.ts - File system utilities (writeJsonAtomic, ensureDir, removeIfExists)
     - tests structure in src/mcp/**/__tests__/

     CURRENT CODE REALITY CHECK:
     - DroidDefinition.id = droid name (e.g., "df-orchestrator") NOT a UUID
     - DroidDefinition.createdAt already exists and is working
     - cleanupRepo tool is very simple (just removes files with confirm flag)
     - Need to ADD uuid field, not replace id field
     - Droids stored as JSON files in .droidforge/droids/*.json
     
     MCP TOOL BEHAVIOR (CRITICAL):
     - MCP tools are request/response, NOT interactive dialogs
     - Confirmation flow must be TWO-STEP:
       Step 1: User calls cleanup_repo WITHOUT exact confirm string
               → Tool returns preview message (list droids, dirs, files)
               → Returns { preview: "...", requiresConfirmation: true, removed: [] }
       Step 2: User calls cleanup_repo WITH exact confirm string "remove all droids"
               → Tool validates string (case-insensitive exact match)
               → Performs deletion and returns { removed: [...], success: true }
     - Tool input: CleanupRepoInput has 'confirm' field (currently boolean, needs to be string)
     - Tool output: CleanupRepoOutput currently just has 'removed' array, needs preview fields

     DESIRED OUTCOME:
     Production-ready DroidForge with bulletproof safety features:
     - Users can't accidentally delete their droid teams
     - Droids tracked reliably even after modifications
     - Clear, user-friendly error messages
     - Professional confirmation flows
     - Comprehensive test coverage
     - Updated documentation matching implementation

     FILES TO PROVIDE AS CONTEXT:
     1. docs/IMPLEMENTATION_NOTES.md
     2. src/types.ts
     3. src/mcp/tools/cleanupRepo.ts
     4. src/mcp/generation/droids.ts
     5. README.md (for understanding the complete system)
     6. Example test files from src/mcp/execution/__tests__/

   ──────────────────────────────────────────