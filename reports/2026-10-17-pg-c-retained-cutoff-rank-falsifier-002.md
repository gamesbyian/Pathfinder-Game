# PG-C cheapest near-cutoff handoff rank falsifier 002

> **Status:** concluded-negative
> **Last evidence:** 2026-10-17 — inspected the previously retained score-width forensic rows at beam widths 2000 and 5000 for the same 28 frozen historical first-loss parents and cross-joined the four prior known-hint-splice repair positives; no new search work or hint-conditioned treatment was run.
> **Decision:** **do not start by seeding repair from a fixed small near-cutoff tail of scored-out beam candidates expecting to recover the four historical hint-splice solves.** At width 2000, **0/4** of those known-successful hindsight prefixes ranked among the first 256 candidates outside the retained pool; at width 5000, **1/4**. None of the four is within the first 256 discarded candidates at both widths. A top-256-only transfer cannot select their historical known-live path at the inspected loss point, although it could select *another* currently unlabelled viable path.
> **Remaining gate:** choose and preregister a current-state, hint-independent selector that can reach deeper than the immediate-score-cutoff tail without enumerating/repairing the whole rejected pool. Confirm source prefix reconstructability and cost before any beam-to-repair treatment, preferably beginning with bounded passive candidate-selection statistics on the four splice-positive and 24 splice-negative parents. Do not promote or claim general failure from post-hoc K thresholds.
> **Research question:** `WS2-FIRST-LOSS-CAUSAL-REFRESH`
> **Evidence role:** retrospective cheapest-idea falsifier (post-hoc K sensitivity; not independent confirmation).
> **Selection:** exactly the same preexisting 14+14 frozen parents in [PG-C 001](2026-10-17-pg-c-phase9-retained-first-loss-survey-001.md), no new sample or reclassification.
> **Population identity:** the September 11 beam-prefix cull and repair known-live-splice material; all 28 source-ID matches validated in [machine rank ledger](stress/pg-c-retained-cutoff-rank-test-20261017-001.json).
> **Inference scope:** historical known-winner support rank in an observed beam frontier; not cold capability and not the rank of all viable alternate branches.
> **Production effect:** none.

## Source-only observation

The existing `scoreWidthForensics` arrays retain `candidatePoolSize`, `bestKnownRank`, `scoreMarginToCutoff` and loss class, but their source runs set `retainAllRemovalDetails=false` and `retainRankedPoolDetails=false`. They **do not store replayable candidate paths**. That does not bar the cheapest retrospective **rank** test: for an already-known valid historical hint family, define rank offset as `bestKnownRank - beamWidth`. An observed best supported rank within `beamWidth + K` would be visible in the first K rejected by score rank; otherwise a top-K discarded selector cannot retrieve that particular supported family at the loss event.

The following describes sensitivity to hypothetical K, **not a preregistered treatment** and not a cold run. All statistics are counts of historical labels present by rank, not distinct new solver successes.

| Rejected-tail size K | Width 2000: supported 28 | Width 2000: 4 repairable | Width 5000: supported 28 | Width 5000: 4 repairable |
|---|---:|---:|---:|---:|
| 64 | 1 | 0 | 0 | 0 |
| 128 | 3 | 0 | 2 | 1 |
| 256 | 6 | **0** | 3 | **1** |
| 512 | 10 | 1 | 6 | 1 |
| 1024 | 21 | 4 | 11 | 2 |
| 2048 | 28 | 4 | 21 | 3 |
| 4096 | 28 | 4 | 28 | 4 |

The 28 at width 2000 are all classified `A-clearly-mis-ranked` in their original forensic rows; at width 5000 the breakdown is 27 clearly mis-ranked and one saturation-classified. This is consistent with the September 11 result: increasing the retained width 2.5× merely pushes observed label extinction a few steps later.

## Four exact historical hint-splice positives

| Parent | Rank below 2000 cut | Rank below 5000 cut |
|---|---:|---:|
| R02530 | +919 | +2594 |
| R02733 | +745 | +1315 |
| R02590 | +787 | +71 |
| R02897 | +383 | +613 |

So the cheapest imaginable fixed-score-tail selector with K=256 (already 256 repair starts for each parent if used exhaustively!) cannot nominate any of the four original successful splice prefixes at width 2000. At K=1024, all four finally become rank-accessible under width 2000 but this is a far larger state-candidate volume than a near-typical-budget retry can treat naively. It is not necessary to run that wasteful literal expansion as the first implementation.

## Valid limits and constructive next step

A score-rank-only selector might still find an alternate LIVE prefix or a better repairable one. The hindsight seeded success does not establish that the recorded hint-supported candidate was the only good starting point. This finding should therefore **reject only the narrow claim** that a modest fixed top-K rejected tail will recover the known four conditional operator successes. The next cheap step is a diversity/source-informed or obligation-conditioned selector that observes actual current candidates, not oracle labels. It requires a source replay artifact containing reconstructed prefix identities; the existing rank-forensic files cannot supply that by themselves. Make that a small passive, bounded candidate-capture gate before either hint-labelled annotation or active repair handoff.

The broad PG-C first-irreversible-loss question remains active, unresolved; no first-causal-loss class or cold solve is claimed here.
