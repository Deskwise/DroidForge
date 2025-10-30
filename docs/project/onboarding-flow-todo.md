# Onboarding Flow Tracker

- [x] Transform `src/mcp/prompts/onboarding.ts` to follow the phased script (vision hook → Core 6 checklist → methodology → delivery wrap-up → forging) with a dynamic checklist and mirrored summaries.
- [x] Update `src/mcp/templates/commands.ts` so forge-start guidance mirrors the gates, explains the three “because you said…” recommendations, and keeps instructions conversational instead of pattern-matched rules.
- [x] Ensure roster forging delivers personalized first-person introductions, referencing user language while keeping command slugs in the `df-<role>` format.
- [x] Extend UAT coverage with `scripts/uat-onboarding-flow-check.mjs` to assert the Core 6 gate, the 10/10 data requirement before forging, and successful roster creation once complete.
- [x] Re-run the onboarding experience (script + harness) to verify the flow remains conversational and satisfies every gate, including handling unknown methodologies via friendly prompts in `select_methodology`.

**Status:** Spec implemented end-to-end. Future adjustments should keep this list in sync.
