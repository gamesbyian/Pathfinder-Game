# PG-G: current-input D4 canonical-frame feasibility 001

> **Status:** active
> **Last evidence:** 2026-10-16 — preregistered, read-only current-input D4 frame screen; outcomes pending CI execution.
> **Decision:** evaluate a simple, solve-legal canonical orientation key before building any search policy or eight-orientation portfolio.
> **Remaining gate:** run invariant-preserving corpus census, then decide whether enough parents have a unique legal frame; independent-parent symmetry confirmation still gates production work.
> **Research question:** `WS2-SYMMETRY-TIE-ORDER-CANONICALIZATION`
> **Evidence role:** discovery
> **Selection:** all 148 currently published levels plus the current full 1,700-row Corpus 2, without inspecting any solver result for selection.
> **Population identity:** pinned input corpus contents at this branch's exact git SHA, with raw canonical mechanical fields only.
> **Inference scope:** exposure and geometric equivariance of a *restricted feature sketch*, not solver effect or symmetric-puzzle solution invariance.
> **Production effect:** none.

## Causal motivation

The PG-G research factorial restored six of six selected symmetry solve-state cliffs by altering candidate order into a parent frame. That experimental parent frame is forbidden at cold-solve time. This pilot asks whether the **current unseen puzzle itself** supplies a cheap substitute.

For each level, extract only typed mechanic positions: goal, gate(s), block(s), geese, must-pass, must-cross, false-goal, landmarks, filter/flipper positions and portal endpoints. Deliberately omit non-geometric details, including filter axes, chirality, portal pair identity, designer metadata, hints, IDs and prior outcomes. Under each of the eight D4 coordinate transforms, serialize these features into a sorted type-aware sequence and choose its lexicographically smallest form.

A **unique minimizing orientation** gives a canonical frame independently of the parent. A nonunique minimum is an **abstention**, not a reason to make an arbitrary choice and then claim equivariance. Sketched mechanics that are omitted can increase abstentions by collapsing distinct orientations, but cannot invalidate D4 covariance of a truly unique minimum. The implementation compares minimum signature and tie multiplicity under all eight physical rotations/reflections, using `modules/domain/geometry.ts` as the math owner.

## Frozen stop criteria

The next behavior-changing consumer is worthwhile to prototype only if:

1. all reciprocal invariance checks pass, with zero failures;
2. a unique frame exists on at least **50%** of ordinary published levels and **50%** of Corpus-2 levels, measured before any solver treatment outcome; and
3. the unique-frame algorithm is solve-local/current-input only and its setup cost remains small next to one normal attempt.

A positive geometry screen does not override the independent-parent confirmation gate for PG-G. The next step would set an **opt-in research-only candidate-order tie key**, compute the frame once per level, and A/B at matched canonical work against the normal cold solver. It must count unique wins and losses, not merely reduce symmetry divergence. No persisted per-level orientation or family identity is permitted.

If exposure is low, test a richer *current-input* signature (axis/chirality/portal-pair information) as a distinct, explicitly registered extension, or close the anchor-only form without discarding the ordering mechanism itself.

Artifact: `scripts/stress/pg-g-cold-d4-frame-feasibility.mjs` writes machine summaries under `tmp/pg-g-cold-d4-frame/`; the test runs in the maintained Node contract suite. No additional GHA research workflow is created.
