# D1 production-inert observation implementation bootstrap 001

> **Status:** active
> **Last evidence:** 2026-09-17 — current `main` after research-integration and canonical-work hardening through PR #1867.
> **Decision:** implement the existing `docs/solver-d1-production-inert-evidence-preflight.md` as a two-phase observer: freeze ordinary beam decisions first, then annotate the frozen trace with D1 exact queries offline. Add only the smallest shared beam telemetry required to measure immediate retained-lineage expansion work.
> **Remaining gate:** Stage-1 canary must prove parity, eligibility semantics, annotation support, decision reconstruction, and work accounting before any independent pilot.

## Implementation boundaries

- No D1 answer is visible to search.
- No ranking, cull, random, cache, budget, or policy behavior changes.
- Capture and exact annotation are separate commands/artifacts.
- Eligibility is frozen before annotation.
- The D1 independent unit remains parent level.
- Development parent `R03147` may validate schema/parity only.
- Exact-query wall time is information-production cost, never solver `workSpent`.
- Immediate next-phase expansion work is the first bounded downstream-work measure; longer-horizon lineage survival remains descriptive unless a sound shared attribution is added.
