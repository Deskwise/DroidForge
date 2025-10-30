# Specification: Methodology Recommendations (No Pattern Matching)

## Goal

When a user describes their project during onboarding, the AI should intelligently recommend a primary methodology and display a tailored set of 6 methodologies that fit their specific situation. The AI must use natural language understanding, NOT rigid pattern matching.

### Current Implementation Snapshot

- The onboarding script now walks through five phases: context hook, core discovery checklist, methodology recommendation, delivery wrap-up, and roster forging.
- Methodology guidance is conversational and visible to the user. Three recommendations are delivered with explicit “because you said…” reasoning before the Top 6 list.
- `select_methodology` only records the confirmed choice. It no longer performs pattern matching or auto-selection—delegation must be resolved in conversation first.
- `recommend_droids` returns first-person introductions that reference the user’s own language and the chosen methodology so the roster reveal matches the spec.
---

## ❌ What NOT To Do (Pattern Matching - FORBIDDEN)

### BAD Example 1: Keyword-Based Rules
