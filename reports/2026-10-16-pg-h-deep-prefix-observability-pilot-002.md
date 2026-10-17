# PG-H: deeper-prefix exact-observability pilot 002

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — [GHA run 39005597866](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39005597866) completed 8/8 deep-prefix exact reference shards, 35/35 CP-SAT DEAD, 0 LIVE, 0 UNKNOWN; strict reconciliation classifies all 16 selected branching states as semantically DEAD.
> **Decision:** Deepest-eligible post-hard-prune branching states are exact-reference tractable under a 20-second per-child ceiling, but **none of the 16 selected states is semantically forced**. The result exposes a late-search all-dead-branch phenomenon that may justify a cheap current-state sound prune. It cannot establish population prevalence or solver economics.
> **Remaining gate:** replay those 16 dead states to identify **why** they are impossible using cheap current-state constraints; stratify next capture by remaining counted moves and objective slack rather than extreme raw depth, then require witness-soundness and matched-work cold A/B before any consumer.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** same eight outcome-blind parents as 001, but depth-based selection was introduced after observing 38/45 UNKNOWN shallow reference outcomes; development evidence, not untouched confirmation.
> **Population identity:** same eight hash-frozen Corpus-2 parents R00242, R02941, R03030, R02405, R01229, R02307, R02561, R02240; source commit 09221f14279f66209ebaf853e9233fb99cbe7985 and GHA 39005597866
> **Inference scope:** the 16 selected deep states at depth 53–105 and 35 child cases only; all are from already heavily studied Corpus 2 and condition on extreme depth.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-16","decision":"A deliberately extreme-depth sample of 16 eligible multi-child beam states yielded 35/35 CP-SAT DEAD results and 0 UNKNOWN within 20 seconds per query, revealing all-dead late branches, not new forced branches or cold solves.","remainingGate":"Cheap sound current-state dead-branch discriminator on 16 cases; outcome-blind mid-depth / counted-length-stratified opportunity census and matched-work cold validation.","joins":{"researchQuestion":"WS2-SEMANTIC-FORCEDNESS","premiseRefs":["P170","P198","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"same eight hash-frozen Corpus-2 parents R00242, R02941, R03030, R02405, R01229, R02307, R02561, R02240; source commit 09221f14279f66209ebaf853e9233fb99cbe7985 and GHA 39005597866","selection":"eight frozen parent IDs; deepest two 2–4-child groups per gate after prior pilot revealed shallow timeouts","inferenceScope":"depth-selected development proof of all-dead opportunity only"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-h-deep-reference-cases-20261016-001.json","scripts/stress/semantic-forcedness-capture.mjs"],"successors":{"questions":["WS2-SEMANTIC-FORCEDNESS"],"artifacts":[]},"prospective":{"expectation":"Deeper prefixes may improve bounded reference-model information throughput.","surprise":"All 35 children exact DEAD, yielding 16 fully dead groups and no forced groups.","anomaly":null}} -->


## Completed result and inference limits

The read-only [depth capture run 38980229147](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38980229147) saw **16 eligible groups** across the same eight independent parent levels, picking the deepest two per gate under the existing 500k-work, width-500 observer. It froze **35 child reference cases**, with raw prefix depths **53–105** (mean **74.5**). No solution, hint, family identity or CP-SAT label entered the selection rule.

The follow-on [35-case exact run 39005597866](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39005597866) reproduced the same depth/case-count freeze and completed **8/8 shards**. The strict reconciler reported **0 LIVE / 35 DEAD / 0 UNKNOWN**, **16/16 fully resolved semantically dead states**, **0 semantically forced**, **0 genuinely branching**, **0 input/correctness alarms**.

| Opportunity | First-eligible shallow pilot | Deepest-eligible pilot |
|---|---:|---:|
| Independent parents | 8 | 8 (same parents) |
| Multi-child groups | 16 | 16 |
| Exact child queries | 45 | 35 |
| LIVE | 3 | 0 |
| DEAD | 4 | **35** |
| UNKNOWN | 38 | **0** |
| Fully resolved groups | 2 (both forced, one parent) | **16 (all dead)** |
| Sampled raw prefix depth | 0–1 | **53–105** |

This is **not an unbiased answer-rate comparison**, since the group-selection rule changed deliberately in response to the first result and extreme-depth sampling likely enriches late-stage dead branches. Raw path depth includes portal hops; it must not be naively subtracted from `reqLen` to estimate residual counted moves. The all-dead result proves a narrow **late hard-prune deficiency** on these states, but does not indicate how much search work the states cost after selection, nor whether an affordable sound recognizer exists.

Complete **case IDs and exact classifications** are committed in [`reports/stress/pg-h-deep-reference-cases-20261016-001.json`](stress/pg-h-deep-reference-cases-20261016-001.json); full prefixes, CP-SAT records and reconciliation are also in the completed Actions artifacts. The two temporary evidence workflows used for this bounded campaign are deliberately removed from the final PR, leaving the tested `--selection=deepest` observer and regression coverage as reusable infrastructure.

### Next preflight: cheap late-state deadness, then stratified depth

1. Replay the 16 frozen parent paths with the ordinary mutable search state. Collect *solve-local* remaining counted steps (subtract actual portal jumps), intersection budget, pending must-pass, must-cross, must-turn and adjacent-turn obligations, and fresh/used transition capacity.
2. Search for a **sound monotone impossibility certificate** or conservative cheap lower bound that rejects a subset of the 16 without consulting exact labels online. Require zero false prunes on extensive stored referee-valid witnesses before any production candidate. Compare with ordinary pruning to ensure genuinely nonredundant rejection.
3. Estimate the time/work opportunity at the actual beam seam, including the recognizer's all-candidate cost, then run a matched-work level-blind A/B. A positive reference label alone is not a consumer.
4. The next CP-SAT measurement should select outcome-blind **intermediate residual-counted-length strata**, preserving independent-parent and paired-budget accounting, to distinguish a useful consequence from the trivial near-exhaustion envelope. Do not simply buy more extreme-depth 20-second queries.

## Why this is worth a cheap diagnostic

The first pilot selected the **first two** post-prune multi-successor parents on each of the eight levels. All 16 lay at depth 0 or 1. That yielded two strong hidden-forcedness existence witnesses (R00242), but 38/45 CP-SAT child queries abstained. Buying 320 more similarly shallow exact queries would be poor evidence economics.

The existing capture observes *every eligible multi-successor parent state* along its bounded real beam search and knows each group's prefix depth before any exact reference label. Add an explicit `--selection=deepest` option that selects the two deepest eligible groups per gate; ties retain source generation order. The default `first` behavior is unchanged and tested.

No solver search ordering, budget, level selection, hint access or production policy changes. This intervention shifts only **which already-observed states become reference questions**. It is deliberately a development-only measurement-design adaptation informed by the initial 84% UNKNOWN result.

## Frozen pilot

- Independent parents: `R00242,R02941,R03030,R02405,R01229,R02307,R02561,R02240`, identical to PG-H 001.
- Same `objectiveFirst` beam width 500, 500,000 canonical work per gate, 600,000 ms wall safety, 2–4 hard-prune surviving successors and two selected groups per gate.
- One new dimension: `--selection=deepest`, ordered by descending prefix depth and earliest observed tie.
- First run is **capture only**, with max 320 child cases. Record each selected depth, observed eligible group count, work and exact prefix IDs. No exact oracle yet.
- If the selected depth distribution remains at 0–1 or produces few informative cases, stop; don't increase exact compute.
- If prefixes are materially deeper, run a small **matched 20-second-per-child CP-SAT query** on the frozen new cases and score its resolution/coverage against the original 7/45 answered child cases, without treating between-depth groups as exchangeable.
- Any discovered LIVE or DEAD fact is offline/reference evidence only; production cold-solving needs a cheap current-input inference and matched-work A/B.

Temporary capture and exact-reference workflows were run only on the research branch and retired before integration. The pilot creates no persistent hint or corpus mutations.
