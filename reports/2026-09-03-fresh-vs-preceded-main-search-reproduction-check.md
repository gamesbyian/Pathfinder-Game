# Fresh-vs-preceded main-search reproduction check

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — round 2 extended `corpus1` coverage to its full 102-level population and attempted (but did not reach) `repair-fallback`-stage cases; 30 real `main-search` cases now reproduced across both rounds (4 `published` + 26 `corpus1`, superseding round 1's 11-case `corpus1` subsample), still 0 mismatches. Current HEAD.
> **Decision:** every reproduced case matched exactly (`ok`, `outcome`, `workSpent`, `nodesExpanded` byte-identical). No fresh-vs-preceded discrepancy found. `docs/architecture-unification-debt.md`'s "Search-stage mutable-state isolation" P0 row and `docs/solver-correctness-hardening.md`'s "Open research-integrity blocker" both already say "no known current instance" — this is the first actual empirical sweep behind that claim (as opposed to code-reading confidence), with real predecessor depth up to 18 prior attempts on the same `prep`.
> **Remaining gate:** none. Reopen only on a new discrepancy, per both docs' own instruction — this is not a standing program to keep re-running.
> **Evidence role:** research-integrity/correctness check (`docs/solver-correctness-hardening.md`'s own five-step "Required handling" procedure), not a scheduler experiment or capability claim.

## Why this check

`docs/architecture-unification-debt.md` carries "Search-stage mutable-state isolation" as **P0 while unexplained sequence dependence exists**: a target action run fresh should be search-equivalent to the same action reached after real predecessor-stage activity, at fixed explicit input/config/seed/work, unless a documented typed handoff says otherwise. `docs/solver-correctness-hardening.md`'s "Open research-integrity blocker: fresh vs preceded stage behavior" section says this is currently "no known current instance," and prescribes reproducing an action fresh vs. after real predecessor history as required handling before any scheduler/cap conclusion may lean on the absence of the effect. This session's own static-portfolio work (`portfolio-18-tranche-v2`, see the confirmation-002/003/entrypoint-parity reports) leans on exactly that assumption — a technique's outcome under a per-technique work cap should not depend on which other techniques ran before it on the same `prep`. Nothing in this research line had actually run the fresh-vs-preceded reproduction itself; the "no known current instance" status was accurate but untested by this specific method. This is local, GHA-independent, read-only work — a natural fit while the census refresh and cross-generator transfer dispatches run unattended.

## Method

For a sample of real corpus levels, ran the production ladder (`solveLevel(level, { strictTotalWorkBudget: true, workBudget: W, timeBudgetMs: <generous>, attemptBudgetTelemetry: true })`, `schedulerMode` defaulted to `'production'`) and inspected the real `attempts[]` telemetry. For each level whose winning attempt (`ok: true`) was `stageId: 'main-search'` (a plain DFS/beam attempt drawn from the same `getConfiguredAttemptConfigs()` list used by every other main-ladder tier — repair and admissible-order configs are pulled out of this list before the main loop runs, so this scope is deliberately non-repair, non-admissible-order for this first round) and was preceded by at least one earlier attempt with real `workSpent > 0` on the same `prep`, reconstructed:

- the winning attempt's own effective work ceiling directly from its recorded `allocatedWorkCeiling` (this is already "ceiling minus units spent so far," snapshotted by `runAttempt` before dispatch — see `modules/solver/orchestration.ts:627-629` — so it is exactly the value needed to reproduce the same allocation on a prep starting from zero);
- which `AttemptConfig` produced it, by matching the attempt's own discriminating fields (`scoringProfileId`, `orderingBiasId`, `beamWidth`, `mechanicBucketRetention`, `repair*`, `admissibleOrder*`) against a freshly regenerated `getConfiguredAttemptConfigs(level, null)` list, requiring exactly one match.

Then, on a **completely fresh `prep`** (`prepLevel(level)`, never touched by any other attempt), set `prep._workCap = prep._strictWorkCap = <the real attempt's allocatedWorkCeiling>` (mirroring `runStaticPortfolio`'s own identical-purpose assignment at `orchestration.ts:1709-1710`) and called `runAttempt(gateKey, level, freshPrep, config, <generous ms>, Date.now(), null, Infinity)` directly — the same low-level primitive both `runStaticPortfolio` and `technique-census-cell.mjs`'s `runCell` already call. A deliberately generous ms budget (far larger than the real attempt's own `allocatedBudgetMs`) was used for every fresh reproduction so a wall-clock/ms-currency artifact of this specific machine could not masquerade as a state-isolation finding — the only binding constraint on the fresh run is the reproduced work ceiling, matching the currency the whole ladder is specified in (`docs/solver-budget-determinism.md`).

Compared `ok`, `outcome`, `workSpent`, and `nodesExpanded` between the real (preceded) attempt and the fresh reproduction.

### Population notes

Tried three corpora before getting a productive sample size:

- `published` (`data/levels.json`, 160 real game levels): solves almost always on attempt #1 (designed to be solvable) — only 4/60 sampled levels had any preceded main-search winner at all, and none deeper than 1 preceding attempt.
- `corpus2` (`stress-levels-random.json`, adversarial/uniform-random): far harder — even at a 20,000,000 work budget, 14/15 sampled levels were still unsolved (consistent with this session's own static-portfolio confirmations needing a 67,000,000 envelope to reach ~43-45% coverage), so it contributed 0 usable cases at this budget.
- `corpus1` (`stress-levels.json`, hypothesis-driven/generated, 102 levels): the productive middle ground — 30 sampled levels produced 11 real preceded-winner cases, with predecessor depth ranging from 1 to **18** prior attempts on the same `prep` before the eventual winner ran (level `S00055`: 18 preceding attempts, `unitsAtStart=13,503,917` work units already spent on that `prep` before the winning attempt's own 748,041-unit ceiling).

15 real cases total (4 `published` + 11 `corpus1`), spanning shallow (1 preceding attempt) to genuinely deep (18 preceding attempts, over 13.5M work units of prior activity) predecessor histories.

## Result

**15/15 exact matches.** Every fresh reproduction had identical `ok`, `outcome`, `workSpent`, and `nodesExpanded` to its real preceded counterpart — including the deepest case (`S00055`, 18 preceding attempts). No mismatch was found at any predecessor depth tested.

| corpus | levels sampled | preceded-winner cases | max preceding-attempt depth | mismatches |
|---|---:|---:|---:|---:|
| `published` | 60 | 4 | 1 | 0 |
| `corpus2` | 15 | 0 (population too hard at this budget) | — | — |
| `corpus1` (round 1, first 30) | 30 | 11 | 18 | 0 |
| `corpus1` (round 2, full 102) | 102 | 26 (supersedes round 1's 11) | 18 | 0 |

(Round 1's own `corpus1` figures are kept above for chronology; see "Round 2" below for the superseding full-population run and its `repair-fallback` extension attempt.)

## Interpretation

This is real, if scoped, positive evidence — not just the absence-of-a-known-instance status the two docs already carried. It directly exercises the exact concern `solver-correctness-hardening.md`'s required-handling procedure names (mutable caches, memo tables, counters, proxy overrides reachable across attempts on the same `prep`) at real depth (18 prior attempts, not a synthetic 2-attempt fixture), and finds no leak into a later attempt's own work-capped outcome.

**Scope this does not cover** (explicitly, so this isn't overclaimed as a full closure):

- Restricted to `stageId: 'main-search'` winners only — repair-fallback, admissible-order-fallback, and the later retry tiers (`repair-shrink-recovery`, `late-repair-multiseed-retry`, etc.) draw from the same `getConfiguredAttemptConfigs()` list but some retry tiers apply their own ablation-config swap or seed variation around the call, which this round deliberately did not attempt to reconstruct (a real but separate reconstruction problem, not a reason to doubt this round's own scope).
- `corpus2`, the hardest and most adversarial population, contributed zero cases at the work budget this check could afford locally — the invariant is untested there specifically, though nothing about `corpus2`'s difficulty level implies a different mutable-state-isolation mechanism than `corpus1`/`published`.
- 15 cases is a real but modest sample; this closes "untested" but is not a formal proof of isolation for every code path.

None of these gaps suggest a reason to expect a different result — they are where a future session could extend this exact method if a new discrepancy or a reason for suspicion ever appears. Per both docs' own instruction, the correct action on a clean result is to leave the invariant's disposition as-is (still "no known current instance," now empirically exercised) rather than manufacture a bigger sweep.

## Round 2: extending toward `repair-fallback`

Round 1 named `repair-fallback` as a tractable next stage to test: `orchestration.ts`'s repair-fallback loop (`orchestration.ts:2116-2140`) draws `repairConfig` from `repairConfigs = baseConfigs.filter(c => c.repair)` — the exact same `getConfiguredAttemptConfigs()` list round 1 already matches against — calls `runAttempt` with no `seedSalt` argument (defaults to `0`) and no ablation-config swap, and owns `prep._workCap` via `withWorkCapScope` (`budget-context.ts`) rather than the main loop's own per-attempt assignment. None of that changes the reconstruction method: `runAttempt`'s `allocatedWorkCeiling` snapshot is taken fresh immediately before each attempt regardless of which caller last set `prep._workCap` (`orchestration.ts:627-629`), so the same field-matching/fresh-`prep`-replay method applies unchanged to a `repair-fallback`-stage winner.

Widened the same check (unchanged method, `TARGET_STAGES = {'main-search', 'repair-fallback'}`, requiring `!att.seedSalt` for the repair case) to `corpus1`'s **entire 102-level population** at the same `WORK_BUDGET=15,000,000`/`GENEROUS_MS=60,000` as round 1's `corpus1` sample. Result: **26 more `main-search` cases** (superseding round 1's 11-case `corpus1` subsample, since round 2's population is a superset), all 26 reproducing exactly — but **zero `repair-fallback` cases**, at any level, in the entire population. This is itself informative, not a null result to shrug off: `repair-fallback` only ever runs after the *entire* main loop has already failed on *every* gate (`orchestration.ts`'s own tier ordering), so reaching it needs either a harder population or a smaller main-loop-share of the same work budget than this round's mix of `corpus1` levels and 15,000,000 work units ever produced — consistent with `repair-fallback` being a genuinely late, comparatively rare tier, not evidence that the fresh-vs-preceded method fails to apply there.

**Updated totals across both rounds: 30 real `main-search` cases** (4 `published` + 26 `corpus1`), depth 1-18 preceding attempts, **0 mismatches**. `repair-fallback`, admissible-order-fallback, and the later retry tiers remain untested by this method — attempted for `repair-fallback` this round and not reached, not skipped — and stay the natural next extension if a future session has budget for a harder/larger population or a more targeted level selection (e.g. pre-filtering to levels already known from `stage: 'repair-fallback'` telemetry elsewhere, such as `equal-work-production-reach.json`, before running this check on them specifically, rather than discovering eligibility by random sampling).

## Reproduction

Not committed as a script — a one-off local diagnostic, same convention as this session's other ad hoc joins (e.g. the static-portfolio entrypoint parity check). Method: for each sampled `{corpus, levelPos}`, run `Solver.solveLevel()` with `strictTotalWorkBudget: true` and inspect `result.attempts` for a `stageId: 'main-search'`, `ok: true` attempt preceded by real `workSpent`; reconstruct its `AttemptConfig` via `getConfiguredAttemptConfigs(level, null)` field-matching; reproduce via `SOLVER_TESTING_API.runAttempt` on a fresh `prepLevel(level)` with `_workCap`/`_strictWorkCap` set to the real attempt's own `allocatedWorkCeiling`; diff `ok`/`outcome`/`workSpent`/`nodesExpanded`.
