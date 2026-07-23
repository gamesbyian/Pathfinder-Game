/** Shared pure helpers between scripts/portfolio-solve-sweep.mjs (sequential/main-process path)
 *  and scripts/portfolio-solve-sweep-worker.mjs (parallel worker path) — kept in one place so the
 *  two never compute a row's fields differently. */

export function attemptConfigKey(attempt) {
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
function attemptRecord(a) {
    return {
        gateKey: a.gateKey, profile: a.profile, template: a.template, beamWidth: a.beamWidth,
        ok: a.ok, elapsedMs: a.elapsedMs,
        ...(a.nodesExpanded !== undefined ? { nodesExpanded: a.nodesExpanded } : {}),
        ...(a.timedOut !== undefined ? { timedOut: a.timedOut } : {}),
        ...(a.bestBadness !== undefined ? { bestBadness: a.bestBadness } : {}),
        ...(a.finalBadness !== undefined ? { finalBadness: a.finalBadness } : {}),
        ...(a.diverseBeam ? { diverseBeam: true } : {}),
        ...(a.repair ? { repair: true } : {}),
        ...(a.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
        ...(a.repairTurnBiased ? { repairTurnBiased: true } : {}),
        ...(a.attractionDiversity ? { attractionDiversity: true } : {}),
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
        error: result?.error ?? null,
        totalMs: result?.totalMs ?? null,
        elapsedMs: result?.totalMs ?? null,
        nodesExpanded: result?.nodesExpanded ?? null,
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
