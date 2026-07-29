# Categorizing Corpus 2's Remaining 995 Unsolved Levels — Investigation Plan

**Status**: High-budget sweep confirmed solver capability (not budget) is the binding constraint. Next phase: understand *why* the remaining 995 are unsolvable.

## The Problem

Corpus 2 currently has:
- **605/1700 solved** (have valid hint paths)
- **679/1700 with any hints** (solved + witness divergence)
- **1021/1700 with zero hints** (genuinely unsolved)

Of those 1021 with zero hints:
- **26 newly discovered** in round 2 high-budget sweep (300M node budget each)
- **995 remain unsolvable** even at that budget, all hitting the node cap

**Key insight**: Every remaining unsolved level exhausted the node budget without finding a solution. Budget is no longer the lever. The question is: *what's blocking each one*?

## Hypotheses to Test

### 1. **Solver Algorithm Gap**
Levels unsolvable by the current deterministic/repair-search approach, but solvable by a different algorithm entirely.

**Test**: Pick a sample of 5–10 remaining unsolved levels and manually solve them (or attempt to) to answer:
- Is there a solution at all (are they genuinely solvable)?
- If yes, what *search strategy* would find it?
- Do they cluster by archetype, or are they scattered?

### 2. **Specific Heuristic Blind Spot**
A particular mechanic combination (e.g., must-cross + portal + flipping filter) that the solver's scoring/pruning systematically mishandles.

**Test**: Ablation on a sample of unsolved levels. Disable specific components (must-cross pruning, portal logic, flipper state tracking) and re-solve. If a disable fixes it, that's the culprit.

### 3. **Level Design Issue**
Some unsolved levels might be:
- Genuinely infeasible (no solution exists despite passing schema/structural validation)
- Trivially solvable but have a corpus-generation bug (witness path is wrong, not the solver)
- Pathologically low signal-to-noise ratio (solution exists but is hidden by bad geometry)

**Test**: For each level's witness path (stored in `stressMeta.witnessSolution`), verify it still passes `validateCandidatePath`. If it fails, the level itself is broken, not the solver.

### 4. **Archetype Clustering**
Some archetypes may be inherently harder than others, independent of budget.

**Test**: Cross-reference unsolved levels against their auto-computed `archetype` field and `predictionConfidence`. Are unsolved levels concentrated in specific archetypes? Spread evenly?

## Investigation Workflow

1. **Sample selection** (start with ~20 levels)
   - Pull 995 unsolved IDs from current baseline
   - Stratify by archetype (if corpus 2 levels have this metadata)
   - Select 2–3 per archetype to ensure coverage
   - Prefer levels close to the "solvability edge" (high nodesExpanded, diverse attempt patterns) over levels that timed out immediately

2. **Characterization per level**
   - Witness path validity: Does the stored witness still pass `validateCandidatePath`?
   - Attempt portfolio analysis: Which attempt config came closest? (Check `reports/stress/benchmark-latest-random.json`'s `closest attempt config` if available, or re-solve in isolation with detailed logging)
   - Manual solve attempt: Can a human/AI solve it? If yes, what strategy?
   - Blocker identification: Which constraint/mechanic is the pain point?

3. **Categorization scheme** (build incrementally)
   - **Infeasible**: Witness fails validation; level is broken, not solver
   - **Algorithmically hard**: Solvable but requires search strategy not in portfolio (e.g., constraint propagation)
   - **Heuristic blind spot**: Solvable by current algorithm but scoring/pruning systematically avoids it
   - **Archetype edge case**: Solvable but specific archetype regime under-represented in policy
   - **Geometry edge case**: Solution exists but hidden by degenerate geometry or grid bounds

4. **Output**: Categorization report
   - Per-level category + evidence
   - Cluster summary (which categories dominate?)
   - Recommended next steps per category

## Tools Available

- **Re-solve in isolation**: `npm run solver:direct -- --levels=id:R00XXX --verbose` (check the solver-architecture doc for flags)
- **Validate witness**: Read `data/stress/stress-levels-random.json`, pull level's `stressMeta.witnessSolution`, call `Solver.validateCandidatePath(level, path)`
- **Attempt portfolio**: `npm run stress:benchmark -- --levels=id:R00XXX` (full sweep) or manual instrumentation of `Solver.solve(...).attempts`
- **Ablation**: Modify `modules/solver/attempts.ts` or scoring to selectively disable features and re-solve
- **Manual solving**: Editor mode (`npm run dev`), load level via Dev-Mode corpus switch

## Output Structure (for next session)

Write a categorization report as `reports/stress/corpus2-failure-categorization-2026-07-29.md`:
- Executive summary: Dominant failure mode(s), distribution across categories
- Per-category summary: How many levels? What's the recommended next step per category?
- Detailed level sheet: ID, archetype, category, evidence, closest-attempt config, manual solve result (if attempted)
- Recommended priorities: Which category should solver work focus on?

---

**Estimate**: ~50–100 hours of distributed analysis (parallelizable: each level is independent; 20 sample levels × 2–5 hours per = 40–100 hours). Not a solve — a diagnosis. The goal is to de-risk future work by knowing which direction (algorithm, heuristic, level design) is actually worth pursuing.
