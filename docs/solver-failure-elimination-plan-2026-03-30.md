# Solver failure elimination plan (audit batch dated 2026-03-30)

## Inputs reviewed

- `node scripts/analyze-audit-failures.mjs` summary across latest windows shows stable failures on levels **92, 108, 134**, with level **61** newly regressed in the latest run. Collapse-family diagnostics are not implicated (`collapseFailures=0`), and all failures are timeout-class, not contradiction/pre-expansion aborts.  
- Latest raw export (`audits/raw/latest.json`) has 4 failing levels (61, 92, 108, 134), all with `failureCategory=healthy-expansion-timeout`.  
- Level definitions and saved hint paths in `levels.js` were compared for 92/108 and their non-portal counterparts 134/135.

## Core observations from the latest batch

1. **Level 108 is one move from feasibility under timeout diagnostics, while level 135 solves directly.**
   - Level 108 timeout diagnostics repeatedly report `bestLowerBoundToValidSolution=1`, with high near-solution counts in `interaction` and `must-pass`. This indicates search is close but ordering/selection is missing a narrow branch.
   - Level 135 (portal→wall counterpart of 108) solves in one attempt.

2. **Level 92 and level 134 fail for the same reason pattern (must-cross deficit), so this pair is not primarily a portal issue.**
   - Level 92 timeout diagnostics end with `bestLowerBoundToValidSolution=14` and near-solution mass only in `must-cross`.
   - Level 134 (portal→wall counterpart of 92) also times out, with `bestLowerBoundToValidSolution=10`, near-solution mass likewise in `must-cross`.
   - Therefore, replacing portals with walls does **not** fix this family; the dominant weakness is long-horizon must-cross scheduling under high length/intersection constraints.

3. **Saved hints imply portals are not needed for level 108-style successes.**
   - Level 108’s saved hint paths do not visit portal endpoints.
   - Level 135’s saved hints are essentially the same shape and solve without portal mechanics, supporting the conclusion that optional portals are distracting search rather than enabling required progress in this family.

## Logical deduction about portals from 108→135 and 92→134

- **Deduction A (108→135):** If converting optional portals to walls changes timeout→solve, the solver likely needs a stronger policy for *optional portal suppression* (avoid entering portals that are not obligation-improving), because walls implicitly remove these branches and reduce entropy.
- **Deduction B (92→134):** If converting portals to walls still fails, the dominant issue is *not* portal transition handling but objective scheduling (must-cross and long-path feasibility). Portal policy improvements alone will not eliminate this failure class.

Together, this means the solver needs **two independent upgrades**:
1) optional-portal branch suppression for low-obligation portal levels (108-class), and
2) deeper must-cross scheduling/progress scoring for long constrained levels (92/134-class).

## Plan to eliminate current failure classes

## Phase 1 — Optional portal suppression (target: level 108 class)

### 1.1 Add an optional-portal admissibility gate at candidate filtering
At candidate generation/filter time, reject (or strongly de-prioritize) a portal transition when all of the following hold:
- no mandatory portal family obligation is active,
- portal use does not improve nearest outstanding must-pass/must-cross lower bound,
- portal use does not reduce objective-track distance,
- and current slack does not require portal compression.

This should be implemented as a general rule derived from state metrics, not level IDs.

### 1.2 Add a “portal-opportunity debt” feature to scoring
Extend scoring with a debt term that accumulates for non-improving portal hops and is only discharged by measurable obligation progress. This is stronger than one-step oscillation penalties and should reduce repeated portal detours that stay near-solvable but fail to close.

### 1.3 Acceptance checks
- Level 108 transitions from timeout to solved in full newHint audit.
- Level 135 remains solved.
- Portal-required levels do not regress (watch portal-family signatures with high mandatory usage).

## Phase 2 — Must-cross horizon planning (target: levels 92 and 134)

### 2.1 Add a multi-objective reachability budget bound
Introduce a forward-feasibility estimate that combines:
- remaining must-pass count,
- remaining must-cross deficits,
- required intersections,
- and path-length slack,
into one conservative schedule bound (not just independent local bounds).

Use this in root ordering and depth-limited pruning to avoid branches that cannot satisfy all obligations within remaining steps.

### 2.2 Prioritize “must-cross unlock” moves early in long slack regimes
When `bestLowerBoundToValidSolution` is dominated by must-cross deficits, increase score pressure toward moves that reduce *future must-cross feasibility risk* (e.g., preserving access corridors and parity-compatible approach lanes), even if immediate must-pass distance is flat.

### 2.3 Add timeout rescue variant focused on must-cross closure
Add one late pass variant that relaxes portal-related biases and increases must-cross urgency + connectivity preservation, then reorders root candidates by estimated must-cross closure potential.

### 2.4 Acceptance checks
- Levels 92 and 134 both solve in full newHint audits.
- No regressions on existing long non-portal must-cross levels.

## Phase 3 — Instrumentation upgrades to keep this robust as level sets change

### 3.1 Add two diagnostic counters to timeout diagnostics
- `nonImprovingPortalTransitionsExpanded`
- `mustCrossScheduleInfeasibleFrontierStates`

These metrics make future regressions attributable without level-specific assumptions.

### 3.2 Add feature-signature audit slices
Track solve/fail rates by derived topology buckets (e.g., optional-portal + must-cross-heavy + long-length) so future level reorderings/new levels remain covered by behavior-based tuning.

## Phase 4 — Regression protocol

1. Run `npm run audit:newhint:full` and `npm run audit:analyze-failures`.
2. Confirm no timeout failures on 61/92/108/134.
3. Confirm no statistically meaningful regressions on portal-required and high-intersection signatures.
4. Lock gains with targeted smoke checks for:
   - optional portal present but non-mandatory,
   - portal mandatory family,
   - high must-cross + high reqLen levels.

## Non-goals / constraints respected

- **No hint seeding**: saved hints were only used as comparative inspiration, not runtime guidance.
- **No level-specific logic**: all proposed changes are state/feature based and remain valid if level ordering/content changes.
