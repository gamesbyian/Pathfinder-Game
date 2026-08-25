# Technique census reverse-oracle diagnosis

> **Status:** resolved / provenance correction
> **Last evidence:** 2026-08-25 — immutable run `32459711208`, exact historical orchestration at `e5034e8c433eb32ab6d1882d80271dc277b91b0f`, lifecycle reducer audit, and census-plan coverage audit
> **Decision:** the former P0 “predecessor-dependent admissible-order” anomaly was created by stale lifecycle-stage attribution plus missing compound census cells. The eight rows previously described as admissible-order wins were later diverse-beam retry wins. There is no surviving evidence from those rows for deterministic cross-stage teaching or MP/MC memo dependence.
> **Remaining gate:** none for the former P0. If a future matched action/config reproduces fresh-versus-preceded divergence, use the bounded paired deterministic trace and the resource/order stop tree described below.
> **Evidence role:** forensic correction
> **Selection:** observational

## Why this report exists

The technique census contained production solves that did not appear in isolated T1 cells. Initial joining through `winningConfig`, followed by a stale lifecycle reducer, made several rows look like deterministic admissible-order actions that somehow became stronger after predecessor stages.

That interpretation was wrong. Re-reading the immutable production artifact and the exact historical orchestration shows that the relevant rows were solved by later beam retry stages.

## Repair-probe result

### `R01936` remains explained by seed 1

Current production showed a salt-0 repair probe fail at about 2M nodes, followed by a salt-1 probe solving at about 1.79M nodes. A fresh-process direct probe with salt 1 reproduced the solve without any preceding ladder state.

Therefore this row is not evidence of hidden cross-stage teaching. It is a distinct deterministic randomized action omitted by the isolated salt-0 cell.

The other historical repair-probe rows remain historical observations only where current-code seed controls did not reproduce them. Repair ordering/code changed, so those negatives do not retroactively erase historical wins.

## Correction: the eight alleged admissible-order wins were beam retry wins

The affected rows are:

- `R02493`
- `R02088`
- `R02536`
- `R01356`
- `R03195`
- `R02690`
- `R03230`
- `R03238`

The immutable combined artifact from GitHub Actions run `32459711208` records their actual successful attempts. In every case, the admissible-order attempts failed before a later diverse-beam retry solved the level.

Six rows were solved by `beam:intersectionHarvest@beam5000(diverse)` and one additional intersection row plus the objective row were also late retry-stage diverse-beam successes; `R02690` used `beam:objectiveFirst@beam5000(diverse)`. The relevant successful retry stages were `dedup-near-tie-retry` and `connectivity-axis-exhausted-retry`, not `admissible-order`.

`R02088`, the original forensic target, is explicit:

- ordinary `ida:default` failed;
- the dedup-near-tie retry ladder ran;
- `ida:none` failed in the non-default admissible retry;
- `beam:intersectionHarvest@beam5000(diverse)` then solved in `connectivity-axis-exhausted-retry`.

There is therefore no admissible-order production success to reproduce on `R02088`.

## Root cause: stale lifecycle reducer

`scripts/stress/lifecycle-failure-map.mjs` historically carried a hard-coded technique list. New retry stages were added to production orchestration without being added to that reducer.

The historical/current stale list could not represent stages such as:

- `dedup-near-tie-retry`;
- `admissible-order-non-default-retry`;
- `connectivity-axis-exhausted-retry`;
- later retry tiers.

Its “last reached before solve” logic therefore selected the last *known* old stage, not the actual last reached production stage. A solve after `ida:none` in a later beam retry could be mislabeled `admissible-order` even though the immutable attempt rows and `techniqueLifecycle` contained the later stage.

The reducer is being changed to derive stage order from each artifact's `techniqueLifecycle` keys rather than maintain a second hard-coded stage registry. A regression fixture covers a solved row whose winner is a newly introduced later stage.

## Why the census did not contradict the production beam wins

The T1 census did contain promoted retry-flag variants, but not the exact production-winning compound configurations.

`build-technique-census-plan.mjs` promoted:

- plain `beam:intersectionHarvest@beam5000` with `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` disabled;
- plain `beam:objectiveFirst@beam5000` with that prune disabled;
- plain intersection/objective 5K beams with `STRATEGY_DEDUP_NEAR_TIE_RETENTION` disabled.

The historical winners were **diverse** 5K beams under those retry overrides. Diversity is part of the operational configuration, not decoration. The census therefore measured adjacent cells, not the exact winning cells.

Consequently the inference chain “isolated admissible fails, production admissible succeeds, therefore predecessor state matters” had two broken joins:

1. the production winner was not admissible-order;
2. the exact diverse-beam + retry-override winner was not represented by the compared census cell.

No MP/MC memo hypothesis is required to explain these rows.

## Historical replay lesson

The first attempted forensic replay also exposed an evidence-contract ambiguity worth retaining. The frozen stress workflow used a 50M cumulative node budget plus a 67M `workSpent` budget and internal per-stage envelopes. Replaying the level through a generic “100M node budget” solve did not recreate that action allocation and consumed more than 100M cumulative nodes before solving elsewhere.

A historical result is only reproducible when the action identity, stage override, cumulative budget currencies, and local stage envelope are all reconstructed. A headline node number is not a sufficient execution contract.

## Reusable diagnostic stop tree

The former P0 premise is closed, but the diagnostic procedure remains useful for any future genuine deterministic sequence-dependence case.

For the same gate/action/config under a matched effective resource envelope:

1. **Resource/context differs.** Fix the action contract first. Unequal-budget behavior is not semantic carryover.
2. **Resource/context agrees but initial child order differs.** Inspect ranking/bound inputs, including MP/MC lower-bound memo values, before broad state diffing.
3. **Initial child order agrees.** Use the bounded paired deterministic trace to locate the first later multi-child decision divergence, then add a narrower prune/one-child seam only if that trace proves insufficient.

The first child order remains a useful semantic checksum. It simply was never legitimately reached for these eight rows because their supposed admissible-order wins did not exist.

## Scheduler consequence

The special sequence-ambiguity quarantine for these eight rows is removed.

Do not treat the neighboring plain-beam promoted census cells as causal measurements of the diverse retry winners. If those exact compound cells become decision-relevant, assay them explicitly with stable action/config identity and canonical `workSpent`. Do not launch a broad recensus solely to repair this historical attribution error.

The general scheduler rule remains: any genuinely intentional producer -> receptor handoff must have typed identity and charge producer work. Nothing in these eight rows establishes such a handoff.

## Current disposition

The reverse-oracle discrepancy now has a simpler decomposition:

- repair seed diversity explains at least one historical production-only repair row;
- `winningConfig` alone was insufficient for stage attribution;
- the lifecycle failure-map reducer silently fell behind the production stage vocabulary;
- the eight alleged admissible-order wins were actually diverse-beam retry wins;
- the census did not test the exact diverse-beam + retry-override compound cells;
- therefore this evidence set does **not** demonstrate predecessor-dependent deterministic search.

The former P0 blocker is closed. Preserve the paired deterministic trace as a targeted research instrument for future genuinely matched anomalies, not as justification to continue memo-state archaeology here.
