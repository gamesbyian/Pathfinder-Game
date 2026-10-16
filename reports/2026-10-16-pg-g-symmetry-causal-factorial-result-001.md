# PG-G symmetry ordering × repair-seed causal factorial result (2026-10-16)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — corrected strict-work run 38864229664 on source f5eae0830a2b07e8b380584c2b6701bf4935c904 completed the frozen five-pair causal factorial at 10,000,000 canonical work per isolated technique.
> **Decision:** symmetry-dependent stable candidate ordering is causal for every selected solve-state cliff: parent-frame ordering restores the parent solve/unsolved outcome in 6/6 cliffs, with exact parent work/status in all five DFS/admissible cases. Repair seed identity alone restores 0/1 repair solve-state cliffs; ordering restores the solve, and ordering plus parent-mapped seed exactly reproduces the parent repair work on that case.
> **Remaining gate:** confirm orientation-order causality on an outcome-blind independent-parent symmetry population before designing any cold production consumer. The confirmation treatment must be computable from current level/state only; family parent-frame provenance is forbidden as production input.
> **Evidence role:** forensic / selected-pair causal attribution.
> **Selection:** five symmetry pairs selected after the PG-G discovery pilot and ordering microscope; not prevalence or confirmation evidence.
> **Population identity:** exact five cases in reports/2026-10-16-pg-g-symmetry-causal-factorial-spec-001.json; historical descendants pinned to 32132d6ba60f1203ee013ed0d475f46061eddd49.
> **Inference scope:** causal attribution for the selected symmetry cliffs under current-main search semantics and the frozen 10M isolated-technique dose; no unseen-parent rate or production-value claim.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-16","decision":"Parent-frame candidate ordering restores all six selected symmetry solve-state cliffs; repair seed alone restores none of the one repair solve-state cliff, while order plus fixed seed exactly matches parent repair work there.","remainingGate":"Confirm orientation-order causality on an outcome-blind independent-parent symmetry population before any cold production consumer.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":"exact five cases in reports/2026-10-16-pg-g-symmetry-causal-factorial-spec-001.json; historical descendants pinned to 32132d6ba60f1203ee013ed0d475f46061eddd49.","selection":"selected after PG-G response cliffs and ordering microscope","inferenceScope":"selected-pair causal attribution at the frozen 10M isolated-technique dose"},"claimRefs":[],"sourceArtifacts":["reports/2026-10-16-pg-g-symmetry-causal-factorial-spec-001.json","reports/2026-10-15-pg-g-symmetry-ordering-microscope-result-001.md"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"If fixed directional tie order is causal, mapping variant candidate order into the parent frame should collapse solve/work cliffs; fixed repair seed should distinguish any independent seed contribution.","surprise":"Ordering alone resolves every selected solve-state cliff; repair seed alone does not rescue the repair loss, although seed identity matters for exact deterministic work once ordering is aligned.","anomaly":null}} -->

## Provenance and instrument recovery

Decision-bearing run: **38864229664**.

- source SHA: `f5eae0830a2b07e8b380584c2b6701bf4935c904`
- historical family-data SHA: `32132d6ba60f1203ee013ed0d475f46061eddd49`
- raw artifact: `pg-g-symmetry-causal-factorial`, artifact **12030173429**
- standard front door: `solver-sweep-result`, artifact **12029779445**
- frozen dose: **10,000,000 canonical work** per isolated technique cell; 600,000 ms wall deadline only as a safety cap
- mapped-order canary: **393/393** prefixes checked before solver work
- maximum observed work-cap overshoot: **835** units (0.00835%), inside the preregistered 1% atomic-work guard
- referee-invalid solutions: **0**
- deadline-truncated rows: **0**

Run **38863341481** is explicitly **instrument-invalid** for the factorial. Its purpose-built runner set the historical soft `_workCap` but omitted admissible-order's required `_strictWorkCap`, allowing three admissible rows to exceed the nominal 10M dose, one to 368M work. That defect was discovered from the raw matrix before any scientific result was promoted. The corrected runner mirrors the maintained technique-census equal-work contract by setting both caps and fails closed on >1% overshoot. No row from the invalid run is mixed into the result below.

## Aggregate result

| measurement | corrected result |
|---|---:|
| frozen symmetry pairs | 5 |
| parent × technique comparison rows | 7 |
| unique parent × technique controls | 5 |
| mapped-prefix order canary | 393 |
| control solve-state cliffs | **6** |
| cliffs resolved by parent-frame ordering | **6 / 6** |
| repair solve-state cliffs resolved by fixed seed alone | **0 / 1** |
| repair solve-state cliffs resolved by ordering + fixed seed | **1 / 1** |
| pure both-solved work-cliff controls | 1 |

The decisive result is not merely that ordering sometimes helps. On every selected solve-state cliff, changing **only** candidate order into the corresponding parent frame makes the transformed sibling agree with the parent on solved/unsolved state. In every selected DFS/admissible case it also reproduces the parent's exact measured work/status.

## Per-case result

| pair / technique | parent | symmetry control | parent-frame order | fixed seed | order + fixed seed |
|---|---:|---:|---:|---:|---:|
| P00146 → sym-01 / DFS | fail @ 10.001M | solve 1.995M | **fail @ 10.001M exact** | — | — |
| P00146 → sym-01 / admissible | solve 9.179M | fail @ 10.001M | **solve 9.179M exact** | — | — |
| P00146 → sym-05 / DFS | fail @ 10.001M | solve 1.161M | **fail @ 10.001M exact** | — | — |
| P00146 → sym-05 / admissible | solve 9.179M | fail @ 10.001M | **solve 9.179M exact** | — | — |
| R02976 → sym-01 / admissible | fail @ 10.000M | solve 0.102M | **fail @ 10.000M exact** | — | — |
| R00631 → sym-02 / repair | solve 5.563M | fail @ 10.000M | **solve 0.041M** | fail @ 10.001M | **solve 5.563M exact** |
| P00144 → sym-02 / repair | solve 0.044M | solve 0.000636M | **solve 0.0328M** | solve 0.00129M | **solve 0.0601M** |

### DFS and admissible-order

The result is exact across the five selected DFS/admissible rows:

- mapped legal choices were already proven identical by the microscope;
- semantic DFS scores / admissible slacks were already proven equivariant;
- the factorial changes only tied candidate order;
- every variant then reproduces the parent's solved/unsolved state **and exact work/status**.

For these cases, fixed E/W/S/N stable tie order is sufficient to explain the symmetry cliff.

### Repair

Repair has two coordinate-sensitive dimensions, and the factorial separates them.

**R00631 → sym-02**:
- parent solves at 5,563,384 work;
- symmetry control fails at the 10M cap;
- fixed seed alone still fails;
- parent-frame ordering alone solves at 40,852 work;
- parent-frame ordering + parent-mapped seed solves at **5,563,384**, exactly the parent's work.

So ordering is causal for basin access. Seed identity is not sufficient to rescue the cliff, but once ordering is aligned it controls enough of the deterministic trajectory to recover exact parent work on this case.

**P00144 → sym-02** is the pure work-cliff control:
- parent solves at 44,384 work;
- symmetry control solves at 636 work, about **69.8× cheaper**;
- fixed seed alone solves at 1,289, still about **34.4× cheaper** than parent;
- parent-frame ordering solves at 32,817, within about **1.35×** of parent;
- combined solves at 60,103, also within about **1.35×** of parent.

Again, ordering removes most of the orientation-induced work cliff; seed normalization alone does not.

## What this establishes

### G4 — stable tied ordering is a causal search-policy dimension

The previous microscope only localized a seam. This factorial intervenes on it. For all six selected solve-state cliffs, changing tied candidate order while preserving legality, score/slack, technique, dose and puzzle semantics restores the parent's solve-state behavior.

This is strong evidence that current E/W/S/N enumeration is an arbitrary coordinate-system input to complete-search economics for DFS, no-tie admissible-order and repair.

### G5 — repair seed is secondary to ordering on the selected cases

Coordinate-derived repair seed identity is real, but it is not the primary explanation for the selected repair loss:
- seed-only: no rescue;
- order-only: rescue;
- order+seed: exact parent work.

The next confirmation should therefore center **ordering**, not spend an independent broad campaign on seed normalization. Seed can remain a nested diagnostic when repair work identity matters.

## Production boundary

The experimental parent-frame mapping is **not cold-legal production policy**. It consumes family ancestry and the known symmetry relation between a parent and generated sibling. A production consumer must derive an equivalent orientation/tie rule solely from the current unseen level/state.

The smallest plausible descendant is therefore a current-input D4-canonical tie-order rule, not an additive eight-orientation portfolio. The existing family generator already uses the canonical domain transform primitives; reuse those. Any canonicalizer must handle automorphism/tie cases explicitly rather than reintroducing arbitrary local coordinate order under another name.

No production flag or default change is earned here.

## Next gate

Use an **outcome-blind independent-parent symmetry confirmation**.

A suitable pre-existing reservoir exists in the pinned family trove: 22 symmetry-family parents outside the six-parent PG-G discovery cohort, each with seven generated siblings. Do not inspect historical solver outcomes to choose among them.

Recommended economical design:
1. freeze 12 parents by deterministic ID hash before any new outcome inspection;
2. Stage A: current-policy parent + all seven symmetry siblings for DFS, no-tie admissible-order and repair at the same 10M work dose, producing the orientation-discordance opportunity set without treatment results;
3. Stage B: apply the parent-frame order intervention only to the predeclared discordant sibling cases;
4. score the fraction whose solved/unsolved state returns to the parent control and the paired work contraction where both solve;
5. only if independent-parent confirmation is positive, design a cold-legal current-input canonical orientation/tie key and test it against production at fixed aggregate work.

That preserves independent-parent inference and avoids paying treatment compute on symmetry cases with no control-side cliff.
