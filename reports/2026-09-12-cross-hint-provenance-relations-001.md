# Cross-hint provenance relations 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-12 — all-corpus schema-v3 evidence report after bounded per-technique examples were added; 44,305 exact same-event/multiple-path identities classified by origin, facet, technique and producer.
> **Decision:** exact collisions are explained by producer multiplicity/replay semantics plus one historical provenance-under-resolution class already repaired by source-cell capture. No hidden-determinism replay or provenance-distance stage is earned.
> **Remaining gate:** none for exact collisions. Reopen only if a future producer with one-output semantics yields a same-event/multiple-path collision after current provenance fields are present.

## Question

`provenanceEventIdentity()` is the canonical persistence identity for one stored discovery event. The September 11 audit checked semantic duplicates inside one hint; this audit asked whether one canonical event identity is attached to multiple distinct accepted paths on the same level.

## Result

The all-corpus audit found **44,305** collision identities.

- **42,755** are `variant-parent-replay`: one source discovery is intentionally attributed to multiple parent-valid paths. These are dependent replay evidence, not independent discoveries.
- **1,550** are `pathfinder-solver` origin. Most belong to explicitly multi-output/hint-guided producers such as `prefix-anchored`, `ablation-full`, candidate-grid enumeration, family enumeration and targeted enumeration.
- The apparently more suspicious ordinary-search tail is exactly the **160 `isolated-technique` collisions**: 95 admissible-order, 50 beam, 10 repair and 5 DFS. This matches the already-diagnosed historical technique-census provenance gap. Before exact `context.techniqueCensusCell` capture, distinct census cells could persist indistinguishable event identities. Current provenance now preserves the cell identity, so this is historical under-resolution rather than evidence of current nondeterminism.

Repeated examples from that tail recur as the same small path sets across multiple solver revisions, further contradicting a flaky-run interpretation. No affected case earns deterministic replay.

## Tooling finding

Adding per-technique examples initially made the report itself fail with `RangeError: Invalid string length`: a single one-to-many event can span very many full paths, so retaining every path in diagnostic examples made the audit artifact unbounded. `hint-provenance-relations.mjs` now retains only bounded path previews plus exact path counts. The diagnostic remains adjudicable without allowing replay-heavy provenance to explode report size.

## Interpretation

The audit confirms the standing evidence rule:

> multiple paths carrying one canonical event identity are dependent evidence unless the producer contract establishes independent discovery semantics.

It also validates the current source-cell provenance repair as the right response to the one genuine identity-granularity gap found here. No broader schema redesign is indicated.

## Second-stage disposition

Near-collision/provenance-distance versus solution-distance analysis remains interesting but is **not automatically next**. Exact collisions did not reveal a live determinism problem, and any later near-collision question must first join against existing family/basin, seed-sensitivity, solver-version-drift and structural-response evidence. That work needs a new concrete question, not continuation by inertia.
