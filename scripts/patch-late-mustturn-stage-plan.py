from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    'modules/solver/stage-plan.ts',
    "    /** Known only after repair probe; omission leaves shrink-recovery eligibility undefined. */\n    earlyRepairSearchShrunkTierCount?: number;\n",
    "    /** Known only after repair probe; omission leaves shrink-recovery eligibility undefined. */\n    earlyRepairSearchShrunkTierCount?: number;\n    /** Pre-dispatch structural eligibility for the default-off late must-turn retry. */\n    lateRepairMustTurnBiasedRetryEligible?: boolean;\n",
)
replace_once(
    'modules/solver/stage-plan.ts',
    "    const { budgetPlan, mainSearchEligible, earlyRepairSearchShrunkTierCount } = input;\n",
    "    const { budgetPlan, mainSearchEligible, earlyRepairSearchShrunkTierCount, lateRepairMustTurnBiasedRetryEligible } = input;\n",
)
replace_once(
    'modules/solver/stage-plan.ts',
    "        if (id === 'main-search') return { spec: solverStageSpec(id), eligible: mainSearchEligible };\n",
    "        if (id === 'main-search') return { spec: solverStageSpec(id), eligible: mainSearchEligible };\n        if (id === 'late-repair-must-turn-biased-retry') {\n            return { spec: solverStageSpec(id), eligible: !!lateRepairMustTurnBiasedRetryEligible };\n        }\n",
)

replace_once(
    'modules/solver/orchestration.ts',
    "        const solverStagePlan = buildSolverStagePlan({ budgetPlan: stageBudgetPlan, mainSearchEligible: hasMainConfig });\n",
    "        const solverStagePlan = buildSolverStagePlan({\n            budgetPlan: stageBudgetPlan,\n            mainSearchEligible: hasMainConfig,\n            lateRepairMustTurnBiasedRetryEligible: stageBudgetPlan.repairLateProbeTierWillRun\n                && !hasRepairConfig\n                && (level.mustPassTurnDirs?.size ?? 0) > 0\n                && cfg?.STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY === true,\n        });\n",
)
replace_once(
    'modules/solver/orchestration.ts',
    "            ['late-repair-search', !hasRepairConfig],\n            ['guidance-goal-distance-retry', hasMainConfig],\n",
    "            ['late-repair-search', !hasRepairConfig],\n            ['late-repair-must-turn-biased-retry', !hasRepairConfig && (level.mustPassTurnDirs?.size ?? 0) > 0],\n            ['guidance-goal-distance-retry', hasMainConfig],\n",
)
