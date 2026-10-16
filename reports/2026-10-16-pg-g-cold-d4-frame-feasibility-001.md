# PG-G: current-input D4 canonical-frame feasibility 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — one-shot [GHA run 38979227761](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38979227761) completed all D4 reciprocal invariance checks over 160 published and 1,700 Corpus-2 puzzles; 137/160 and 1,700/1,700 have unique frames.
> **Decision:** current-input mechanic-position sketch passes the preregistered >=50% unique-frame exposure gate in both populations (85.625% published; 100% Corpus 2), with zero D4 invariance alarms. Geometric frame feasibility is established, not cold-solve benefit.
> **Remaining gate:** price canonical-key setup overhead and confirm PG-G causal effect across outcome-blind independent symmetry parents; a cold-legal candidate-order research hook and matched-work production A/B remain separate.
> **Research question:** `WS2-SYMMETRY-TIE-ORDER-CANONICALIZATION`
> **Evidence role:** discovery
> **Selection:** full current 160-level published corpus and full 1,700-level Corpus 2, chosen without inspecting solver outcomes.
> **Population identity:** run 38979227761 source commit 54717c2f0fe13e5052c477bfcc553b43eaecb719, with full current data/levels.json and data/stress/stress-levels-random.json.
> **Inference scope:** exposure and geometric equivariance of a *restricted feature sketch* on these two development corpora, not solver benefit, transfer or symmetric-puzzle solution invariance.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-16","decision":"Unique current-input D4 mechanic-position frames exist on 137/160 published and 1700/1700 Corpus-2 levels with no invariance errors; independent-parent causal confirmation and matched-work production benefit remain untested.","remainingGate":"Price canonical-frame setup overhead and confirm independent-parent PG-G ordering mechanism before production A/B.","joins":{"researchQuestion":"WS2-SYMMETRY-TIE-ORDER-CANONICALIZATION","premiseRefs":["P015","P144","P145","P165","P183","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"run 38979227761 source commit 54717c2f0fe13e5052c477bfcc553b43eaecb719, with full current data/levels.json and data/stress/stress-levels-random.json.","selection":"full published and Corpus-2 populations, result-independent","inferenceScope":"current-input feature-sketch geometric exposure and covariance only"},"claimRefs":[],"sourceArtifacts":["scripts/stress/pg-g-cold-d4-frame-feasibility.mjs"],"successors":{"questions":["WS2-SYMMETRY-TIE-ORDER-CANONICALIZATION"],"artifacts":[]},"prospective":{"expectation":"A cheap mechanical signature should produce a unique legal canonical frame on a substantial fraction of current levels.","surprise":"All 1700 Corpus-2 levels have unique sketch frames; 23 of 160 published are ambiguous.","anomaly":null}} -->

## Measured result

Frozen branch-push run [38979227761](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38979227761), source `54717c2f0fe13e5052c477bfcc553b43eaecb719`, ran the normal bundled, current-input-only geometry detector across every row in both current corpora, checking the lexicographically minimal feature sketch under **all eight D4 transformations of every level**.

| Population | Tested | Unique frames | Ambiguous | Unique-frame exposure |
|---|---:|---:|---:|---:|
| Published `data/levels.json` | 160 | 137 | 23 | **85.625%** |
| Corpus 2 `stress-levels-random.json` | 1,700 | 1,700 | 0 | **100.000%** |

Published ambiguity: 21 cases have two equivalent minimizers; two have four. No non-square/unsupported rows. **Zero D4 reciprocal-invariance failures**, across both corpora. Both populations independently clear the preregistered 50% unique-minimizer opportunity threshold.

Important distinctions: 1,700/1,700 is not a solve rate, speedup, or symmetry-generalization claim. It simply establishes that a uniquely chosen orientation can be derived from the current puzzle without violating level blindness on these mechanic-position sketches. The 23 ambiguous published puzzles must explicitly abstain or receive a separately verified equivariant tie rule. The feature sketch ignores axes, chirality and portal pair identity; that loses discriminative power (sometimes increasing ties) but does not inject parent knowledge.

This read-only script is now a maintained Node-contract test. The temporary GHA readout workflow is removed from the final PR; artifact evidence remains attached to the completed run. We do not know whether cold canonical tie-ordering increases solves, nor the actual setup-wall overhead: those are the next gates.

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

Artifact: `scripts/stress/pg-g-cold-d4-frame-feasibility.mjs` writes machine summaries under `tmp/pg-g-cold-d4-frame/`; the test runs in the maintained Node contract suite. A one-shot evidence workflow captured an independent visible readout, then was removed from the final source branch.
