/** Shared pure helpers for sequential and worker portfolio-sweep paths. */

import { formatAttemptActionKey, formatAttemptIdentityKey, normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { normalizeSolverStageId } from '../modules/solver/stage-policy.ts';

/** Reconstruct canonical config identity from a persisted Attempt shape. */
export function attemptConfigKey(attempt) {
    return formatAttemptIdentityKey({
        scoringProfileId: attempt?.scoringProfileId ?? attempt?.profile ?? 'unknown',
        orderingBiasId: attempt?.orderingBiasId ?? attempt?.template ?? null,
        beamWidth: attempt?.beamWidth, mechanicBucketRetention: attempt?.mechanicBucketRetention ?? attempt?.diverseBeam, repair: attempt?.repair,
        repairMustTurnBiased: attempt?.repairMustTurnBiased, repairTurnBiased: attempt?.repairTurnBiased,
        admissibleOrder: attempt?.admissibleOrder, admissibleOrderNoTieBreak: attempt?.admissibleOrderNoTieBreak,
        admissibleOrderLds: attempt?.admissibleOrderLds,
    });
}

/** Normalize a persisted config string when present; otherwise reconstruct it from Attempt fields. */
export function canonicalAttemptConfigKey(attempt) {
    const raw = attempt?.configKey ?? attempt?.config;
    if (raw != null) return normalizeAttemptIdentityKey(String(raw));
    return attemptConfigKey(attempt);
}

/**
 * Reconstruct scheduler/research action identity from an Attempt. Returns null for historical
 * records that predate canonical stageId rather than inventing a stage from compatibility flags.
 * Gate and budget remain separate dimensions; repair salt 0 is made explicit by the formatter.
 */
export function attemptActionKey(attempt) {
    if (!attempt?.stageId) return null;
    return formatAttemptActionKey({
        stageId: normalizeSolverStageId(attempt.stageId),
        scoringProfileId: attempt?.scoringProfileId ?? attempt?.profile ?? 'unknown',
        orderingBiasId: attempt?.orderingBiasId ?? attempt?.template ?? null,
        beamWidth: attempt?.beamWidth, mechanicBucketRetention: attempt?.mechanicBucketRetention ?? attempt?.diverseBeam, repair: attempt?.repair,
        repairMustTurnBiased: attempt?.repairMustTurnBiased, repairTurnBiased: attempt?.repairTurnBiased,
        admissibleOrder: attempt?.admissibleOrder, admissibleOrderNoTieBreak: attempt?.admissibleOrderNoTieBreak,
        admissibleOrderLds: attempt?.admissibleOrderLds,
        seedSalt: attempt?.seedSalt,
    });
}

function schedulerPhaseMatches(actual, expected) {
    if (!expected) return true;
    if (expected === 'legacy-latency-portfolio') return actual === expected || actual === 'portfolio';
    return actual === expected;
}
export function winningAttempt(result, phase = null) {
    return (Array.isArray(result?.attempts) ? result.attempts : []).find(a => a?.ok && schedulerPhaseMatches(a.schedulerPhase, phase)) ?? null;
}

function projectedAttemptError(error) {
    const bounded = (value, fallback, max) => {
        let string;
        try { string = typeof value === 'string' ? value : value == null ? fallback : String(value); }
        catch { string = fallback; }
        return string.slice(0, max);
    };
    const field = (key) => { try { return error?.[key]; } catch { return undefined; } };
    const rawConfigKey = bounded(field('configKey'), 'unknown', 240);
    let configKey = rawConfigKey;
    try { configKey = normalizeAttemptIdentityKey(rawConfigKey); } catch {}
    return {
        name: bounded(field('name'), 'Error', 120),
        message: bounded(field('message'), 'Unknown attempt error', 500),
        gateKey: Number.isFinite(field('gateKey')) ? field('gateKey') : null,
        configKey,
        scoringProfileId: bounded(field('scoringProfileId') ?? field('profile'), 'unknown', 120),
        orderingBiasId: (field('orderingBiasId') ?? field('template')) == null
            ? null
            : bounded(field('orderingBiasId') ?? field('template'), 'unknown', 120),
    };
}

/** Prefer phase-specific portfolio/fallback winner, then any successful attempt for legacy/race modes. */
export function anyWinningAttempt(result) {
    return winningAttempt(result, 'legacy-latency-portfolio') ?? winningAttempt(result, 'fallback') ?? winningAttempt(result, null);
}

export function passForWin(result) {
    const winner = winningAttempt(result, 'legacy-latency-portfolio');
    return Number.isFinite(Number(winner?.passNumber)) ? Number(winner.passNumber) : null;
}

/** Project one raw Attempt into the stress-benchmark-compatible persisted shape. */
export function attemptRecord(a) {
    const actionKey = attemptActionKey(a);
    return {
        ...(a.stageId !== undefined ? { stageId: a.stageId } : {}),
        ...(actionKey !== null ? { actionKey } : {}),
        gateKey: a.gateKey,
        scoringProfileId: a.scoringProfileId ?? a.profile,
        orderingBiasId: a.orderingBiasId ?? a.template ?? null,
        beamWidth: a.beamWidth,
        ok: a.ok, elapsedMs: a.elapsedMs,
        ...(a.outcome !== undefined ? { outcome: a.outcome } : {}),
        // Whitelist error fields; never persist arbitrary thrown objects/stacks.
        ...(a.error !== undefined ? { error: projectedAttemptError(a.error) } : {}),
        ...(a.passNumber !== undefined ? { passNumber: a.passNumber } : {}),
        ...(a.configKey !== undefined || a.config !== undefined ? { configKey: canonicalAttemptConfigKey(a) } : {}),
        ...(a.restart !== undefined ? { restart: a.restart } : {}),
        ...(a.schedulerPhase !== undefined ? { schedulerPhase: a.schedulerPhase } : {}),
        ...(a.allocatedBudgetMs !== undefined ? { allocatedBudgetMs: a.allocatedBudgetMs } : {}),
        ...(a.nodesExpanded !== undefined ? { nodesExpanded: a.nodesExpanded } : {}),
        ...(a.timedOut !== undefined ? { timedOut: a.timedOut } : {}),
        ...(a.bestBadness !== undefined ? { bestBadness: a.bestBadness } : {}),
        ...(a.finalBadness !== undefined ? { finalBadness: a.finalBadness } : {}),
        ...(a.mechanicBucketRetention || a.diverseBeam ? { mechanicBucketRetention: true } : {}),
        ...(a.repair ? { repair: true } : {}),
        ...(a.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
        ...(a.repairTurnBiased ? { repairTurnBiased: true } : {}),
        ...(a.repairProbe ? { repairProbe: true } : {}),
        ...(a.repairProbeShrinkRecovery ? { repairProbeShrinkRecovery: true } : {}),
        ...(a.admissibleOrder ? { admissibleOrder: true } : {}),
        ...(a.admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
        ...(a.admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        ...(a.mainLoopLateReserve ? { mainLoopLateReserve: true } : {}),
        ...(a.attractionDiversity ? { attractionDiversity: true } : {}),
        ...((a.coarseStateNearTieRetentionRetry ?? a.dedupNearTieRetry) ? { coarseStateNearTieRetentionRetry: true } : {}),
        ...(a.admissibleOrderNonDefaultRetry ? { admissibleOrderNonDefaultRetry: true } : {}),
        ...(a.connectivityAxisExhaustedRetry ? { connectivityAxisExhaustedRetry: true } : {}),
        ...(a.repairElitePrefixDfsRetry ? { repairElitePrefixDfsRetry: true } : {}),
        ...(a.mcNeighborBudgetRetry ? { mcNeighborBudgetRetry: true } : {}),
        ...(a.repairLateProbe ? { repairLateProbe: true } : {}),
        ...(a.allocatedWorkCeiling !== undefined ? { allocatedWorkCeiling: a.allocatedWorkCeiling } : {}),
        ...(a.allocatedNodeCeiling !== undefined ? { allocatedNodeCeiling: a.allocatedNodeCeiling } : {}),
        ...(a.workSpent !== undefined ? { workSpent: a.workSpent } : {}),
        ...(a.randomSeed !== undefined ? { randomSeed: a.randomSeed } : {}),
        // On repair attempts, absent seedSalt means 0; randomSeed is derived from gateKey + salt.
        ...(a.seedSalt !== undefined ? { seedSalt: a.seedSalt } : {}),
    };
}

/** Build one persisted row. Hint saving and referee computation remain caller-owned. */
export function buildRow(levelNumber, id, result, schedulerMode) {
    const pass = passForWin(result);
    const legacyLatencyPortfolio = result?.legacyLatencyPortfolioExperiment ?? result?.portfolio;
    const solvedBeforeFallback = !!legacyLatencyPortfolio?.solvedBeforeFallback;
    const solvedByFallback = !!result?.ok && !solvedBeforeFallback;
    const winner = anyWinningAttempt(result);
    const phaseLabel = pass ? `pass${pass}` : (solvedByFallback ? (schedulerMode === 'production' || schedulerMode === 'legacy' ? 'production' : 'fallback') : '');
    const attempts = (Array.isArray(result?.attempts) ? result.attempts : []).map(attemptRecord);
    const persistedWinner = attempts.find(attempt => attempt.ok) ?? null;
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
        // Cross-technique host-independent cost; deadline-truncated failure is indeterminate.
        workSpent: result?.workSpent ?? null,
        deadlineTruncated: !!result?.deadlineTruncated,
        stageLifecycle: result?.stageLifecycle ?? result?.techniqueLifecycle ?? null,
        refereeValid: result?.refereeValid ?? null,
        solvedBeforeFallback,
        solvedByFallback,
        solvedByPrime: !!result?.solvedByPrime,
        pass,
        phaseLabel,
        // Compatibility family identity remains unchanged; action identity preserves stage + seed.
        winningConfig: winner ? canonicalAttemptConfigKey(winner) : null,
        winningActionKey: persistedWinner?.actionKey ?? null,
        gateKey: winner?.gateKey ?? null,
        solution: result?.solution ?? null,
        attemptCount: attempts.length,
        attempts,
        failedStrategies: attempts.filter(a => !a.ok).map(canonicalAttemptConfigKey),
        failedActionKeys: attempts.filter(a => !a.ok && a.actionKey).map(a => a.actionKey),
        hintAppended: false,
        skippedCached: false,
    };
}

/** JSON IPC drops Set objects; serialize config Sets to arrays and restore them in workers. */
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

/** Mutate pass-distribution counters for one row. */
export function tallyPass(passCounts, row, schedulerMode) {
    if (row.pass === 1) passCounts.pass1 += 1;
    else if (row.pass === 2) passCounts.pass2 += 1;
    else if (row.pass === 3) passCounts.pass3 += 1;
    else if (row.pass && row.pass > 3) passCounts.conditional += 1;
    else if (row.solvedByFallback) passCounts[schedulerMode === 'production' || schedulerMode === 'legacy' ? 'production' : 'fallback'] += 1;
    else passCounts.unsolved += 1;
}
