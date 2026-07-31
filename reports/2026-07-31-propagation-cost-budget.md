# Sizing the budget for a global-inference pass — and why the work meter must not be used to do it (2026-07-31)

Prerequisite for the propagation work that
[`2026-07-31-prune-gap-localisation.md`](2026-07-31-prune-gap-localisation.md) recommends. That
report established the search enters ~62% of provably-dead branches and that no cheap structural
check separates them, leaving "real propagation, or nothing." Before designing a propagator, this
answers the question that decides whether it can exist at all: **how much can a periodic consistency
sweep afford to cost, and how often can it run?**

**Headline**: the affordable envelope is **~1–2 µs amortized per candidate** — roughly a doubling of
current per-candidate cost — because that is what `isConnected` costs today and it returns a 1.95–2.67x
wall-clock speedup for it. **Do not size the pass in work units**: the work meter overcharges
connectivity-style inference by ~3–4x, and budgeting in it will reject passes that are in fact
comfortably affordable.

---

## 1. The work meter is the wrong instrument for this question

`work = applyMove calls + 12 × isConnected calls` (`work-meter.ts`). The 12 was *fitted* to equalise
work/second across dfs/beam/repair, collapsing an 11.4x cross-technique spread to 1.02x. It does that
job well and it makes runs reproducible — but it is a cross-technique fairness weight, not a
statement about what a connectivity call costs in real time.

The cleanest demonstration, from the hard-regime A/B below, where both arms were bounded at the same
40M work budget:

| | connectivity ON | OFF | ratio |
|---|---|---|---|
| work spent | 169,277,034 | 170,118,527 | **1.00x** |
| wall time | 146,279 ms | 284,596 ms | **1.95x** |

**Identical work, half the wall time.** A work unit spent with connectivity enabled buys twice as
much real progress as one spent without it, which can only mean the meter is mispricing the
connectivity calls that dominate the ON arm's work.

Direct instrumentation (`PF_BEAM_DEBUG=1`) agrees. On three published beam attempts:

| cands | connCalls | conn ms | conn share of beam time | µs/call |
|---|---|---|---|---|
| 432,158 | 101,823 | 356.7 | 36% | 3.50 |
| 142,544 | 52,950 | 111.6 | 25% | 2.11 |
| 38,906 | 19,664 | 35.3 | 32% | 1.80 |

(`candGen` in that instrumentation *includes* `conn`, so the share is conn / (replay + candGen +
dedup + sort). The ~34% matches the figure already quoted in `topology.ts`.)

On the first row: connectivity is **74% of work units** but **36% of time**. A base candidate costs
~0.92 µs (1.75 µs per candidate including connectivity, minus 0.83 µs of amortized connectivity), so
a connectivity call at 2–3.5 µs is worth roughly **2–4 applyMove-equivalents in time, not 12**.

**Consequence for anyone building a propagator:** a pass benchmarked in work units will look ~3–4x
more expensive than it is. Size it in measured µs per call and calls per candidate.

## 2. What connectivity costs, and what it buys

Connectivity is itself a (weak) global-inference pass, so its measured exchange rate is the
reference point.

**Published corpus, 160 levels, pinned 100M work budget, extra-budget passes disabled**, on the 158
levels solved in both arms:

| | ON | OFF | ratio |
|---|---|---|---|
| solved | 160 | 158 | **+2 solves** |
| nodes | 36,237,859 | 57,997,360 | 1.60x more without |
| wall | 27,571 ms | 73,635 ms | **2.67x slower without** |

Largest individual blowups without it: 7.0x, 6.3x, 4.7x, 3.2x, 2.2x nodes.

**Hard regime — the 15 stratified in-scope corpus-2 levels from the prune-gap study**, pinned 40M
work budget:

| | ON | OFF |
|---|---|---|
| solved | **11 / 15** | 7 / 15 |
| nodes | 168,680,755 | 183,644,992 (1.09x) |
| wall | 146,279 ms | **284,596 ms (1.95x)** |

So in the regime that actually matters, connectivity is worth **4 of 15 levels** and a ~2x speedup.

**The exchange rate**: connectivity roughly **doubles** per-candidate cost (0.92 → ~1.75 µs) and
returns a 1.95–2.67x wall-clock speedup plus solves. That is a very favourable trade, and it is the
empirical proof that expensive-but-strong inference wins in this search.

## 3. The budget

Take "one more doubling of per-candidate cost" as the envelope — justified by connectivity having
already bought a 2x+ speedup for exactly that. That is **~1.5 µs amortized per candidate**.

For a pass costing **P** µs per invocation, run on a fraction **f** of candidates, the constraint is
`P × f ≲ 1.5 µs`:

| pass cost P | affordable frequency f | i.e. run every… |
|---|---|---|
| 3 µs (connectivity-like) | 50% | other candidate |
| 15 µs | 10% | ~10 candidates |
| 30 µs | 5% | ~20 candidates |
| 50 µs | 3% | ~33 candidates |
| 500 µs | 0.3% | ~330 candidates |

This is a break-even envelope, not a target: a pass that prunes *more* than connectivity does can
afford proportionally more, and one that prunes less must be cheaper.

**Sanity anchor at the other extreme.** A CP-SAT prefix-feasibility call — the oracle that defines a
perfect dead-branch check — takes 1–20 s, i.e. 10⁶–10⁷ µs. The table puts its affordable frequency
at ~1 call per 700,000 candidates: roughly once per level. **CP-SAT as an in-loop subroutine is five
to six orders of magnitude too slow**, which settles that question — it is an offline oracle and
nothing else.

The viable design space is therefore a hand-written pass in the **tens of µs**, running every
~10–50 candidates. For scale: the existing bit-parallel flood fill does a whole-region reachability
sweep in 2–3.5 µs, so a pass doing 5–10x its work sits squarely in that band. Demanding, but not
absurd.

## 4. What this does not answer

- **Whether such a pass prunes enough to pay.** This is the cost half only. The prune-gap study
  bounds the *opportunity* (62% of dead sibling branches entered) but that figure is
  branch-counted, not node-weighted, so it does not convert directly into a predicted speedup.
- **DFS vs beam.** The µs instrumentation is beam-only (`PF_BEAM_DEBUG`); DFS runs connectivity on a
  narrower throttle (`rSteps <= 10`), so its amortized share — and therefore its headroom — differs
  and was not measured.
- **Single host, single run per arm.** The A/B ratios (1.95x, 2.67x) are large enough to survive
  normal ±5–10% variance, but they are not medians of interleaved runs.
- The published-corpus arm compares only levels solved in both arms; the 2 levels connectivity
  rescues are excluded from its node/wall ratios, which if anything understates its value.

## 5. Recommendation

The envelope is wide enough that propagation is worth attempting — this was the main risk and it is
retired. Two rules for whoever picks it up:

1. **Budget in µs per candidate, never in work units.** Add the pass behind an ablation flag and A/B
   it on **wall time and solves**, with the work budget pinned only to make the runs reproducible.
   If you gate the decision on `workSpent`, you will reject a pass that is winning.
2. **Design to a frequency, not to a per-node check.** Pick the pass's cost first, read its
   affordable frequency off the table, and schedule it like connectivity already is — a periodic
   sweep, not a per-candidate test.

## Reproducing

```
PF_BEAM_DEBUG=1 npm run solver:direct -- --levels=pos:156        # per-attempt conn cost breakdown

node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/levels.json --levels=all --scheduler-mode=legacy \
  --budget-ms=30000 --work-budget=100000000 --workers=4 --disable-extra-budget-passes \
  [--disable-flags=PRUNE_CONNECTIVITY] --out=<arm>.json
```
