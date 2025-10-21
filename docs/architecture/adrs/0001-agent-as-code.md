# ADR-0001: Agent-as-Code

**Decision:** Represent droids as YAML-fronted Markdown files versioned in the repo and user's home dir for global orchestrator.

**Rationale:** Reviewable, idempotent, portable across repos; aligns with Factory CLI custom droids.

**Consequences:** Simple tooling; changes are diffable; enables dynamic synthesis and reanalysis flows.
