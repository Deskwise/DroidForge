--- a/README.md
+++ b/README.md
@@ -16,6 +16,7 @@
- [ ] Transform `onboarding-intelligent.ts` to follow the new phased script (core discovery → methodology discovery → delivery wrap-up → forging) with dynamic checklist logic.
- [ ] Update `commands.ts` onboarding guidance so the orchestrator AI mirrors the new gates and methodology recommendation instructions (no pattern matching).
 - [ ] Add intelligent methodology recommendation handling in the live flow (recommend one with “because you said…” reasoning before presenting Top 6).
- [ ] Ensure roster forging emits the personalized introductions described in the spec and enforces plain `df-<role>` slug naming.
- [ ] Extend tests/UAT to cover the phased gating (collect 6 items before methodology, 10 before roster) and the personalized roster output.
- [ ] Re-run `/forge-start` end-to-end after implementation to verify the experience stays conversational and satisfies all gates.
+- [ ] SelectMethodology must accept unknown methodologies gracefully and research them.

