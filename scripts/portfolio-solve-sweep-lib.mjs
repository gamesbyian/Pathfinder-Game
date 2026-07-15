/** Shared pure helpers between scripts/portfolio-solve-sweep.mjs (sequential/main-process path)
 *  and scripts/portfolio-solve-sweep-worker.mjs (parallel worker path) — kept in one place so the
 *  two never compute a row's fields differently. */

export function attemptConfigKey(attempt) {
    const family = attempt?.beamWidth ? 'beam' : 'dfs';
    const template = attempt?.template ? `/${attempt.template}` : '';
    const beam = attempt?.beamWidth ? `@beam${attempt.beamWidth}` : '';
    const diverse = attempt?.diverseBeam ? '(diverse)' : '';
    const repair = attempt?.repair ? ':repair' : '';
    const biased = attempt?.repairMustTurnBiased ? '(mustTurnBiased)' : '';
    return `${family}:${attempt?.profile ?? 'unknown'}${template}${beam}${diverse}${repair}${biased}`;
}

export function winningAttempt(result, phase = null) {
    return (Array.isArray(result?.attempts) ? result.attempts : []).find(a => a?.ok && (!phase || a.schedulerPhase === phase)) ?? null;
}

export function passForWin(result) {
    const winner = winningAttempt(result, 'portfolio');
    return Number.isFinite(Number(winner?.passNumber)) ? Number(winner.passNumber) : null;
}

/** Builds the per-level report row from a raw SolveResult. Does NOT do hint-saving (that stays
 *  in the main process only — see portfolio-solve-sweep.mjs). */
export function buildRow(levelNumber, id, result, schedulerMode) {
    const pass = passForWin(result);
    const solvedBeforeFallback = !!result?.portfolio?.solvedBeforeFallback;
    const solvedByFallback = !!result?.ok && !solvedBeforeFallback;
    const winner = winningAttempt(result, 'portfolio') ?? winningAttempt(result, 'fallback');
    const phaseLabel = pass ? `pass${pass}` : (solvedByFallback ? (schedulerMode === 'legacy' ? 'legacy' : 'fallback') : '');
    return {
        level: levelNumber,
        id: id ?? null,
        ok: !!result?.ok,
        status: result?.status ?? 'unknown',
        totalMs: result?.totalMs ?? null,
        nodesExpanded: result?.nodesExpanded ?? null,
        solvedBeforeFallback,
        solvedByFallback,
        pass,
        phaseLabel,
        winningConfig: winner ? (winner.configKey ?? attemptConfigKey(winner)) : null,
        gateKey: winner?.gateKey ?? null,
        solution: result?.solution ?? null,
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
