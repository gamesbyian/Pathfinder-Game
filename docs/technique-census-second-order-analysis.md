# Technique census: second-order analysis

> **Status:** research proposals from existing census evidence; not production policy.
> **Source:** `reports/stress/technique-census/32240161854/` after 2026-08-22 re-derivation: 78,505 unique cells; 253/888 frozen-baseline unsolved levels have a T1 isolated solver.
> **Goal:** extract solver behavior, routing, redundancy, and speed opportunities beyond already-mined cheap routing gaps.

## Highest-value questions

1. **Explain the 14 reverse-oracle gaps.** Production solves 14 levels that no T1 isolated technique solves at 50M nodes. T3's 10 tested A→B pairs found zero pair-only solves. Reproduce these 14 under current provenance/telemetry and identify the mechanism: state carryover, restart/randomness effects, dynamic config generation, budget structure, or evidence error. Any real ladder-only capability may generalize.
2. **Model conditional technique value.** For each ordered pair, estimate `P(B solves | A failed)` and incremental solves per expected B cost. Extend to failure signatures (exhausted vs node-cap, cheap vs deep failure). Use this to test adaptive ordering based on observed search outcomes, not only static level features.
3. **Use flag flips as controlled pathology experiments.** Compare levels gained/lost by one-mechanism ablations, especially dedup-near-tie retention. Seek predictors and early-search differences (score entropy, tie multiplicity, duplicate pressure, beam churn, winning-lineage survival) that support state-conditioned behavior rather than a global flag.

## Analyses requiring only existing census data

- **Technique phenotypes:** cluster techniques by level-success vectors (Jaccard/mutual information), ignoring implementation labels. Identify behavioral duplicates and genuinely distinct methods.
- **Level phenotypes:** cluster levels by technique-success vectors, then inspect structural/mechanic features of each cluster. This may expose latent routing classes absent from hand-built archetypes.
- **Multiplicity / fragility:** count T1 solvers per level. Singleton/doubleton solves mark sharp capability boundaries and good regression fixtures; test whether low multiplicity predicts high production cost or instability.
- **Capability margin:** per level record cheapest, second-cheapest, and median winning node counts plus their gaps. Distinguish narrow-key routing problems from broadly solvable but expensive levels.
- **Minimum-cost cover:** find small technique subsets that retain most oracle-union coverage, weighted by node/time cost. Compare covers for production-solved vs production-unsolved populations.
- **Substitutability:** for each production attempt, measure how often a cheaper technique solves the same levels. High overlap plus higher cost nominates delay/removal/conditional skip.
- **Conditional redundancy:** measure marginal solve rate after actual or candidate predecessors fail. Raw standalone solve rate is insufficient for ladder ordering.
- **Perfect-router curve:** at 100K/250K/500K/1M/2M/5M/10M/... nodes, compute how many levels an oracle choosing one technique would solve. This bounds the remaining value of routing alone.
- **Routing regret:** compare cheapest isolated winning cost with production work spent before success/failure. Rank large-regret levels as policy defects.
- **Failure fingerprints:** cluster no-oracle levels by per-family outcome (`exhausted`, node-cap, eligibility skip) and work consumed. Use these as pathology classes for new-technique research.
- **Symmetry/directionality:** compare CW/CCW and other theoretically symmetric techniques by level identity, then cross-reference rotated/mirrored families. Persistent non-transforming asymmetry can expose iteration/tie-breaking/order bias.
- **Parameter inversions:** mine cases where a nominally stronger setting loses to a weaker one: beam2000 > beam5000, plain > diverse, `ida:none` > informed profiles. These are clean cases for locating harmful retention/ranking effects.

## Analyses needing extra telemetry or targeted reruns

- **Solve-hazard curves:** estimate `P(solve in next N nodes | still unsolved)` by technique/family. Use censored attempt data to test adaptive caps, deep protected passes, and removal of low-yield middle budget.
- **Beam frontier economics:** map exhaustion size and width sensitivity. Predict where beam5000 adds useful frontier versus only cost.
- **Winning-lineage extinction at inversions:** replay smaller/better configurations against larger/worse siblings and locate the exact depth/state where the eventual winner is dropped.
- **Flag-flip mechanism telemetry:** instrument only the discriminating populations, not the whole corpus.

## Scheduling hypotheses to test

- Split some families into **cheap screen + protected deep pass** if solve-node distributions are bimodal.
- Order attempts by **incremental solves per expected work on the residual population**, not total solve rate.
- Let observed failures update routing when they are informative and level-blind.
- Prefer pruning/removing strongly substitutable attempts before adding more ladder entries.

## Priority order

1. Reverse-oracle 14-level mechanism.
2. Conditional success/cost matrix and candidate adaptive ordering.
3. Dedup-near-tie gained-vs-lost pathology comparison.
4. Technique/level clustering, multiplicity, minimum-cost cover, and routing regret.
5. Hazard/frontier telemetry only where the existing matrix identifies a live scheduling or retention question.

Do not turn exact census winners or level IDs into production routing. Any production change still needs current-code, level-blind, matched-work validation under `solver-research-operating-model.md`.
