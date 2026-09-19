# H3 remaining-length allocation-value: independent-transfer preflight

> **Status:** active
> **Last evidence:** 2026-09-19 — population-design pass only (no new solver compute); confirms a genuinely disjoint, already-defined eligible pool exists and is large enough to size a transfer at the same effect magnitude as the original finding.
> **Decision:** not yet reached. Precommits the population and decision rule for the "one prespecified independent shared-budget transfer" the workstream authority requires before H3 can open a WS1 gate (`docs/solver-optimization-workstreams.md`, `docs/solver-future-work.md`'s "Automatic selector/profile calibration" entry, `reports/2026-09-17-research-integration-cross-lineage-reconciliation-001.md`'s "H3 -> WS1" section — none of which specify a concrete population, only that the transfer be independent and preferably a bounded work ladder).
> **Remaining gate:** dispatch the population-construction pipeline below (currently unrun) and re-apply `scripts/stress/h3-length-allocation-value-simulation.mjs`'s existing methodology to the resulting data, unchanged.
> **Evidence role:** precommitment. No outcome has been inspected.
> **Population identity:** a disjoint remainder of the pool `reports/2026-09-16-card-e-sizing-and-state-selection-001.md` already defined and partially drew from — see below.

## Why this is needed

`reports/2026-09-17-h3-length-allocation-value-simulation-result-001.md` found ascending-remaining-length ordering has large allocation value (22x random at 2% budget, 16/17 rescues at 20% budget) — but entirely on Card-E's own 156-row population and its own `searchCompletionFromPartialPath` technique. The report's own "Not earned" section and the workstream authority both require an independent transfer before this can license a WS1 selector gate. This report designs that transfer using an already-defined, already-vetted, genuinely disjoint population, so the transfer tests generalization across *population*, not technique (a stronger, cheaper-to-justify first transfer than also varying the technique).

## Population (disjoint by construction)

`reports/2026-09-16-card-e-sizing-and-state-selection-001.md`'s own population contract:

- 439 eligible rows (current post-Class-4-promotion residual, `primaryClass` in {4,5}, referee-valid stored hint present, minus the original 28-id Card-E population, minus 21 `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`-rescued ids, minus 5 pipeline-timing-calibration ids).
- That report drew **200** of the 439 (all 65 class-4 + 135 class-5, proportional by routing regime) for its own frozen cohort.
- **239 eligible rows were never drawn.** This is a real, already-defined, already-vetted remainder -- no new eligibility computation is needed, only a fresh seeded draw from the documented remainder.

**Draw:** all 239 remaining eligible rows, or a proportional-by-routing-regime seeded subsample if the full 239 is judged too expensive once the phenotype screen's own cost is measured on a small pilot slice first (see "Staged cost" below). Seed: `h3-independent-transfer-2026-09-19` (same mulberry32/FNV-1a/Fisher-Yates convention as the Card-E draw). Exclude nothing further -- the 239-row remainder is already independent of every row used by the original H3 finding.

## Instrument (identical to Card-E's, unchanged)

Reuse Card-E's exact three-step pipeline verbatim -- no new code, no parameter changes, since introducing any variation here would confound "does the effect transfer" with "does a different protocol produce it":

1. **Phenotype screen:** `collect-known-solution-prefix-survival.mjs --beam-width=2000 --node-budget=3000000`. Frozen cohort = `solved===false` AND `lossCause==='score-width-culled'`.
2. **Natural exposure census** (context only, not filtering): `census-repair-rollback-windows.mjs --node-budget=30000` and `--node-budget=300000`.
3. **Seeded operator reachability:** `repair-plateau-rollout-classifier.mjs --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000`, using the real `searchCompletionFromPartialPath` operator -- this step's per-row `nodesExpanded` on a reconstructable row is H3's own `reachNodes` feature, and `low`/`high` (beam cull depth) already gives the row's own remaining-length-at-cull proxy `h3-repair-commitment-interface-2026-09-17.json`'s extraction used.

## Staged cost discipline (per "prefer the cheapest information-value test")

Card-E's own pipeline is expensive at the reachability step specifically (2,000,000-node cap x 2,000 rollout trials per reconstructable candidate). Per standing practice, run the phenotype screen (step 1, cheap: a single beam pass per id) on the full 239-row remainder first and inspect only its *count*, not its content, before committing to the full reachability step's cost on whatever cohort results -- exactly the sequencing Card-E's own original report used (156-row cohort size was known before the expensive reachability step ran). If the phenotype screen yields a cohort far smaller than needed to detect an effect of comparable size to the original (very unlikely given the original screen's 78% conversion rate held on an independent 200-row draw), stop and report a sizing failure rather than forcing the expensive step.

## Decision rule (fixed before any dispatch)

Feed the resulting `{reachNodes, remainingLength}` per reconstructable row into `scripts/stress/h3-length-allocation-value-simulation.mjs`'s existing four-order simulation (ascending length, descending length, dataset order, random baseline; same per-row cap, same budget grid 2%-100%), unmodified:

- **Ascending-length order clears >=50% of achievable rescues at <=20% of full-cap-for-all budget** (the original found 94% at 20%): confirms the allocation-value effect transfers across population. Proceed to the smallest production consumer (a bounded, matched-work pilot ordering near-miss completion-search candidates by ascending remaining length within a fixed shared budget), per standing rule ("positive premise -> smallest consumer").
- **Ascending-length order still dominates random by a large margin (e.g. >=5x at low budget) but misses the 50%/20% bar**: the effect transfers directionally but is weaker on this population -- report the actual numbers, do not round up to "transfers," and treat the next step (consumer pilot vs. further characterization) as an open call for the workstream authority, not a foregone yes.
- **Ascending-length order is statistically indistinguishable from random** (the population is simply too small to tell, or the effect genuinely does not recur): this closes the transfer question negative on this attempt. Given the population is disjoint but drawn by the *same* eligibility/regime-proportional procedure as the original, a negative result here would be a real, decision-relevant finding (population-specific, not technique-specific) and should feed back into whether H3's allocation-value claim is Card-E-specific before any further transfer attempt.

No outcome has been inspected before this precommitment; no dispatch has occurred as of this report.

## What this does not authorize

- Does not itself open a WS1 selector gate under any outcome above -- a positive transfer nominates the smallest production consumer pilot, it does not authorize production deployment of length-first ordering.
- Does not vary the technique (`searchCompletionFromPartialPath` only) -- a technique-independent transfer is a separate, later question if this one is positive.
- Does not commit to running the full 239-row remainder if the staged phenotype screen suggests a smaller draw would already be decisive; the exact draw size is fixed only after that screen's count, not its content, is known.
