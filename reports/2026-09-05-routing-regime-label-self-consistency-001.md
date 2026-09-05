# The `must-cross-heavy` routing regime does not have the highest raw `mustCross` value — `intersection-heavy` does

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — mean `mustCross`/`portals`/`requiredIntersections` per `routingRegime` across all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** `intersection-heavy` levels have the highest mean raw `mustCross` (3.05), not `must-cross-heavy` (2.57) — despite the latter's name. `must-cross-heavy` does lead on `portals` (3.09) among the two, but not by much over `multi-portal`'s 5.45, which is itself named for a different feature. The regime labels appear to reflect something other than "which regime has the single highest mean of its namesake raw feature" — plausibly a relative/proportional criterion (e.g. `mustCross` as a share of total constraint load) rather than an absolute one.
> **Remaining gate:** none — a descriptive observation, not a claim that the labels are wrong.
> **Evidence role:** forensic/methodological — a label-validation spot-check using already-collected data, flagged so a future reader does not assume regime names track raw absolute feature values
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Grouped levels by `features.routingRegime` and computed mean `mustCross`, `portals`, and `requiredIntersections` per group, to check whether each regime's namesake feature is in fact elevated in that regime relative to others.

## Result

| `routingRegime` | n | mean `mustCross` | mean `portals` | mean `requiredIntersections` |
|---|---:|---:|---:|---:|
| `intersection-heavy` | 1,371 | **3.05** | 2.79 | 6.68 |
| `must-cross-heavy` | 222 | 2.57 | 3.09 | 2.63 |
| `multi-portal` | 174 | 0.14 | **5.45** | 1.85 |
| `general` | 149 | 0.19 | 0.16 | 1.98 |
| `sparse-low-intersection` | 46 | 0.22 | 0.76 | 0.63 |

`intersection-heavy` does correctly lead on `requiredIntersections` (6.68, clearly highest) — the feature its own name suggests. `multi-portal` correctly leads on `portals` (5.45). But `must-cross-heavy` does *not* lead on `mustCross` — `intersection-heavy` does, despite `intersection-heavy` levels not being labeled must-cross-heavy.

## Interpretation

This is not evidence of a labeling bug — the regime classifier plausibly uses a relative or combined criterion (e.g. `mustCross` as the *dominant* constraint type for that level, or a ratio against other constraint counts) rather than simple ranking by raw absolute value, and `intersection-heavy` levels can carry high absolute `mustCross` while still being classified by a different, larger characteristic. But it is a useful caution for any future work: do not assume a regime's raw namesake-feature mean will be the highest across regimes without checking, since at least one of the five regimes checked here does not have that property in absolute terms. `2026-09-05-routing-regime-composition-by-corpus-001.md` and `2026-09-04-routing-regime-multiplicity-and-difficulty-001.md`'s conclusions are unaffected — both are stated in terms of the regime label itself (as assigned), not in terms of a raw-feature reconstruction of it.

## What this does not establish

- Does not identify the actual classification rule behind `routingRegime` — that would require reading the tool that produces this label, not attempted here.
- Does not check whether `general`/`sparse-low-intersection` (the two regimes without an obvious namesake feature) are internally consistent by some other criterion.
- Single census snapshot (2026-09-03).
