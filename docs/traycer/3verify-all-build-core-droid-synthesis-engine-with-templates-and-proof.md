I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
## Comment 1: Mustache templates use unsupported @index and faulty tools joining causing invalid YAML frontmatter.

In `templates/droid.generic.md.hbs`, `templates/droid.script.md.hbs`, and `templates/droid.contextual.md.hbs`, replace the inline tools array with a YAML list:
`tools:` followed by `{{#tools}}` each item as `- {{.}}` then `{{/tools}}`.
Replace Procedure numbering to a simple bullet list: in the body use `{{#procedure}}- {{.}}` then `{{/procedure}}`; remove `{{@index}}` usage.
For `outputSchema`, switch to a YAML block scalar:
`outputSchema: |` followed by indented lines `{{{ outputSchema }}}`. Ensure indentation under the frontmatter key.
Apply the same changes consistently to all three templates.

### Referred Files
- /home/richard/code/DroidForge/templates/droid.generic.md.hbs
- /home/richard/code/DroidForge/templates/droid.script.md.hbs
- /home/richard/code/DroidForge/templates/droid.contextual.md.hbs
---
## Comment 2: Proof generator incorrectly captures exit codes across separate commands, producing false PASS/FAIL.

In `src/orchestrator/proofGenerator.ts`, emit a single shell command that captures and evaluates the exit code in one line, e.g., `bash <script>; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`. Do this for shell and python types. For npm scripts, use `npm run <name>; ec=$?; echo "Exit code: $ec"; test $ec -eq 0 && echo PASS || echo FAIL`. Ensure each proof step is a single compound command per evaluation.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/proofGenerator.ts
---
## Comment 3: Makefile proof generation derives an invalid target and may run `make Makefile`.

In `src/orchestrator/proofGenerator.ts`, change the make branch to detect a `Makefile:` prefix explicitly. If `scriptPath.includes(':')`, split on `:` and use the part after as the target; otherwise, emit `make` (no target) or `make all`. Do not attempt to replace `Makefile:` when the string is just `Makefile`.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/proofGenerator.ts
- /home/richard/code/DroidForge/src/detectors/scripts.ts
---
## Comment 4: PowerShell scripts (*.ps1) are executed with bash, not PowerShell, causing failures on Windows.

In `src/orchestrator/proofGenerator.ts`, map `.ps1` to a distinct `powershell` ScriptType and emit proof commands using `pwsh -File <script>` (or `powershell -File <script>`), with the same single-line exit code capture approach. Update `ScriptType` union and switch accordingly.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/proofGenerator.ts
---
## Comment 5: scripts detector mistakenly treats package.json as a script, creating bogus script droids.

In `src/detectors/scripts.ts`, remove `package.json` from the globby patterns for `files`. Keep the explicit read of package.json for npm script extraction, but ensure `files` only includes actual executable scripts (e.g., `scripts/**/*.{sh,py,ps1}`, `Makefile`). Filter out `Makefile` if you don’t handle it properly or treat it specially, but do not include `package.json` in `files`.

### Referred Files
- /home/richard/code/DroidForge/src/detectors/scripts.ts
- /home/richard/code/DroidForge/src/orchestrator/droidPlanner.ts
---
## Comment 6: Default scope pattern is overly broad, causing pervasive overlaps and noisy conflicts.

In `src/orchestrator/fileClaims.ts`, narrow default scope to a safer subset (e.g., `src/**`, `docs/**`) or require explicit role mapping. Reduce reviewer scope to code-only globs (e.g., `**/*.{ts,js,tsx,jsx,py,go,rs}` within `src/**`). Consider separating config globs to `config/**`. Adjust patterns to minimize blanket overlaps.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/fileClaims.ts
---
## Comment 7: File-claims overlap detection is heuristic and can miss or invent conflicts.

In `src/orchestrator/fileClaims.ts`, replace the heuristic with a real file set expansion: use `globby` to list actual repo files (`cwd` root) and check for intersections by testing each pattern against the expanded list. Record conflicts when two claims match at least one same real file. Keep the interface the same.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/fileClaims.ts
---
## Comment 8: Script droid name sanitization removes dots, risking collisions and readability issues.

In `src/orchestrator/droidPlanner.ts`, change name normalization to replace non-alphanumeric characters with `-`, collapse repeats, and preserve the base name without extension (or include the extension safely). For npm scripts, keep `npm-<name>` as-is.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/droidPlanner.ts
---