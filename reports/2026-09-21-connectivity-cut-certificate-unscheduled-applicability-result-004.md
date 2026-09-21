# Connectivity cut-certificate unscheduled applicability result 004

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — indexed retained cut proofs applied at 49,270 candidates where production deliberately skipped connectivity, across 9/24 hard-C2 parents.
> **Decision:** earlier implication reuse is a real work-elimination opportunity, but checking every skipped candidate is not an earned consumer because the observer paid 21.7M boundary-cell validations; advance to technique/cadence-specific downstream-work economics, not a behavioral always-check prune.
> **Remaining gate:** attribute unscheduled hits to the production search family/cadence and measure work dominated after proof applicability versus proof lookup/validation cost before any live prune A/B.
> **Evidence role:** development.
> **Parent selector result:** [selector economics result 003](2026-09-21-connectivity-cut-certificate-selector-economics-result-003.md).
> **Parent audit:** [computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Execution:** GitHub Actions run `35573246425`, fast-gate job `106249263216`, head `ee1a8bdec6b2c1be7241e62dae93b6423ef3b63c`.
> **Artifact:** `connectivity-cut-unscheduled-development-004`, artifact `10627046703`, digest `sha256:71474482fd2297cf03f048ab845c577a6b83e97c04f1533f78b84fa826bbf858`.

## Question

The scheduled-call studies established:

- exact cut-proof recurrence is real;
- exact-template deduplication is useful;
- current-position membership is a strong first-stage selector;
- replacing already-scheduled connectivity fills cannot matter much at whole-solve scale.

The remaining plausible reservoir was earliness:

> **Does a previously derived cut proof already apply at candidates where production intentionally skips the ordinary connectivity flood fill?**

The 004 observer asks that question only after every earlier hard prune has passed.

It never changes the prune verdict and never runs an extra flood fill.

## Frozen population

Same development population as results 002/003:

- Corpus 2 random stress corpus;
- positions 81-104;
- 24 parents;
- strict base work budget 500,000 per level;
- 30 s wall safety per level;
- maximum 64 retained unique proof templates per solve;
- ordinary solver search/pruning unchanged.

The retained proof lookup is indexed by current packed cell. Only certificates whose certified reached component contains the candidate position are boundary-validated.

## Aggregate result

| metric | result |
|---|---:|
| completed parents | 24 / 24 |
| retained unique certificates | 168 |
| exact duplicate derivations suppressed | 504 |
| unique certificates dropped at cap | 1,618 |
| total proof derivation occurrences | 2,290 |
| repeated proof occurrences | 1,323 / 2,290 = **57.77%** |
| scheduled connectivity probes | 15,019 |
| scheduled confirmed cut hits | 911 |
| **unscheduled hard-prune candidates probed** | **587,149** |
| indexed certificate candidates at unscheduled seam | 4,426,484 |
| average indexed candidates per unscheduled probe | **7.54** |
| unscheduled boundary-cell validations | **21,744,091** |
| **unscheduled cut hits** | **49,270** |
| **unscheduled hit rate** | **8.39%** |
| cross-exact-state unscheduled hits | **49,186 / 49,270 = 99.83%** |
| parents with unscheduled hits | **9 / 24** |
| total canonical solve work | 12,218,378 |

The incidence gate is decisively positive.

A retained proof applied at roughly one in twelve of the candidates reaching this unscheduled seam.

## Parent distribution

| parent | unscheduled probes | indexed cert candidates | boundary checks | hits | cross-state hits | median proof age (work) |
|---|---:|---:|---:|---:|---:|---:|
| R00553 | 2,604 | 1,807 | 11,301 | 83 | 83 | 42 |
| R00555 | 2,794 | 1,843 | 5,557 | 141 | 132 | 1,849 |
| R00556 | 3,201 | 1,039 | 3,441 | 81 | 81 | 2,554 |
| R00593 | 2,513 | 553 | 5,685 | 20 | 20 | 893 |
| R00595 | 271,261 | 3,578,299 | 20,454,388 | 36,454 | 36,402 | 142,347 |
| R00597 | 293,576 | 835,532 | 1,184,108 | 11,717 | 11,696 | 63,828 |
| R00602 | 6,488 | 4,145 | 35,521 | 217 | 217 | 1,830 |
| R00635 | 2,393 | 2,529 | 41,426 | 426 | 426 | 745 |
| R00639 | 2,319 | 737 | 2,664 | 131 | 129 | 126 |

R00595 and R00597 contribute 48,171 / 49,270 = **97.77%** of hits.

That concentration forbids a broad prevalence claim. It does not erase the mechanism replication: seven additional independent parents contribute 1,099 hits.

## Semantic interpretation

These unscheduled hits are not empirical flood-fill disagreements.

No ordinary fill runs at this seam by design.

Applicability is instead the previously proved one-way implication:

1. current position lies inside the old certified component;
2. every cell in the old complete cardinal boundary still fails the current connectivity-entry predicate;
3. portal-free topology prevents another exit;
4. the fixed goal was outside that component;
5. therefore the goal is still unreachable.

The scheduled result's 0-false-positive differential and targeted unit tests remain implementation checks for the theorem. The 004 count is theorem-backed applicability incidence.

Do not relabel the unscheduled count as a new empirical soundness sample.

## Why this advances the audit

Results 002/003 could still have ended with:

> the theorem recurs, but only at moments when production was about to recompute connectivity anyway.

004 rules that out.

The reusable computation unit genuinely becomes available **earlier than production's expensive reasoning schedule** on multiple parents, sometimes after very long work distances from the original proof.

The two dominant parents have median source-proof ages of approximately 142k and 64k canonical work units at unscheduled hits. Proof age is not subtree savings, but it demonstrates that useful implication lifetime is not merely a one-step neighborhood artifact.

## Why an always-check consumer is not earned

The observer performed **21,744,091 boundary-cell validations** over 587,149 unscheduled probes.

That is about:

- 7.54 indexed certificate candidates per probe;
- 37.0 boundary-cell checks per probe;
- 441 boundary checks per observed hit.

Those operations are observer work and are not charged to canonical `workSpent`.

Therefore 004 cannot claim positive net economics.

In fact, it gives a strong warning against the obvious implementation:

> **do not validate retained cuts at every candidate that skips connectivity.**

The opportunity is large enough to study, but the naive high-frequency consumer may simply exchange flood-fill work for even more proof-validation work.

## Next experiment

The next measurement is **technique/cadence-specific downstream-work economics**.

First add the smallest attribution needed to answer:

- are the 49k hits principally DFS, beam, repair, or one retry tier?
- how many hits occur far from versus just before the next ordinary connectivity checkpoint?
- for the relevant technique, what downstream nodes/work are actually dominated before production would otherwise reject/cull/backtrack the branch?
- can a much lower-frequency proof check capture most of that dominated work?

Preferred order:

1. attribute unscheduled hits to search family and production schedule phase;
2. choose the single family with the largest credible reservoir;
3. add bounded lineage/subtree accounting only there;
4. compare dominated canonical work to boundary-validation cost;
5. only then preregister a behavioral matched-work A/B.

For DFS, a proved-dead prefix gives a clean semantic subtree boundary but needs production-inert entry/exit work accounting.

For beam, the existing BeamResearch lineage/disposition machinery may make attribution cheaper, but a proof hit can interact with width/cull policy. Measure before choosing.

## W2 boundary

The unscheduled observer is now explicitly opt-in.

The paired 2K/5K W2 proof-overlap tool uses the same certificate producer only to collect proof identities and must **not** inherit this heavy unscheduled instrumentation.

That keeps W1 early-applicability economics separate from W2 cross-query proof overlap.

## Disposition

- implication theorem: **survives**;
- solve-local exact proof recurrence: **positive**;
- cheap first-stage position selector: **positive**;
- scheduled-call replacement: **closed low-value**;
- earlier/unscheduled applicability: **strong positive incidence**;
- check-every-skipped-candidate consumer: **not earned / likely too expensive**;
- technique-specific dominated-work economics: **earned next gate**;
- behavioral prune A/B: **not yet earned**;
- general proof store / blackboard: **still not earned**.

This is the first successor-audit fact family to clear theorem, recurrence, cheap coarse selection, and earlier-consumer incidence. It still has to clear net saved-work economics.
