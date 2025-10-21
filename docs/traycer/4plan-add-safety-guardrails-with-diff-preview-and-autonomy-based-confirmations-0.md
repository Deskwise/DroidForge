I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

Current implementation writes files directly without previews or confirmations. All droids start with `['Read']` in droidPlanner (generic/contextual) or `['Read', 'Shell']` (script droids). ProjectBrief captures autonomy (L1/L2/L3) and preferences.toolWidening. Writers are simple and write directly. No dry-run mode exists. The `diff` package with `kleur` is ideal since `kleur` is already a dependency.

### Approach

Create two utility modules (`diffPreview` and `confirmations`) to handle diff display and autonomy-based approval flows. Integrate confirmation hooks into `synthesizeDroids` before file writes, implement tool widening logic to start droids with `['Read']` and prompt for `Write`/`Shell`, and add dry-run mode via CLI flag. Use `diff` package with `kleur` for colored output, and `inquirer` for confirmations.

### Reasoning

Read synthesizeDroids and CLI implementations, examined types for autonomy levels and project brief structure, reviewed droidPlanner to understand tool assignment patterns, checked interview flow for autonomy capture, examined writers to understand file write patterns, and researched diff libraries for colored terminal output.

## Mermaid Diagram

sequenceDiagram
    participant User
    participant CLI
    participant Interview
    participant Synthesize
    participant Planner
    participant Confirmations
    participant DiffPreview
    participant FileSystem

    User->>CLI: droidforge synthesize --dry-run
    CLI->>CLI: Parse --dry-run flag
    CLI->>Interview: conductInterview()
    Interview-->>CLI: ProjectBrief (with autonomy level)
    
    alt Dry-Run Mode
        CLI->>User: [DRY-RUN MODE] No files will be written
    end
    
    CLI->>Synthesize: synthesizeDroids({plan, dryRun})
    Synthesize->>Planner: planDroids(plan)
    Planner-->>Synthesize: DroidSpec[] (tools: ['Read'])
    
    alt L2 Checkpoint
        Synthesize->>Confirmations: confirmOperation('write droids')
        Confirmations->>User: Confirm writing N droids?
        User-->>Confirmations: Yes/No
        Confirmations-->>Synthesize: approved
    end
    
    loop For each DroidSpec
        alt Tool Widening Needed
            Synthesize->>Confirmations: confirmToolWidening(['Read'], ['Read','Write'])
            Confirmations->>User: Allow Write access for {droid}?
            User-->>Confirmations: Yes/No
            alt Approved
                Confirmations-->>Synthesize: true
                Synthesize->>Synthesize: Update spec.tools to ['Read','Write']
            end
        end
        
        Synthesize->>Synthesize: Render template with spec
        Synthesize->>DiffPreview: previewFileWrite(path, content)
        DiffPreview->>FileSystem: Read existing file (if exists)
        FileSystem-->>DiffPreview: oldContent
        DiffPreview->>DiffPreview: Compute diff (added/removed lines)
        DiffPreview->>User: Show colored diff (+green, -red)
        
        alt L1 or L2 Autonomy
            Synthesize->>Confirmations: confirmOperation('write droid file')
            Confirmations->>User: Write this file?
            User-->>Confirmations: Yes/No
        end
        
        alt Not Dry-Run AND Confirmed
            Synthesize->>FileSystem: fs.writeFile(path, content)
        else Dry-Run OR Denied
            Synthesize->>User: [SKIPPED] {path}
        end
    end
    
    alt Not Dry-Run
        Synthesize->>CLI: Complete
        CLI->>FileSystem: writeAgentsMd()
        CLI->>FileSystem: writeDroidGuide()
    else Dry-Run
        CLI->>User: [DRY-RUN] Would update AGENTS.md, droid-guide.md
    end
    
    CLI->>User: Summary: N droids created/skipped, M tool widenings

## Proposed File Changes

### package.json(MODIFY)

Add `diff` package to dependencies. This library provides text diffing capabilities (Myers algorithm) that will be used with `kleur` for colored terminal output. Add entry: `"diff": "^5.2.0"` to the dependencies object. No other changes needed to package.json.

### src/utils/diffPreview.ts(NEW)

Create diff preview utility module. Import `diffLines` from `diff` package and `kleur` for colored output. Import `fs` from 'node:fs/promises'. Export async function `showDiff(filePath: string, newContent: string): Promise<void>` that reads existing file content (if exists), computes line-by-line diff using `diffLines(oldContent, newContent)`, and prints colored output to console. For each diff part: if `added` is true, print line with green '+' prefix using `kleur.green()`, if `removed` is true, print with red '-' prefix using `kleur.red()`, otherwise print unchanged lines with gray color using `kleur.gray()`. Add header showing file path in cyan using `kleur.cyan()`. Handle case where file doesn't exist (show all lines as additions). Export helper function `previewFileWrite(filePath: string, content: string): Promise<void>` that shows the diff and adds a separator line. Use `process.stdout.write()` for output to avoid extra newlines. Format output similar to unified diff format with file path header and +/- prefixes.

### src/utils/confirmations.ts(NEW)

References: 

- src/types.ts(MODIFY)

Create confirmation utility module for autonomy-based approval flows. Import `inquirer` and types from `../types.js`: AutonomyLevel. Export interface `ConfirmationContext` with fields: autonomy (AutonomyLevel), operation (string describing the operation), details (optional string with additional info), dryRun (boolean). Export async function `confirmOperation(ctx: ConfirmationContext): Promise<boolean>` that implements autonomy-based logic: if dryRun is true, always return true (skip confirmation in dry-run mode). For L1 autonomy, always prompt with inquirer confirm for every operation. For L2 autonomy, prompt only for checkpoint operations (detect by checking if operation string includes keywords: 'write droids', 'update docs', 'widen tools'). For L3 autonomy, only prompt for critical operations (detect keywords: 'widen tools', 'shell access'). Use `inquirer.prompt` with type 'confirm', message constructed from operation and details, default to true for L2/L3, false for L1. Return the user's answer. Export async function `confirmToolWidening(fromTools: string[], toTools: string[], droidName: string, autonomy: AutonomyLevel, dryRun: boolean): Promise<boolean>` that specifically handles tool widening confirmations. Check if widening includes 'Write' or 'Shell' (compare arrays). If no widening needed, return true. Otherwise call `confirmOperation` with context describing the tool change. Add helper function `needsConfirmation(operation: string, autonomy: AutonomyLevel): boolean` to centralize the checkpoint detection logic. Use `kleur` to color prompts: yellow for warnings about Write/Shell access, cyan for informational prompts.

### src/types.ts(MODIFY)

Add new type for synthesis options. Export interface `SynthesisOptions` with fields: signals (optional Signals type), scripts (optional object with files and npmScripts arrays), addSingleScript (optional string), mode (optional 'reanalyze' | 'fresh'), plan (DroidPlan), dryRun (boolean, defaults to false). This interface will be used as the parameter type for `synthesizeDroids` function. No changes to existing types.

### src/orchestrator/droidPlanner.ts(MODIFY)

References: 

- src/types.ts(MODIFY)

Update tool assignment logic to support tool widening. Keep all existing logic unchanged. Update comments in `createGenericDroidSpec`, `createContextualDroidSpec`, and `createScriptDroidSpec` functions to note that tools start with `['Read']` for generic/contextual droids (already implemented correctly) and `['Read', 'Shell']` for script droids (already correct). Add comment explaining that tool widening to `['Read', 'Write']` or `['Read', 'Write', 'Shell']` happens during synthesis based on user confirmation. No code changes needed since tools are already correctly initialized to minimal sets. Add JSDoc comment to DroidSpec interface documenting that `tools` field represents initial/minimal tool set and may be widened during synthesis with user approval.

### src/orchestrator/synthesizeDroids.ts(MODIFY)

References: 

- src/utils/diffPreview.ts(NEW)
- src/utils/confirmations.ts(NEW)
- src/types.ts(MODIFY)
- src/orchestrator/droidPlanner.ts(MODIFY)

Refactor to integrate diff preview, confirmations, tool widening, and dry-run mode. Import `previewFileWrite` from `../utils/diffPreview.js`, `confirmOperation` and `confirmToolWidening` from `../utils/confirmations.js`, and update imports to include `SynthesisOptions` from `../types.js`. Change function signature to accept single parameter `opts: SynthesisOptions` (replace current inline type). Extract autonomy level from `opts.plan.brief.autonomy` and dryRun from `opts.dryRun`. Update `writeDroidFromSpec` function signature to accept additional parameters: `autonomy: AutonomyLevel`, `dryRun: boolean`. Before rendering template in `writeDroidFromSpec`, check if spec requires tool widening: if spec.type is 'generic' or 'contextual' and user wants Write access, call `confirmToolWidening(['Read'], ['Read', 'Write'], spec.name, autonomy, dryRun)`. If approved, update `spec.tools` to include 'Write'. For script droids, check if Shell is needed (already in tools) but confirm if widening to include Write. After rendering template with mustache, call `previewFileWrite(filePath, body)` to show diff. Then call `confirmOperation` with context describing 'write droid file' operation, passing autonomy and dryRun. If not confirmed or dryRun is true, skip `fs.writeFile` and log with `kleur.yellow()` that write was skipped. If confirmed and not dryRun, proceed with `fs.writeFile`. Update main synthesis flow: after planning droids and validating claims, add checkpoint confirmation before writing droids (L2 level): call `confirmOperation` with operation 'write droids' and details showing count. If not confirmed, return early. Update console logging to indicate dry-run mode when active (prefix messages with '[DRY-RUN]' in yellow). Add summary at end showing: droids created/skipped, tool widenings approved/denied. Handle tool widening for contextual droids based on `opts.plan.brief.preferences.toolWidening` setting ('conservative' means prompt, 'auto' means allow without prompt for L3).

### src/cli.ts(MODIFY)

References: 

- src/orchestrator/synthesizeDroids.ts(MODIFY)
- src/types.ts(MODIFY)
- src/writers/writeAgentsMd.ts(MODIFY)
- src/writers/writeDroidGuide.ts(MODIFY)

Add dry-run mode support and pass autonomy context to synthesizeDroids. Import `SynthesisOptions` type from `./types.js`. Add `--dry-run` option to `synthesize` command using `.option('--dry-run', 'Preview changes without writing files')`. Add same option to `reanalyze` command. In `synthesize` command action, extract dryRun from options parameter (commander provides this). After fuseSignals, construct SynthesisOptions object with all required fields including `dryRun: options.dryRun || false`. Pass this object to `synthesizeDroids(synthesisOpts)`. Update `reanalyze` command action similarly. For `add-script` command, also support dry-run option and pass through. Update console messages to indicate dry-run mode when active: after interview, if dryRun is true, log with `kleur.yellow('[DRY-RUN MODE] No files will be written')`. Keep all other CLI logic unchanged. Update command descriptions to mention dry-run capability. Ensure writers (`writeAgentsMd`, `writeDroidGuide`) are called only when not in dry-run mode (wrap calls in `if (!dryRun)` blocks). Add final summary message showing what would be written in dry-run mode vs what was actually written.

### src/writers/writeAgentsMd.ts(MODIFY)

Add dry-run support to writer. Update function signature to accept `{ bootstrap?: boolean; dryRun?: boolean }`. If dryRun is true, skip `fs.writeFile` call and instead log with `kleur.yellow('[DRY-RUN] Would write AGENTS.md')` showing the content that would be written (first 200 chars). Keep all content generation logic unchanged. Import `kleur` for colored output. This allows the writer to respect dry-run mode when called from CLI.

### src/writers/writeDroidGuide.ts(MODIFY)

Add dry-run support to writer. Update function signature to accept `{ bootstrap?: boolean; dryRun?: boolean }`. If dryRun is true, skip `fs.writeFile` call and instead log with `kleur.yellow('[DRY-RUN] Would write docs/droid-guide.md')` showing the content that would be written (first 200 chars). Keep all content generation logic unchanged. Import `kleur` for colored output. This allows the writer to respect dry-run mode when called from CLI.