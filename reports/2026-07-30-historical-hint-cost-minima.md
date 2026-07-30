# Historical hint-cost minima: useful inventory, no scheduler change justified (2026-07-30)

## Question and outcome

Can hint provenance identify the cheapest historical solve for each level, and can those records tell
us how to solve the level as cheaply now?

**Yes for candidate discovery, but not yet for automatic tuning.** Mining the three hint libraries
found an eligible cold-solve node count for 1,049 levels. For 1,010 of them (96.3%), the most recent
eligible discovery is already tied with the historical minimum. Only 12 levels have a latest/minimum
ratio of at least 2x. Nine of those 12 compare different attempt configurations or materially
different time budgets, so they are not evidence that the current scheduler lost a cheap route. The
remaining three are the already-known timing-sensitive published levels P00125, P00131, and P00140;
same-configuration repeats on one machine span roughly 1.6-1.8x.

The exercise was valuable because it sharply reduced an apparently large search space to three
controlled candidates, then showed that all three are measurement-noise cases already covered by
existing repeat data. **I do not recommend changing scheduler order or solver heuristics from this
evidence.**

## Method

I scanned all 1,255 JSON files in:

- `data/hints` (published);
- `data/stress/hints` (Corpus 1);
- `data/stress/hints-random` (Corpus 2).

For each level I:

1. retained only production-ladder `dfs`, `beam`, `repair`, and `admissible-order` discoveries;
2. excluded hint-guided entries and entries without a positive `nodesExpanded` value;
3. selected the most recently observed non-null `context.levelRevision`, then excluded entries for
   other revisions;
4. took the minimum node count across any valid solution as the historical minimum;
5. compared it with the chronologically latest eligible discovery for that revision.

This first pass deliberately compares *any solution* and *any configuration*. It answers “where
does history suggest a potentially cheaper basin?” It does **not** claim a regression. A candidate
must still survive a second filter requiring the same technique, profile, template, beam settings,
forcing/seed settings, and materially equivalent budget. Node counts are preferred over elapsed time,
but even node counts vary when a wall-clock-bounded search runs under different CPU conditions.

“Latest discovery” is also only the latest append in provenance, not a benchmark of the current
`HEAD`. Append-only successful discoveries omit failures and do not give every configuration equal
sampling. This makes the results a candidate inventory rather than a current-performance scorecard.

## Corpus-level result

| Corpus | Levels with eligible current-revision provenance | Latest tied for minimum | Latest/minimum >=2x |
| --- | ---: | ---: | ---: |
| Published | 160 | 157 (98.1%) | 3 |
| Corpus 1 | 100 | 89 (89.0%) | 1 |
| Corpus 2 | 789 | 764 (96.8%) | 8 |
| **Total** | **1,049** | **1,010 (96.3%)** | **12** |

The 39 non-ties should not be read as 39 regressions: small differences are expected, and the
comparison intentionally ignores configuration until the candidate-filtering step. The >=2x cutoff
is a triage threshold, not a statistical confidence boundary.

## The 12 apparent gaps

| Level | Corpus | Ratio | Historical minimum | Latest discovery | Controlled comparison? |
| --- | --- | ---: | --- | --- | --- |
| R02575 | Corpus 2 | 107.7x | beam/intersectionHarvest, 204,399 nodes, 2,000ms | dfs/intersectionHarvest, 22,020,657 nodes, 35,817ms | **No:** technique and budget differ |
| R02242 | Corpus 2 | 7.7x | dfs/intersectionHarvest, 345,562, 887ms | dfs/intersectionHarvest, 2,648,935, 22,059ms | **No:** budget differs 24.9x |
| R03087 | Corpus 2 | 6.8x | dfs/perimeterSweep/perimeterCCW, 412,426, 1,142ms | same profile/template, 2,797,834, 17,857ms | **No:** budget differs 15.6x |
| R02943 | Corpus 2 | 3.4x | dfs/knotBuilder, 147,009, 499ms | dfs/objectiveFirst, 499,891, 7,812ms | **No:** profile and budget differ |
| R02876 | Corpus 2 | 3.3x | dfs/knotBuilder, 618,497, 887ms | same profile, 2,046,465, 12,619ms | **No:** budget differs 14.2x |
| P00125 | Published | 2.8x | dfs/perimeterSweep/cornerHarvest, 1,418,502, 1,875ms | same config/budget, 3,950,342 | **Yes, but known timing variance** |
| R02464 | Corpus 2 | 2.8x | dfs/perimeterSweep/perimeterCCW, 1,087,317, 1,142ms | same profile/template, 3,012,693, 10,714ms | **No:** budget differs 9.4x |
| R03096 | Corpus 2 | 2.7x | dfs/portalFirstTransfer, 1,813,505, 500ms | same profile, 4,945,921, 8,000ms | **No:** budget differs 16x |
| P00140 | Published | 2.5x | dfs/perimeterSweep/perimeterCW, 1,544,188, 1,428ms | same config/budget, 3,909,116 | **Yes, but known timing variance** |
| R02716 | Corpus 2 | 2.3x | dfs/knotBuilder, 1,218,024, 1,142ms | dfs/objectiveFirst, 2,808,988, 10,714ms | **No:** profile and budget differ |
| R00822 | Corpus 1 | 2.2x | dfs/portalFirstTransfer, 1,973,075, 1,250ms | same profile, 4,257,875, 20,000ms | **No:** budget differs 16x |
| P00131 | Published | 2.1x | dfs/perimeterSweep/cornerHarvest, 920,022, 937ms | same config/budget, 1,926,137 | **Yes, but known timing variance** |

The extreme R02575 result is the clearest demonstration of why “cheapest ever” cannot directly
drive scheduling: the minimum is a beam solve and the latest record is a DFS solve with nearly 18x
the time allocation. It is evidence that more than one basin exists, not evidence that current beam
replay would still win or that beam should globally move earlier.

## What “as cheaply now” means for the credible candidates

P00125, P00131, and P00140 are the only >=2x candidates whose headline comparison holds technique,
profile, template, and budget fixed. They are also exactly the three levels already isolated by the
published-corpus repeat investigation. Four same-commit, same-machine runs did not converge on a
stable node count; their ranges were roughly 1.6-1.8x (P00140 was 1.60M-2.82M). Their search is
wall-clock-sensitive, so a lucky historical minimum is not a reliably schedulable operating point.

The current ladder already invokes the historically winning perimeterSweep configuration on these
levels. There is therefore no missing profile to promote. Getting closer to the minimum reliably
would require changing the measurement/control regime first—most usefully a deterministic node cap
or a node-count checkpoint—not copying a historical wall-clock allocation.

## Suggestions

### Do now

1. **Keep the scheduler unchanged.** The study found no reproducible cheap route that the present
   ladder demonstrably omits or invokes too late.
2. **Treat the 12-row table as an investigation queue, not a leaderboard.** R02575 is the best first
   live-replay candidate if deterministic node budgeting becomes available because its beam/DFS
   contrast is large, but it should not be promoted from one successful beam sample.
3. **Use medians and spread from repeated runs.** Require at least three independent samples for both
   the historical candidate configuration and current default; compare median nodes and report
   min/max or a robust dispersion measure. Never optimize against the minimum alone.

### Instrument before the next replay campaign

1. **Add an optional hard node budget to solver experiments.** Wall-clock limits make
   `nodesExpanded` machine-load-dependent because the termination decision is itself time-based. A
   node cap would make exact configuration replay substantially more diagnostic.
2. **Record failures and attempted configurations.** Hint provenance is success-biased. A small
   benchmark-result ledger keyed by level revision, full configuration, commit, host/run id, and
   repetition would permit success-rate and cost comparisons without polluting hint provenance.
3. **Give runs a stable run id.** This separates genuine independent samples from multiple hints
   appended by one solve and makes sample counts trustworthy.
4. **Capture every caller-controlled axis in comparison keys.** In addition to profile/template and
   beam settings, preserve gate, forcing, seed, seed salt, repair flags, attempt index, and exact or
   multiplicatively bucketed budget.

### Decision rule for a future scheduler change

Promote a historical configuration only if repeated current-commit cold solves show (a) no loss in
solve rate, (b) a lower median cumulative node count including all earlier attempts, and (c) no
material tail regression on the rest of the corpus. Per-attempt cheapness alone is insufficient: a
specialist can be cheap when it wins and still make the portfolio more expensive if tried early on
many levels where it fails.

## Bottom line

Mining provenance was worthwhile as a low-cost filter. It says that the overwhelming majority of
latest recorded cold discoveries already match the historical minimum, and every large apparent gap
is explained either by incomparable configurations/budgets or by a known timing-sensitive trio. The
responsible next investment is deterministic, repeated cost telemetry—not a solver or scheduler
change based on historical minima.
