# Post-promotion production-boundary refresh 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — full-corpus control refresh (`solver-stress-refresh.yml` run `35066677597`) and residual-atlas rebuild on `main@16114b80` (includes the Class-4 dead-last-retry promotion, PR #1815)
> **Decision:** the production boundary and residual atlas are refreshed and current. No new actionable gate is exposed; this is confirmatory bookkeeping.
> **Remaining gate:** none from this refresh. Live queue is unchanged: Class-5 offline/contrast-starved, Class 1-3 needs a new premise.
> **Evidence role:** standing freshness-reconciliation after a material capability promotion, per `solver-capability-memory.md`.

## Why this ran

The Class-4 dead-last-retry promotion (`reports/2026-09-16-class4-113-allocation-promotion-001.md`) changed production capability; the residual atlas and production-boundary counts quoted in `docs/solver-optimization-workstreams.md` predated it and were flagged stale.

## Result

New production boundary (run `35066677597` @ `16114b80`): **101/102 C1 + 1,169/1,700 C2** (previously `34683011115`: 100/102 + 1,048/1,700). Full-population diff against the prior boundary run: **+121 gains, 0 losses** on Corpus 2 — larger than the 86 gains directly measured on the tested 113-row population, confirming the promotion's real production reach extends slightly beyond that specific tested intersection (expected: production now runs the retry on every portal-bearing residual row, not only the 113 nominated by the historical gain-id intersection). Zero losses confirms at full production scale what the 113-row population's byte-identical non-target-stage tables already showed structurally.

Refreshed residual atlas (`analyze-post-1029-residual-atlas.mjs` against the new baseline/lifecycle + existing `33717910218` census + current `hints-random`): residual **531** (down from 652), classes 1-5 = **17 / 30 / 23 / 71 / 390** (previously 22 / 39 / 37 / 159 / 395 pre-promotion, itself already a hint-provenance-drifted read of the original 22/39/37/123/431). Class 4 dropped most sharply (159 → 71), consistent with the promotion; classes 1-3 also shrank somewhat as a byproduct of the smaller overall residual pool, not new evidence for those gates.

## Disposition

Refresh complete. Update `docs/solver-optimization-workstreams.md`'s production-boundary line to this run and remove the stale flag. The remaining 71 class-4 rows and other residual buckets are not a new earned allocation population — querying them would need a fresh nomination source (e.g., a new evidence-panel reconciliation), not a re-application of the already-spent historical gain-id intersection this session's 113-row population already exhausted.

## Next gate

None newly exposed. Live queue: Class-5 stays offline/contrast-starved pending a separately justified human-parent question; Class 1-3 needs a materially different must-turn placement/selector or changed class-1 allocation contract before reopening.
