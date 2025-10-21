I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim.

---
## Comment 1: `brief.signals.scripts` is never populated in fusion, leaving it permanently empty.

In `src/orchestrator/signalFusion.ts`, after merging `frameworks` and `prdPaths` into `parsed.signals`, set `parsed.signals.scripts` to the list of script files from the `scripts` argument. Ensure `parsed.signals` is initialized (it already is) and assign `parsed.signals.scripts = Array.from(new Set(scripts.files || []))` before constructing the `plan` object.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/signalFusion.ts
- /home/richard/code/DroidForge/src/types.ts
---
## Comment 2: Merged brief signals are not persisted back to `.factory/project-brief.yaml`.

In `src/orchestrator/signalFusion.ts`, after merging `parsed.signals`, write the updated brief back to `.factory/project-brief.yaml` using `js-yaml.dump()`. Ensure you preserve existing fields and formatting. Perform the write after validation and before returning the constructed `plan`. Consider guarding behind a flag if you want to keep this non-destructive for now.

### Referred Files
- /home/richard/code/DroidForge/src/orchestrator/signalFusion.ts
---
## Comment 3: PRD parsing reads files sequentially; concurrency would speed large repos.

In `src/detectors/repoSignals.ts` `parsePrdContent()`, map over `prdPaths` to create an array of promises for reading/parsing and `await Promise.all()` to process them concurrently. Aggregate sections after all promises resolve. Keep error handling per-file to skip failures.

### Referred Files
- /home/richard/code/DroidForge/src/detectors/repoSignals.ts
---
## Comment 4: `conductInterview()` returns existing brief without validation; errors surface later in fusion.

In `src/interview/conductInterview.ts`, after loading the existing brief and before returning it, add a shallow validation to check for `mode`, `persona`, `autonomy`, and `intent` keys. If invalid, prompt the user to update or abort with a clear message.

### Referred Files
- /home/richard/code/DroidForge/src/interview/conductInterview.ts
- /home/richard/code/DroidForge/src/orchestrator/signalFusion.ts
---