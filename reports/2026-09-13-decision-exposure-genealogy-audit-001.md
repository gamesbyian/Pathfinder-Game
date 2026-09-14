# Decision-exposure genealogy audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — decision-bearing population manifests, confirmation/transfer reports, candidate-specific selection manifests, and merged research-history PRs through #1788.
> **Decision:** no additional promoted solver treatment loses its verdict from population-exposure history. Most recent confirmation/transfer work already distinguishes development, conditional confirmation, and cross-generator challenge correctly. One historical vocabulary defect remains in the August managed-population record: two-phase phase-2 residuals are **control-outcome-conditioned**, not outcome-neutral; they remain treatment-outcome-independent and therefore valid for the conditional question they tested.
> **Remaining gate:** none before the research-resource contract. Preserve treatment-lineage exposure prospectively; reconstruct deeper row-level genealogy only when a live claim needs it.
> **Evidence role:** forensic existing-data audit; no new solver compute.
> **Scope:** populations described as confirmation, transfer/challenge, holdout-like, fresh/disjoint, or otherwise independent enough to support a solver-policy inference.

## Question

The stress-corpus population audit left one deliberate gap: raw level-ID mentions cannot tell whether a population had already influenced the treatment later tested on it. This pass reconstructs the useful version of that history from decision-bearing manifests, reports, selection records and treatment ancestry.

The question is narrower than "has anyone ever looked at this level?" A population is compromised for a decision lineage when its outcomes, or a derived classification from them, helped choose the treatment, threshold, routing rule, stop rule or acceptance rule that is then evaluated on the same population while being described as independent evidence.

Three dimensions must stay separate:

1. **population conditioning:** why rows entered the tested population;
2. **treatment-lineage exposure:** whether outcomes from those rows influenced the candidate or an ancestor;
3. **treatment-outcome leakage:** whether treatment outcomes themselves affected population membership before the decision-bearing comparison.

A control-failure residual is therefore outcome-conditioned, but it can still be legitimate conditional confirmation when the candidate/protocol are frozen before treatment outcomes exist.

## Bottom line

No second September-3-style population-role failure was found.

The principal managed confirmation populations were genuinely fresh for the candidate that first consumed them, spent populations are recorded as spent, the topology-composition challenge was generated after the candidate was frozen, and the still-reserved envelope population remains unmaterialized/unused. Later candidate-specific confirmations usually did something stronger than the old generic lifecycle: they explicitly excluded their development/tuning rows and selected informative rows using **control-side** lifecycle/reach evidence while stating that the result was conditional rather than a whole-corpus effect estimate.

The main defect is semantic bookkeeping in the older managed-population record. `confirm-residual-001/002/003` are described with `outcomeConditioned: false` and prose calling phase-1 control-failure filtering "pre-outcome-neutral." That phrasing is too flat under the current evidence model. Phase-2 membership depends directly on a solver outcome: **control failed this row**. What remains clean is that treatment outcomes did not select the residual. The valid inference is therefore conditional on control failure, exactly as the current `solver-evaluation-evidence.md` now specifies.

This correction does **not** weaken `confirm-residual-003`'s literal result or promotion evidence: on its frozen 516-row control-failure residual, treatment gained 3 solves and lost 0 with real participation. It only prevents that result from being described as an unconditional fresh-population effect.

## Population genealogy

| Population / evidence | Selection and prior exposure | Correct evidence role | Disposition |
|---|---|---|---|
| `confirm-broad-001` | Fresh 256-row random-generator cohort; candidate frozen before materialization; outcomes inspected only after verdict. | Same-generator sample-independent confirmation. | **Clean, spent.** Failed its frozen zero-loss gate. |
| `confirm-broad-002` | Fresh 256-row random-generator cohort; independent of the development rows for the selective diverse-IH treatment. | Same-generator sample-independent confirmation. | **Clean, spent.** Clean null; treatment closed. |
| `confirm-broad-003/004` | Fresh generated populations, but historical workflow wiring made both comparisons control-vs-control. | Void execution evidence; their populations became development/instrument-diagnosis material once inspected. | **Already correctly void/spent.** No efficacy inference survives. |
| `confirm-residual-001/002` | Fresh phase-1 pools; phase-2 membership selected by **control failure** before a real treatment comparison. Both historical comparisons were later found control-vs-control because of the wiring bug. | Control-outcome-conditioned diagnostic populations; treatment-outcome-independent, but efficacy runs void. | **Already void/spent.** Correct the old "outcome-neutral" vocabulary. |
| `confirm-residual-003` | Fresh 1,200-row phase-1 pool; 516-row phase-2 residual frozen from control failures; candidate already fixed; treatment outcomes unseen during selection. | **Conditional confirmation on current-control failures**, not an unconditional solve-rate sample. | **Valid.** 0/516 -> 3/516, +3/-0. Literal and conditional inference stand. |
| `confirm-transfer-topology-001` | Separate topology-composition construction family; feature-only sizing pilot used a different seed and observed structure only, never treatment outcomes. | Cross-generator challenge within topology-v0.1's mechanic/topology support. | **Clean, spent.** 997/1000 in both arms, ceiling-limited clean null; establishes no transfer gain, only no observed loss. |
| `transfer-envelope-001` | Reserved recipe only; same witness-first generator family as C2; no level materialization or solver outcome recorded. | Potential same-generator in-envelope challenge/confirmation, claim-relative when eventually consumed. | **Still LOCKED/pristine.** Not cross-generator transfer. |
| Goal-attraction fresh-work-pool confirmation 002 | Sampled from historical **control-side starvation** evidence; development A/B, confirmation-001 and tuned `R00355` explicitly excluded before the arms ran. | Conditional confirmation of value when the diagnosed starvation opportunity exists. | **Clean.** Report explicitly rejects unconditional prevalence/effect interpretation; +3/-0 promotion evidence stands. |
| Repair late-probe seven-vs-six confirmation | Sampled from historical **control-side stage reach**; 40-row discovery population excluded before the comparison. | Conditional confirmation on rows where the tier has opportunity to matter. | **Clean.** Two seed-7-exclusive losses close the unconditional 7->6 truncation; no broad prevalence inference required. |
| Restart-vs-continuation 23-row follow-up | Entire untouched remainder of one already-defined 43-row near-miss stratum; same treatment and W frozen after first 20; report explicitly calls this development-stage replication rather than promotion-grade confirmation. | Disjoint development replication inside one selected residual stratum. | **Cleanly scoped.** All 43 become development evidence for descendants. |
| Admissible-order repricing fresh 150-row population | Uniform C2 draw explicitly disjoint from the treatment line's accumulated exposure ledger before execution. | Candidate-line independent population, subject to C2's general development-distribution limits. | **Exposure discipline sound.** Later treatment interpretation is governed by its own participation/work-envelope diagnoses. |
| `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` 219-row A/B | Structural-predicate opportunity population used for the mechanism's matched-work decision, backed separately by soundness replay. It was not represented as a representative or transfer sample. | Opportunity-conditioned development/promotion evidence for the narrow sound prune. | **No exposure misclassification found.** Later mechanic-composition work explicitly remained a causal probe, not retrospective confirmation. |

## The one semantic correction

The August managed-population schema has one boolean, `outcomeConditioned`, but the research program now needs at least two questions:

- **Was population membership conditioned on a solver outcome?**
- **Was it conditioned on the treatment outcome being evaluated?**

For a two-phase residual confirmation the answers are **yes** and **no** respectively. Calling that population `outcomeConditioned: false` is therefore misleading if read literally; calling the selection "pre-outcome-neutral" is also too strong. The scientifically relevant property is that the **treatment was frozen and treatment outcomes were unavailable** when the control-failure residual was selected.

Do not rewrite old execution observations. Until the research-resource contract standardizes this distinction, read the residual entries under the current authority:

> control-outcome-conditioned, treatment-outcome-independent, conditional confirmation.

A future machine schema should represent conditioning source explicitly instead of relying on one boolean. Useful categories are at least `none`, `control-outcome`, `treatment-outcome`, `historical-solver-outcome`, `residual`, `participation/reach`, `difficulty/mechanic enrichment`, and `manual/curated`, with multiple categories allowed when necessary.

## Lineage checks that did not find a problem

### Managed broad confirmations

`confirm-broad-001` and `002` were materialized once, content-sealed, shared across arms, and spent after their verdicts. Their failures were not reused as untouched confirmation for descendants. Later populations received new identities/seeds.

The four historically miswired must-cross/flipper confirmations are already marked void rather than being allowed to masquerade as repeated negative evidence. Their inspected populations are development/instrument history only.

### Topology challenge

The topology transfer cohort was not selected using candidate outcomes. A separate 300-level pilot measured only structural eligibility to size the eventual 1,000-level cohort. The candidate had already passed same-generator confirmation. The final 997/1000 vs 997/1000 result was correctly recorded as ceiling-limited and **not** as successful transfer. No downstream promotion premise depends on pretending otherwise.

### Envelope

`transfer-envelope-001` has accumulated documentation and role reclassification but no materialized levels or solver results. Merely discussing its recipe does not spend it. It remains usable for a future candidate only under its narrowed role: same-generator in-envelope challenge/confirmation, and only if that candidate or ancestor has not consumed its outcomes first.

### Candidate-specific informative populations

The September goal-attraction and six-seed confirmations deliberately use control-side opportunity information to avoid another non-participating broad run. That is selection, but it is selection appropriate to their questions. Both reports expose the conditioning and refuse unconditional effect/prevalence interpretations. Their treatment-lineage exclusions are stronger than the older generic managed-population lifecycle.

## What the genealogy cannot prove

The repo still does not have a universal machine-readable ancestry graph connecting every experiment, population, candidate mutation and inspected outcome. This audit therefore does not claim that every C2 row has a complete exposure history.

That is not required for the present conclusion. Broad standing C2 is already classified as heavily mined development data. The expensive question is only whether evidence currently carrying a stronger role, such as confirmation or transfer, secretly belongs to the treatment's own tuning history. For the decision-bearing lines inspected here, no such undisclosed reuse was found beyond the corrected control-conditioning vocabulary.

A deeper row-level genealogy should be built only when a future claim depends on proving untouched status for a particular population. At that point, use experiment/population identities and parent/descendant decision relations, not raw ID mention counts.

## Consequences for the research-resource contract

This pass adds one requirement that the four resource audits alone did not state sharply enough:

**Selection provenance must identify the conditioning variable, not merely say that selection occurred.**

The contract should make an asset/population capable of expressing:

- selection source and rule;
- whether generation, control outcomes, treatment outcomes, residual membership, participation/reach, difficulty/mechanics, manual inspection or prior research conclusions affected membership;
- the treatment/question lineage for which the population is still unspent;
- whether the resulting inference is unconditional or explicitly conditional;
- predecessor/successor relationships when a population or result causes the next experiment.

That is the difference between "fresh rows" and genuinely fresh evidence.

## Closeout

The unfinished exposure-genealogy gate from the stress-corpus population audit is satisfied at the level justified by current decisions. No additional solver treatment needs rerunning or demoting before the research-resource contract. The remaining work is prospective schema/contract hardening, not another archaeology campaign.