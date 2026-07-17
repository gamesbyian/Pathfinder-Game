# Solver Development Roadmap — Toward Full Stress-Corpus Solvability

> **Status: active strategy document (written 2026-07-17).** This is the campaign-level plan for
> expanding the solver until it solves every level in both stress corpora, preferably in under 30s
> per level. It sequences *existing* diagnostic machinery into a repeatable workflow — it proposes
> no new tooling (the tooling investments are done; see
> [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md)) and no specific solver change (those
> come out of the diagnosis loop below, one campaign at a time). Complementary docs:
> [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) (technique-level
> research ledger), [`../data/stress/README.md`](../data/stress/README.md) (the shipped/rejected
> avenue ledger). Update the "Where things stand" numbers here after each full corpus refresh, or
> retire sections into the current-state references as campaigns complete.

## Where things stand (as of 2026-07-17)

| Corpus | Solved | Source |
|---|---|---|
| Published (regression gate) | 160/160 | `logs/solver-baseline.json` — the only trusted "did I break something" signal |
| Stress-corpus-1 | 85/102 | `logs/stress-corpus1-baseline.json` (compiled 2026-07-12) |
| Stress-corpus-2 | 237/1700 | 2026-07-17 batch refresh (`reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md`); up from 152 pre-elite-splice-fix |

The unsolved corpus-2 population is already clustered by failure mechanism
(`reports/stress/unsolved-failure-clusters.json`,
`reports/2026-07-16-phase-a-unsolved-failure-clustering.md`; clusters overlap):

- **`dfs-plain` — 843 levels (57.6%)**: genuine combinatorial exhaustion — plain DFS burns real
  node budget without finding the goal. Exhaustion-dominated, so *more time is the wrong lever*;
  the levers are ordering, pruning, and bounds. 592 of these are high-intersection-burden.
- **`repair-close` — 114 levels**: repair-gated near-misses, badness ≤ 5. The natural rescue
  target: the solver already gets within a handful of moves.
- **`repair-far` — 507 levels**: repair-gated but structurally stuck (badness > 5).
- **Fragile scoring-interaction family**: R02248/R01465 plus 3 diagnosed cousins — a
  position/attraction scoring term × orientation interaction locks in an early self-defeating
  commitment. Already mitigated by the attraction-diversity last-resort pass
  (`reports/2026-07-16-phase-d-attraction-diversity-implementation.md`). The once-reported
  285-level "beam-collapse" bucket was an instrumentation artifact (timed-out beam attempts
  reported `nodesExpanded: 0`), since fixed — the real bucket is these few levels.
- **Robust hard cores** (e.g. R00440: 0/45 family variants solvable; R02579: 1/45): resist every
  technique *and* structural perturbation. Genuine combinatorial hardness, not a heuristic bug.

Two structural facts shape everything below: every stress level carries a withheld witness path
(`stressMeta.witnessSolution`) proving solvability by construction, so "is it solvable?" is never
the question — only "why doesn't our search find it?"; and solver strategy is keyed on level
*features*, never identity (`check:no-solver-level-numbers`), so no fix may be a per-level tweak.

## The core loop: diagnose → generalize → verify → refresh

Every campaign runs the same loop. The expensive groundwork (telemetry, clustering, witnesses,
diagnostic tools) already exists; the loop is how it compounds into solver capability.

### 1. Pick a failure cluster, not a level

Start from `reports/stress/unsolved-failure-clusters.json` and
`npm run stress:rank-levels` (closest-miss-first ordering over a compiled baseline). A level is a
*sample from* a cluster; the deliverable is always a fix for the cluster's mechanism.

### 2. Diagnose the mechanism on 3–5 representatives

The differential toolkit, in rough order of cost:

- **Witness-divergence diffing** (`scripts/stress/witness-divergence.mjs`): replay the withheld
  witness against the solver's own search trace and inspect each divergence point. This is the
  instrumented-ablation method that produced the real R02248/R01465 findings — per
  [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md), differential diagnosis is the
  one reasoning mode that reliably beats narrative-mining.
- **Ablation sweeps** ([`ablation.md`](ablation.md) — 63 flags over scoring/pruning/strategy/
  templates/profiles, `scripts/run-ablation.mjs` + `analyze-ablation.mjs`): isolate which term is
  load-bearing vs self-defeating on the representatives. The fragile-family diagnosis
  (`reports/2026-07-16-phase-d-fragile-group-ablation-diagnosis.md`) is the worked example.
- **Level reduction** (`npm run stress:reduce-level`): shrink an antagonistic 15×15 to a minimal
  repro before reasoning about it — witness-guided free shrink first, then signature-preserving
  ddmin with a node budget.
- **Family variants** (`scripts/family-generate.mjs` — density-sweep, re-embed, symmetry,
  local-mutant, swap; joined by `family-analyze.mjs`; program described in
  [`sibling-cousin-system.md`](sibling-cousin-system.md)): the **fragile/robust split is the
  single most decision-relevant diagnostic**. A level whose variants mostly solve (R02248 solved
  35/45) has a heuristic problem — some scoring/ordering term is the obstacle, and a targeted or
  diversity-style fix is likely. A level whose variants mostly fail (R00440 solved 0/45) has a
  combinatorial problem — no scoring fix will help; it needs bounds/pruning/technique work.
  Remember open space is itself a difficulty variable
  (`reports/families/2026-07-15-re-embedded-cousin-grid-growth.md`).
- **Solution-profile comparison** (`npm run stress:solution-profile-compare -- --target-level=…`,
  [`solution-profile.md`](solution-profile.md)): profile the unsolved level's witness against the
  known-solvable libraries to ask which solved family it behaviorally resembles — i.e. which
  existing technique *should* work and therefore where the gap is.

### 3. Generalize to a feature-keyed change

Acceptable shapes, in increasing order of invasiveness:

- A new/adjusted `ATTEMPT_POLICY` rule or `POLICY.*` threshold (`modules/solver/attempts.ts`),
  gated on the diagnosed feature regime (navDensity band, reqInt burden, mechanic counts).
- A scoring/pruning adjustment (`scoring.ts`, `prune-gauntlet.ts`, `lower-bounds.ts`) — with the
  memoization-key soundness rule (CLAUDE.md gotcha: an under-keyed cache is a correctness bug)
  and differential testing.
- A strengthened admissible lower bound — every new bound needs a written admissibility argument
  and an `oracle:fuzz` pass (the MST-scratch-buffer bug is the precedent for why).
- **The proven pattern for fragile clusters**: a bounded, additive, opt-out *last-resort pass*
  (the attraction-diversity model — runs only after everything else failed, so it is zero-cost on
  every level that already solves, with its own budget-fraction override so testing sweeps can
  disable it independently).

### 4. Verify at the right tier — solvability AND cost

Follow `docs/testing.md`'s tier table: `npm run stress:smoke` (<60s sanity) → mechanic-filtered
subset (`--filter-mechanic`) where the change is mechanic-scoped → full
`npm run solver:bench -- --check` for anything touching shared hot-path files. Non-negotiables:

- `solver:bench --check` only verifies the solved/failed set — **always** pair it with a full-corpus
  before/after cost comparison (`nodesExpanded` + wall-time); the repair-probe seed-width episode
  is the standing example of a clean `--check` hiding a 14% slowdown.
- Testing sweeps pass **both** `--repair-budget-fraction=0` and
  `--attraction-diversity-budget-fraction=0`.
- When a refactor removes or tightens a condition, grep for second-order dependencies on the exact
  case removed (the elite-splice regression lesson).
- `diff-baseline.mjs` (+ `--retry-failures` isolated retry) to explain result changes;
  `classify-stability.mjs` to keep budget-edge flakiness out of conclusions.

### 5. Refresh, re-baseline, re-rank

Full corpus-2 sweeps go to GitHub Actions (`.github/workflows/solver-corpus2-batch-*.yml`, 20
batches ≈ 12.5 min each, combined via `npm run solver:combine-corpus2-batches`), never a local
multi-hour run. Always solve with `--save-hints` so every newly-solved level's hints (with full
provenance) feed the solution-profile libraries and heatmaps automatically. Between refreshes,
iterate locally with `portfolio-solve-sweep.mjs --resume --attempt-cache --baseline --priority`
so only levels the edited attempt family could plausibly affect are re-solved. Newly interesting
levels go through the failure inbox → promotion pipeline (`scripts/stress/failure-inbox.mjs`),
never ad-hoc pin-file edits. Regenerate `logs/stress-corpus2-baseline.json` /
`reports/stress/dev-benchmark-corpus2.json` and update this doc's numbers.

## Campaign sequence

**Campaign 0 — close out the pending follow-ups (first; cheapest; locks in gains already paid
for).** The 2026-07-16/17 reports left explicit unfinished work:

- Test the attraction-diversity pass against the 621 `repair-close`+`repair-far` levels (currently
  untested there — `reports/2026-07-16-phase-d-attraction-diversity-implementation.md`).
- Evaluate the budget-fraction 1.5 candidate (`reports/2026-07-17-attraction-diversity-dose-response.md`)
  and the widening of `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS` to the other diagnosed culprit terms —
  each with full-corpus solvability+speed verification, per step 4 above.
- ~~Audit the flagged `solveLevel()` budget-accounting overshoot~~ **Done 2026-07-17.** Root cause:
  the early repair probe's cost was never gated by `repairBudgetFractionOverride`, so `... : 0`
  zeroed the later fallback loop but left the probe free to burn its full fixed node budget as
  unaccounted wall time — confirmed on R02401 (~10.7s of the ~10s overshoot) and shown to also
  silently break both interactive UIs' documented ~30s cost promise on any repair-gated level.
  Fixed by skipping the probe when the resolved fraction is exactly 0. Real, measured trade-off:
  the 4 known repair-gated published levels lose the probe's cheap win on this path (up to ~100x
  slower, still comfortably under 30s) — judged correct, not a regression, since that override
  already means "no repair-related cost, period" for the later loop. See
  [`reports/2026-07-17-repair-probe-budget-override-bug.md`](../reports/2026-07-17-repair-probe-budget-override-bug.md).
  Follow-up noted there, not yet done: the probe's node budget is still unscaled by `timeBudgetMs`
  even on the production-default (non-zero-override) path.

**Campaign 1 — `repair-close` rescue (114 levels, badness ≤ 5).** Highest expected solve-yield
per unit effort: the solver already gets within a few moves. Diagnose why repair stalls short on
representatives (witness-divergence + `scripts/repair-direct-probe.mjs` for repair-only
iteration); candidate levers are the near-miss bookkeeping/elite-splice candidate selection and a
feature-keyed retry shape — with the `REPAIR_PROBE_ORDINARY_SEED_SALTS` calibration history as
the standing warning that retry width is paid for in corpus-wide time.

**Campaign 2 — `dfs-plain` exhaustion (843 levels; the bulk of the problem).** Research-shaped:
reduce → diagnose ordering divergence vs the witness → hypothesize → ablate → verify. Since
exhaustion means the search space is too large for current ordering/pruning, the levers are
better admissible bounds, better move ordering, and plausibly a new archetype for the 592
high-intersection-burden members (e.g. planning intersection *placement* rather than crossing
opportunistically — to be validated by diagnosis, not assumed). Any new feature gate should
consider navDensity/unused-space explicitly, given the grid-growth sensitivity finding.

**Campaign 3 — `repair-far` (507) + the robust cores.** Attacked last, armed with whatever
Campaigns 1–2 teach. If nothing generalizes, genuinely-new techniques (constraint propagation
over intersection/must-cross budgets; witness-shape-informed macro moves suggested by
solution-profile family resemblance) get prototyped behind ablation flags and held to the same
verification bar as everything else — the fast-portfolio-scheduler verdict
(`reports/portfolio/portfolio-scheduler-decision.md`) is the model for how a plausible idea gets
measured and, if slower, honestly shelved.

## Standing rules

- Published 160/160 is inviolable. No change ships without `solver:bench --check` **and** the
  cost sweep.
- Progress is measured per refresh on two axes: solved counts per corpus, and the wall-time
  distribution against the 30s/level target (report worst-case multiples explicitly, not just
  means).
- Every fix is keyed on features; every claim of "verified" names which testing tier ran and what
  it cannot see (e.g. "cost sweep not run" is a reportable gap, not a footnote).
- Negative results get written up in `reports/` like positive ones — the rejected-avenues ledger
  is what keeps future sessions from re-buying the same lessons.
