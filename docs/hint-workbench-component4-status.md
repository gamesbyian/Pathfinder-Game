# Component 4 Implementation Status (2026-07-10)

## Summary

Component 4 (Modularize full ablation/diversification phases) has been given a solid foundation:

- **Module created**: `modules/solver/hint-ablation-generator.ts` (398 lines)
- **Phase 0 (Baseline)**: Fully implemented and tested
- **Candidate events**: Properly emitted via `makeCandidateEvents()` from Component 3
- **Workbench integration**: New `ablation-full` preset wired and working
- **Smoke test**: Passing (`npm run hints:workbench -- --preset=ablation-full`)
- **Helper functions extracted**: portal/gate enumeration, swap level building, portal triple finding
- **Stubs in place**: Phases A/B/C/D/E/F/G defined but returning empty (ready for extraction)

## What's Done

### Module Structure
```
modules/solver/hint-ablation-generator.ts
├── AblationGeneratorOptions interface
├── AblationGeneratorResult interface
├── Helper functions
│   ├── pathSignature()
│   ├── flipTurnDir(), flipAxis()
│   ├── enumerateDirections(), enumeratePortalExitDirections()
│   ├── buildSwapLevel()
│   ├── findPortalExitPoints(), findGatePortalTriples()
└── createHintAblationGenerator() — async entry point
    └── Phase 0 (baseline) — WORKING
    └── Phases A/B/C/D/E/F/G — STUBS (ready for extraction)
```

### Workbench Integration
- Added `ablation-full` preset to PRESETS object
- Added `runAblationFull()` async function
- Updated `stepsForInclude()` to recognize `ablation-full`
- Wired full-ablation into `processLevel()` acceptance pipeline
- Candidates flow through standard dedup/validation/acceptance machinery

### Testing
- Unit tests pass (npm run test:node)
- Workbench smoke test passes
- Type checking passes (npm run check:types)
- All existing tests still pass

## What Remains

### 7 Phases to Extract (estimated 3-5 days of focused work)

1. **Phase A/B: Gate × direction cascade/strategy (forward)**
   - Requires: `runCascade()`, `runStrategyPhase()`
   - Depends on: `anyConfigSurvives()`, `TEMPLATE_CONFIG_KEY`, `PROFILE_CONFIG_KEY`, `FEATURE_GROUPS.strategy`
   - Source: lines 203-249 of `scripts/hint-diversification.mjs`

2. **Phase D: Gate/goal-swap cascade/strategy (reverse)**
   - Requires: Apply phases A/B to swapped level, reverse resulting paths
   - Depends on: Phase A/B logic + `buildSwapLevel()` (already extracted)
   - Source: lines 435-460 of `scripts/hint-diversification.mjs`

3. **Phase C: Portal-exit-direction cascade/strategy**
   - Requires: `runPortalCascade()`, `runPortalStrategyPhase()`
   - Depends on: Same config machinery as Phase A/B
   - Source: lines 254-300 of `scripts/hint-diversification.mjs`

4. **Phase E: Swap portal-exit-direction cascade/strategy**
   - Requires: Apply Phase C to swapped level, reverse paths
   - Depends on: Phase C logic + Phase D swap logic
   - Source: lines 535-567 of `scripts/hint-diversification.mjs`

5. **Phase F: Combined gate×direction × portal-exit-direction cascade/strategy**
   - Requires: `runCombinedCascade()`, `runCombinedStrategyPhase()`
   - Depends on: Same config machinery + evidence-bounded combination logic via `findGatePortalTriples()`
   - Source: lines 307-364 of `scripts/hint-diversification.mjs`

6. **Phase G: Swap combined forcing**
   - Requires: Apply Phase F to swapped level, reverse paths
   - Depends on: Phase F logic + swap logic
   - Source: lines 569-602 of `scripts/hint-diversification.mjs`

### Remaining Configuration/Imports
All 7 phases depend on importing from `scripts/ablation-config.mjs`:
- `TEMPLATE_CONFIG_KEY` — template name → config key mapping
- `PROFILE_CONFIG_KEY` — profile name → config key mapping
- `FEATURE_GROUPS.strategy` — list of strategy-flag feature names
- `withFeaturesDisabled()`, `withFeatureDisabled()` — config constructors

These are already imported in `modules/solver/diversification.ts`, confirming they work in TypeScript:
```typescript
import {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} from '../../scripts/ablation-config.mjs';
```

### Post-Phase Implementation Work
Once phases are extracted:

1. **Test extraction**: Add compatibility test comparing extracted phases to legacy script output
2. **Preset expansion**: Add `ablation-combined-only`, `ablation-reverse-only` presets
3. **Component 5**: Add real `--directions forward,reverse`, `--combined evidence,full` CLI options
4. **Legacy script migration**: (optional) Make `scripts/hint-diversification.mjs` call extracted engine

## Next Steps

**Immediate**: Extract Phase A/B cascade/strategy logic. This is the foundation for phases C-G.

**Pattern**: Each phase follows this structure:
1. Loop over axis dimension (gates, portal dests, combined triples, etc.)
2. For each axis value, run cascade loop (disable one feature per round until no solution found)
3. If cascade found solutions, run strategy loop (try each strategy flag independently)
4. Collect results with provenance (phase name, axis values, disabled feature)
5. Validate against forward level before considering
6. Feed into `consider()` helper which dedupes and tracks novelty

**Configuration**: Phases A/B/C/F use the same cascade/strategy machinery with different solve options:
- **Phase A/B**: `forcedFirstStepKey: direction` on gate-restricted level
- **Phase C**: `forcedPortalExitKey: { from: destKey, to: direction }` on full level
- **Phase F**: Both constraints simultaneously on gate-restricted level
- All variants use the same config disable/enable logic

## Files Modified
- `modules/solver/hint-ablation-generator.ts` (created)
- `scripts/hint-workbench.mjs` (added ablation-full preset + runAblationFull)
- `.gitignore` (added reports/hint-workbench/)
- `docs/hint-workbench-implementation-plan.md` (updated progress)

## Verification Commands
```bash
# Smoke test the foundation
npm run hints:workbench -- --levels=1 --preset=ablation-full --policy=audit-only --wall-ms=1000

# Run tests
npm run test:node                      # All node tests
npm run test:hint-workbench            # Just workbench unit tests
npm run check:types                    # TypeScript type checking

# Check code quality
npm run check:lint modules/solver/hint-ablation-generator.ts
npm run solver:bench -- --check        # Solver regression check (optional)
```
