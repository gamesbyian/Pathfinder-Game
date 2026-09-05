# A "2x-cap restart when unused work covers its full cap" policy never triggers on its 24-level test population

> **Status:** concluded-negative
> **Last evidence:** 2026-09-05 — `matchedEnvelopeShadow` field embedded in `reports/stress/portfolio/dynamic-tranche-value-pilot-001.json` (a shadow simulation already run alongside the 2026-09-03 dynamic-tranche-value pilot but never discussed in that pilot's own report), no new dispatch
> **Decision:** the embedded shadow policy ("in static order, run a 2x-cap restart only when same-solve unused work covers its full cap") recorded **zero** `continuationDispatches` across its 24-level sample — the triggering condition never held for any level, so `controlSolved` and `treatmentSolved` are identical (3/3) by construction, not because the policy was tested and found neutral. This is a clean, already-collected null result for this specific restart-gating condition, distinct from and complementary to Workstream 0's existing closure ("Restart/randomization + learned-failure search — CLOSED IN TESTED FORMS").
> **Remaining gate:** none — the data already shows the gating condition is too strict to ever fire on this population; no further local analysis of this specific file can change that.
> **Evidence role:** discovery/forensic — surfaces an embedded, previously-undiscussed field in an already-analyzed report's source JSON
> **Selection:** whole 24-level sample used by the parent dynamic-tranche-value pilot, not a separate sample

## Method

Inspected `reports/stress/portfolio/dynamic-tranche-value-pilot-001.json`'s `matchedEnvelopeShadow` field, which `reports/2026-09-03-dynamic-tranche-value-pilot-001.md` (the report built from this same file) never discusses. Read its per-level `unusedFirstTrancheWork` vs. `envelope`/`firstWorkSpent` values and its top-level `continuationDispatches` counter directly.

## Result

| | value |
|---|---:|
| levels | 24 |
| `continuationDispatches` | **0** |
| `controlSolved` | 3 |
| `treatmentSolved` | 3 |

Per-level `unusedFirstTrancheWork` ranges from 0 to several million (e.g. `R00181`: 0 unused; `R00702`: 2,639,599 unused) against a fixed `envelope` of 10,531,934 — meaning the specific trigger condition ("unused work covers its full [2x] cap", i.e. unused work ≥ the full additional tranche size) was never met by a wide margin for any of the 24 levels in this sample: the largest observed unused-work figure is still well under half the envelope, let alone a full second cap's worth.

## Interpretation

This closes one specific, concretely-defined restart-policy variant as untestable-as-designed on this population — not because a 2x-cap restart was tried and didn't help, but because the condition gating it almost never occurs at this envelope/tranche sizing. This is useful negative information for any future restart-policy design: a "restart when unused work fully covers the next tranche" gate is likely too conservative to ever activate at typical first-tranche utilization levels observed here (`unusedFirstTrancheWork` topping out well below one envelope's worth), and a workable design would need either a much looser trigger threshold or a different envelope/tranche ratio to ever exercise the restart path at all.

## What this does not establish

- Does not test a looser trigger threshold (e.g. "unused work covers half a cap") that might actually fire on this population — a natural follow-up if restart-policy work is ever reopened per Workstream 0's reopen condition.
- Small sample (24 levels, 3 solved) — even a fired trigger would have limited power to detect a real effect at this scale.
- Does not examine whether a different technique/envelope combination elsewhere in the repo's shadow-pilot family ever triggers a continuation dispatch.
