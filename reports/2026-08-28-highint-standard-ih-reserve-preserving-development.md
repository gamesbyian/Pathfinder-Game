# Reserve-preserving STANDARD intersection-harvest exposure

> **Status:** concluded-negative
> **Last evidence:** 2026-08-28 — selected mechanism replay run 33151801662 was +1/-1: R02440 rescued, R02965 still regressed
> **Decision:** close the reserve-preserving placement descendant; preserving suffix membership did not preserve usable work for the old winner
> **Remaining gate:** none; the prespecified disjoint Gate 2 was correctly never executed

## New premise

The append-last parent established two facts:

1. the missing `beam:intersectionHarvest@beam2000` can directly rescue a real sequential-ladder miss under strict 67M work (`R02440`);
2. appending it at the end can regress an existing winner because the main-loop late reserve protects a fixed final five configs.

The parent’s 120-level development result was 56/120 control versus 55/120 treatment, 0 gains / 1 loss, with treatment participation on 68/120 rows. The sole loss, `R02965`, is mechanistically clean: the old `beam:objectiveFirst@beam5000` winner was the first protected suffix member in control, but append-last pushed it outside that suffix and cut its attempt allocation from 6,465,587 to 5,412,314 work.

The descendant changes **placement only**. It exposes the same STANDARD-IH beam in the same two very-high-intersection rules, but inserts it immediately before the old protected five-config suffix. No reserve is widened and the five old protected configs retain exactly the same suffix membership.

## Gate 1: selected mechanism replay

Population is deliberately selected and diagnostic:

- `R02440`: parent’s selected direct gain;
- `R02965`: parent’s population regression.

Both arms use nodeBudget 50M, strict workBudget 67M, non-binding 24h wall safety, attempt telemetry, same solver revision.

Pass only if:

- treatment still solves `R02440`;
- treatment also solves `R02965` (restoring the parent regression);
- the STANDARD-IH action is actually reached on the rescue row;
- no error/deadline truncation invalidates either comparison.

This replay is tuning evidence by construction and cannot promote anything.

## Gate 1 result

GitHub Actions run `33151801662` completed the selected two-row mechanism replay.

| level | control | reserve-preserving treatment | interpretation |
|---|---|---|---|
| `R02440` | fail | **solve** | the inserted `beam:intersectionHarvest@beam2000` still directly rescues the known gain, now earlier in the ladder |
| `R02965` | **solve** | fail | preserving suffix membership is insufficient to preserve the old winner's usable work |

Result: **+1 / -1**. Gate 1 required treatment to solve both rows, so the descendant fails immediately.

The remaining mechanism is budget dilution inside the preserved suffix. On `R02965`, the old winning `beam:objectiveFirst@beam5000` remains protected, but the newly inserted 2K beam consumes work before it. Control gives the 5K objective attempt about 6.797M work and it solves after about 6.466M. Treatment leaves it about 6.327M and it stops about 134K work short of the known solve. The fixed-work envelope is doing exactly what it should: a useful extra action is not free merely because suffix membership is preserved.

This closes the descendant. Do not execute the prespecified disjoint Gate 2, and do not tune another nearby placement from these two selected rows without a materially new scheduler premise.

## Gate 2: disjoint development cohort

Gate 1 did not pass. The workflow below was prespecified but **never executed**, preserving the disjoint cohort.

The cohort is frozen before Gate 1 outcome:

1. deterministically rebuild the spent append-last parent sample (seed `20260828`, SHA-256 `dc3a013471f58065fa12425b59b3b6f99fd05780facd9eb9eaa46ec97cb4fbc6`);
2. exclude those 120 rows plus the four original census-selected replay IDs;
3. from the remaining mechanics-eligible Corpus-2 rows, draw a deterministic random 120 with seed `20260829`.

Selection is mechanics-only: control lacks the exact STANDARD-IH action and the descendant flag adds it. No outcome/hint/history enters sampling.

Both arms again use strict 67M total work.

Development success requires:

- complete paired coverage;
- zero errors/deadline truncations;
- verified treatment participation;
- **zero control-only losses**;
- at least one treatment-only solve.

A 0/0 result with verified participation closes this descendant. Any loss closes it. Do not tune from Gate-2 changed rows into another nearby placement without a materially new premise.

## Confirmation

No confirmation cohort is reserved yet. If and only if the disjoint development gate passes, prespecify a new descendant-specific independent confirmation before materializing treatment outcomes. The parent’s unexecuted confirmation protocol is not automatically inherited because this descendant changes allocation context.

## Production state

Default remains OFF. Both the append-last parent and reserve-preserving descendant are closed negatives. No live interactive production behavior changed.
