# Level 92 audit-history analysis (through 2026-05-15)

## Scope and method

- Reviewed **158 raw audit exports** in `audits/raw/2026-*.json` and extracted the `levels[]` record where `level == 92`.
- Summarized status outcomes, attempt structure, pruning/branching telemetry, and change-over-time signals.

## What has *not* been changing (stable patterns)

1. **No successful solves in the observed history**
   - Outcomes for L92 are: `timeout` (144), `error` (10), `no-solution-inconclusive` (4).
   - `finalSolvedBy` is always `none`.

2. **Predominant failure mode is healthy but unproductive timeout**
   - `failureCategory` is overwhelmingly `healthy-expansion-timeout` (149/158 runs).
   - This indicates search is active (not immediately collapsing) but still misses the solution path under budget.

3. **Root branching is saturated and static**
   - `rootCandidatesGenerated` and `rootCandidatesExpanded` are consistently capped at 4 (median=4, min=0 in error runs).
   - This suggests L92 may need broader root diversification than the fixed/frequent 4-way expansion can provide.

4. **Attempt architecture is repetitive**
   - Most runs try the same ladder forms: `A..H` (61 runs) or `A..G` (56 runs), with only occasional longer ladders.
   - Across attempts, telemetry is nearly constant: `attemptFamily=main`, `policyProfile=unknown`, `structuralMode=none`, and `terminationReason=timeout`.

5. **No near-closure rescue behavior ever triggers**
   - `nearClosureRescueEligible=false` and `nearClosureRescueActivated=false` in all 158 runs.
   - If L92 requires endgame precision, current gating appears too strict or misaligned.

## What *has* been changing

1. **Some diversity controls appear in later generations, but not enough impact**
   - `depth0DiversityFloorApplied=true` in 112 runs and `forcedRootDiversity=true` in the same 112 runs.
   - This indicates solver evolution attempted root diversification, but result distribution for L92 remains timeout-dominant.

2. **Family-coverage policy toggled over time**
   - `depth0FamilyCoverageEnforced=true` in 61 runs and `false` in 97 runs.
   - The toggling itself shows experimentation, but no associated breakthrough.

3. **Minor attempt-count drift without success effect**
   - Early/mid/late thirds keep similar medians (`attemptCount` ~7–8, `nodesExpanded` ~6.1k–7.2k).
   - Late runs still mostly timeout (51/53), meaning budget distribution changes have not translated to solve success.

## Interpretation: why L92 likely remains unsolved

- L92 appears to be a **needle-in-search-order** problem, not merely a raw-capacity problem.
- The search is doing meaningful expansion (high nodes and candidate counts), but repeatedly explores similar structural regions.
- Rescue/endgame escalations never activate, so the solver likely fails to pivot when close-but-not-closing trajectories appear.

## Concrete refinement opportunities for solving L92

### 1) Add L92-targeted root broadening experiment

- Increase depth-0 candidate expansion *for this level signature* beyond 4 (e.g., 6–10) and track marginal hit-rate.
- Keep global defaults unchanged; gate via feature signature or an audit-only experiment flag.
- Success criterion: improved `bestObservedDepth/bound` and lower repeated timeout rate for L92 replay runs.

### 2) Diversify attempt families, not just depth-0 move choice

- Current attempts are all `attemptFamily=main` with `structuralMode=none`.
- Introduce at least 2 alternative structural families in the ladder (e.g., aggressive obligation-first vs portal-commitment-first).
- Add telemetry fields for family-level novelty and per-family best frontier bound, so we can see if alternatives are genuinely orthogonal.

### 3) Relax/retune near-closure rescue eligibility for L92-like traces

- Since rescue never becomes eligible, adjust gates using L92 timeout traces:
  - lower bound-plateau threshold,
  - reduce minimum depth-ratio trigger,
  - or permit one rescue fire when repeated progress stalls are detected.
- Validate by checking non-zero `nearClosureRescueEligible/Activated` on L92 with no major regression on solved levels.

### 4) Add anti-redundancy pressure across attempts

- Timeout attempts likely revisit equivalent basins.
- Add cross-attempt novelty penalties (e.g., state-signature overlap or repeated root-branch fingerprints) to force different frontier sectors.
- Log overlap metrics per attempt pair; accept only if overlap decreases and L92 best-bound improves.

### 5) Shift budget from breadth-only to staged escalation

- Rather than many homogeneous timeout attempts, run fewer attempts with explicit escalation:
  1. Broad root diversification pass,
  2. Midgame obligation/portal pivot pass,
  3. Endgame-rescue-enabled pass.
- Terminate early when attempts are diagnostically redundant.

### 6) Build an L92 replay benchmark profile

- Create a stable replay profile for L92 that outputs:
  - per-attempt best depth/bound trajectory,
  - overlap/novelty metrics,
  - rescue gate decisions.
- Use this profile as a PR gate for heuristic changes intended to improve hard unsolved levels.

## Practical next step order

1. Instrument novelty + family-level frontier metrics.
2. Run controlled A/B on root beam >4 for L92 signature only.
3. Enable a permissive one-shot near-closure rescue variant in replay mode.
4. Keep the best-performing combination and graduate to broader hard-level cohort tests.

