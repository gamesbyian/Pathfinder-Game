/** Shared pure helpers between scripts/portfolio-solve-sweep.mjs (sequential/main-process path)
 *  and scripts/portfolio-solve-sweep-worker.mjs (parallel worker path) — kept in one place so the
 *  two never compute a row's fields differently. */

export function attemptConfigKey(attempt) {
    // admissible-order-search attempts carry no beamWidth, so without this branch they reconstructed
    // as plain `dfs:<profile>` -- silently attributing every admissible-order win to DFS in every
    // report's winningConfig/failedStrategies (the tier's no-tie-break entry showed up as `dfs:none`,
    // which is how this was noticed). Mirrors orchestration.ts's own attemptConfigKey, which has had
    // this branch since the tier existed; only this reconstruction-from-a-persisted-attempt copy
    // lacked it.
    if (attempt?.admissibleOrder) {
        const base = attempt.admissibleOrderNoTieBreak ? 'ida:none' : `ida:${attempt.profile ?? 'unknown'}`;
        return attempt.admissibleOrderLds ? `${base}(lds)` : base;
    }
    const family = attempt?.beamWidth ? 'beam' : 'dfs';
    const template = attempt?.template ? `/${attempt.template}` : '';
    const beam = attempt?.beamWidth ? `@beam${attempt.beamWidth}` : '';
    const diverse = attempt?.diverseBeam ? '(diverse)' : '';
    const repair = attempt?.repair ? ':repair' : '';
    // Must mirror orchestration.ts's own attemptConfigKey exactly (repairMustTurnBiased takes
    // precedence, else repairTurnBiased, else neither) -- this file's copy previously omitted
    // repairTurnBiased entirely, so a turn-biased repair winner's persisted winningConfig silently
    // lost its "(turnBiased)" suffix, matching the WRONG (plain repair) config on any later
    // config-key lookup (e.g. --prime-winner's primeAttemptFor) -- found while measuring the
    // winner-first pre-attempt's hit rate on repair winners (2026-07-23).
    const biased = attempt?.repairMustTurnBiased ? '(mustTurnBiased)' : attempt?.repairTurnBiased ? '(turnBiased)' : '';
    return `${family}:${attempt?.profile ?? 'unknown'}${template}${beam}${diverse}${repair}${biased}`;
}

export function winningAttempt(result, phase = null) {
    return (Array.isArray(result?.attempts) ? result.attempts : []).find(a => a?.ok && (!phase || a.schedulerPhase === phase)) ?? null;
}

function projectedAttemptError(error) {
    const bounded = (value, fallback, max) => {
        let string;
        try { string = typeof value === 'string' ? value : value == null ? fallback : String(value); }
        catch { string = fallback; }
        return string.slice(0, max);
    };
    const field = (key) => { try { return error?.[key]; } catch { return undefined; } };
    return {
        name: bounded(field('name'), 'Error', 120),
        message: bounded(field('message'), 'Unknown attempt error', 500),
        gateKey: Number.isFinite(field('gateKey')) ? field('gateKey') : null,
        configKey: bounded(field('configKey'), 'unknown', 240),
        profile: bounded(field('profile'), 'unknown', 120),
        template: field('template') == null ? null : bounded(field('template'), 'unknown', 120),
    };
}

/** Portfolio-experiment attempts carry schedulerPhase ('portfolio'/'fallback'); plain legacy-mode
 *  attempts and race.mjs's raced attempts never do (confirmed: scripts/solver-parallel/
 *  benchmark.mjs finds its own winner the same phase-free way, `attempts.find(a => a.ok)`) — so a
 *  phase-scoped lookup alone leaves winningConfig/gateKey null for both of those. Try the
 *  phase-scoped winner first (it's more informative — which pass/phase won), then fall back to
 *  "any ok attempt" so every scheduler mode reports a winner when one exists. */
export function anyWinningAttempt(result) {
    return winningAttempt(result, 'portfolio') ?? winningAttempt(result, 'fallback') ?? winningAttempt(result, null);
}

export function passForWin(result) {
    const winner = winningAttempt(result, 'portfolio');
    return Number.isFinite(Number(winner?.passNumber)) ? Number(winner.passNumber) : null;
}

/** Maps one raw solver Attempt into the same shape scripts/stress/benchmark.mjs's solveEntry
 *  records, so a portfolio-solve-sweep report and a stress:benchmark report are both consumable
 *  by the same downstream badness/stability tooling (rank-levels.mjs's levelBadness needs
 *  bestBadness/finalBadness per attempt; classify-stability.mjs needs elapsedMs/refereeValid at
 *  the row level — see below). */
export function attemptRecord(a) {
    return {
        gateKey: a.gateKey, profile: a.profile, template: a.template, beamWidth: a.beamWidth,
        ok: a.ok, elapsedMs: a.elapsedMs,
        ...(a.outcome !== undefined ? { outcome: a.outcome } : {}),
        // Re-project an explicit whitelist instead of retaining an arbitrary thrown object or a
        // future accidental `stack` field from an upstream transport.
        ...(a.error !== undefined ? { error: projectedAttemptError(a.error) } : {}),
        ...(a.passNumber !== undefined ? { passNumber: a.passNumber } : {}),
        ...(a.configKey !== undefined ? { configKey: a.configKey } : {}),
        ...(a.restart !== undefined ? { restart: a.restart } : {}),
        ...(a.schedulerPhase !== undefined ? { schedulerPhase: a.schedulerPhase } : {}),
        // How much budget this attempt was actually GIVEN. Without it, an attempt that exhausted its
        // search and one that got a sliver of a divided budget are indistinguishable in a report --
        // which is exactly the question "did the last-resort tier get room to run?" needs answered.
        ...(a.allocatedBudgetMs !== undefined ? { allocatedBudgetMs: a.allocatedBudgetMs } : {}),
        ...(a.nodesExpanded !== undefined ? { nodesExpanded: a.nodesExpanded } : {}),
        ...(a.timedOut !== undefined ? { timedOut: a.timedOut } : {}),
        ...(a.bestBadness !== undefined ? { bestBadness: a.bestBadness } : {}),
        ...(a.finalBadness !== undefined ? { finalBadness: a.finalBadness } : {}),
        ...(a.diverseBeam ? { diverseBeam: true } : {}),
        ...(a.repair ? { repair: true } : {}),
        ...(a.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
        ...(a.repairTurnBiased ? { repairTurnBiased: true } : {}),
        // Distinguishes a runRepairProbe attempt from the same repair config re-run later by the
        // full-budget repair fallback loop -- see orchestration.ts's Attempt.repairProbe comment.
        ...(a.repairProbe ? { repairProbe: true } : {}),
        // Separates a STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY re-run from the original shrunken
        // probe attempt (both carry repairProbe) -- without this the recovery tier is invisible in
        // every persisted report, the same drop-before-persist gap CLAUDE.md's provenance section
        // documents for admissibleOrder.
        ...(a.repairProbeShrinkRecovery ? { repairProbeShrinkRecovery: true } : {}),
        // The admissible-order-search last-resort tier's dispatch flags. Omitting these made every
        // one of its attempts indistinguishable from a plain DFS attempt in every persisted report
        // (measured: 0 attempts carrying these flags across the whole corpus-2 baseline and the
        // 240-shard high-budget sweep, despite 486 of that sweep's levels demonstrably reaching the
        // tier -- detectable only via the accident that its no-tie-break entry uses the otherwise
        // unused profile name 'none'). Hint provenance was never affected: deriveSolveAttemptInfo
        // reads the raw solver Attempt, not this projection, which is why the hint corpus does carry
        // admissible-order finds while every report claimed zero.
        ...(a.admissibleOrder ? { admissibleOrder: true } : {}),
        ...(a.admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
        ...(a.admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        ...(a.mainLoopLateReserve ? { mainLoopLateReserve: true } : {}),
        ...(a.attractionDiversity ? { attractionDiversity: true } : {}),
        ...(a.dedupNearTieRetry ? { dedupNearTieRetry: true } : {}),
        ...(a.admissibleOrderNonDefaultRetry ? { admissibleOrderNonDefaultRetry: true } : {}),
        ...(a.connectivityAxisExhaustedRetry ? { connectivityAxisExhaustedRetry: true } : {}),
        ...(a.repairElitePrefixDfsRetry ? { repairElitePrefixDfsRetry: true } : {}),
        ...(a.mcNeighborBudgetRetry ? { mcNeighborBudgetRetry: true } : {}),
        ...(a.repairLateProbe ? { repairLateProbe: true } : {}),
        ...(a.allocatedWorkCeiling !== undefined ? { allocatedWorkCeiling: a.allocatedWorkCeiling } : {}),
        ...(a.allocatedNodeCeiling !== undefined ? { allocatedNodeCeiling: a.allocatedNodeCeiling } : {}),
        ...(a.workSpent !== undefined ? { workSpent: a.workSpent } : {}),
        ...(a.randomSeed !== undefined ? { randomSeed: a.randomSeed } : {}),
        // seedSalt is the value to REPLAY a repair winner directly (repairPrimarySeed(gateKey,
        // seedSalt) derives randomSeed from it, not the other way around) -- only set on the
        // attempt when nonzero (orchestration.ts), so its absence on a repair attempt means salt 0,
        // not "unknown"; distinguish via the `repair` flag above, not this field's presence.
        ...(a.seedSalt !== undefined ? { seedSalt: a.seedSalt } : {}),
    };
}

/** Builds the per-level report row from a raw SolveResult. Does NOT do hint-saving (that stays
 *  in the main process only — see portfolio-solve-sweep.mjs). Does NOT compute refereeValid
 *  itself (needs a live Solver + prepared level, which this pure-helpers module intentionally
 *  doesn't depend on) — callers set `result.refereeValid` before calling buildRow when they want
 *  it recorded; both call paths (portfolio-solve-sweep.mjs's main process, and
 *  portfolio-solve-sweep-worker.mjs's worker process) already have Solver in scope right where
 *  they get `result` back from Solver.solve()/racePool.solveLevel(). */
export function buildRow(levelNumber, id, result, schedulerMode) {
    const pass = passForWin(result);
    const solvedBeforeFallback = !!result?.portfolio?.solvedBeforeFallback;
    const solvedByFallback = !!result?.ok && !solvedBeforeFallback;
    const winner = anyWinningAttempt(result);
    const phaseLabel = pass ? `pass${pass}` : (solvedByFallback ? (schedulerMode === 'legacy' ? 'legacy' : 'fallback') : '');
    const attempts = (Array.isArray(result?.attempts) ? result.attempts : []).map(attemptRecord);
    return {
        level: levelNumber,
        id: id ?? null,
        ok: !!result?.ok,
        status: result?.status ?? 'unknown',
        hadAttemptError: attempts.some(a => a.outcome === 'error'),
        error: result?.error ?? null,
        totalMs: result?.totalMs ?? null,
        elapsedMs: result?.totalMs ?? null,
        nodesExpanded: result?.nodesExpanded ?? null,
        // Host-independent cost, and the flag that says a "failure" was really indeterminate. Only
        // workSpent is comparable across a speed change (nodesExpanded is not, and dfs/beam/repair
        // count 11-17x different work per "node" anyway) — see modules/solver/work-meter.ts and
        // docs/solver-budget-determinism.md. A deadlineTruncated row is NOT evidence of unsolvable.
        workSpent: result?.workSpent ?? null,
        deadlineTruncated: !!result?.deadlineTruncated,
        techniqueLifecycle: result?.techniqueLifecycle ?? null,
        refereeValid: result?.refereeValid ?? null,
        solvedBeforeFallback,
        solvedByFallback,
        solvedByPrime: !!result?.solvedByPrime,
        pass,
        phaseLabel,
        winningConfig: winner ? (winner.configKey ?? attemptConfigKey(winner)) : null,
        gateKey: winner?.gateKey ?? null,
        solution: result?.solution ?? null,
        attemptCount: attempts.length,
        attempts,
        failedStrategies: attempts.filter(a => !a.ok).map(a => a.configKey ?? attemptConfigKey(a)),
        hintAppended: false,
        skippedCached: false,
    };
}

/** child_process IPC serializes messages as JSON, which drops Set objects (they arrive as `{}`).
 *  portfolioExperiment carries pass2Configs/pass3Configs/conditionalPasses[].configs as Sets, so
 *  worker tasks must serialize them to arrays before `worker.send()` and reconstruct them on the
 *  worker side before passing solveOpts to Solver.solve — otherwise runPortfolioExperiment's
 *  `.has()` calls throw. Sequential (non-worker) runs never go through this, so they're
 *  unaffected either way. */
export function serializePortfolioExperiment(experiment) {
    if (!experiment) return experiment;
    return {
        ...experiment,
        pass2Configs: [...experiment.pass2Configs],
        pass3Configs: [...experiment.pass3Configs],
        conditionalPasses: (experiment.conditionalPasses ?? []).map(p => ({ ...p, configs: [...p.configs] })),
    };
}
export function deserializePortfolioExperiment(experiment) {
    if (!experiment) return experiment;
    return {
        ...experiment,
        pass2Configs: new Set(experiment.pass2Configs),
        pass3Configs: new Set(experiment.pass3Configs),
        conditionalPasses: (experiment.conditionalPasses ?? []).map(p => ({ ...p, configs: new Set(p.configs) })),
    };
}

/** Bucket a row into the pass-distribution counters object (mutated in place). */
export function tallyPass(passCounts, row, schedulerMode) {
    if (row.pass === 1) passCounts.pass1 += 1;
    else if (row.pass === 2) passCounts.pass2 += 1;
    else if (row.pass === 3) passCounts.pass3 += 1;
    else if (row.pass && row.pass > 3) passCounts.conditional += 1;
    else if (row.solvedByFallback) passCounts[schedulerMode === 'legacy' ? 'legacy' : 'fallback'] += 1;
    else passCounts.unsolved += 1;
}
