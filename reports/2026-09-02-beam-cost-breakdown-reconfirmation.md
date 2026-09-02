# Beam cost breakdown: current-head reconfirmation, no new hotspot

> **Status:** concluded-negative
> **Last evidence:** 2026-09-02 — this report
> **Decision:** The disjoint cost-breakdown shape found on 2026-08-27 (candidate generation/apply/undo/scoring dominant at ~53-56%, connectivity ~17-20%, replay ~13-14%, sort/coarse-merge small) still holds on current `main`. No new hotspot has emerged; do not start a new Workstream 7 pilot from this data alone.
> **Remaining gate:** none. A future Workstream 7 attempt still needs either a materially different mechanism than allocation-avoidance within candidate generation (both tried and closed negative) or a genuinely new profile shape, neither of which this reconfirmation provides.
> **Evidence role:** discovery
> **Selection:** observational — two independent disjoint samples, both reported, neither cherry-picked

## Context

[`docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) Workstream 7 closed its last two pilots (`getneighbors-allocation-share`, `batched-candidates-allocation-share`, both 2026-09-02) with "no further candidate is currently nominated on this hot loop... needs a materially different mechanism or a freshly measured hotspot." Several solver commits have landed since the original [`beam cost breakdown`](2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md) measurement (`b97358a1`), including at least one beam-search correctness fix (`915754e5`, noted in passing during the static-portfolio pilot above). This is the cheap "freshly measured hotspot" check the queue calls for before anyone invests in a new pilot design — no code changed, purely observational.

## Method

Same protocol as the 2026-08-27 report: `scripts/solver-speed-probe.mjs` (bundled) with `PF_BEAM_DEBUG=1`, a 250,000-node cap, and a 600,000ms non-binding wall allowance, on two disjoint 24-level Corpus-2 stride samples (`--stride=70 --start=5` and `--stride=43 --start=11`; the original report's own exact `--start` offsets were not recorded in its prose, so these are freshly chosen disjoint offsets, not a byte-identical replay — a directional stability check, not a precise diff). Two samples rather than the original four workloads: this is a routine landscape-stability check on a program already ranked below Workstream 2 in current priority, not a fresh decision-bearing pilot design.

```
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=corpus2 --count=24 --stride=70 --start=5 --node-budget=250000 --budget-ms=600000
PF_BEAM_DEBUG=1 node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
  --corpus=corpus2 --count=24 --stride=43 --start=11 --node-budget=250000 --budget-ms=600000
```

Disjoint buckets, aggregated over every `[beam]` debug line (`conn` is a nested sub-span already counted inside `candGen`'s own window, so `candGenExcl = candGen - conn`; `replay + candGenExcl + conn + coarseMerge + sort` sums to the disjoint total):

## Result

| workload | gate calls | replay | candGenExcl | conn | coarseMerge | sort |
|---|---:|---:|---:|---:|---:|---:|
| Corpus-2, stride 70, start 5 (24 levels) | 85 | 13.9% | 54.7% | 20.0% | 3.8% | 7.6% |
| Corpus-2, stride 43, start 11 (24 levels) | 88 | 12.9% | 56.3% | 17.5% | 5.3% | 8.0% |
| *2026-08-27 frozen range (3 samples)* | *57-90* | *14.7-16.2%* | *53.1-55.3%* | *18.3-19.8%* | *2.4-4.3%* | *7.4-9.1%* |

Both fresh samples fall squarely inside (or within ~1 percentage point of) the frozen 2026-08-27 range on every bucket. **The shape is unchanged**: candidate generation/apply/undo/scoring remains the dominant disjoint component by a wide margin, connectivity second, replay third, sort and coarse-state-merge dedup both small. Recent solver commits (including the beam-search correctness fix noted above) have not measurably shifted where beam search spends its time.

## Disposition

This reconfirms, rather than reopens, the existing closed-negative disposition: the fused-kernel pilot and both allocation-avoidance follow-ups (`getNeighbors`, batched candidates) already tested the two most obvious mechanisms within this same dominant bucket and found neither moved wall time. A materially different mechanism (not another allocation-avoidance angle on the same candidate-generation loop) is still what the next Workstream 7 attempt needs, and this reconfirmation gives a current, not eight-day-stale, baseline to measure any future candidate against.
