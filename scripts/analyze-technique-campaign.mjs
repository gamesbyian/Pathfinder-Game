#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { normalizeSolverStageId } from '../modules/solver/stage-policy.js';

const directory = process.argv[2] ?? 'reports/experiments/2026-08-13-technique-tuning';
const output = process.argv[3] ?? path.join(directory, 'aggregate.json');
const root = process.cwd();
const sha256 = value => createHash('sha256').update(value).digest('hex');
// Normalizes a persisted stageId through the canonical stage-id map; artifacts that predate
// stageId (or record a name normalizeSolverStageId doesn't recognize) fall through to the raw
// value rather than throwing, since this is read-only cross-artifact analysis, not a writer.
const normalizedStageId = id => { try { return normalizeSolverStageId(id); } catch { return id; } };
const technique = attempt => (attempt.stageId ? normalizedStageId(attempt.stageId) : null)
    ?? (attempt.admissibleOrder ? 'admissible-order-fallback'
        : (attempt.earlyRepairSearch ?? attempt.repairProbe) ? 'early-repair-search'
            : attempt.repair ? 'repair-fallback'
                : (attempt.goalAttractionDisabledRetry ?? attempt.attractionDiversity) ? 'goal-attraction-disabled-retry'
                    : (attempt.mainSearchLateReserve ?? attempt.mainLoopLateReserve) ? 'main-search-late-reserve'
                        : attempt.beamWidth ? 'beam' : 'dfs');
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
// Search primitives check work at bounded checkpoints rather than before every apply/connectivity
// debit. Strict mode must stay within this instrumentation tolerance; larger excess is invalid.
const STRICT_WORK_OVERSHOOT_TOLERANCE = 4096;
const ids = document => document.levels.map(level => String(level.id ?? level.level));
const duplicateIds = values => [...new Set(values.filter((id, index) => values.indexOf(id) !== index))];
const artifactPath = name => existsSync(path.join(directory, name)) ? path.join(directory, name) : path.join(root, name);
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const errors = [];
const warnings = [];
const artifactOwners = new Map();
for (const experiment of manifest.experiments) {
    for (const artifact of [...(experiment.artifacts ?? []), ...(experiment.artifact ? [experiment.artifact] : [])]) {
        if (!existsSync(artifactPath(artifact))) errors.push(`${experiment.id}: missing artifact ${artifact}`);
        const prior = artifactOwners.get(artifact);
        if (prior && prior !== experiment.id) errors.push(`${artifact}: declared by both ${prior} and ${experiment.id}`);
        artifactOwners.set(artifact, experiment.id);
    }
}

const files = readdirSync(directory).filter(name => name.endsWith('.json') &&
    name !== path.basename(output) && name !== 'manifest.json' && !name.endsWith('-protocol.json') && name !== 'ett-011-transfer.json').sort();
const documents = new Map();
const arms = [];
for (const file of files) {
    const document = JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
    if (!Array.isArray(document.levels) || document.summary?.levelBlind !== true) continue;
    documents.set(file, document);
    const levelIds = ids(document);
    const duplicates = duplicateIds(levelIds);
    if (duplicates.length) errors.push(`${file}: duplicate level IDs: ${duplicates.join(', ')}`);
    if (document.summary.levelsRun !== document.levels.length) errors.push(`${file}: levelsRun does not match rows`);
    const complete = document.summary.levelsRequested === document.levels.length;
    const deadlineTruncated = document.levels.filter(level => level.deadlineTruncated || level.status === 'deadline-truncated').length;
    const attemptErrors = document.levels.filter(level => level.hadAttemptError || level.status === 'attempt-error').length;
    const workOverBudget = document.levels.filter(level => finite(level.workSpent) > finite(document.summary.workBudget)).length;
    const strictWorkMaxOvershoot = document.summary.strictTotalWorkBudget === true
        ? Math.max(0, ...document.levels.map(level => Number(level.workSpent) - Number(document.summary.workBudget))) : null;
    if (document.summary.strictTotalWorkBudget === true && strictWorkMaxOvershoot > STRICT_WORK_OVERSHOOT_TOLERANCE) {
        const owner = manifest.experiments.find(experiment =>
            [...(experiment.artifacts ?? []), ...(experiment.artifact ? [experiment.artifact] : [])].includes(file));
        const target = owner?.status?.includes('invalid') ? warnings : errors;
        target.push(`${file}: strict work overshoot ${strictWorkMaxOvershoot} exceeds tolerance ${STRICT_WORK_OVERSHOOT_TOLERANCE}`);
    }
    if (document.summary.lifecycleTelemetry === true) {
        const owner = manifest.experiments.find(experiment =>
            [...(experiment.artifacts ?? []), ...(experiment.artifact ? [experiment.artifact] : [])].includes(file));
        const issue = message => (owner?.status?.includes('invalid') ? warnings : errors).push(message);
        for (const level of document.levels) {
            const stageLifecycle = level.stageLifecycle ?? level.techniqueLifecycle;
            if (!stageLifecycle) issue(`${file}:${level.id ?? level.level}: lifecycle telemetry missing`);
            for (const [rawName, lifecycle] of Object.entries(stageLifecycle ?? {})) {
                const name = normalizedStageId(rawName);
                for (const field of ['mechanicallyEligible','instantiated','reached','skippedBecauseSolvedEarlier',
                    'starvedByNodeBudget','starvedByWorkBudget','skippedByRoutingOrConfiguration',
                    'exhaustedSearchSpace','stoppedByDeadline','allocatedNodeCeilings','allocatedWorkCeilings',
                    'actualNodes','actualWork','bestProgress']) {
                    if (!(field in lifecycle)) issue(`${file}:${level.id ?? level.level}:${name}: missing ${field}`);
                }
                if (lifecycle.skippedBecauseSolvedEarlier && (!lifecycle.mechanicallyEligible || lifecycle.reached))
                    issue(`${file}:${level.id ?? level.level}:${name}: contradictory earlier-solve skip`);
                if (lifecycle.reached && lifecycle.actualWork === 0
                    && lifecycle.allocatedWorkCeilings.length > 0
                    && lifecycle.allocatedWorkCeilings.every(ceiling => ceiling === 0)
                    && !lifecycle.starvedByWorkBudget)
                    issue(`${file}:${level.id ?? level.level}:${name}: zero-work dispatch not marked work-starved`);
                if (lifecycle.skippedByRoutingOrConfiguration && lifecycle.reached)
                    issue(`${file}:${level.id ?? level.level}:${name}: reached technique marked routing-skipped`);
                if (!lifecycle.mechanicallyEligible && !lifecycle.skippedByRoutingOrConfiguration)
                    issue(`${file}:${level.id ?? level.level}:${name}: mechanically ineligible technique lacks routing/config skip`);
            }
            const attempts = level.attempts ?? [];
            if (attempts.some(attempt => attempt.workSpent != null)) {
                if (attempts.some(attempt => attempt.workSpent == null))
                    issue(`${file}:${level.id ?? level.level}: partially missing per-attempt work`);
                const attemptWork = attempts.reduce((sum, attempt) => sum + Number(attempt.workSpent ?? 0), 0);
                const lifecycleWork = Object.values(stageLifecycle ?? {})
                    .reduce((sum, lifecycle) => sum + Number(lifecycle.actualWork ?? 0), 0);
                if (attemptWork !== lifecycleWork || attemptWork !== Number(level.workSpent))
                    issue(`${file}:${level.id ?? level.level}: attempt/lifecycle/level work totals disagree`);
            }
        }
    }
    const techniques = new Map();
    for (const level of document.levels) for (const attempt of level.attempts ?? []) {
        const name = technique(attempt);
        const row = techniques.get(name) ?? { attempts: 0, levelsReached: new Set(), wins: 0, nodes: 0, elapsedMs: 0 };
        row.attempts++; row.levelsReached.add(level.id ?? level.level); if (attempt.ok) row.wins++;
        row.nodes += Number(attempt.nodesExpanded ?? 0); row.elapsedMs += Number(attempt.elapsedMs ?? 0); techniques.set(name, row);
    }
    arms.push({ file, complete, levels: document.levels.length, solved: document.levels.filter(level => level.ok).length,
        nodes: document.levels.reduce((sum, level) => sum + Number(level.nodesExpanded ?? 0), 0),
        work: document.levels.reduce((sum, level) => sum + Number(level.workSpent ?? 0), 0),
        elapsedMs: document.levels.reduce((sum, level) => sum + Number(level.totalMs ?? level.elapsedMs ?? 0), 0),
        attemptCount: document.levels.reduce((sum, level) => sum + (level.attempts?.length ?? 0), 0),
        deadlineTruncated, attemptErrors, workOverBudget, strictWorkMaxOvershoot,
        strictWorkOvershootTolerance: document.summary.strictTotalWorkBudget === true ? STRICT_WORK_OVERSHOOT_TOLERANCE : null,
        levelIdHash: sha256(levelIds.join('\n')),
        corpus: document.summary.corpus ?? null, corpusHash: document.summary.corpusSha256 ?? document.summary.corpusHash ?? null,
        solverCommit: document.summary.commit ?? null,
        techniques: Object.fromEntries([...techniques].sort(([a], [b]) => a.localeCompare(b)).map(([name, row]) => [name,
            { ...row, levelsReached: row.levelsReached.size, winRateGivenReach: row.levelsReached.size ? row.wins / row.levelsReached.size : null }])) });
}

const protocolAudits = [];
const comparisons = [];
for (const protocolFile of readdirSync(directory).filter(name => name.endsWith('-protocol.json')).sort()) {
    const protocol = JSON.parse(readFileSync(path.join(directory, protocolFile), 'utf8'));
    const experiment = manifest.experiments.find(row => row.id === protocol.experimentId);
    if (!experiment) { errors.push(`${protocolFile}: no manifest experiment`); continue; }
    const protocolLevelIds = protocol.sampleSelection?.levelIds;
    if (Array.isArray(protocolLevelIds)) {
        const expectedHash = sha256(protocolLevelIds.join('\n'));
        if (expectedHash !== protocol.sampleSelection.levelSelectionHash) errors.push(`${protocolFile}: sample hash mismatch`);
    }
    const verification = protocol.protocolVerification ?? {};
    let locallyResolvable = false;
    if (/^[0-9a-f]{40}$/u.test(verification.fullCommit ?? '')) {
        locallyResolvable = spawnSync('git', ['cat-file', '-e', `${verification.fullCommit}^{commit}`]).status === 0;
    }
    const decisionBearing = (protocol.evidenceClass ?? experiment.class).includes('decision-bearing');
    if (decisionBearing && !Array.isArray(protocolLevelIds))
        errors.push(`${protocolFile}: decision-bearing protocol missing frozen level IDs`);
    const refResolves = verification.persistentRef
        ? spawnSync('git', ['show-ref', '--verify', '--quiet', verification.persistentRef]).status === 0 : false;
    const verifiable = verification.status === 'verified' && locallyResolvable && refResolves
        && /^https:\/\/github\.com\//u.test(verification.permalink ?? '');
    if (decisionBearing && !verifiable) errors.push(`${protocolFile}: decision-bearing protocol is not independently resolvable`);
    if (decisionBearing) {
        for (const field of ['solverCommit','corpusSha256','environment','exactCommands','runStartedAt']) {
            if (protocol[field] == null && protocol.common?.[field] == null) errors.push(`${protocolFile}: decision-bearing protocol missing ${field}`);
        }
        for (const armFile of (experiment.artifacts ?? []).filter(name => documents.has(name))) {
            const expectedDigest = protocol.artifactSha256?.[armFile];
            const actualDigest = sha256(readFileSync(path.join(directory, armFile)));
            if (!expectedDigest || expectedDigest !== actualDigest) errors.push(`${protocolFile}: missing/incorrect artifact SHA-256 for ${armFile}`);
            const completed = documents.get(armFile).summary?.artifactCompletedAt;
            if (!completed) errors.push(`${armFile}: decision-bearing artifact missing completion time`);
        }
    }
    protocolAudits.push({ experimentId: protocol.experimentId, protocolFile, status: verification.status ?? 'missing', locallyResolvable, verifiable });
    const armFiles = (experiment.artifacts ?? []).filter(name => documents.has(name));
    for (const armFile of armFiles) {
        const document = documents.get(armFile);
        if (duplicateIds(ids(document)).length) continue;
        if (Array.isArray(protocolLevelIds) && ids(document).join('\n') !== protocolLevelIds.join('\n')) {
            const message = `${armFile}: protocol level set/order mismatch`;
            if (verifiable) errors.push(message); else warnings.push(message);
        }
        for (const key of ['nodeBudget', 'workBudget', 'workers']) if (protocol.common[key] != null && document.summary[key] !== protocol.common[key]) errors.push(`${armFile}: ${key} differs from protocol`);
    }
    if (armFiles.length === 2) {
        const declaredControl = protocol.arms?.find(arm => arm.role === 'control')?.artifact ?? experiment.controlArtifact;
        const declaredTreatment = protocol.arms?.find(arm => arm.role === 'treatment')?.artifact ?? experiment.treatmentArtifact;
        if ((declaredControl || declaredTreatment) &&
            (!armFiles.includes(declaredControl) || !armFiles.includes(declaredTreatment) || declaredControl === declaredTreatment)) {
            errors.push(`${protocol.experimentId}: declared control/treatment artifacts do not identify both paired arms`);
            continue;
        }
        // Historical protocols did not declare roles. Preserve their ordering for compatibility,
        // but let new protocols remove the otherwise easy-to-miss direction ambiguity.
        const leftFile = declaredTreatment ?? armFiles[0];
        const rightFile = declaredControl ?? armFiles[1];
        const left = documents.get(leftFile), right = documents.get(rightFile);
        if (ids(left).join('\n') !== ids(right).join('\n')) { errors.push(`${protocol.experimentId}: paired level IDs/order differ`); continue; }
        const allowed = new Set((protocol.treatmentVariables ?? ['admissibleOrderNodeReserveFraction']).flat());
        const ignored = new Set(['generatedAt', 'runStartedAt', 'artifactCompletedAt', 'solvedCount', 'unsolvedCount', 'hintChanges']);
        for (const key of new Set([...Object.keys(left.summary), ...Object.keys(right.summary)])) {
            if (allowed.has(key) || ignored.has(key)) continue;
            if (JSON.stringify(left.summary[key]) !== JSON.stringify(right.summary[key])) errors.push(`${protocol.experimentId}: undeclared summary difference ${key}`);
        }
        const rightById = new Map(right.levels.map(level => [String(level.id ?? level.level), level]));
        const deltas = left.levels.map(level => {
            const id = String(level.id ?? level.level), control = rightById.get(id);
            const reach = row => new Set((row.attempts ?? []).map(technique));
            const lreach = reach(level), rreach = reach(control);
            return { id, solveTransition: `${control.ok ? 'solved' : 'unsolved'}->${level.ok ? 'solved' : 'unsolved'}`,
                nodeDelta: Number(level.nodesExpanded ?? 0) - Number(control.nodesExpanded ?? 0),
                workDelta: Number(level.workSpent ?? 0) - Number(control.workSpent ?? 0),
                elapsedMsDelta: Number(level.totalMs ?? level.elapsedMs ?? 0) - Number(control.totalMs ?? control.elapsedMs ?? 0),
                attemptCountDelta: (level.attempts?.length ?? 0) - (control.attempts?.length ?? 0),
                techniqueReachTransitions: [...new Set([...lreach, ...rreach])].sort().map(name => ({ technique:name, control:rreach.has(name), treatment:lreach.has(name) })) };
        });
        comparisons.push({ experimentId:protocol.experimentId, treatment:leftFile, control:rightFile,
            gained:deltas.filter((d,i)=>left.levels[i].ok&&!right.levels[i].ok).map(d=>d.id),
            lost:deltas.filter((d,i)=>!left.levels[i].ok&&right.levels[i].ok).map(d=>d.id),
            retained:deltas.filter((d,i)=>left.levels[i].ok&&right.levels[i].ok).map(d=>d.id),
            jointlyUnsolved:deltas.filter((d,i)=>!left.levels[i].ok&&!right.levels[i].ok).map(d=>d.id), deltas });
    }
}
const uniqueLevels = new Set([...documents.values()].flatMap(ids));
const result = { schemaVersion:2, generatedFrom:directory, validity:{ valid:errors.length===0, errors, warnings },
    counts:{ uniqueLevels:uniqueLevels.size, levelInvocations:arms.reduce((n,a)=>n+a.levels,0), armRuns:arms.length,
        independentHypothesisFamilies:new Set(manifest.experiments.map(e=>e.hypothesisFamily ?? e.question)).size },
    protocolAudits, comparisons, armCount:arms.length, arms };
writeFileSync(output, `${JSON.stringify(result)}\n`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Validated and wrote ${arms.length} arm summaries to ${output}`);
