# PG-L independently source-frozen 24-parent complete-flood replay confirmation (2026-10-19)

> **Status:** concluded-negative
> **Last evidence:** 2026-10-19 — complete [source-exact 24-parent run 39311125025](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39311125025), artifact 12215179479, [retained machine result](stress/pg-l-flood-replay-independent-24-250k-result-20261019-001.json)
> **Decision:** The prospectively source-frozen 24-parent strict-250k replay A/B is concluded negative for new solves: 24/24 exact neutral source parity, 3,203 actual chronological replay hits across 6/24 parents and 38,436 charges displaced, but 0/24 baseline and 0/24 saving solves, 0 treatment gains/losses; do not promote the tested full-path cache as a solve-rate strategy.
> **Remaining gate:** Close this full-state serialized flood replay consumer at 250k. Only reopen on a distinct current-input mechanism with demonstrated cold outcome or meaningful wall/CPU win after lookup, memory and stage costs, plus independent source-only holdout; do not repeat broad unchanged cache campaigns.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** confirmatory
> **Selection:** exact order of 24 source records from the precommitted affine permutation and source-only manifest, selected before replay outcomes, excluding prior PG-L parents
> **Population identity:** source-frozen 24 Corpus2 independent parents, SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb, manifest pg-l-flood-replay-independent-24-source-freeze-20261019-001.json
> **Selection history:** The affine source-index ordering was committed before the development-source replay verdict was inspected, and the ID-bearing source-only workflow did not run any solver, consult historical hints/winner statuses, or select by target-beam participation.
> **Inference scope:** independent parent-level matched-total-250k solve changes, work displacement, neutral semantic parity and cost; not 50M solves
> **Production effect:** none (explicit experiment-only replay option)

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-19","decision":"The prospectively source-frozen 24-parent strict-250k replay A/B is concluded negative for new solves: 24/24 exact neutral source parity, 3,203 actual chronological replay hits across 6/24 parents and 38,436 charges displaced, but 0/24 baseline and 0/24 saving solves, 0 treatment gains/losses; do not promote the tested full-path cache as a solve-rate strategy.","remainingGate":"Close this full-state serialized flood replay consumer at 250k. Only reopen on a distinct current-input mechanism with demonstrated cold outcome or meaningful wall/CPU win after lookup, memory and stage costs, plus independent source-only holdout; do not repeat broad unchanged cache campaigns.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"confirmatory","scope":{"populationIdentity":"source-frozen 24 Corpus2 independent parents, SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb, manifest pg-l-flood-replay-independent-24-source-freeze-20261019-001.json","selection":"exact order of 24 source records from the precommitted affine permutation and source-only manifest, selected before replay outcomes, excluding prior PG-L parents","inferenceScope":"independent parent-level matched-total-250k solve changes, work displacement, neutral semantic parity and cost; not 50M solves"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-l-flood-replay-independent-24-source-freeze-20261019-001.json","scripts/stress/pg-l-flood-replay-independent-24.mjs","reports/stress/pg-l-flood-replay-independent-24-250k-result-20261019-001.json"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP"],"artifacts":[]},"prospective":{"expectation":"Eligible overlapping parents will free some of 250k canonical work; any improvement must create independently referee-valid new solves, not only work meter reductions","surprise":null,"anomaly":null}} -->

## Executed independent source-frozen verdict: zero cold-solve gain

The completed [run 39311125025](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39311125025) used the **unaltered** 24 source IDs from the previously committed independent manifest, with no hints or outcome-conditioned substitutions. The execution's source SHA was `edb8c2ebac894d3679afc27723c6d29353942da2`. Complete artifact **12215179479**, independently verified ZIP SHA-256 `9d9ebac392a568b98af8020115025cd0e30b6330107fd6af93ef957dfa54d4db`, extracted `verdict.json` SHA-256 `bbf31a934fe9f35994bb1126599f731e3dd77e4fd34cbe1f04bc094c38da01d7`. Source [machine mirror](stress/pg-l-flood-replay-independent-24-250k-result-20261019-001.json) preserves each fixed independent parent, control and saving status, actual chronological hits and work displacement; original artifact retains full attempts.

| Metric under true strict-total 250k shared work | Completed result |
| --- | ---: |
| Frozen, independently source-selected parents | **24 / 24** |
| Original versus neutral full solve identical status, winner, entire attempts, work and nodes | **24 / 24** |
| Parents with actual cross-scorer same-full-state 12-unit flood reuse | **6 / 24** |
| Later exact charged connectivity calls genuinely bypassed | **3,203** |
| **Native canonical work displaced** | **38,436** |
| Product control referee-valid solves | **0 / 24** |
| Cache-saving treatment referee-valid solves | **0 / 24** |
| Treatment-added or treatment-lost solves | **0 / 0** |
| Cache storage censoring / invalid solution alarms | **0 / 0** |

The six participating source parents were **R02362** (757 hits, 9,084 work displaced), **R02773** (384, 4,608), **R03184** (329, 3,948), **R02443** (644, 7,728), **R02717** (699, 8,388), and **R03265** (390, 4,680). Eighteen prospectively selected parents had **no** cross-scorer replay hits, and remain fully included in the independent denominator. Neither selection nor reported denominator was conditioned on a positive cache opportunity.

The *neutral-charge* replay reproducing every original exact source attempt across 24 parents is stronger evidence of **scoped deterministic semantic parity** than the two source-selected development cases. The *work-saving* replay indeed eliminated repeated canonical flood charges, but the strict-total 250k scheduler consumed the recovered budget without obtaining any new complete referee-valid solution. There is no evidence from this experiment that this particular serialized whole-path cache improves the **cold solve rate** near typical budgets.

The present cache pays lookup/serialization and Map/array overhead outside the canonical work metric. It might be **slower** in CPU time despite reporting avoided native charges, and neither the current pair nor the independent run measures a positive net wall-speed improvement. Therefore do not promote it as a production default or reinterpret 38,436 gross charges across 24 levels as confirmed time saved.

**Disposition:** the tested exact full-state cross-scorer connectivity replay is sound-looking and operationally qualified only in its offline, default-OFF form, but **closed as a 250k cold-solve-rate treatment** on this 24-parent preselected challenge. A genuinely different cheap key/fact or an independently established runtime advantage could earn a new narrowly precommitted experiment; simply increasing the same population or repeating fixed-method budgets cannot.

One-shot execution workflow removed after artifact capture, with retained source script and source-only selection manifest. PG-L queue must reflect a negative independent consumer despite the earlier observational positive.
 
---

## Frozen population and provenance

Exact [24-source holdout manifest](stress/pg-l-flood-replay-independent-24-source-freeze-20261019-001.json), independently verified source artifact **12215581975**, ZIP SHA256 `25926186d19b651f5cb0d9d87a0758fc610e8a9b7e062d951b9d915d7b632f9c`, JSON member SHA256 `8471fe4bf0517bae0995e4218d49d5243a4375f4ffbc2e3e4a7c10426c77d3d0`, GHA source commit `a89a5a8b0c989298a23b2bc0b47af143f4f48c24`.

Selector, committed before treatment result inspection: 1,700 Corpus-2 records, index cycle `(281+137*j) mod 1700` for increasing `j`, skip the 24 already selected source-only PG-L prior parents and original eight PG-L parents, then take the first 24 remaining records. **Parent**, not technique action or shared prefix, is the independent observation unit. No post hoc addition or replacement for lack of width5000 co-dispatch is permitted.

## Strict evaluation

[Dedicated 24-parent runner](../scripts/stress/pg-l-flood-replay-independent-24.mjs) checks source manifest SHA, index and ID before computing any solve, then runs one unmodified production `solveLevel`, one full-flood **neutral-charge** replay and one **saving** replay per parent, all with `strictTotalWorkBudget=true, baseWorkBudget=250000, nodeBudget=250000, timeBudgetMs=600000`, and with **no hints**. Even if a selected parent never executes both target width5000 scorers or never has a cache hit, it still counts in the fixed **24** parent denominator. Do not replace it with a convenient case.

Require **exact neutral identity** across every status, winner path, work amount, node count and full attempt sequence, plus strict cache no-censor and saving-path referee validity. A failure is a real correctness/experimental alarm, not grounds for silently discarding a source parent. Compare 24 parent-level baseline versus treatment outcomes at identical total budgets: genuine treatment-added successes, losses, opportunities where both profiles execute, and saved canonical work. Do not interpret repeats or 72 arm runs as 72 independent levels.

A gain at source size 24 earns a separate nonoverlapping confirmation and CPU cost measurement before any production default change. Zero or only descriptive work savings closes this full-path/cache-key implementation as a solve-rate treatment at 250k, even if it is mathematically legitimate. No broad 50M solve factory is called merely to rescue a small negative, and no source winner is consumed by a cold technique.

One-shot Actions workflow must be retired after exact run-artifact and report retention; the source-only population selector and raw source-hash evidence remain durable.
