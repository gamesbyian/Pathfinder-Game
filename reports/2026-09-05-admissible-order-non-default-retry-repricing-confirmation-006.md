# 6th confirmation attempt: clean, complete, zero-loss — the repriced fraction changes nothing on this population

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — control run [`33956553409`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33956553409) (fraction=1.0) and treatment run [`33956555296`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33956555296) (fraction=0.18), both against the same narrowed 76-id population from `-004`, both completed with `conclusion=success` and **all 76/76 shards succeeding in both arms** (0 cancelled) — the first fully clean dispatch in this six-attempt line
> **Decision:** both arms produced the **identical solved-id set**: 12/76 solved (`R00707, R01504, R02179, R02271, R02472, R02646, R02655, R02770, R02947, R02974, R03120, R03188`), and all 64 unsolved ids report the same clean, structured `work-budget-reached` status in both arms — not a single gain, not a single loss, and no censored/errored/ambiguous outcomes on either side. Per the confirmation's own pre-registered acceptance framing, **zero-loss supports nominating the repriced 0.18 fraction for a properly-scoped promotion path** — the smaller shared work-pool allocation for `admissible-order-alternate-tiebreak-retry` did not cost this population a single solve.
> **Remaining gate:** the promotion path itself (moving from "confirmed no solve-set loss on this 76-level population" to an actual default-value change) is a separate, not-yet-started step — see `docs/solver-research-operating-model.md`'s promotion rules and `solver-scheduling-policy.md`'s "Promotion path" for what independent confirmation/cross-distribution evidence that requires. This report closes the confirmation-execution problem, not the promotion decision.
> **Evidence role:** confirmation — the first successful execution of this specific A/B after five failed attempts
> **Selection:** the full pre-specified 76-id population (not a further sample) — the same narrowed, informative-only population `-004` derived from the original 150-id population

## Method

Both arms used `solver-level-blind-targeted-sweep.yml` with the same 76-id population, `node_budget=750000000` (deriving `work_budget≈1,005,000,000`), `node_budget_advisory_only=true`, **`strict_total_work_budget=true`** (the fix from `-005`'s diagnosis), `target_wall_minutes=60`, differing only in `admissible_order_non_default_retry_budget_fraction` (1.0 control / 0.18 treatment). Compared each arm's `Combine shard results` job output — the `Solved:`/`Unsolved:` id lists and per-id status labels — directly.

## Result

| | control (fraction=1.0) | treatment (fraction=0.18) |
|---|---|---|
| shards succeeded | 76/76 | 76/76 |
| solved | 12/76 | 12/76 (identical ids) |
| unsolved, `work-budget-reached` | 64/76 | 64/76 (identical ids) |
| gains vs. control | — | 0 |
| losses vs. control | — | 0 |

## Interpretation

This is the clean result the prior five attempts (`-001` through `-005`) were trying to reach: a full, valid, execution-sound comparison across the entire 76-level informative population, with no partial/confounded/timed-out data on either side. The zero-loss outcome is consistent with — and now population-scale confirms — this session's own earlier finding (`2026-09-05-admissible-order-tiebreak-production-exposure-001.md`) that only `tieBreak=none` among admissible-order's tie-break profiles ever wins a real production solve; shrinking the shared work-pool allocation for the other three profiles (which never convert to a win regardless of fraction) costs nothing on this population.

This does **not** by itself quantify how much `workSpent` the smaller fraction actually saved — the per-level aggregate cost figures live in each arm's `targeted-sweep-combined` artifact (control: artifact `9968206487`; treatment: `9968104124`, both on their respective run pages), which this session's sandboxed network egress could not download directly (the signed Azure blob-storage URLs are blocked by this environment's proxy policy). A future session with artifact-download access, or a manual download via the GitHub UI, can pull the exact `workSpent` delta from those two files — the solved/unsolved comparison above does not depend on that figure and stands on its own.

## What this does not establish

- Does not itself promote the 0.18 fraction to production default — that requires a separate, properly-scoped promotion step per this repo's standing evidence-intensity rules (independent confirmation on a disjoint population, cross-distribution transfer where the claim scope warrants it).
- Does not quantify the exact `workSpent` savings (see above) — only that the savings, whatever they are, cost zero solves on this population.
- Single population (76 ids, deliberately drawn from the historically-hardest tail); does not test whether a broader or differently-composed population would show the same zero-loss result.
- Does not revisit whether `strict_total_work_budget=true`'s search-behavior change (relative to production's non-strict default) itself needs separate parity evidence before this result is read as fully production-representative — flagged as an open methodological question in `-005`, not resolved here.
