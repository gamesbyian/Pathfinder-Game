# Capability-invention demand: EW1 residual-unsolved upside round design 001

> **Status:** active
> **Last evidence:** 2026-09-26 — zero-compute branch-membership recomputation (same `getAttemptConfigs`-diff method `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md` used) reproduces that report's own 196/335 branch sizes exactly, then splits each branch by the current 1,169/1,700 production-solved boundary. This report predeclares and dispatches a full-population run over the residual-**unsolved** rows in each branch.
> **Decision:** defer the `OPT_IN_FEATURES` promotion decision for both `STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE` (CID-0027) and `STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE` (CID-0028): 26.5%/15.5% solved-branch regression coverage is materially short of this repo's own promotion precedent (every actually-promoted mechanism in `docs/solver-opt-in-experiment-ledger.md` tested ~100% of its addressable population, not a sampled fraction). Rather than simply buying more regression-safety sample (diminishing returns against an already-reasonable <=5.8% bound), dispatch the higher-information-value round first: the full residual-**unsolved** population in each branch, which the two prior rounds (pilot 13, confirmation 40+40) never touched and which is where additional real cold solves — not just regression safety — could exist.
> **Remaining gate:** interpret this round's result; a promotion decision still requires either full solved-branch coverage or an explicit reasoned acceptance of the current coverage level, neither of which this report performs.
> **Evidence role:** acquisition (new solver execution, level-blind, no production effect)
> **Research question:** `WS2-CAPABILITY-INVENTION-DEMAND`
> **Production effect:** none. Both flags remain `OPT_IN_FEATURES`, default OFF.

## Why this is the next gate, not a restart

`reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md`
already named exactly this option as the open alternative: "A future round could sample from the
residual instead, if more upside discovery (not just regression safety) is the priority." The
workstreams doc's own gate text for this question is "decide whether current evidence is sufficient
for promotion; buy broader sampling only if that decision identifies a concrete unresolved
safety/generalization question; do not run more generic compact telemetry merely to enlarge the
sample."

Two concrete, distinct gaps exist, and this report resolves the cheaper, higher-value one first:

1. **Regression-safety coverage is below this repo's own promotion bar.** Cross-checking
   `docs/solver-opt-in-experiment-ledger.md`'s actual promoted-mechanism entries
   (`PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`: 530/530 tested; `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`: 219/219;
   `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY`: 113/113 earned population;
   `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_*`: 150/150 reach-conditioned population) shows every
   actual promotion in this codebase tested essentially its full addressable population, not a
   percentage sample. 52/196 (26.5%) and 52/335 (15.5%) are real evidence but short of that bar.
   Closing this gap would need 40 more CID-0027 solved-controls and 187 more CID-0028
   solved-controls (331 total) for comparatively low marginal information value: the existing 52/52
   zero-regression result already bounds each branch's true regression rate at <=5.8% (95%,
   rule-of-three); closing to full coverage tightens that bound but does not change its qualitative
   conclusion.
2. **The residual-unsolved population (upside) has never been tested at all.** Neither the 13-level
   pilot nor the 40-level confirmation touched any row outside the already-solved population — by
   construction, since both were regression-safety designs. Given the two known target rows (R00118,
   R02696) were themselves discovered by cross-referencing a T1-isolated census, not by broad search,
   it is a real open question whether either branch's other 103/95 unsolved rows contain further
   referee-valid rescues under the same treatment. This is untested, cheap (level-blind, matched
   production budget, no production effect either way), and directly serves the actual research
   objective (new cold solves), not merely a tighter confidence interval on a question already
   reasonably answered.

Per this workstream's "prefer cheapest information-value test" rule, (2) is dispatched now; (1) is
recorded as a known, well-quantified, lower-priority open item (see "What this does not authorize").

## Population (zero-compute recomputation, no new branch-definition change)

Recomputed branch membership with the exact same method
(`SOLVER_TESTING_API.getAttemptConfigs` diffed with/without each flag, over the full 1,700-level
Corpus 2) the original design report used, then split each branch by the pinned `35066677597`
production boundary (`ok === true`):

| Branch (flag) | Total branch | Already tested (pilot+confirmation, solved) | Residual-unsolved (this round) |
|---|---:|---:|---:|
| CID-0027 (`STRATEGY_NEAR_HAMILTONIAN_INTERSECTION_HARVEST_MECHANIC_BUCKET_EXPOSURE`) | 196 | 92 solved total (52 tested) | **104** |
| CID-0028 (`STRATEGY_VERY_HIGH_INT_WIDTH2000_HARVEST_KNOT_MUSTCROSS_EXPOSURE`) | 335 | 239 solved total (52 tested) | **96** |

Both totals (196, 335) match the originating design report exactly, confirming the recomputation is
consistent with the frozen branch definitions (no drift, no redefinition). Frozen id lists:
`data/stress/cid-0027-near-hamiltonian-residual-unsolved-104-ids.txt`,
`data/stress/cid-0028-very-high-int-residual-unsolved-96-ids.txt`.

## Protocol

Identical to the pilot/confirmation rounds — matched production budget, both arms:
`scripts/level-blind-capability-sweep.mjs` production defaults, `--node-budget=50000000`, derived
`--work-budget=67000000`, generous non-binding `--budget-ms`, level-blind, dispatched via
`solver-level-blind-targeted-sweep.yml`'s `enable_flags` input (control: none; treatment: the one
relevant flag, each branch's population tested independently against only its own flag). No canary
step repeated here — the pilot round already verified end-to-end (`effectiveConfig`, solve
completion, referee validity) for both exact flags under this exact workflow.

## Advance rule

- **Any referee-valid treatment-only solve** on a residual-unsolved row is a new capability-recovery
  candidate: report it individually (parent id, work/nodes, which of the flag's added configs won),
  same disposition path CID-0027/CID-0028 themselves went through (T1-isolated-style singleton
  finding -> smallestProbe -> matched-work test), not an automatic production change.
- **Zero new solves** is a genuine, informative negative for this specific population: it means the
  two already-known target rows were not representative of a broader recoverable cohort in their own
  branch, narrowing (not closing) the promotion case to "two isolated wins," which is useful context
  for whoever makes the eventual promotion call.
- Either outcome, **this round alone still does not authorize a promotion decision** — it answers the
  upside question, not the regression-coverage-completeness question in item (1) above.

## What this does not authorize

- No `OPT_IN_FEATURES` change for either flag from this report or its eventual result alone.
- Does not close the regression-coverage gap identified in item (1) — the 331 additional
  solved-control levels needed for full-branch coverage remain a distinct, deferred, lower-priority
  option, not performed here. A future round should draw from
  `data/stress/cid-0027-near-hamiltonian-residual-unsolved-104-ids.txt`'s solved counterpart set
  (the 40/92 CID-0027 and 187/239 CID-0028 solved rows not yet tested) if full coverage becomes the
  priority.
- No claim about levels outside either named branch — this is strictly branch-scoped, matching both
  flags' own reserve-preserving, single-rule placement.
- No change to either flag's placement or the config bundle it adds.

## Artifacts

- `data/stress/cid-0027-near-hamiltonian-residual-unsolved-104-ids.txt`,
  `data/stress/cid-0028-very-high-int-residual-unsolved-96-ids.txt` — frozen populations.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-test-design-001.md` — original
  branch location/flag implementation this report reuses unchanged.
- `reports/2026-09-25-capability-invention-demand-ew1-routing-exposure-confirmation-ab-result-001.md`
  — the round that nominated this exact next step.
- `docs/solver-opt-in-experiment-ledger.md` — promotion-precedent cross-check.
