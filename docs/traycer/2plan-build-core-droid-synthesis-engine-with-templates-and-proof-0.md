I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

Current implementation creates hardcoded generic droids without consuming DroidPlan. Templates have minimal YAML frontmatter. No mode-based logic, contextual droids, Proof generation, or file claims system exists. Script detection returns only paths without metadata. Writers don't read droid metadata yet.

### Approach

Create a droid planning module to map mode+signals to droid specifications, enhance templates with comprehensive frontmatter (scope, procedure, proof, outputSchema), implement Proof command generation based on script types and frameworks, add file claims validation to prevent overlaps, support contextual droids (ui-ux, api, domain-specialist) based on detected frameworks, and refactor synthesizeDroids to orchestrate the full pipeline.

### Reasoning

Read existing synthesizeDroids implementation, examined all three templates, reviewed types and DroidPlan structure, checked script detection logic, explored signal fusion and interview flows, examined sample repo structure, and analyzed PRD requirements for mode-based generation and contextual droids.

## Mermaid Diagram

sequenceDiagram
    participant CLI
    participant Interview
    participant Detectors
    participant Fusion
    participant Planner
    participant ProofGen
    participant Claims
    participant Synthesize
    participant Templates

    CLI->>Interview: conductInterview()
    Interview-->>CLI: ProjectBrief
    
    CLI->>Detectors: scanRepo() + scanScripts()
    Detectors->>Detectors: Parse package.json for npm scripts
    Detectors-->>CLI: signals + scripts (files + npmScripts)
    
    CLI->>Fusion: fuseSignals(signals, scripts)
    Fusion-->>CLI: DroidPlan
    
    CLI->>Synthesize: synthesizeDroids({plan})
    Synthesize->>Planner: planDroids(plan)
    
    Planner->>Planner: Check mode (bootstrap/feature/action/maintenance)
    
    alt Bootstrap Mode
        Planner->>Planner: Add core droids (planner, dev, reviewer, qa, auditor)
    end
    
    Planner->>Planner: Detect frameworks from signals
    Planner->>Planner: Add contextual droids (ui-ux, api, qa-e2e, etc.)
    
    loop For each script
        Planner->>ProofGen: generateProofCommands(scriptPath, frameworks)
        ProofGen-->>Planner: Proof commands array
        Planner->>Planner: Create script droid spec
    end
    
    Planner-->>Synthesize: DroidSpec[]
    
    Synthesize->>Claims: Extract file claims from specs
    Synthesize->>Claims: validateClaims(claims)
    Claims-->>Synthesize: Validation result (conflicts if any)
    
    loop For each DroidSpec
        Synthesize->>Templates: Load template (generic/script/contextual)
        Synthesize->>Templates: Render with spec data
        Templates-->>Synthesize: Rendered markdown
        Synthesize->>Synthesize: Write to .factory/droids/{name}.md
    end
    
    Synthesize-->>CLI: Complete
    CLI->>CLI: Update AGENTS.md and droid-guide.md

## Proposed File Changes

### src/orchestrator/proofGenerator.ts(NEW)

Create Proof command generator module. Export function `generateProofCommands(scriptPath: string, frameworks: string[]): string[]` that returns array of verification commands. Implement logic to detect script type by extension: `.sh`/`.ps1` scripts return commands to check exit code and verify common artifact patterns (e.g., `test -f dist/index.html`), `.py` scripts return python execution with exit code check, `package.json` returns npm script execution commands. For framework-specific proofs: if `frontend` in frameworks, add build artifact checks (dist/, build/), if `backend` in frameworks, add health check or server start verification, if `testing` in frameworks, add test result validation commands. Return array of shell commands as strings. Handle edge cases where script path is Makefile (return `make <target> && echo 'PASS'`). Add helper function `inferScriptType(path: string): 'shell' | 'python' | 'npm' | 'make' | 'unknown'` to classify scripts.

### src/orchestrator/fileClaims.ts(NEW)

Create file claims validation module. Export interface `FileClaim` with fields: droidName (string), patterns (string array of glob patterns). Export function `validateClaims(claims: FileClaim[]): { valid: boolean; conflicts: Array<{droid1: string; droid2: string; pattern: string}> }` that checks for overlapping glob patterns using `micromatch` library. Implement overlap detection by comparing each claim's patterns against all others—if two patterns match the same file path, record as conflict. Export function `generateScopePatterns(role: string, frameworks: string[], scriptPath?: string): string[]` that returns appropriate glob patterns based on droid role: generic droids like `planner` get broad patterns (`**/*.md`, `docs/**`), `dev` gets source patterns (`src/**`, `lib/**`), `reviewer` gets all code patterns (`**/*.{ts,js,py}`), `qa` gets test patterns (`**/*.test.*`, `**/*.spec.*`, `tests/**`), `auditor` gets config patterns (`*.config.*`, `.*rc`, `package.json`). For contextual droids: `ui-ux` gets `src/components/**`, `src/pages/**`, `*.css`, `*.scss`, `api` gets `src/api/**`, `src/routes/**`, `src/controllers/**`, `domain-specialist` gets patterns from PRD features if available. For script droids, return the specific script path only. Return empty array for unknown roles.

### src/orchestrator/droidPlanner.ts(NEW)

References: 

- src/types.ts(MODIFY)
- src/orchestrator/fileClaims.ts(NEW)
- src/orchestrator/proofGenerator.ts(NEW)

Create droid planning module to map DroidPlan to droid specifications. Import types from `../types.js`: DroidPlan, Mode, Persona. Import `generateScopePatterns` from `./fileClaims.js` and `generateProofCommands` from `./proofGenerator.js`. Export interface `DroidSpec` with fields: name (string), type ('generic' | 'script' | 'contextual'), role (string), description (string), tools (string array), scope (string array of patterns), procedure (string array of steps), proof (string array of commands), outputSchema (string), scriptPath (optional string for script droids). Export function `planDroids(plan: DroidPlan): DroidSpec[]` that implements mode-based logic: For `bootstrap` mode, return array containing core generic droids (planner, dev, reviewer, qa, auditor) plus contextual droids based on plan.signals.frameworks (if 'frontend' present add ui-ux droid, if 'backend' add api droid, if 'testing' add qa-e2e droid, if 'motion' add animation-specialist droid) plus script droids for each file in plan.scripts.files. For `feature` mode, return only contextual droids relevant to detected frameworks plus script droids. For `action` mode, return minimal scoped droids based on plan.brief.intent.goal (parse goal string for keywords like 'refactor', 'upgrade', 'migrate' and create appropriately named short-lived droids like 'refactor-auth', 'dep-upgrade-guard') plus script droids. For `maintenance` mode, return same as bootstrap but mark for comparison (future phase will handle). For each droid spec, populate: name from role, type based on category, description from role + mode context, tools starting with ['Read'] (widening handled in next phase), scope from `generateScopePatterns`, procedure as array of numbered steps appropriate to role (planner: analyze PRD, draft plan, validate; dev: read context, implement changes, run proof; reviewer: read changes, check standards, suggest improvements; qa: run tests, verify outputs, report results; auditor: scan configs, check security, report issues; contextual droids get role-specific procedures), proof from `generateProofCommands` for script droids or framework-appropriate commands for contextual droids, outputSchema as template string with Summary/Results/Artifacts/Notes sections. Add helper function `inferContextualDroids(frameworks: string[]): Array<{role: string; description: string}>` to map frameworks to contextual droid specs.

### src/detectors/scripts.ts(MODIFY)

Enhance script detection to extract npm scripts and provide metadata. Keep existing `scanScripts` function signature but enhance return type to include metadata. Import `fs` from 'node:fs/promises' and `path` from 'node:path'. After globbing files, check if `package.json` exists in root. If yes, read and parse it, extract `scripts` field, and for each npm script key, create a pseudo-path like `npm:build`, `npm:test` to represent npm scripts. Return object with `files` array (existing file paths) and new `npmScripts` array of objects with shape `{name: string; command: string; path: string}` where path is the pseudo-path format. Update return type to `{files: string[]; npmScripts: Array<{name: string; command: string; path: string}>}`. This allows downstream modules to distinguish between file-based scripts and npm scripts for Proof generation.

### templates/droid.generic.md.hbs(MODIFY)

Enhance template with comprehensive YAML frontmatter and structured body. Update frontmatter to include: name (existing), model (existing), description (existing), tools (existing), scope (new array field with mustache variable `{{#scope}}{{.}}{{/scope}}`), procedure (new array field), proof (new array field), outputSchema (new string field). Update body sections: keep existing Role section, enhance Scope section to list allowed patterns from frontmatter scope array using mustache iteration `{{#scope}}- {{.}}{{/scope}}`, enhance Procedure section to list numbered steps from frontmatter using `{{#procedure}}{{@index}}. {{.}}{{/procedure}}`, add new Proof section with heading '# Proof' and list commands using `{{#proof}}- {{.}}{{/proof}}`, keep Constraints section, enhance Output section to use outputSchema variable `{{{outputSchema}}}` (triple braces for unescaped). Ensure all mustache variables are properly closed and formatted for array iteration.

### templates/droid.script.md.hbs(MODIFY)

Enhance script droid template with comprehensive frontmatter and Proof commands. Update frontmatter to include: name (existing), model (existing), description (existing), tools (existing, keep [Read, Shell]), scope (new array with single element `{{scriptPath}}`), procedure (new array field), proof (new array field with generated commands), outputSchema (new string field). Update body: keep Role section with existing scriptPath reference, update Scope section to show the specific script path as allowed scope, add Procedure section with steps: '1. Execute {{scriptPath}}', '2. Verify exit code is 0', '3. Check expected artifacts exist', '4. Report status', add new Proof section with heading '# Proof' listing verification commands from frontmatter using `{{#proof}}- {{.}}{{/proof}}`, keep Constraints section, update Output section to use outputSchema with fields: Summary, Results (exitCode, artifacts), Notes. Ensure scriptPath variable is used consistently throughout template.

### templates/orchestrator.md.hbs(MODIFY)

Enhance orchestrator template with comprehensive frontmatter. Update frontmatter to include: name (existing), model (existing), description (existing), tools (existing), scope (new array with patterns: '.factory/droids/**', 'AGENTS.md', 'docs/droid-guide.md', 'docs/**/prd/**', 'README.md', 'package.json', 'scripts/**'), procedure (new array with steps: '1. Conduct user interview to capture intent', '2. Scan repo for PRD/README/scripts/frameworks', '3. Fuse signals into DroidPlan', '4. Generate droid specifications based on mode', '5. Validate file claims to prevent overlaps', '6. Write droid files with least-privilege tools', '7. Update AGENTS.md and docs/droid-guide.md', '8. Show diffs and request confirmation', '9. Summarize changes and next steps'), proof (new array with commands: 'test -d .factory/droids', 'test -f AGENTS.md', 'test -f docs/droid-guide.md', 'ls .factory/droids/*.md | wc -l'), outputSchema (new string with template: 'Summary: <1-2 lines>\nCreated Droids:\n- <name>: <purpose>\nDocs:\n- Updated AGENTS.md, docs/droid-guide.md\nNotes:\n- <follow-ups>'). Keep existing body sections but ensure they reference the enhanced frontmatter structure. Update Procedure section to list steps from frontmatter array.

### templates/droid.contextual.md.hbs(NEW)

Create template for contextual specialist droids (ui-ux, api, domain-specialist, etc.). Define YAML frontmatter with fields: name (mustache variable `{{name}}`), model ('inherit'), description (mustache variable `{{description}}`), tools (array starting with ['Read']), scope (mustache array `{{#scope}}{{.}}{{/scope}}`), procedure (mustache array `{{#procedure}}{{.}}{{/procedure}}`), proof (mustache array `{{#proof}}{{.}}{{/proof}}`), outputSchema (mustache variable `{{{outputSchema}}}`). Create body with sections: Role section describing the specialist's domain (use `{{role}}` variable), Scope section listing allowed file patterns from frontmatter scope array, Procedure section with numbered steps from frontmatter procedure array, Proof section listing verification commands from frontmatter proof array, Constraints section with standard least-privilege text ('Start read-only. Request tool widening for Write/Shell operations. Stay within declared scope.'), Output section using outputSchema variable. This template will be used for ui-ux (frontend components/styles), api (backend routes/controllers), domain-specialist (business logic), qa-e2e (end-to-end testing), animation-specialist (motion/animations) droids.

### src/orchestrator/synthesizeDroids.ts(MODIFY)

References: 

- src/orchestrator/droidPlanner.ts(NEW)
- src/orchestrator/fileClaims.ts(NEW)
- src/types.ts(MODIFY)
- templates/droid.generic.md.hbs(MODIFY)
- templates/droid.script.md.hbs(MODIFY)
- templates/droid.contextual.md.hbs(NEW)

Refactor to consume DroidPlan and orchestrate full synthesis pipeline. Import `planDroids` and `DroidSpec` from `./droidPlanner.js`, `validateClaims` and `FileClaim` from `./fileClaims.js`. Keep existing function signature but make plan parameter required (remove optional). Add early return for `addSingleScript` mode (keep existing logic). For main synthesis flow: if plan is provided, call `planDroids(plan)` to get array of DroidSpec objects. Extract file claims from specs by mapping each spec to FileClaim object with droidName and patterns from spec.scope. Call `validateClaims(claims)` and if conflicts exist, log warning with conflict details (droid names and overlapping patterns) but continue (strict enforcement in future phase). Remove hardcoded generic droid creation (planner, dev, reviewer, qa, auditor). Replace with iteration over DroidSpec array: for each spec, determine template based on spec.type ('generic' uses droid.generic.md.hbs, 'script' uses droid.script.md.hbs, 'contextual' uses droid.contextual.md.hbs). Load appropriate template, render with mustache passing full spec object as context (spec fields map directly to template variables). Write rendered content to `.factory/droids/{spec.name}.md`. Update script wrapping logic to use DroidSpec from planner instead of inline generation. Remove existing `writeGenericDroid` and `writeScriptDroid` helper functions, replace with single `writeDroidFromSpec(spec: DroidSpec, dir: string)` helper that handles template selection and rendering. Add console logging with `kleur` to show progress: cyan for 'Generating {name} droid...', green for 'Created {count} droids'. Handle errors gracefully with try-catch around file writes.

### src/cli.ts(MODIFY)

References: 

- src/detectors/scripts.ts(MODIFY)
- src/orchestrator/synthesizeDroids.ts(MODIFY)

Update CLI to handle enhanced script detection return type. In `scan` command action, update to handle new return structure from `scanScripts` which now includes `npmScripts` array. Update JSON.stringify output to include both files and npmScripts. In `synthesize` command action, after calling `scanScripts`, pass the full return object (with files and npmScripts) to `fuseSignals`. Ensure plan is always passed to `synthesizeDroids` (remove optional handling since plan is now required). In `add-script` command, keep existing behavior (plan not needed for single script mode). In `reanalyze` command, same updates as synthesize for script detection and plan passing. No other changes needed to CLI logic.

### src/types.ts(MODIFY)

Update DroidPlan interface to support enhanced script metadata. Change `scripts` field type from `{ files: string[] }` to `{ files: string[]; npmScripts: Array<{name: string; command: string; path: string}> }`. This allows the plan to carry both file-based scripts and npm scripts for downstream processing. No other changes needed to existing types.

### src/orchestrator/signalFusion.ts(MODIFY)

References: 

- src/types.ts(MODIFY)
- src/detectors/scripts.ts(MODIFY)

Update fuseSignals to handle enhanced script detection return type. Change function signature parameter `scripts` from `{ files: string[] }` to `{ files: string[]; npmScripts: Array<{name: string; command: string; path: string}> }`. Update DroidPlan construction to pass full scripts object including npmScripts array. Update brief.signals.scripts to include both file paths and npm script pseudo-paths (map npmScripts to their path field and concat with files array). No other logic changes needed.