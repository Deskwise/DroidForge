# Onboarding Flow TODO Tracker

- [x] Transform `src/mcp/prompts/onboarding.ts` into the phased conversational flow (core discovery → methodology → delivery wrap-up → forging) with dynamic checklist logic.
- [x] Update `src/mcp/templates/commands.ts` onboarding guidance so the orchestrator mirrors the new gates and methodology recommendation instructions.
- [x] Ensure methodology recommendations surface in the live flow with visible “because you said…” reasoning before presenting the Top 6 catalog.
- [x] Ensure roster forging emits the personalized, first-person introductions described in the spec and enforces plain `df-<role>` slug naming.
- [x] Extend UAT/test harnesses to cover the phased gating (six items before methodology, ten before roster) and the personalized roster output (`scripts/uat-onboarding-flow.ts`).
- [x] Re-run `/forge-start` end-to-end after implementation to verify the experience stays conversational and satisfies all gates (captured via the new UAT harness log).
- [x] Update `selectMethodology` to accept unknown methodologies gracefully, validate the Core 6 before proceeding, and avoid heuristic pattern matching.

All onboarding milestones are now implemented end-to-end. Follow-up work: monitor live transcripts to tune example phrasing and expand the roster templates as we gather feedback.
