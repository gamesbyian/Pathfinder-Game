# Persistent Solver Failure Approach Audit (Levels 92, 108, 134)

_Date: 2026-04-27 (UTC)_

## Scope and evidence used

This audit reviews:

1. Git history (commits + merged PRs) focused on solver work and reversions.
2. `audits/metrics/*.json` and `audits/metrics/history.ndjson` to track outcome trends by commit SHA and date.
3. `audits/raw/latest.json` and `scripts/diagnose-failing-levels.mjs` outputs for failure-mode telemetry.
4. Level construction + known solution hints from `levels.js` / `levels2.js`.

## Current failure profile (latest audit)

Across all three persistent failures, the common telemetry signature is still:

- `finalStatus = timeout`
- `failureCategory = healthy-expansion-timeout`
- attempt families that consume budget without closing feasibility gaps.

Per-level shape from latest data:

- **L92**: high intersection burden (`reqInt=8`, `mustCross=2`), usually far from near-solution states, timeout attempts with large intersection deficits.
- **L108**: low `reqInt` but many near-solution states (`bestLowerBoundToValidSolution≈1`) and still times out, suggesting final-mile gating/diversification failures.
- **L134**: moderate intersection burden (`reqInt=3`, `mustCross=2`) with many blocked cells and portal complexity, repeatedly stalling near final-mile constraints.

## Level topology context (construction + hints)

- **L92** (`12x12`, `reqLen=99`, `reqInt=8`, portals=2, mustCross=2, mustPass=2, blocks=9, hints=2): hints complete intersections late and with high revisit structure.
- **L108** (`11x11`, `reqLen=33`, `reqInt=1`, portals=2, mustCross=0, mustPass=2, blocks=0, hints=3): appears close frequently, but conversion to valid completion remains fragile.
- **L134** (`12x12`, `reqLen=53`, `reqInt=3`, portals=3, mustCross=2, mustPass=2, blocks=48, hints=1): constrained geometry + portals create tight feasible corridors.

## Commit/PR trend summary (2026-04-14 to 2026-04-27)

Observed from metrics snapshots tied to merge SHAs:

- Persistent failures remain present at every stable audited merge in this window.
- The failing set oscillates between `{92,108,134}` and supersets that add e.g. 7, 61, or 123.
- Multiple aggressive refactors temporarily caused **mass failures** (up to 135–137 failing levels), then were reverted.

Representative checkpoints:

- **2026-04-16 to 2026-04-18**: telemetry + rescue pipeline work; persistent 3 remain.
- **2026-04-18**: PR #688 (`Unblock persistent solver failures L92/L108/L134 via rescue-gate fixes`) merged, but the post-merge audit still shows all 3 failing.
- **2026-04-18**: PR #695 (`Fix three intersection-bound bugs...`) merged, then reverted by PR #696 the same day.
- **2026-04-25 to 2026-04-26**: landmark-count and red-team/Luby-restart attempts merged and then reverted due regressions/no durable win.
- **2026-04-27 latest audited merge SHA (`1da14d56b77a`)**: still exactly `{92,108,134}` failing.

## Approaches tried and what they indicate

### A) Instrumentation-first / telemetry enrichments

Examples: PRs #679–#690; new causality signatures, hard-level gates, root-family coverage, diagnostics scripts.

**Assessment:**
- **Useful and not misguided.** Improved diagnosis quality and reproducibility.
- **But insufficient alone.** Better observability did not translate into elimination of the 3 persistent failures.

### B) Rescue-gate tuning and diversification tweaks

Examples: retry dedupe guards, rescue trigger expansion, near-closure gating adjustments, PR #688 rescue-gate fixes.

**Assessment:**
- **Partially promising but incomplete.** L108’s near-solution flood indicates this class should matter.
- **Needs more work.** Current gating/registration logic still fails to convert near-solution states into solved outcomes consistently.

### C) Intersection-feasibility pruning fixes (bound correctness)

Examples: PR #693 and PR #695 class changes (slack checks, portal multipliers, int+goal coupling), both reverted.

**Assessment:**
- **Potentially high-leverage but currently unstable.** Diagnostics strongly support intersection-feasibility pruning as a root issue.
- **Not proven safe in current form.** Rapid revert cycle implies regression risk and/or over-pruning in broader level sets.

### D) Large heuristic shifts (landmark-count penalty / LCP threshold)

Examples: PR #721 (`h_L` landmark penalty), PR #722 threshold tighten, then revert in PR #723.

**Assessment:**
- **Likely misguided in current implementation.** Heavy heuristic weighting produced collateral regressions (e.g., level 7) without solving persistent 3.
- Should not be retried as global scalar tuning without guardrails and per-level policy isolation.

### E) Broad architecture refactors (red-team reachability + Luby restart telemetry)

Examples: PR #725, #726, both reverted by #727 and #728.

**Assessment:**
- **Premature at this stage for this problem.** High implementation surface area, no durable hard-level wins before rollback.
- Better treated as an experimentation branch after core feasibility correctness is stabilized.

## What likely needs more work (priority order)

1. **Feasibility-bound correctness with safety scaffolding**
   - The diagnostics repeatedly show frontier expansion in impossible regions.
   - Re-attempt intersection bound fixes behind feature flags, per-level canaries, and CI gate on global regression thresholds.

2. **Final-mile conversion policy (especially L108/L134)**
   - Convert near-solution state volume into successful closure.
   - Improve rescue attempt admission/retry semantics and anti-duplication fingerprinting for “close but invalid” branches.

3. **Per-level policy profiles instead of global heuristic multipliers**
   - Persistent levels have distinct signatures (L92 deep-intersection budget vs. L108 near-solution saturation).
   - Use profile-specific pass ordering and bounded budget reallocation.

## Approaches that appear misguided (as executed)

- Global heavy landmark-penalty retuning without localized safety controls.
- High-churn solver architecture changes before intersection feasibility logic is stable.
- Repeated broad merges that require immediate revert to restore baseline.

## Novel approaches not yet clearly tried (recommended)

1. **Feasibility-first branch-and-bound layer (hard gate before heuristic scoring)**
   - Add an inexpensive deterministic feasibility predicate for `intersection deficit + goal distance + must-pass` budget viability.
   - If infeasible, prune regardless of heuristic score.

2. **Counterexample-guided bound tuning harness**
   - Build an offline replay harness using hint traces for L92/L108/L134 and a sampled suite of solved levels.
   - Automatically search bound coefficients/conditions that improve persistent levels while enforcing zero/low regression budget.

3. **Per-level adaptive attempt portfolio**
   - Instead of one global pass ladder, allocate attempt families by detected signature:
     - L92-like: intersection-deficit dominant => aggressive intersection-feasibility pruning + intersection-schedule-biased moves.
     - L108-like: near-solution saturation => legality-fixup/finalization passes with strict duplicate-control exceptions.
     - L134-like: constrained-portal corridors => corridor commitment policies and portal commitment anti-churn.

4. **Two-phase solve contract**
   - Phase 1: reach “feasible near-solution shell” states explicitly.
   - Phase 2: dedicated completion solver that only operates on shell states and optimizes legal closure.
   - This isolates the final-mile problem from global exploration noise.

5. **Persistent-level golden tests in CI**
   - Add a required gate that asserts measurable progress signals per level (not only solved/unsolved), e.g. reduced impossible-frontier ratio or improved lower-bound closure.
   - Prevents regressions hidden by unchanged timeout status.

## Bottom line

- The repo has invested heavily in telemetry and exploratory heuristics, yielding good observability but no durable resolution of levels **92, 108, 134**.
- The most credible root issue remains **feasibility pruning correctness + final-mile conversion**, not lack of scoring complexity.
- Next cycle should be **narrow, test-harness-driven, and guarded**, prioritizing correctness gates over broad heuristic or architecture swings.
