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

**Draw:** all 239 remaining eligible rows for the phenotype screen. Seed `h3-independent-transfer-2026-09-19` remains reserved only for a future separately precommitted subsample if the full phenotype-positive cohort proves too expensive. The current preflight does **not** authorize choosing a reachability subsample after seeing phenotype identities or other row content. Exclude nothing further from the phenotype screen: the 239-row remainder is already independent of every row used by the original H3 finding.

## Independence and transfer dimensions

“Independent transfer” here means **disjoint row/sample population under the same already-defined eligibility frame**. It deliberately does not vary every ancestry dimension.

Held independent/fresh:

- no row used in the original H3 Card-E analysis is reused;
- the transfer cohort is selected from the untouched remainder before any transfer outcome is observed.

Held common-mode by design:

- source construction / eligibility frame;
- the `searchCompletionFromPartialPath` operator;
- phenotype screen and reachability instrumentation;
- remaining-length representation;
- allocation simulation and budget grid;
- repository implementation and current research framing.

Therefore this experiment answers whether the allocation-value effect recurs on new eligible rows from the same broader source frame. It does not establish cross-generator transport, technique-independent scheduling value, robustness to another completion-search representation, or robustness to an independent observer/analysis implementation.

A positive result is a **population transfer within one technique/source frame**. A negative result is scoped there as well.

### Target-support checks

Before interpreting the transfer, report descriptive overlap between the new and original Card-E cohorts on dimensions that directly shape the scheduling problem:

- remaining-length range/distribution;
- reconstructable fraction;
- reach-node/work range for reconstructable rows;
- beam-cull depth/routing regime;
- path/intersection-demand range where already available;
- mechanics/gate-count mix where retained descriptors already expose it.

These support checks may explain a transfer failure or constrain generalization, but they must not alter the frozen population or primary decision rule.

## Instrument (identical to Card-E's, unchanged)

Reuse Card-E's exact three-step pipeline verbatim -- no new code, no parameter changes, since introducing any variation here would confound "does the effect transfer" with "does a different protocol produce it":

1. **Phenotype screen:** `collect-known-solution-prefix-survival.mjs --beam-width=2000 --node-budget=3000000`. Frozen cohort = `solved===false` AND `lossCause==='score-width-culled'`.
2. **Natural exposure census** (context only, not filtering): `census-repair-rollback-windows.mjs --node-budget=30000` and `--node-budget=300000`.
3. **Seeded operator reachability:** `repair-plateau-rollout-classifier.mjs --backoffs=0 --rollout-trials=2000 --rollout-node-cap=5000 --close-gap-node-budget=2000000`, using the real `searchCompletionFromPartialPath` operator -- this step's per-row `nodesExpanded` on a reconstructable row is H3's own `reachNodes` feature, and `low`/`high` (beam cull depth) already gives the row's own remaining-length-at-cull proxy `h3-repair-commitment-interface-2026-09-17.json`'s extraction used.

## Staged cost discipline (per "prefer the cheapest information-value test")

Card-E's own pipeline is expensive at the reachability step specifically (2,000,000-node cap x 2,000 rollout trials per reconstructable candidate). Run the phenotype screen (step 1, cheap: a single beam pass per id) on the full 239-row remainder first. The phenotype screen is an explicit sizing gate, not permission for post-hoc scientific sampling.

After the screen there are only two authorized paths:

1. run reachability on **all phenotype-positive rows**; or
2. if that cost is unacceptable, stop before any reachability outcome is collected and write a new pre-outcome amendment that freezes an exact deterministic subsample size, seed, stratification rule and inclusion list.

The current report deliberately does not guess that future sample size. This removes the earlier discretion to choose a "large enough" subsample after observing the screen. If the phenotype-positive count is too small to justify the expensive stage, report a sizing failure and stop.

## Decision rule (fixed before any dispatch)

Feed the resulting `{reachNodes, remainingLength}` per reconstructable row into `scripts/stress/h3-length-allocation-value-simulation.mjs`'s existing four-order simulation (ascending length, descending length, dataset order, random baseline; same per-row cap, same budget grid 2%-100%), unmodified:

- **Transfer-positive:** ascending-length order clears >=50% of all achievable rescues at one of the already-fixed budget points at or below 20% of full-cap-for-all budget. This confirms the allocation-value effect transfers across population. Proceed to the smallest production consumer (a bounded, matched-work pilot ordering near-miss completion-search candidates by ascending remaining length within a fixed shared budget), per standing rule ("positive premise -> smallest consumer").
- **Directional-but-below-transfer-bar:** if the transfer-positive rule fails, inspect only the already-fixed 2% budget point. Classify directional evidence only when ascending length solves at least 2 rows **and** `ascendingLength >= 5 * randomMean` across the simulation's frozen 50 seeded random orders. Report the actual values and leave consumer-pilot vs. further characterization to the workstream authority; do not call this a transferred effect.
- **No-prespecified-transfer-signal:** all remaining complete, valid outcomes close this population-transfer attempt negative. Do not substitute an undefined post-hoc significance test or search the other budget points for a friendlier ratio. A negative here is population-specific and should feed back into whether H3's allocation-value claim is Card-E-specific before any further transfer attempt.
- **Blocked:** missing rows, protocol/instrument mismatch, or an incomplete reachability cohort blocks the decision rather than counting as negative.

No outcome has been inspected before this precommitment; no dispatch has occurred as of this report.

## What this does not authorize

- Does not itself open a WS1 selector gate under any outcome above -- a positive transfer nominates the smallest production consumer pilot, it does not authorize production deployment of length-first ordering.
- Does not vary the technique (`searchCompletionFromPartialPath` only) -- a technique-independent transfer is a separate, later question if this one is positive.
- Does not authorize an adaptive reachability sample. The full phenotype-positive cohort is the default expensive-stage population; any smaller cohort requires a new pre-outcome amendment that freezes the exact deterministic sample before reachability outcomes are collected.
