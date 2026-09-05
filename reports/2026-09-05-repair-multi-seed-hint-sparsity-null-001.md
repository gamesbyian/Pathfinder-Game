# `data/stress/hints-random/` cannot cheaply confirm the repair multi-seed-retry truncation nomination — non-zero seed salts are too rare and never co-occur per level

> **Status:** inconclusive
> **Last evidence:** 2026-09-05 — `provenance[0].search.seedSalt` for all `repair`-technique hints across `data/stress/hints-random/`'s 1,700 files, no new dispatch
> **Decision:** checked whether this session's hint-provenance stash could cheaply cross-validate `2026-09-04-repair-late-probe-multi-seed-retry-tail-audit-001.md`'s discovery-only finding (seed 1 never uniquely best, seed 7 adds nothing beyond seeds 1-6, on a 40-level sample) against the full 1,700-level population — it cannot. In a 100-file sample, 101/105 repair hints carry `seedSalt=0` (the ordinary, non-multi-seed-retry tier); only 4 carry a `REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS` value (`[1,2,3,4,5,6,7]`), and across the full 1,700-file corpus **zero** levels have 2+ distinct non-zero seed salts recorded among their repair hints — the mechanism is reached far too rarely in this stash, and even when reached, only ever leaves one seed's hint behind, for a same-level seed-vs-seed cost comparison to be possible.
> **Remaining gate:** none locally — this closes the "can an already-collected dataset answer this more cheaply" question in the negative for this specific dataset. The opt-in ledger's own stated requirement (a population-scale fixed-work confirmation) stands unchanged; this report does not provide it.
> **Evidence role:** forensic/methodological — a documented negative check preventing a future investigator from re-attempting this same shortcut
> **Selection:** whole hints-random population (1,700 files) for the co-occurrence check; 100-file sample for the seedSalt-distribution characterization

## Method

Per the future-work-mining checklist's "has a newer dataset made this cheaper than when deferred?" question, checked whether `data/stress/hints-random/`'s 172,604-hint provenance stash (generated after the original 40-level discovery) could supply the population-scale seed-comparison evidence the ledger's `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` row says is still needed, without new dispatch.

## Result

| | value |
|---|---:|
| repair hints sampled (100 files) | 115 |
| `seedSalt=0` (ordinary tier) | 101 |
| non-zero `seedSalt` (multi-seed-retry tier) | 4 |
| levels (full 1,700-file corpus) with 2+ distinct non-zero seed salts among repair hints | **0** |

## Interpretation

This is a genuine, if modest, negative result: it does not confirm or refute the original 6-seed-truncation nomination, but it does establish that this particular already-collected dataset cannot be repurposed to test it cheaply, closing off what would otherwise look like an obvious "check the bigger corpus" shortcut. The underlying reason is structural rather than a data-quality accident — the multi-seed-retry tier is, by design, a rarely-reached dead-last mechanism (consistent with `2026-09-04-repair-late-probe-multi-seed-retry-tail-audit-001.md`'s own framing), and the hint-corpus generation process apparently records at most one seed's result per level even when the mechanism does engage, so no same-level seed-vs-seed comparison survives into this stash regardless of corpus size.

## What this does not establish

- Does not test whether a different, non-hint-provenance data source (e.g. raw per-attempt lifecycle telemetry from a production run, if one exists with multi-seed-retry attempts recorded individually) could supply this comparison more cheaply than a fresh dedicated confirmation run.
- Does not revisit whether the original 40-level discovery's finding is itself reliable — only that this specific larger corpus cannot independently check it.
- 100-file sample for the seedSalt-distribution characterization; the full-corpus zero-co-occurrence check used all 1,700 files.
