# Repair-stagnation escape plan, Stage 1: signed signatures + structural features (2026-07-22)

## What this is

Stage 1 of [`docs/repair-search-stagnation-escape-plan.md`](../docs/repair-search-stagnation-escape-plan.md)
— the cheap, no-behavior-change instrumentation step the plan says to do first, whose output feeds
the Stage 2 (signature-conditioned soft feature memory) design. It captures, per dead-ended
`repairSearchFromGate` restart, a **signed** deficit signature plus a candidate set of structural
features, then measures (a) how concentrated the frozen near-miss signature is during a plateau and
(b) which structural features are overrepresented conditional on that signature.

No solver behavior changed. The instrumentation is env-gated (`PF_REPAIR_SIGNATURE_DEBUG=1`,
zero-overhead-when-unset, same convention as the existing `PF_REPAIR_DEBUG`/`PF_LENGTH_GAP_DEBUG`
additions to `repair-search.ts`). `npm run solver:bench -- --check`: 160/160, no regressions,
nodes −0.7% (noise; the added code is fully gated). `repair-search.test.ts`: 14/14 unchanged.

## Method

The instrumentation lives in `repair-search.ts`:

- `deadEndSignatureRecord()` builds, from a restart's dead-ended state, a signature string
  `L<Δlen>|I<Δint>|mp<deficit>|mc<mask>|sr<deficit>|mt<mask>|at<mask>` where `Δlen = realLen −
  reqLen` and `Δint = ints − reqInt` are **signed** (never `Math.abs`'d — the plan flags that
  `computeBadness`'s existing terms lose sign, and "two short" must not collapse with "two long"),
  and a token list of candidate features: per pending must-turn cell `mtVisited:i`/`mtUnvisited:i`,
  per pending adjacent-turn object `atPending:i`, per pending must-cross cell `mcPending:i:v<count>`,
  the dead-end tip cell `tip:<key>`, and every revisited cell `revisit:<key>`.
- Per `repairSearchFromGate` call it accumulates a signature-frequency table, a global
  feature-frequency table, and a per-signature feature table, then emits one JSON summary line on
  the timeout return: signature concentration + the top features by smoothed log-odds
  overrepresentation (α=0.5) conditional on the **plateau signature** (the most frequent signature
  that achieves the run's best-ever badness).

Sample: a fresh 16-level seeded draw from the 124-member `repair-close` cluster in
`reports/stress/unsolved-failure-clusters.json`, excluding ids used in this week's prior
repair-close investigations (invocation-rate, frozen-signature diagnosis, near-miss A/B). Driven
by `scripts/repair-direct-probe.mjs` (single `repairSearchFromGate` call, gate 0, `budgetMs=8000`),
matching the prior reports' methodology. Sample: R01531, R02025, R02077, R02150, R02239, R02267,
R02279, R02358, R02378, R02575, R02654, R02842, R02859, R03280, R03294, R03349.

R03349 was solved by the single-gate 8 s probe alone (2.5 s) — no plateau to analyze; the other 15
timed out, as expected for cluster members. All findings below are over those 15.

## Finding 1 — every plateau is length-SHORT, never long (15/15)

The single sharpest result, and the one that only signed capture could have surfaced: **all 15
plateau signatures have a negative length residual** (`Δlen` from −2 to −18), **zero are long,
zero hit length exactly**. Repair's walks dead-end *before* reaching `reqLen` — they run out of
legal moves short, never overshoot.

This directly refines the plan:

- It **vindicates the plan's insistence on signed residuals**: an `abs`-based signature would have
  reported this population as "length off by N" and hidden that N is uniformly *short*.
- It **weakens Stage 4 (strategic oscillation across the length boundary) specifically as written.**
  Stage 4's premise is "let the path overshoot `reqLen`, then come back," which needs an operator
  that *shortens* an overshoot. There is no overshoot in this population to come back from — the
  deficit is the opposite, an inability to *extend* a short dead end. Whatever Stage 4 becomes for
  this cluster, it should be framed as "reach a length the random walk can't extend to on its own,"
  not "oscillate around" a boundary the search never crosses from above.

## Finding 2 — pending must-turn dominates the plateau shape (13/15)

13 of 15 plateau signatures carry a **pending must-turn mask** (`mt:<nonzero>`). The two that don't:
R02025 (must-pass + surround deficit) and R02239 (pure length deficit, no structural term at all).
Secondary structural terms appear less often (must-cross in 5, must-pass in 5, surround in 3).

This **generalizes the frozen-signature diagnosis** (which inferred must-turn dominance from just 2
deeply-instrumented levels, and explicitly flagged that as the open generality question) to a
15-level diverse sample: **length-short + pending must-turn is the modal plateau, not a two-level
coincidence.** The mechanism the diagnosis proposed — a required-direction turn is a narrow,
length-coupled target that ordinary epsilon-greedy exploration rarely lands together with exact
length — is consistent with both findings at once (short length *and* an unmade turn co-occurring
as the frozen residual).

## Finding 3 — signatures are diffuse at exact-residual granularity, concentrated at shape granularity

Per-level distinct signatures run 1,133–21,695; the single most frequent signature captures only
2.8–30.4% of restarts (median 6.5%). So a plateau is **not** one exact recurring state — consistent
with the diagnosis's "distinct states, shared deficit shape" framing.

But the diffusion is driven almost entirely by the **exact length residual** fragmenting otherwise-
identical shapes across many `L<n>` buckets (e.g. R01531's top two signatures are `L-6|…|mt2` and
`L-6|I-2|…|mt2` — same structural shape, split only by the int residual). Collapsed to *shape*
(sign of each residual + which structural masks are pending), the population is highly concentrated
and consistent across levels: short-length + pending-must-turn.

**Design implication for Stage 2:** its signature key should be the plateau *shape* (residual signs
+ structural masks), **not** the exact signed length value. Keying on exact `Δlen` would scatter the
conditional-frequency table across thousands of near-empty buckets and dilute the very signal
Stage 2 needs. (This does not contradict Finding 1 — the *sign* of `Δlen` is load-bearing and must
stay in the key; its exact magnitude is what should be bucketed or dropped.)

## Finding 4 — the plateau converges on a fixed structural attractor (revisit/tip cells) + the reached-but-unturned cell

Conditional on the plateau signature, the top overrepresented features are, on essentially every
level, a **specific set of `revisit:<cell>` cells and a specific `tip:<cell>`** at ~100% conditional
rate versus a low global rate (log-odds 8–11) — i.e. plateaued restarts pour through the same small
set of cells and dead-end at the same tip, even though they are not the same exact state. This is
the concrete, per-cell face of "same attractor, different states."

On the must-turn levels, **`mtVisited:<pending-cell>` is prominently overrepresented** (log-odds
~7–11): the pending must-turn cell is being *reached* but not turned correctly — not skipped. A
minority of levels instead over-represent `mtUnvisited` (the cell is never reached: R02279, R02358,
partly R02842), so both failure modes exist, with reached-but-unturned the more common.

These are exactly the features a Stage 2 soft penalty would bias against: the specific revisit
cells that funnel restarts into the attractor, and the specific reached-but-unturned move at the
pending must-turn cell.

## What Stage 1 establishes for Stage 2

1. Use **signed** residuals — confirmed load-bearing (Finding 1), and reused-`computeBadness`
   would have hidden it.
2. Key the conditional-frequency table on the plateau **shape** (residual signs + structural
   masks), not the exact length residual (Finding 3).
3. The overrepresented features worth penalizing are concrete and measurable: attractor
   `revisit`/`tip` cells and the reached-but-unturned must-turn move (Finding 4).
4. Re-scope Stage 4 away from "oscillate around the length boundary" toward "extend a short dead
   end," since the search never overshoots (Finding 1).

## Caveats

- 15 unsolved levels, single gate (index 0), 8 s each — real evidence, not a population-level
  number; same sampling caveat every prior report in this series carries.
- The candidate feature set is a first cut. It deliberately omits some fields the plan listed
  (per-cell `edgeUsage`/axis, incoming/outgoing turn direction at turn cells, self-intersection
  traversal order) — the revisit/tip/must-turn subset already produced a clear, actionable signal,
  so the richer features are deferred to Stage 2 if the soft-penalty prototype needs finer
  discrimination, rather than added speculatively now.
- This is diagnosis, not a fix. No solver policy changed; the next step is the Stage 2 prototype.
