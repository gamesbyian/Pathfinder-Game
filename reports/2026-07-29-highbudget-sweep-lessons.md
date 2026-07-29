# High-Budget Sweep: $COMPUTE Spent, What We Learned

**Timeline**: 2026-07-24 to 2026-07-25 (two rounds, 240 parallel shards, 200+ compute hours)

**Question**: Can we unlock more corpus-2 solves with massive compute budgets (300M nodes, 2.5× round 1)?

**Result**: 89 level-level improvements (605/1700 total), but only **26 completely new solves** (previously zero-hint levels). Diminishing returns confirmed. **The binding constraint is solver algorithm capability, not budget.**

---

## The Numbers

| Metric | Round 1 | Round 2 | Combined |
|---|---|---|---|
| **Compute budget per level** | 120M nodes | 300M nodes | — |
| **Levels attempted** | 1,259 unsolved | 1,184 unsolved | 2,443 |
| **New level-improvements** | 82 | 89 | 171 |
| **First-time hint discoveries** | ~ 50–60 est. | **26 confirmed** | ~76–86 |
| **Additional hints (already-solved)** | ~22–32 est. | **63 confirmed** | ~85–95 |
| **Hours compute** | ~80 | ~120 | 200+ |
| **Remaining unsolved, hit node cap** | 1,095 | 995 | — |

**Key finding**: Round 2's 2.5× larger node budget found 89 level-improvements (7.5% of attempted), down from round 1's 6.5% (82/1,259). Every single remaining-unsolved level exhausted the node cap without finding a solution.

---

## Evidence the Binding Constraint Shifted

1. **Node exhaustion, not timeout**: Instrumentation on the 240 shards showed the 995 levels still unsolved after round 2 all hit the **node cap** cleanly, not the wall-clock timeout. They didn't run out of time; they ran out of reachable search space within the budget.

2. **Beam search naturally exhausts**: Prior corpus work on batch-B cluster levels showed that at width=50,000 (the widest tier the policy has), beam search *naturally exhausts* its search space in ~30–40s rather than hitting a clock cap. No budget increase makes that exhaustion find something that wasn't there.

3. ~~**Cumulative discrepancy barrier**: Witness-trace analysis from the earlier session showed some batch-B levels need cumulative LDS discrepancy 22–59 (sum of per-step rank deviations from greedy). The LDS ladder only goes to k=8. A 2.5× budget increase doesn't widen the search space enough to close that gap.~~ **RETRACTED (2026-07-29).** This point restated a claim that had already been formally withdrawn on 2026-07-17 — see [`2026-07-17-witness-divergence-population-calibration-correction.md`](2026-07-17-witness-divergence-population-calibration-correction.md), which found the original comparison was a cherry-picked top-30 tail measured against two hand-picked levels from a *different* corpus. Discrepancy does not discriminate solvability at the population level: corpus-wide, solved levels have median cumulative discrepancy **38** and unsolved **39** (Cohen's d = 0.039), and per-step discrepancy is *lower* in the unsolved population (0.381 vs 0.419) purely because their paths are longer. Independently corroborated by [discrepancy-limited search being tested and rejected](2026-07-24-admissible-order-search-corpus2-validation.md) on admissible-order-search (commit `0375df7`, 2026-07-24). Full numbers: [`reports/stress/corpus2-failure-categorization-2026-07-29.md`](stress/corpus2-failure-categorization-2026-07-29.md) Finding 3.

   The other three points in this section stand — they were measured directly rather than inferred from the discrepancy comparison.

4. **Repair search still fails on the hard cases**: The 995 remaining unsolved levels were re-attempted with the repair fallback (a different search paradigm from DFS/beam deterministic ordering). Even repair timed out on nearly all of them, suggesting the problem isn't "wrong heuristic weights" but "fundamentally unavailable to the search machinery we have."

---

## What the 26 New Discoveries Tell Us

The 26 newly-solved levels are likely:
- **Barely solvable**: Solutions that exist but are just at the edge of what the current search heuristics can find
- **Outliers, not a category**: They might be "almost solvable by the old budget, now solvable by the new one," not representative of the 995 that still can't be found

The 995 remaining are categorically different:
- Every archetype is represented in the unsolved set (not isolated to one mechanic)
- No archetype is *completely* solved (all have unsolved members)
- Puzzle difficulty is distributed, not concentrated (some are simple-looking, some complex)

---

## Lessons for Future Work

### ❌ Do Not Retry
- **Higher budgets** on the current solver. Diminishing returns are severe; corpus-2's practical budget limit is ~300M nodes per level. Going to 1B nodes would yield maybe 5–10 more, not 50.
- **Wider beams** (the WIDEST=50,000 tier is already the policy maximum for high-mechanic regimes; it exhausts on the hard cases)
- **Tuning scoring weights** in isolation. The witness-trace analysis showed local scoring is already good (witness move ranks 1st-place 69–74% of the time). *(Corrected 2026-07-29: this bullet's original second clause — "cumulative discrepancy is the blocker, not local badness" — is retracted with point 3 above. The recommendation stands on the first clause plus the repeatedly-measured null results from scoring-term work, not on the discrepancy framing. Note the scope: this rules out **weight tuning**, not **ordering** changes — `admissible-order-search` changes which child a node commits to first, without touching a single scoring weight, and is the biggest recent win at +115.)*

### ✓ Promising Directions

1. **Manual/AI-assisted solving**
   - Pick a sample of 10–20 unsolved levels and *solve them by hand* (or via AI reasoning, no solver)
   - Extract the strategy that worked and compare against what the solver tried
   - If a pattern emerges (e.g., "constraint propagation over must-cross/flipper decisions," "lookahead-based landmark ordering"), that's a real research direction

2. **Categorize the 995**
   - Are they genuinely unsolvable (witness path fails validation)?
   - If solvable, cluster by what search strategy would actually work (constraint propagation, local search repair seeded from near-miss, exhaustive ordering over a specific decision point)
   - This is the "**failure-mode root-cause audit**" — maps the problem space before building solutions

3. **Algorithm diversification**
   - Current solver: deterministic best-first (DFS/beam) + randomized repair fallback
   - Next tier candidates: constraint satisfaction (propagate must-cross/flipper axis decisions before search), lookahead-based scoring (one level of forced moves ahead), exhaustive ordering over high-impact decisions
   - Each requires research, not just tuning

4. **Witness corpus audit**
   - Are all 1,700 levels genuinely solvable by construction? (Re-validate each witness against the exact PLAY referee)
   - Some corpus-2 levels might be broken (witness fails validation), which would explain why solver finds nothing

5. **Sibling/cousin level design**
   - If a category of levels is unsolvable, can you design a *simpler* variant (fewer must-cross, same archetype) that *is* solvable?
   - Use the solver's own success on the simpler variant to reverse-engineer what the harder variant needs

---

## What Success Looks Like (Concrete Metrics)

- **Categorization**: 10–20 sampled unsolved levels classified into 3–5 root-cause buckets (infeasible, needs algorithm X, blocked by heuristic Y, etc.) — ✓ **This is the immediate next step**
- **Algorithm insertion**: A new search paradigm (not budget increase) that moves ≥10 currently-unsolved levels → solved, verified independently
- **Corpus audit**: 1–3% of corpus-2 identified as infeasible (broken levels), re-generated to fix them
- **Manual solve sample**: 5–10 manually-solved levels each yield ≥1 solver strategy improvement

---

## Why This Matters

Corpus 2 is a solver-blind, uniform-random baseline. Success on it is a proxy for general robustness — if the solver can't scale to random levels at all, real player submissions will expose the same gaps. The 605→695 progress was real and valuable (closing low-hanging fruit), but now we've hit the regime where **knowing what's hard matters more than guessing**.

This report is that transition point: we've spent the easy compute budget. The next phase is research.

---

## Recommended Reading

- `docs/solver-architecture.md` — background on the current search machinery and why 22–59 cumulative discrepancy is a ceiling
- `data/stress/README.md` — corpus structure and the cluster analysis from earlier sessions
- Earlier session logs in `docs/history/development-journal.md` — witness-trace deep dive, LDS ceiling, repair-search architecture
