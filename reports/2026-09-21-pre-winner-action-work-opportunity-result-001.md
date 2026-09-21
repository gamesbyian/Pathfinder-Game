# Pre-winner action work opportunity result 001

> **Status:** concluded-positive opportunity ceiling; selector achievability unmeasured.
> **Date:** 2026-09-21.
> **Question:** how much canonical work on successful production-shaped solves occurs before the first successful attempt?
> **Decision:** a material action-ordering/allocation reservoir exists. Advance to the smallest runtime-legal discriminator under WS1; do not reorder production from oracle winner knowledge.
> **Evidence role:** opportunity sizing / oracle ceiling.
> **Preflight:** [pre-winner action work opportunity preflight 001](2026-09-21-pre-winner-action-work-opportunity-preflight-001.md).

## Executive result

The answer is decisively positive.

On production-boundary run `35066677597` at solver SHA
`16114b80e54233910f34ec2ea8e2c1a41a859eb4`:

### Corpus 1

- 102 rows;
- 101 solved;
- 101/101 solved rows retain canonical `attempt.workSpent`;
- **1,166,005,352** canonical work occurred before the eventual winning attempt;
- **1,331,383,151** total canonical work across those successful rows;
- oracle pre-winner share: **87.58%**.

### Corpus 2

- 1,700 rows;
- 1,169 solved;
- 531 unsolved;
- 1,169/1,169 solved rows retain canonical `attempt.workSpent`;
- **65,657,307,264** canonical work occurred before the eventual winning attempt;
- **69,302,968,971** total canonical work across the successful rows;
- oracle pre-winner share among successful rows: **94.74%**;
- those successful-row pre-winner attempts alone account for **31.71% of all canonical work across the full 1,700-row batch**.

This clears the preregistered >=10% “potentially material scheduler-speed reservoir” gate by a very large margin.

It does **not** mean 31.71% is achievable savings.

## Corpus-2 breadth

The result is not driven by a handful of monsters.

Among the 1,169 successful rows:

- 961 (82.2%) spend nonzero canonical work before the winner;
- median row pre-winner share is **89.0%**;
- p90 row pre-winner share is **98.7%**;
- median failed attempts before winner: **4**;
- p90: **59**.

Pre-winner work concentration:

| top rows | share of all pre-winner work |
|---|---:|
| 5 | 2.61% |
| 10 | 5.07% |
| 20 | 9.73% |
| 50 | 22.87% |
| 100 | 41.87% |

So the opportunity is broad enough to justify a general WS1 discriminator question rather than only a one-level forensic.

## Critical caveat: protected late treatments

The largest single stage is the promoted portal-coarse dead-last retry:

- 121 wins;
- 31.15B pre-winner work;
- 98.6% pre-winner share within those successful rows.

That retry is deliberately late because the globally enabled portal-coarse form previously caused real regressions. Its placement structurally protects ordinary production winners.

Therefore the gross oracle result must **not** be read as:

> put each historical winner first.

Historical winner identity is illegal runtime routing input, and moving protected treatments earlier can destroy capability.

## Conservative ordinary-ladder ceiling

To avoid leaning on deliberately protected late-treatment wins, restrict the winning stage to:

- `early-repair-search`;
- `main-search`;
- `repair-fallback`;
- `admissible-order-fallback`.

On those 874 solved rows:

- pre-winner work: **14,070,783,830**;
- denominator work: **16,533,435,130**;
- within-row oracle share: **85.11%**;
- pre-winner work is still **6.80% of the entire 1,700-level batch's canonical work**.

Restrict further to ordinary `main-search` winners:

- 646 rows;
- pre-winner work: **11,202,006,403**;
- denominator work: **12,867,322,422**;
- within-row oracle share: **87.06%**;
- pre-winner work is **5.41% of the whole 1,700-level batch**.

This is the most important result for the next gate.

Even after excluding protected late-treatment rescues, ordinary action ordering has a material machine-independent-work ceiling.

## Where ordinary main-search pre-winner work goes

Largest observed main-search failed-before-winner consumers include:

| action | pre-winner work |
|---|---:|
| DFS objectiveFirst | 2.83B |
| DFS intersectionHarvest | 2.01B |
| DFS perimeterCW | 1.40B |
| beam intersectionHarvest 5K plain | 1.32B |
| beam objectiveFirst 5K plain | 1.22B |
| DFS perimeterCCW | 0.90B |
| beam intersectionHarvest 5K mechanic-buckets | 0.79B |
| beam perimeterCCW 2K | 0.70B |
| beam perimeterCW 2K | 0.67B |
| beam objectiveFirst 5K mechanic-buckets | 0.65B |

Several expensive DFS actions win relatively rarely but remain real specialists. For example, on all observed main-search attempts in this artifact:

- DFS objectiveFirst: 1,059 attempts, 17 wins, 6.43B total work;
- DFS intersectionHarvest: 848 attempts, 6 wins, 4.91B total work;
- DFS perimeterCW: 536 attempts, 22 wins, 2.52B total work;
- DFS perimeterCCW: 489 attempts, 7 wins, 1.75B total work.

These figures nominate repricing/order questions. They do **not** authorize removing those actions.

## Why this is different from the old portfolio question

Previous action-selection work correctly warned that:

- static generic features did not justify another selector-engineering detour;
- historical winners cannot become per-level routing inputs;
- specialist retention matters;
- a large aggregate uplift can hide rare regressions.

This result does not contradict that evidence.

It changes the **value-of-information** of finding a new legal signal.

Before this census, WS1 had no measured current machine-independent-work ceiling for getting action order right.

Now it does:

> at least 5.41% of full Corpus-2 work sits before ordinary main-search winners, with 6.80% when the conservative primary ladder is included.

That is large enough to search for a discriminator, but only through current-input or within-solve response evidence.

## Next question

Do **not** ask:

> Can we predict the historical winning action from stored labels?

Ask:

> Can cheap, runtime-legal evidence available before an expensive action identify when that action should be deferred, while preserving the action's specialist wins?

The best first target is not a full multiclass selector.

A bounded discriminator should focus on one high-cost action/family and answer something like:

```
run now | safely defer | unknown
```

Candidate evidence classes:

1. mechanics/current-input eligibility already known before search;
2. response from one or more cheap preceding beam attempts;
3. exact/safe current-state facts already produced by those attempts;
4. compact failure-progress signals whose runtime legality is already established.

The first discriminator should be evaluated retrospectively with parent-level holdout or another appropriate independent split before any production ordering change.

## Stop rule for the next gate

Close a proposed discriminator if it cannot recover a meaningful fraction of the 5.41-6.80% ordinary-ladder ceiling without sacrificing known specialist winners.

Do not rescue a weak signal by:

- adding historical ID/family/winner features;
- fitting a broad feature soup after seeing the answer;
- moving deliberately protected retries earlier;
- increasing total work.

## Data products

- Corpus-1 derived census:
  `reports/stress/pre-winner-work-census-corpus1-production-boundary-2026-09-21.json`
- Corpus-2 derived census:
  `reports/stress/pre-winner-work-census-corpus2-production-boundary-2026-09-21.json`
- Analyzer:
  `scripts/pre-winner-work-census.mjs`

## Disposition

**Positive opportunity ceiling.**

Route the next discriminator to WS1 automatic action selection.

The result does not itself justify a production selector or action reorder.
