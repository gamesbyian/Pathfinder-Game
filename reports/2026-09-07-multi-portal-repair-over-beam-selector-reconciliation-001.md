# Multi-portal repair-over-beam selector reconciliation

> **Status:** concluded-negative
> **Last evidence:** 2026-09-07 — the initial cross-asset correlation was reconciled against the earlier population A/B and current production exposure; no solver dispatch.
> **Decision:** do not nominate `routingRegime === "multi-portal"` as a repair-allocation selector. Although repair-only capability exceeds beam-only capability in the isolated census (31:6), the already-completed broad repair-gate A/B produced 0 gains / 2 losses, and 27/31 correlated rows are already production-solved. Of the four current production misses, only two lack exposure to a known winning repair configuration. The broad correlation therefore does not establish useful marginal routing opportunity.
> **Remaining gate:** none for the regime-only selector or broad repair-gate widening. Reopen only for a prespecified legal descriptor of the two-row missing-exposure residue that replicates beyond those selected rows, or materially new matched-work evidence.
> **Evidence role:** forensic reconciliation / negative discovery
> **Selection:** multi-portal was selected after inspecting aggregate regime-by-family outcomes; all cohort refinement is selected development evidence

## Question

Does the apparent repair-over-beam capability advantage on multi-portal levels justify a future fixed-work routing test?

The answer is **no, not in this regime-only form**. The first analysis stopped at capability correlation and failed to reconcile the candidate with the opt-in ledger's later, more causal production evidence. This revision closes that gap before any new compute is proposed.

## Integrity correction retained

The analysis did find a real tooling defect. The dated `level-capability.json` stores canonical pipe-delimited actions under `solvingFamilies: ["other"]` because `scripts/analyze-technique-niches.mjs` recognized only historical colon-delimited identities. Results here are recomputed from `solvingActions`; the analyzer now recognizes current and historical beam, repair, admissible-order, and DFS identities, with regression coverage. Frozen dated artifacts remain unchanged.

## Initial correlation

At Corpus-2 level grain, “only” relative to beam versus repair:

| routing regime | levels | repair only | beam only | both | neither |
|---|---:|---:|---:|---:|---:|
| multi-portal | 159 | **31** | 6 | 46 | 76 |
| must-cross-heavy | 174 | 32 | 30 | 54 | 58 |
| intersection-heavy | 1,302 | 116 | **281** | 324 | 581 |
| general | 65 | 2 | **17** | 36 | 10 |

Accumulated native provenance, restricted to solved, unguided, unforced records without `isolatedTechnique: true`, points the same direction (multi-portal 35 repair-only versus 7 beam-only). This is cross-asset agreement, not independent confirmation: provenance is exposure-selected and legacy missing markers can include isolated-like work.

Even before the causal reconciliation, these counts could only nominate a question. T1 is node-depth evidence, does not price families in `workSpent`, and measures any success across several configurations rather than the marginal value of changing production allocation.

## Reconciliation against existing causal evidence

The initial nomination overlooked `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN`, already recorded in `docs/solver-opt-in-experiment-ledger.md` and `modules/solver/ablation-config.ts`:

- its predicate explicitly added multi-portal levels (together with broader high-intersection coverage);
- it exercised the real early repair probe and fallback path;
- its 562-level population A/B was **0 gains / 2 losses**;
- both losses were in the high-intersection portion, so the result does not isolate multi-portal harm, but it provides no positive production outcome that could upgrade the correlation;
- its gate remains closed absent a materially narrower selector.

A proposed fixed-work repair/beam shift differs mechanically from that gate widening, but the isolated family correlation alone is not materially new evidence that earns another broad test. It does not identify a specific repair action, dose, displaced beam action, or presently unserved population.

## Current-production opportunity audit

The smallest relevant cohort is the 31 multi-portal rows with at least one T1 repair winner and no T1 beam winner. Joining those rows to the current comparable production sweep `33824275953` gives:

| disposition | levels |
|---|---:|
| already production-solved | **27** |
| current production miss | 4 |
| miss offered at least one known winning repair config | 2 |
| miss not offered any known winning repair config | **2** |

The two missing-exposure rows are `R03056` and `R02367`; both are isolated winners only for `repair|score=repair|guidance=must-turn-biased`, while production offered standard repair repeatedly. The other misses, `R01642` and `R03049`, were offered at least one isolated winning repair configuration and still failed, with per-attempt work depth unavailable in this production artifact.

This reduces 159 multi-portal levels → 31 repair-only correlated rows → 4 current misses → **2 known missing-exposure rows**. Exact IDs and known winners are forbidden routing inputs, and inspecting two selected rows cannot establish a generic selector. Their shared multi-portal/must-turn description is not enough: the broad multi-portal gate is already negative, and multi-portal rows with `mustTurn >= 6` still include only 9 repair-only versus 2 beam-only outcomes among 65 levels, with 47 solved by neither family in T1.

## Durable conclusion

The apparent multi-portal repair advantage is real as descriptive capability anatomy but weak as marginal product opportunity:

1. most repair-only rows are already solved by production;
2. the broad production exposure intervention already failed;
3. half of the remaining misses already received a known winning family/configuration;
4. the unexplained missing-exposure residue is only two selected levels;
5. no matched `workSpent` evidence identifies a safe tranche to shift.

Therefore close the regime-only selector and do not schedule a new broad or sharded run. The only reopen path is materially narrower **new** evidence: a legal descriptor learned without exact identity that predicts missing must-turn-biased repair exposure across independent units, followed by a fixed-work participation audit. The current two rows are too small to justify that work.
