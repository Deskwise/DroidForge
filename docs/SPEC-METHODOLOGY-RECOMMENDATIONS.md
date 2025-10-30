# Specification: Methodology Recommendations (No Pattern Matching)

## Goal

When a user describes their project during onboarding, the AI must explain why a methodology fits instead of relying on hidden keyword rules. Recommendations are conversational, reference the user's own language, and remain visible so the user can agree, counter, or delegate.

## Updated Conversational Requirements (October 2025)

1. **Gate on the Core 6 discovery items first.** Methodology talk only starts once vision, audience, timeline, quality vs speed, team size, and experience are all recorded via `record_onboarding_data`.
2. **Show your work.** Offer three tailored recommendations with explicit “because you said…” explanations that quote the user’s wording. Follow with the Top 6 catalog so the user can compare.
3. **Stay flexible.** Accept numbers (1–6), spelled out names, or a delegation request. If the user invents a new style, acknowledge it, summarize what it means, and keep going with that text.
4. **No heuristics or hidden defaults.** The system never infers a methodology from repository keywords or vague hunches. Every selection comes directly from the user’s answer or a delegation they confirmed in the conversation.

## Implementation Snapshot

- `src/mcp/prompts/onboarding.ts` runs the phased interview, surfaces the three “because you said…” explanations, and only calls `select_methodology` after the Core 6 gate passes.
- `src/mcp/templates/commands.ts` documents the five onboarding phases for the orchestrator AI, including how to walk through methodology recommendations without pattern matching.
- `src/mcp/tools/selectMethodology.ts` validates the Core 6, normalizes user selections (numbers or catalog names), blocks delegation without an explicit choice, and stores custom text verbatim when the user invents a new approach.

## Verification

Run `npm run build` followed by:

```
./scripts/uat-onboarding-flow-check.mjs
```

The harness exercises the critical gates:
- Blocks methodology selection until the Core 6 are recorded.
- Blocks roster forging until all ten onboarding data points are saved.
- Confirms the roster can be forged once methodology and delivery fields are complete.

Keep this spec synchronized with any future adjustments to onboarding prompts, command templates, or tooling logic.
