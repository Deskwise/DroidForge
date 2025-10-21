I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

The codebase follows clean ESM patterns with async/await, uses `commander` for CLI, `mustache` for templates, and has `inquirer`, `js-yaml`, and `gray-matter` available but unused. Current detectors only find file paths without parsing content. The `synthesizeDroids` function uses inline types and simple signatures. No shared types file exists yet.

### Approach

Create an interview module using `inquirer` to capture user intent, generate a YAML project brief, enhance PRD parsing to extract structured content, build a signal fusion module to merge all inputs into a DroidPlan, and integrate the flow into CLI commands. Use TypeScript interfaces for type safety and follow existing ESM/async patterns.

### Reasoning

Listed repository structure, read CLI and detector implementations, examined templates and writers, checked package.json for available dependencies, reviewed PRD requirements, and analyzed existing code patterns to understand the architecture.

## Mermaid Diagram

sequenceDiagram
    participant User
    participant CLI
    participant Interview
    participant Detectors
    participant Fusion
    participant Synthesize

    User->>CLI: droidforge synthesize
    CLI->>Interview: conductInterview()
    Interview->>Interview: Check if brief exists
    alt Brief exists
        Interview->>User: Use existing or update?
    end
    Interview->>User: Ask 4 questions (mode, persona, autonomy, intent)
    User->>Interview: Provide answers
    Interview->>Interview: Write .factory/project-brief.yaml
    Interview-->>CLI: Return ProjectBrief
    
    CLI->>Detectors: scanRepo(cwd)
    Detectors->>Detectors: Find PRD paths, frameworks, configs
    Detectors->>Detectors: Parse PRD content (vision, features, criteria)
    Detectors-->>CLI: Return signals + prdContent
    
    CLI->>Detectors: scanScripts(cwd)
    Detectors-->>CLI: Return scripts
    
    CLI->>Fusion: fuseSignals(signals, scripts)
    Fusion->>Fusion: Read project-brief.yaml
    Fusion->>Fusion: Merge brief + signals + PRD
    Fusion-->>CLI: Return DroidPlan
    
    CLI->>Synthesize: synthesizeDroids({signals, scripts, plan})
    Note over Synthesize: Plan parameter added but not consumed yet<br/>(future phase will use it)
    Synthesize->>Synthesize: Generate droids from templates
    Synthesize-->>CLI: Complete
    
    CLI->>User: ✅ Droids synthesized

## Proposed File Changes

### src/types.ts(NEW)

Create shared TypeScript interfaces for the project. Define `Mode` type as union of 'bootstrap' | 'feature' | 'action' | 'maintenance'. Define `Persona` type as 'vibe' | 'pragmatic' | 'pro'. Define `AutonomyLevel` type as 'L1' | 'L2' | 'L3'. Define `ProjectBrief` interface with fields: version (number), mode (Mode), persona (Persona), autonomy (AutonomyLevel), intent (object with goal, context, constraints array), domain (object with type and stack array), preferences (object with testingStyle, docStyle, toolWidening), signals (object with frameworks, scripts, prdPaths arrays). Define `PRDContent` interface with fields: vision (string), features (string array), acceptanceCriteria (string array). Define `DroidPlan` interface with fields: brief (ProjectBrief), signals (object with frameworks, prdPaths, testConfigs arrays), prdContent (PRDContent or null), scripts (object with files array). Export all types and interfaces.

### src/interview/conductInterview.ts(NEW)

Create interview module using `inquirer` package. Import types from `../types.js`. Export async function `conductInterview()` that returns Promise<ProjectBrief>. Check if `.factory/project-brief.yaml` exists; if yes, ask user via inquirer confirm prompt whether to update or use existing (return parsed existing if user declines). Define 4 inquirer prompts: (1) list prompt for mode with choices bootstrap/feature/action/maintenance and helpful descriptions, (2) list prompt for persona with choices vibe/pragmatic/pro and descriptions matching PRD personas, (3) list prompt for autonomy with choices L1/L2/L3 and descriptions from PRD, (4) input prompts for intent.goal, intent.context, and intent.constraints (comma-separated, split into array). For domain and preferences, provide sensible defaults (domain.type: 'unknown', domain.stack: [], preferences with defaults from PRD). Construct ProjectBrief object with version: 1 and empty signals object. Use `mkdirp` to ensure `.factory/` directory exists. Use `js-yaml` dump method to serialize brief to YAML. Write to `.factory/project-brief.yaml` using `fs.writeFile`. Return the ProjectBrief object. Add helpful console messages using `kleur` for colored output (e.g., cyan for questions, green for success).

### src/detectors/repoSignals.ts(MODIFY)

References: 

- src/types.ts(NEW)

Enhance the existing `scanRepo` function to parse PRD/README content in addition to finding paths. Import `PRDContent` type from `../types.js`. Import `gray-matter` for frontmatter parsing. Keep existing logic for finding prdPaths, frameworks, and testConfigs unchanged. After collecting prdPaths, add new logic to parse PRD content: iterate through prdPaths array, read each file using `fs.readFile`, parse with `gray-matter` to extract frontmatter and content. For markdown content, use regex or string methods to extract sections: look for headings like '## Vision', '## Goals', '## Features', '## Acceptance Criteria' (case-insensitive). Extract vision as the text between Vision heading and next heading. Extract features as bullet points or numbered list items under Features heading (split by newlines, filter lines starting with - or digits). Extract acceptanceCriteria similarly under Acceptance Criteria heading. Combine results from all PRD files (concatenate arrays, join vision strings). Create PRDContent object or null if no content found. Update return type to include prdContent field alongside existing fields (prdPaths, frameworks, testConfigs). Handle errors gracefully (e.g., file read failures should not crash, just skip that file).

### src/orchestrator/signalFusion.ts(NEW)

References: 

- src/types.ts(NEW)

Create signal fusion module to merge project brief, repo signals, and PRD content into unified DroidPlan. Import types from `../types.js`: ProjectBrief, DroidPlan, PRDContent. Import `js-yaml` for parsing YAML. Import `fs` from 'node:fs/promises' and `path` from 'node:path'. Export async function `fuseSignals(signals: {frameworks: string[], prdPaths: string[], testConfigs: string[], prdContent: PRDContent | null}, scripts: {files: string[]})` that returns Promise<DroidPlan>. Read `.factory/project-brief.yaml` using `fs.readFile`, parse with `js-yaml.load()` to get ProjectBrief object. Merge signals into brief.signals field (update the frameworks, prdPaths arrays). Construct DroidPlan object with: brief (parsed ProjectBrief with updated signals), signals (passed signals), prdContent (from signals.prdContent), scripts (passed scripts). Return DroidPlan. Add error handling: if brief file doesn't exist, throw descriptive error suggesting user run interview first. Validate brief structure (check required fields exist) and throw if invalid.

### src/cli.ts(MODIFY)

References: 

- src/interview/conductInterview.ts(NEW)
- src/orchestrator/signalFusion.ts(NEW)
- src/types.ts(NEW)
- src/detectors/repoSignals.ts(MODIFY)
- src/orchestrator/synthesizeDroids.ts(MODIFY)

Integrate interview and signal fusion into CLI commands. Import `conductInterview` from `./interview/conductInterview.js`. Import `fuseSignals` from `./orchestrator/signalFusion.js`. Import `DroidPlan` type from `./types.js`. Update `synthesize` command action: before calling scanRepo, call `await conductInterview()` to generate/update project brief. After scanRepo and scanScripts, call `await fuseSignals(signals, scripts)` to get DroidPlan. Pass DroidPlan to synthesizeDroids (note: current synthesizeDroids signature doesn't accept it yet, but future phase will consume it—for now, still pass signals and scripts as before to maintain compatibility). Add console log after interview completes (e.g., '✅ Project brief created/updated'). Update `reanalyze` command action similarly: call conductInterview first (with message that reanalysis will use updated intent), then fuseSignals, then pass to synthesizeDroids with mode: 'reanalyze'. Keep `scan` command unchanged (no interview needed for scan-only). Keep `add-script` command unchanged (no interview needed for single script). Keep `init` command unchanged. Add try-catch blocks around interview and fusion calls to handle errors gracefully with helpful messages.

### src/orchestrator/synthesizeDroids.ts(MODIFY)

References: 

- src/types.ts(NEW)

Update function signature to accept optional DroidPlan parameter for future consumption. Import `DroidPlan` type from `../types.js`. Change function signature to `synthesizeDroids(opts: { signals?: Signals; scripts?: { files: string[] }; addSingleScript?: string; mode?: 'reanalyze' | 'fresh'; plan?: DroidPlan })`. Add plan parameter to opts destructuring. For now, plan parameter is not used in the function body (future phases will consume it to generate droids based on mode, persona, autonomy). Keep all existing logic unchanged. Add comment noting that plan will be consumed in future phase to generate context-aware droids based on ProjectBrief mode and preferences.