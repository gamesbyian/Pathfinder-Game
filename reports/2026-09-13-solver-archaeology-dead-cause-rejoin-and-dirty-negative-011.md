# Solver archaeology: dead-cause rejoin and dirty-negative correction

> **Status:** concluded-positive archaeology / current-gate correction
> **Last evidence:** 2026-09-13 — July CP-SAT correction chain and August connectivity-rejection Stage B re-read against current WS2 Class-5 acquisition gate
> **Decision:** rejoin the existing August within-solve connectivity-failure population before any new compact-dead-cause recurrence census. Preserve the July CP-SAT conflict-learning dismissal as a dirty negative caused by a broken reference formulation, not as evidence against reason-producing search. Do not broaden this into CDCL/LCG implementation work.
> **Remaining gate:** determine whether the recurring within-solve boundary/reached-set shapes can be reduced to a small **sound cause** that is cheaper to match than a fresh connectivity check and accounts for material repeated work. If not, close this descendant.
> **Evidence role:** archaeology / current-question reconciliation
> **Selection:** historical seams nominated by the uploaded nogood/conflict-learning reports, then traced through retained repository evidence and current authority.

## Why this pass matters

The current Class-5 WS2 acquisition question asks whether exact/reliable dead detections reduce to a recurring compact sound cause with enough repeated-work cost to justify solve-local reason reuse. The September backlog excavation describes recurrence discovery as the first unresolved step.

Retained August evidence shows that one important recurrence population was already measured. The old work was rejected because its original goal required **cross-level** transfer. The current question is deliberately **solve-local**. Therefore the old negative must be re-read against the changed success criterion rather than treated as absent history.

## 1. July conflict-learning dismissal was a formulation failure, not a premise failure

On 2026-07-30, `reports/2026-07-30-solvability-plateau-diagnosis.md` argued that porting CP-SAT-style conflict learning/global propagation looked unattractive because the full CP-SAT model timed out on the same difficult levels as Pathfinder.

That inference was retracted the next day. `cpsat-full-probe.py` had encoded the edge-axis rule incorrectly: it constrained axis use on entry but not on departure, admitting bounce-heavy paths the referee rejects. Once the model was corrected, the three comparison levels cited by the negative solved in roughly **24.5s / 29.3s / 40.5s** rather than timing out at 240s. The report now explicitly says the argument against conflict learning lost its basis.

Classification:

- **not** a clean negative for conflict learning, backjumping, or reason-producing propagation;
- **yes** a clean warning that reference-model search performance is meaningless until the model can emit referee-valid candidates, not merely accept pinned witnesses;
- **not** positive evidence that Pathfinder should build CDCL/LCG. The corrected CP-SAT result only removes the historical dismissal.

This distinction matters because broad CDCL/LCG remains uneconomical and outside the current gate; the surviving question is the much smaller one about recurring sound causes.

## 2. August Stage B already found strong solve-local structural recurrence

The August learned-failure certificate programme first instrumented existing connectivity rejections, then added a read-only structural boundary sketch over the flood fill that had already run.

For the dominant `goal`-unreachable / no-pending-obligation cluster on an 80-level Corpus-2 sample:

| identity | distinct groups | records sharing a group | share |
|---|---:|---:|---:|
| exact-state fingerprint | 7,934 | 6,793 | **52.6%** |
| reached-set fingerprint | 3,661 | 10,726 | **83.1%** |
| normalized boundary-blocker set | 3,885 | 10,614 | **82.2%** |

The old programme stopped because only **1.9%** of reached-set shapes spanned more than one level and only **8.8%** of records belonged to a cross-level-spanning shape. Under its own cross-level learned-certificate success criterion, that was correctly negative.

But the same report explicitly records the opposite within each solve: roughly **91.2% of recurring records' recurrence benefit is level-local**, with the same solve revisiting the same local dead boundary shape from different exact states. It surfaced a per-solve boundary-shape memo as a separate, unscoped descendant.

That is directly relevant to the current WS2 question, whose desired scope is solve-local rather than cross-level.

## 3. What the August evidence does and does not establish

It **does establish**:

- a large existing population of repeated structural connectivity failures;
- recurrence materially above literal exact-state recurrence in that population;
- a read-only observer path whose sketching cost was small in the historical smoke measurement;
- the reason the old line stopped was transfer scope, not absence of local repetition.

It **does not establish**:

- that equal reached-set/boundary shapes imply equal future deadness;
- a sound projected reason key;
- that matching a projected reason is cheaper than the normal `isConnected` schedule;
- how much canonical work is wasted beneath repeated instances;
- whether a reason could fire materially earlier than the throttled connectivity check;
- that the same recurrence survives on the current Class-5 residual population.

A reached-set fingerprint is therefore evidence of a recurring **failure shape**, not itself a nogood.

## 4. Corrected current gate

Do not begin `WS2-COMPACT-DEAD-CAUSE-RECURRENCE` with a fresh generic recurrence census.

First rejoin the August artifact/tooling to the current Class-5 population and answer, in order:

1. **Population survival:** does the strong within-solve reached/boundary recurrence still appear on current expensive Class-5 misses under current canonical work accounting?
2. **Cause reduction:** for repeated shapes, which blocker/resource facts are actually sufficient for the dead conclusion? Keep the key explicitly sound; do not infer soundness from fingerprint equality.
3. **Economic value:** how much repeated `isConnected` work or downstream exploration could a sound match avoid, and is matching materially cheaper?
4. **Shadow safety:** if a compact cause survives, shadow-match it without pruning and search for live/referee/exact counterexamples.
5. **Treatment only if earned:** only then consider a bounded solve-local reason reuse experiment.

A null at any early stage closes this descendant cheaply.

## 5. Relation to uploaded nogood / conflict-analysis research

The uploaded research correctly distinguishes exact-state caching from explanation-based learning and notes that recurrence, explanation size, backtrack shortening, and reuse rate are the key empirical signals. Pathfinder history adds an important domain-specific refinement: before discussing backjumping or clause retention, first prove that a **sound cause language** exists for a recurring native failure population.

The August connectivity population is currently the strongest known pre-existing candidate because its failures originate in a sound native rejection rather than stochastic repair failure.

## 6. Articulation/separator orphan discovered but not promoted here

The July literature cross-check ranked articulation-point / graph-separator structure as a cheap near-term idea and proposed a pre-code correlation against witness-divergence data. Archaeology found no Tarjan/articulation implementation or committed result under that vocabulary.

However, its original motivation leaned on high witness ordering discrepancy, while later controlled evidence found no general move-ordering deficit on unsolved levels. That weakens the old rationale without testing the structural premise itself.

Disposition: preserve as an orphaned **observer premise**, not as a current WS2 priority. If revisited, test separator/chokepoint structure directly against exact LIVE/DEAD or recurring connectivity-failure populations, not against generic witness rank/discrepancy. Do not build a separator prune first.

## Bottom line

Two historical verdicts change meaning when their actual failure modes and success criteria are restored:

- the July CP-SAT result was a **dirty negative** caused by an under-constrained model;
- the August connectivity-certificate line was **cross-level negative but solve-local positive evidence**.

The current Class-5 compact-dead-cause question should therefore rejoin August Stage B rather than restart at recurrence discovery, while retaining the much stricter requirement that any reusable cause be logically sound and economically worthwhile.