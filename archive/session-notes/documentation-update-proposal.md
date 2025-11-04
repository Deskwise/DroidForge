# Documentation Update Proposal

**Date:** 2025-10-28
**Status:** DRAFT

## 1. Objective

To align all active documentation with the current state of the DroidForge application, clarify the status of planned features, and correct all outdated information. This proposal is based on the findings in the `documentation-consistency-report.md`.

## 2. Proposed Changes

### 2.1. `CHANGELOG.md`

*   **Action**: Modify the v2.0.0 entry to accurately reflect the implemented features.
*   **Rationale**: To correct the inaccurate claim about the "conversational onboarding" system.
*   **Proposed Text**:
    *   **From**: "Conversational onboarding replaces form-style prompts for `/forge-start`"
    *   **To**: "Introduced a basic conversational flow for `/forge-start`, replacing the previous form-style prompts. Full intelligent, 10-point data gathering is planned for a future release."

### 2.2. `QUICKSTART.md`

*   **Action**: Replace the outdated manual JSON configuration with the modern `/mcp add` command.
*   **Rationale**: To provide a simpler and more accurate setup guide for new users.
*   **Action**: Update the directory structure diagram to be simpler and more accurate.
*   **Rationale**: To avoid confusion about where DroidForge stores its files.
*   **Action**: Enhance the onboarding example to hint at the planned intelligent capabilities.
*   **Rationale**: To better align with the project's vision without overstating current features.

### 2.3. `CONTRIBUTING.md`

*   **Action**: Replace the outdated project structure diagram with a more accurate, high-level overview.
*   **Rationale**: To help new contributors understand the codebase more effectively.
*   **Action**: Correct all outdated directory references and contact information.
*   **Rationale**: To ensure all information is current and accurate.

### 2.4. `README.md`

*   **Action**: Add a brief section describing the vision for the intelligent onboarding process.
*   **Rationale**: To communicate this key feature to users and contributors, while clearly marking it as a work in progress.

## 3. Next Steps

Upon approval of this proposal, I will:

1.  Switch to `code` mode.
2.  Create a series of `apply_diff` patches to implement these changes.
3.  Submit the changes for your final review.

This structured approach will ensure that all documentation is brought up to a consistent and accurate standard.