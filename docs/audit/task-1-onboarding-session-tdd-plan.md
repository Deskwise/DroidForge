# Task 1 – Onboarding Session & Deep Merge TDD Remediation Plan

## Scope

This plan covers Task 1 and its eight subtasks:

- Define a nested `OnboardingData` model and integrate it into `OnboardingSession`.
- Implement correct deep-merge behavior for the `onboarding` subtree in the session store.
- Add and run tests that enforce this behavior (true TDD: RED → GREEN → REFACTOR).

Current reality:

- `OnboardingData` in `src/types.ts` is a flat bag of strings.
- `OnboardingSession` in `src/mcp/types.ts` includes `onboarding: OnboardingData` but without the nested required-data model described in the spec.
- `SessionStore.save` in `src/mcp/sessionStore.ts` only does a shallow merge of the session object after stripping `undefined` fields.
- `src/mcp/__tests__/sessionStore.test.ts` does not exist.
- Task-master marks Task 1 and its subtasks 1.1–1.8 as done, but the spec is not actually satisfied.

## Goals

1. Make Task-master’s task state honest for Task 1 and its subtasks.
2. Drive implementation changes via TDD, not post-hoc testing.
3. Align the data model and session persistence semantics with the original Task 1 spec while keeping backward compatibility for existing callers where reasonable.

## High-level TDD strategy

We will work in two clusters, always following RED → GREEN → REFACTOR:

1. **Deep-merge + session store cluster**
   - Subtasks primarily affected: 1.2, 1.3, 1.7, 1.8.
   - Behavior: deep merge for `onboarding`, array replacement, legacy-field preservation.

2. **Data model + type structure cluster**
   - Subtasks primarily affected: 1.1, 1.4, 1.5, 1.6.
   - Behavior: nested `OnboardingData` with `requiredData`, `collectionMetadata`, `methodology`, `team`, plus integration with `OnboardingSession` and tool IO types.

Each cluster will be handled in small, TDD-driven increments.

---

## Cluster 1 – Deep-merge & Session Store

### RED: Introduce tests that describe the desired behavior

1. Create `src/mcp/__tests__/sessionStore.test.ts` using `node:test` (consistent with the rest of the repo).
2. Implement focused test cases for `SessionStore.save`:
   - **Nested onboarding merge**
     - Given an existing session on disk with a populated `onboarding.requiredData` object, when a new session is saved that updates only one nested field, the other fields in `requiredData` must remain intact.
   - **Array replacement semantics**
     - For arrays such as `selectedDroids` (or any other onboarding-related array field), saving a new session with a different array should replace the existing array, not merge elements.
   - **Legacy field preservation**
     - When saving a partial session that omits some legacy top-level fields (e.g., `methodologyConfirmed`), existing values for those fields should remain unchanged.
3. Run this test file directly (or via the appropriate npm script) and confirm:
   - Tests fail for the expected reasons (shallow merge behavior and missing deep merge implementation).

### GREEN: Implement the minimum code to satisfy the tests

4. Introduce a reusable deep-merge utility, e.g. in `src/mcp/utils/deepMerge.ts`:
   - Deeply merges plain objects.
   - For arrays, uses replacement semantics rather than element-wise merge.
   - Avoids mutating inputs; always returns a new object.
5. Update `SessionStore.save` in `src/mcp/sessionStore.ts`:
   - Retain the existing `undefined`-filtering behavior.
   - For top-level merge:
     - Use shallow merge for all fields except `onboarding`.
     - If both `existing.onboarding` and `sanitized.onboarding` are present, deep-merge them using the helper.
     - If only one side has `onboarding`, use that object as-is.
6. Re-run `sessionStore.test.ts` to ensure all new tests pass.

### REFACTOR: Clean up and align task metadata

7. Review the implementation for clarity and resilience:
   - Ensure the deep-merge helper is well-typed and has a small, focused API.
   - Consider adding small unit tests for the deep-merge helper itself if behavior is non-trivial.
8. Confirm that Task-master Task 1 subtasks related to deep merge and tests (1.2, 1.3, 1.7, 1.8) can be legitimately moved back to `done` once behavior and tests match the spec.

---

## Cluster 2 – Data Model & Type Structure

### RED: Extend tests (or add new ones) to pin the data model

1. In `sessionStore.test.ts`, add expectations about the shape of `onboarding` and `requiredData`:
   - When a session is created and saved with a nested `OnboardingData`, the stored JSON structure must match the expected nested layout.
   - When `SessionStore.load` reads this file back, it must deserialize into the expected shape without losing or mis-typing nested fields.
2. If needed, add additional type-oriented tests (or compile-time checks) to ensure that IO types for tools like `record_onboarding_data` line up with the nested structure.

### GREEN: Implement the nested data model

3. In `src/types.ts`:
   - Define `RequiredDataPoint`:
     - `{ value: string | null; confidence: number; source: string }`.
   - Redefine `OnboardingData` to include:
     - `requiredData: Record<string, RequiredDataPoint>` for the 10 mandatory data points (vision, audience, etc.).
     - `collectionMetadata: object` (or a more refined interface once requirements are clearer).
     - `methodology: object`.
     - `team: object`.
   - Preserve existing flat fields (e.g., `projectVision`, `targetAudience`, etc.) as optional legacy properties to avoid breaking callers immediately.
4. In `src/mcp/types.ts`:
   - Ensure `OnboardingSession.onboarding` is typed as the new `OnboardingData`.
   - Update tooling IO types (e.g., `RecordOnboardingDataInput`, `GetOnboardingProgressOutput`) to:
     - Accept and/or expose the nested structure.
     - Retain legacy flat fields as optional, documented as deprecated.

### REFACTOR: Migrate callers safely and tighten the model

5. Survey tools that read/write onboarding state (e.g., `record_onboarding_data`, `get_onboarding_progress`, `select_methodology`, `recommend_droids`, `forge_roster`):
   - Update their internal logic to read from and write to the nested `OnboardingData` structure.
   - Keep compatibility shims where necessary to support any existing flat-field usage.
6. Once all call sites have been migrated and tested, consider deprecating or eventually removing legacy flat fields from the model and IO types.
7. Re-check Task 1 subtasks 1.1, 1.4, 1.5, 1.6 in Task-master and set them to `done` only when the nested data model is fully wired and tested.

---

## Working Notes

- All changes must follow TDD: write or restore failing tests first, then implement the minimum code to make them pass.
- Commit history should reflect the RED → GREEN → REFACTOR phases where practical, to make it easy to audit the evolution of this feature.
- Any divergence from the original spec should be explicitly documented in this directory (e.g., if we refine the shapes of `collectionMetadata`, `methodology`, or `team`).


## Progress (as of 2025-11-14)

- **Deep-merge & session store**
  - Implemented `deepMerge` utility with array replacement semantics.
  - Updated `SessionStore.save` to deep-merge the `onboarding` subtree while preserving unknown fields.
  - Added `src/mcp/__tests__/sessionStore.test.ts` to enforce nested merge and array replacement.

- **Data model & types**
  - Introduced `RequiredDataPoint { value: string | null; confidence: number; source: string }`.
  - Updated `OnboardingData` in `src/types.ts` to include `requiredData`, `collectionMetadata`, `methodology`, `team` plus legacy flat fields for compatibility.

- **Tool integration**
  - `record_onboarding_data` now writes to both legacy flat fields and `onboarding.requiredData` with confidence/source metadata.
  - `get_onboarding_progress` now reads from `onboarding.requiredData` first and falls back to legacy fields.
  - `smart_scan` now initializes new sessions (and upgrades existing ones) with the full nested `onboarding` structure.

## Remaining Work

- **Caller audit & migration**
  - [ ] Audit all remaining tools and modules that read or write onboarding fields and update them to use `requiredData` where appropriate.
  - [ ] Ensure no caller assumes `onboarding` is a flat bag of strings.

- **Edge cases & validation**
  - [ ] Add stricter validation/schema checks for `requiredData` entries (e.g., required keys, confidence ranges).
  - [ ] Add tests for partially migrated sessions and mixed legacy/new data.

- **Documentation & cleanup**
  - [ ] Update user-facing and internal docs to describe the nested onboarding model and deep-merge semantics.
  - [ ] Decide on a deprecation timeline for legacy flat fields and document migration guidance.
