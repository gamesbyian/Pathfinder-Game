# WS6 independent-parent replication result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-10-01 — frozen replication run once on the 69-pair population (24 parents, retained exact DEAD prefixes + stored valid hints) with exact CP-SAT causal-contract labels (60 s per query).
> **Decision:** the retained population cannot supply the independent-parent contrast: only **2 of 24 parents** yield an eligible exact DEAD/LIVE pair (minimum 12 pre-registered) -> **inconclusive-insufficient-parents**; per the standing rule, WS6 stays dormant rather than generating broad new exact truth for this nomination.
> **Remaining gate:** none; reopen only if an independent-parent matched-pair population with exact point-of-no-return labels is acquired for another reason.
> **Evidence role:** development.
> **Owner:** `WS6-DEPENDENCY-CONDITIONED-REPAIR`.

Protocol and decision rules: [preregistration](2026-10-01-ws6-independent-parent-replication-preregistration-001.md). Artifacts: `reports/stress/ws6-replication-observe-001.json`, `reports/stress/ws6-replication-cpsat-labels-001.json`, `data/stress/ws6-replication-pairs-001.json`.

## Funnel (69 candidate pairs, 24 parents)
| stage | pairs |
|---|---:|
| candidate pairs | 69 |
| CP-SAT timeout/abstain at 60 s (4 shards sharing 4 cores) | 60 |
| exact DEAD at the divergence (causal contract met) | 9 |
| ... of which DEAD already rejected by the current hard-prune gauntlet (`existing-hard-fact`) | 4 |
| ... of which global accounting differs (explained by existing scalars) | 3 |
| **eligible decision pairs** | **2** (2 parents) |
| live-by-SAT / LIVE alarms | 0 / 0 |

The two eligible pairs show ties on `mustPassLowerBound` and at most a one-pair lean on `legalSuccessorCount`; nothing is testable at n=2.

## Findings
- **Existing facts already explain 4 of the 9 resolvable exact-dead divergences** (44%): the current prune gauntlet rejects the DEAD branch outright, so those points need no dependency interface. Together with 3 accounting-explained pairs, 7/9 resolved pairs are not decision-bearing for a dependency-conditioned story.
- **Resolution is the bottleneck, not independence in the data:** 60/69 prefixes are exactly unresolvable inside 60 s because proving a short prefix live requires finding a whole solution of a hard level, and proving it dead requires a full infeasibility proof. Scaling CP-SAT time/shards to reach 12 eligible parents would generate precisely the broad new exact truth the nomination said not to buy, for a feature test with a plausible directional power of ~15/20 parents.
- The R03147 two-point positive therefore stays one-parent development evidence; nothing here supports or refutes it.

## Not earned
A dependency-conditioned repair neighborhood, a hard prune, a classifier, backjumping or LNS. The question `WS6-DEPENDENCY-CONDITIONED-REPAIR` returns to dormant with the acquisition note above.
