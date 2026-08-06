# Near-twin solver-response comparison: routing gap or real limit? (2026-08-06)

Follow-up to `reports/2026-08-06-corpus2-nearest-solved-neighbor.md`, which found that static
features run out at the individual-pair level (a solved and an unsolved corpus-2 level can be
nearly feature-identical) and recommended looking at solver-RESPONSE data instead — per
`solver-next-frontier-2026-08-02.md`'s Part I item 6 ("family analysis should use solver-response
vectors, not only static level features"). This is that follow-up.

## Method

Read-only, no solving. `scripts/stress/nearest-solved-neighbor.mjs` was first run over the FULL
corpus (every one of the 958 unsolved-with-attempts levels, not just a sample) to find the true
closest solved/unsolved pairs by z-scored static feature distance — sharper than the earlier
8-level low-badness sample, since some very close pairs (e.g. R02363 at distance 0.654) sit at high
badness, not the lowest.

For the 40 closest pairs found, `scripts/stress/near-twin-response-comparison.mjs` pulls each
pair's actual solver-response data straight from the compiled baseline: the solved twin's
`winningConfig` (which attempt profile actually won, how many nodes, how fast), and the unsolved
twin's full attempt ladder (every profile/template tried, nodes expended, final badness). Each pair
is classified into exactly one of three categories:

- **never-attempted**: the solved twin's winning profile never appears anywhere in the unsolved
  twin's ladder at all — a routing/policy gap (the attempt-selection logic sent it down a different
  path).
- **starved-zero-nodes**: the winning profile DOES appear in the ladder, but every occurrence got
  `nodesExpanded = 0` — present in name only, never actually given budget to run. This is the same
  shape of problem as the already-documented, already-fixed `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION`
  starvation bug (`reports/2026-07-30-admissible-order-node-reserve.md`), just a different tier.
- **real-attempt**: the winning profile ran with genuine nodes expended and still failed — the
  technique that solves the near-twin cleanly was actually tried here, at real cost, and still came
  up empty.

## Results

```
40 pairs: never-attempted=4 (10.0%), starved-zero-nodes=5 (12.5%), real-attempt=31 (77.5%)
```

**The large majority (77.5%) are genuine real-attempt cases, not routing or scheduling problems.**
The same technique that solves the near-identical twin — often almost trivially (`R02669` solved
in 128,151 nodes / 873ms via `beam:perimeterSweep`; `R02718` solved in 1,002,122 nodes / 1,178ms via
`repair`) — runs to the FULL node cap (tens of millions of nodes, e.g. 27,000,182 for `R02548`,
36,000,008 for `R03224`) on the near-statically-identical unsolved twin and still finds nothing.
This is the sharpest evidence yet in this session's work that a meaningful chunk of corpus-2's
remaining unsolved levels are not failing because of *which* technique gets tried — they're failing
because the *same* technique behaves completely differently on two levels that look almost
identical on paper.

**The remaining 22.5% (9/40) are concrete, listed, and plausibly fixable scheduling issues**,
distinct from the harder algorithmic question above:

```
never-attempted        R02931 -> R02718  (winning profile: repair)
never-attempted        R02634 -> R02364  (winning profile: objectiveFirst)
never-attempted        R03160 -> R02316  (winning profile: perimeterSweep)
never-attempted        R02269 -> R02316  (winning profile: perimeterSweep)
starved-zero-nodes     R02657 -> R02677  (winning profile: mustCrossFirst)
starved-zero-nodes     R00477 -> R02699  (winning profile: perimeterSweep)
starved-zero-nodes     R02911 -> R02441  (winning profile: intersectionHarvest)
starved-zero-nodes     R00720 -> R03200  (winning profile: mustCrossFirst)
starved-zero-nodes     R02666 -> R02783  (winning profile: knotBuilder)
```

Full per-pair detail (every attempt's profile/template/nodes/badness) is not committed as an
artifact given its size — regenerate via the command in the next section.

## Reproduce

```bash
node scripts/stress/near-twin-response-comparison.mjs \
    --baseline=logs/stress-corpus2-baseline.json \
    --corpus=data/stress/stress-levels-random.json --count=40 \
    --out=<file.json>
```

## Interpretation and recommendation

Two genuinely different problems, two genuinely different next steps:

1. **The 9 routing/starvation cases** are the cheap, well-defined fix, in the same spirit as the
   admissible-order node-reserve precedent: check whether these specific profiles (`repair`,
   `objectiveFirst`, `perimeterSweep`, `mustCrossFirst`, `intersectionHarvest`, `knotBuilder`) are
   being starved of budget by an earlier tier on THESE levels specifically, the same diagnostic
   `reports/2026-07-30-admissible-order-node-reserve.md` already used successfully once. Small,
   scoped, and the corpus-wide feature-solvability numbers (`reports/2026-08-06-corpus2-nearest-
   solved-neighbor.md`) already show must-cross's difficulty is largely budget-bound — `mustCrossFirst`
   showing up twice in this starved list is a plausible concrete instance of that exact phenomenon.
2. **The 31 real-attempt cases** are the harder, more valuable target, and they are exactly the
   population `docs/ai-assisted-manual-solving.md`'s ONE validated recommended use is for:
   differential diagnosis — hand-solve one of these unsolved levels (or study why its near-twin
   solves so easily), then diff the accepted path against the solver's own search trace at each
   divergence point, the same instrumented-ablation model that found the real R02248/R01465 fixes
   that doc references. The `R02751`/`R02669` pair from the original nearest-neighbor report (the
   closest low-badness pair, distance 1.001, differing by only reqLen+13/mustPass-2/reqInt-1/
   mustTurn-1) is a strong, concrete starting candidate: both attempted `perimeterSweep`, one wins in
   under 1,000 nodes, the other exhausts its ladder without a solution.

Neither of these was attempted here — this report identifies and categorizes the population and
recommends where to point real investigative effort next, per this session's own "measure before
build" discipline: the diagnosis is complete enough to act on, but the two follow-ups (a scheduling
fix for the 9 cases, a hand-diff for one of the 31) are each their own scoped task.

## Limitations

Same as the source report: association not causation, small sample (40 of 958 unsolved-with-
attempts levels — the CLOSEST 40, not a random sample, so this is about the near-twin population
specifically, not a corpus-wide claim about routing-vs-real-limit proportions in general). The
`extractProfile()` parsing of `winningConfig` strings is a simple heuristic (split on `:`/`/`/`@`)
validated against a handful of observed formats, not exhaustively against every winningConfig shape
the solver can produce — a genuinely new, unobserved format could parse incorrectly and misclassify
a pair.
