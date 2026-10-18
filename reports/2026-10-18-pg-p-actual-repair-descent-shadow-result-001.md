# PG-P actual repair descent-shadow pilot 001

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — complete [green run 39106880924](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39106880924), SHA `d9dceaeb0b44c7f41e8bf96424513c9ca1a7afe5`, 12 independent puzzle parents and 742,066 canonical work units.
> **Decision:** The live repair observer recovered 166,375 decisions and 666 distinct elite paths across 12 parents. Three parents held four alternative equally-scored top elites with distinct earlier routes, but no exact fate labels or causally separable preterminal commitment mechanism; the tested observer form does not earn a new repair policy.
> **Remaining gate:** Do not rerun September WS6 post-divergence snapshots, expand this hint-assisted descent census or fit a score-only repair selector unchanged. Reopen PG-P only on a materially different independent current repair near-miss population where a typed *before-failure* dependency, a discriminating outcome, and a cheap current-state intervention can be compared.
> **Research question:** `WS6-DEPENDENCY-CONDITIONED-REPAIR`
> **Evidence role:** development
> **Selection:** retrospective hint-bearing population; fixed ID-hash order before observer outcomes; 20k repair-node dose, first historical accepted gate, top four independent-identity elites per parent
> **Population identity:** Twelve unique SHA256-sorted, historically hint-bearing Corpus-2 parents R02385, R00960, R02954, R02133, R03132, R02140, R03238, R02840, R03297, R02916, R02609 and R01998; source corpus SHA256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.
> **Inference scope:** actual unchanged repair choices and elite acquisition, not independent exact DEAD commitments, causality, a cold solve or a validated new repair operator
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"The live repair observer recovered 166,375 decisions and 666 distinct elite paths across 12 parents. Three parents held four alternative equally-scored top elites with distinct earlier routes, but no exact fate labels or causally separable preterminal commitment mechanism; the tested observer form does not earn a new repair policy.","remainingGate":"Do not rerun September WS6 post-divergence snapshots, expand this hint-assisted descent census or fit a score-only repair selector unchanged. Reopen PG-P only on a materially different independent current repair near-miss population where a typed *before-failure* dependency, a discriminating outcome, and a cheap current-state intervention can be compared.","joins":{"researchQuestion":"WS6-DEPENDENCY-CONDITIONED-REPAIR","premiseRefs":["P169"],"measurementOpportunity":null},"evidenceRole":"development","scope":{"populationIdentity":"Twelve unique SHA256-sorted, historically hint-bearing Corpus-2 parents R02385, R00960, R02954, R02133, R03132, R02140, R03238, R02840, R03297, R02916, R02609 and R01998; source corpus SHA256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb.","selection":"retrospective hint-bearing population; fixed ID-hash order before observer outcomes; 20k repair-node dose, first historical accepted gate, top four independent-identity elites per parent","inferenceScope":"actual unchanged repair choices and elite acquisition, not independent exact DEAD commitments, causality, a cold solve or a validated new repair operator"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-p-real-repair-descent-20261018-001.json","scripts/stress/pg-p-real-repair-descent-shadow.mjs"],"successors":{"questions":["WS6-DEPENDENCY-CONDITIONED-REPAIR"],"artifacts":[]},"prospective":{"expectation":"Real repair descents expose repeating early coupled commitment classes before they become a terminal near miss.","surprise":"All 12 parents produce actual elite paths and 3 show equal-badness different trajectories, but this is not a sound dependency or directionally valid repair trigger; all 48 top-elite decision histories were reconstructable. Observed and unobserved control attempts matched exactly in all 12 independent parents.","anomaly":"First run's validation guard required widening benign atomic node cap overshoot from 10 to 32 (measured maximum 11); a subsequent protocol-string edit caused a syntax-only run failure; final exact-path archival run 39106880924 passed."}} -->

## Recovered question, not a duplicate

The archived July [repair descent-shadow orphan](2026-09-13-solver-archaeology-repair-descent-shadow-orphan-016.md) remains distinct from the **already completed** September [WS6 exact-divergence snapshot](2026-09-20-ws6-dependency-interface-observer-result-001.md) and October [underpowered independent-parent replication](2026-10-01-ws6-independent-parent-replication-result-001.md). An initial branch-only replay of that original snapshot was recognized as redundant; it is **not counted as this finding** and its one-shot workflow was retired immediately.

Instead, the [new pilot script](../scripts/stress/pg-p-real-repair-descent-shadow.mjs) invokes the current, unmodified `repairSearchFromGate`, observing actual choices via `_repairChoiceResearchObserver` and retained elites via `_repairEliteResearchObserver`. It never steers a choice or calls CP-SAT. For each parent, it records real choice modes and elite acquisitions, then retrospectively compares up to four lowest-badness distinct elite paths with historical referee-accepted hints, using only path-history event tags. The full raw artifact preserves exact packed elite paths and per-decision histories.

Sampling chose twelve distinct level IDs by SHA256 from *hint-bearing* Corpus-2; first historical accepted hint also selected the gate and served as a post-hoc reference. This is selected development evidence, not an outcome-blind cold solver A/B or independent representative random corpus. The 20,000-node cap is native repair's stopping contract, with at most 11 observed atomic nodes of overshoot. The wall-clock timeout field appears on node-bound runs; it does not imply a separately measured wall-clock treatment cost.

## Frozen measured result

| Measure | Result |
|---|---:|
| Independent parent puzzles with complete observer results | **12 / 12** |
| Source-native observed repair choice events | **166,375** |
| Observed elite events / distinct elite paths | **666 / 666** |
| Parents with multiple distinct elites | **12 / 12** |
| Canonical work across the bounded attempts | **742,066** |
| Top elites with complete matched choice histories | **48 / 48** |
| Instrumented versus uninstrumented repair (work/nodes/stop/solution) | **12 / 12 exactly matched** |
| Parents with equal-badness top elites diverging before the last two moves | **3 / 12** |
| Additional equal-badness paths besides their best elite | **4** |
| Actual repair probe solved its hint-selected gate | **1** (R02840, not a newly demonstrated cold solve) |
| Newly justified hard prune, oracle, repair operator, cold solves | **0** |

Observed choice modes were 67,469 forced-singleton, 62,735 greedy and 36,171 exploratory decisions. No must-turn-override event was recorded in this run. Repair choice branching and elite construction are genuinely exercised, rather than synthetic or source-level hypothetical.

Three level IDs have same-badness but different top-elite trajectories:

- `R02385`: best two elites, badness 9, share 65 packed path nodes (about three quarters of the elite trajectory). Different histories, but a fairly **late** divergence.
- `R03132`: best two elites, badness 20, share 4 nodes out of 77-78, a genuinely early divergence.
- `R02916`: best three elites, badness 14, share 26 nodes out of 96-98. Two alternatives in one parent are correlated, **not** two independent boards.

These are explicitly **not** equivalent residual states. The badness function is a lossy repair heuristic, and neither an equally scored pair nor a differing move/turn/portal/revisit tag proves a DEAD commitment, a persistent dependency or a viable interior edit. Simple aggregate event deltas against accepted hints are also confounded by elites ending much earlier than complete solutions.

## Source, reproducibility and stop decision

Permanent parent-level [machine summary](stress/pg-p-real-repair-descent-20261018-001.json) records exact level IDs, per-parent work/nodes, elite counts, choice counts, best elite path SHA-256, mechanism flags, and full raw artifact identity. Full run artifact `12128916392` contains the 1,033,983-byte uncompressed `real-descent.json`, exact 48 elite paths and complete associated choice chronology, original JSON SHA-256 `72466b999cbdea182a63cf509b4f59db2612c0ddf4119a2122ca4544b2f48b37`, ZIP digest `e2a134e4e88bb5ed1e0cf54c475080e1b1fe731388e9acec6d6e060736be31ec`. The source script is retained to regenerate the full run when the Actions artifact expires.

No change to solver core, repair probabilities, pruning, reference labels, hint records, work allocation, or production defaults. After read-only observation this pilot **cannot nominate an exact causal interface**: few matched equal-badness contrasts, different divergence positions and no *before-failure* exact outcome or cheap dependency discriminator. Buying more CP-SAT or building an interior-edit operator on this evidence would invert the research programme's premise-before-consumer discipline.

The final source run passed, including **12/12 exact observer OFF/ON matched checks** on canonical work, expanded nodes, stopping cause and solution path; a preliminary report produced valid full data but failed a harness-only strict 10-node overshoot assertion at 11, and a later source-edit run exposed a local string syntax error. Neither is used as the decision-bearing run. The completed one-shot workflow is removed before integration, leaving the reproducible Node script, the compact evidence and this dated report. This closes the tested PG-P observer, **not** the broader possibility of a new, causally grounded repair revision if an independently selected current-search near-miss later exposes one.
