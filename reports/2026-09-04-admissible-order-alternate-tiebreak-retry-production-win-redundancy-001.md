# Do admissible-order-alternate-tiebreak-retry's real production wins have an isolated-census alternative?

> **Status:** active
> **Last evidence:** 2026-09-04 — join of `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json` (fresh 1,700-level level-blind production run, `winningTechnique` per level) against `reports/stress/technique-niches/2026-09-03/level-capability.json`'s isolated-oracle `solvingActions`, no new dispatch
> **Decision:** at full production scale, `admissible-order-alternate-tiebreak-retry` genuinely wins **28/975 (2.9%) of all production solves** on this 1,700-level population — not the 0/40 the smaller marginal-value-tail-audit sample happened to show. Of those 28, **every single one (28/28) also has an isolated-census winner** — but the isolated winner set is a *mix*: **14/28 have isolated winners exclusively from the `admissible-order` family**, consistent with this tier genuinely being the only production path to that capability, while **14/28 also have an isolated winner from `beam`/`dfs`/`repair`** — meaning an earlier, non-ablated main-ladder stage's technique can, in isolation with a full fresh budget, also solve the same level. This is directly decision-relevant to the in-flight fixed-work confirmation of a smaller work-fraction for this tier: it is not evidence the tier is dispensable (every one of its 28 real wins is genuinely reproducible by *some* known technique, so census-cross-checked rare value is real), but it does show roughly half its wins may be recoverable earlier in the ladder under better dose/context, not solely from this tier's own budget.
> **Remaining gate:** none from this join alone. Whether the 14 "shared" levels would actually be caught earlier in production (not just in isolation with a fresh budget) is a dose/context question this join cannot answer — it would need the same kind of attempt-by-attempt attribution `2026-09-04-production-ladder-marginal-value-tail-audit-001.md`'s Part 1 used for the static-portfolio comparison, at this larger scale.
> **Evidence role:** discovery — exploratory join of two already-collected evidence artifacts; not itself a confirmation or refutation of the in-flight repricing candidate
> **Selection:** the 1,700-level population and the 28-level winner subset are not selected for this report's outcome (both are simply "every level this stage won" in an already-completed run); which isolated actions solve each of the 28 was inspected after the fact

## Why this matters right now

The in-flight confirmation (`2026-09-04-admissible-order-non-default-retry-repricing-confirmation-001.md` and its corrected re-dispatch) is testing whether a smaller work-fraction for this exact tier costs real solves on a *150-level* population. The original marginal-value-tail-audit's caution against outright suppression rested on the frozen census's per-profile exclusive-win counts, not on any direct look at what this tier's real production wins actually are. This report looks directly at that, using a dataset roughly 42x larger than the original 40-level sample (1,700 vs. 40 levels) that happened to already be sitting on disk.

## Result

| | count |
|---|---:|
| Production levels solved by `admissible-order-alternate-tiebreak-retry` (of 975 total solves, 1,700-level population) | **28** |
| ...of those, has ≥1 isolated-census winner | **28/28 (100%)** |
| ...of those 28, isolated winner set is admissible-order-family only | **14** |
| ...of those 28, isolated winner set also includes beam/dfs/repair | **14** |

Every one of the 14 "admissible-order-only" examples' isolated winner set includes `admissible-order|tieBreak=none|lds=off` specifically — consistent with this session's earlier finding that this profile carries the largest rare-capability footprint of the four non-default tie-break profiles (17 exclusive census levels, the single largest dropped-technique exclusive count in the portfolio-18 retention audits). Representative "shared" examples (isolated winner set includes a non-admissible-order technique too): `R00691` (also `beam|intersectionHarvest@5000(mb)`, three DFS variants, `repair|standard`), `R01019` (also four DFS variants and `repair|standard`), `R02056` (also `beam|intersectionHarvest@5000(mb)` and `repair|standard`).

## Interpretation

This does not resolve the repricing question — that is exactly what the in-flight confirmation exists to test — but it materially changes what "0 solves on the 40-level sample" should be read to mean. At true production scale, this tier is not a zero-value tail: it is a genuine, if modest (2.9% of all solves), unique-or-shared contributor, and the "half its wins might be recoverable earlier" finding is itself a concrete, testable hypothesis for whatever this research line does after the fraction confirmation lands. If the repriced fraction turns out to cost solves in the 150-level confirmation, this report's 14 "admissible-order-only" levels are the ones most likely to be genuinely at risk; the 14 "shared" levels are the ones where an earlier-stage dose/context fix might be the more targeted remedy instead of preserving this tier's full budget.

## What this does not establish

- "Has an isolated winner" does not mean production's *actual* earlier-stage attempt on that exact level, with its actual dose/context, would have found it — isolated testing uses a full fresh budget per technique, which production's shared/depleting pools do not give every technique.
- Single production run (33841017634), not independently replicated (though its corpus-2 solved set has already been shown byte-identical to a separate 2026-09-02 dispatch, `33588487486`, in `2026-09-04-census-cross-evidence-production-boundary-join.md` — see that report for the comparability verification this one relies on).
- Does not attribute the specific *sub-action* (which of the four tie-break profiles) within `admissible-order-alternate-tiebreak-retry` won each level — this data source records stage-level `winningTechnique`, not per-attempt sub-action identity.
