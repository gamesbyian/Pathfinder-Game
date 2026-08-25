# Technique census reverse-oracle diagnosis

> **Status:** active
> **Last evidence:** 2026-08-24 — exact-commit fresh controls plus current-head static lifetime/accounting audit
> **Decision:** `R01936` is explained by repair seed diversification, but the eight historical admissible-order wins remain genuinely predecessor-dependent at their exact historical commit. Do not use those rows for causal scheduler/cap inference until the dependency is localized. The next diagnostic is resource/context equality, then initial admissible child ordering as a semantic checksum; if ordering differs, clear MP/MC lower-bound memos before broader state diffing.
> **Remaining gate:** reproduce one unmodified historical full-ladder winner and compare fresh-versus-preceded admissible dispatch under the same explicit action/resource contract; record resource context and first child order, then either clear lower-bound memos or trace the first later tree divergence.
> **Evidence role:** forensic
> **Selection:** observational

## Why this report exists

The technique census contained production solves that did not appear in isolated T1 cells. Initial joining through `winningConfig` made several rows look like ordinary repair or beam capability that somehow became stronger after predecessor stages.

Lifecycle/stage attribution corrected that interpretation:

- six historical rows were `repair-probe` wins;
- eight were `admissible-order` wins;
- the eight beam-labelled rows were not main-beam wins at all.

The resulting question is narrower: which apparent production-only wins are ordinary missing action identity, and which really depend on prior ladder history?

## Repair-probe result

### `R01936` is causally explained by seed 1

Current production showed a salt-0 repair probe fail at about 2M nodes, followed by a salt-1 probe solving at about 1.79M nodes. A fresh-process direct probe with salt 1 reproduced the solve without any preceding ladder state.

Therefore this row is not evidence of hidden cross-stage teaching. It is a distinct deterministic randomized action omitted by the isolated salt-0 cell.

The other five historical repair-probe rows did not reproduce on current code at salts 1 or 2 under the tested ~2M-node scale. That does not invalidate their historical wins because repair ordering/code changed. It does prevent the explanation “salt 1 explains all six” from being generalized.

## Admissible-order result

The eight historical admissible rows are materially different.

At production commit `e5034e8c433eb32ab6d1882d80271dc277b91b0f`, direct fresh-preparation controls tested the plausible/canonical admissible profiles at generous deterministic node ceilings. They failed from a fresh prepared state even though the production ladder at that same commit had solved later in the admissible tier.

The rows include `R02493`, `R02088`, `R02536`, `R01356`, `R03195`, `R02690`, `R03230`, and `R03238`.

The decisive property is not the exact per-row inferred profile label. It is that deterministic admissible-order search can fail fresh at the exact historical implementation while succeeding after preceding ladder work.

This is genuine attempt-history dependence or an unprojected execution-context difference.

## What has been ruled down statically

### Dirty DFS/beam/repair backing buffers

Low probability for this anomaly. Admissible-order creates a new logical state and calls `createState` without the reusable DFS/beam/repair state-buffer slot. Current reusable buffers are per-prepared-level and cleared on reuse.

### PRNG history

Very low probability. Admissible-order has no random seed input. A changed deterministic child order cannot be explained by PRNG stream position.

### Simple leaked retry config

Lower probability on current code. Inspected whole-ladder/repair retry overrides restore `_cfg` through guarded save/restore paths. This does not prove every historical version was leak-free, but no obvious current leak explains the anomaly.

### Cross-stage accounting/resource state

High-priority control, because this architecture has had real bugs of this class. Stages share mutable per-solve fields such as cumulative nodes, `_workMeter`, `_workCap`, and other execution context. Historical late tiers have inherited depleted caps or been starved by predecessor cumulative-node spending.

Accounting can explain whether/how much search runs. By itself it cannot explain a different first deterministic child ordering when ranking inputs are otherwise identical.

### MP/MC lower-bound memo state

Leading visible semantic suspect if first ordering differs under equal resource context.

Admissible ranking/pruning reaches exact must-pass/must-cross lower-bound memo tables populated on the shared prepared level. Their intended contract is pure exact memoization, so warm versus empty should not change values or ordering. A measured difference would indicate a key/value/lifetime defect rather than beneficial learning.

A later discovered fixed-width must-pass memo-key collision is not the mechanism for these eight historical rows: their objective cardinalities are too small to set the colliding high bit.

## Smallest diagnostic, in order

At the exact target admissible dispatch, compare fresh and preceded runs using the same gate/action/config and intended resource envelope.

Record:

- `prep._workMeter.units`;
- `_workCap` and `_strictWorkCap`;
- cumulative `_metrics.nodesExpanded`;
- supplied admissible node and wall budget;
- effective config/forced-step state;
- gate and canonical action/config identity;
- initial admissible child order, ideally with primary slack and tie-break values.

Interpretation:

1. **Resource/context differs.** Normalize the action contract first. Do not call unequal-budget behavior semantic carryover.
2. **Resource/context agrees but initial child order differs.** Clear MP/MC lower-bound memo tables and rerun. Inspect only ranking/bound inputs before broad `PrepLevel` diffing.
3. **Initial child order agrees.** Trace the first later tree divergence and inspect the prune/bound/state inputs at that exact point.

The first child order is a useful semantic checksum because it separates “something already changed before search” from “the searches diverge later.”

## Scheduler consequence

Until this dependency is understood:

- mark affected admissible cells sequence-ambiguous;
- do not estimate causal continuation value from their historical predecessor-conditioned success;
- scheduler analyses may include a conservative frontier that excludes them and an explicitly optimistic sensitivity view that includes them;
- do not workaround the issue by always running the historical predecessor ladder first.

If the dependency is intentional and useful, it must become a typed producer -> receptor contract whose producer work is charged. If accidental, eliminate it and add a regression fixture.

## Current disposition

The broad reverse-oracle question is mostly resolved:

- repair seed diversity explains at least one historical production-only repair row;
- winning-config labels were insufficient for stage attribution;
- the eight admissible-order rows are not ordinary isolated wins hidden by provenance;
- their unresolved phenomenon is now a very small deterministic lifetime diagnostic.

The P0 queue item owns execution priority. This report owns the forensic evidence and localization logic.
