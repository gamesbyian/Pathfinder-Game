import { stableHash } from './solver-experiment-contract.mjs';
import { SOLVER_STAGE_IDS } from '../modules/solver/stage-id-normalization.mjs';

export const CLASS4_FRESHNESS_IDS = Object.freeze(['R00082', 'R02173', 'R02807', 'R03365', 'R00466', 'R03228', 'R00329', 'R03303']);
export const CLASS4_SENTINEL_ID = 'R01273';
export const CLASS2_EXCLUDED_IDS = new Set(['R02768', 'R02180']);
export const CLASS2_TARGET_STAGE = 'late-repair-must-turn-biased-retry';
export const CLASS4_TARGET_STAGE = 'portal-coarse-state-merge-dead-last-retry';

export { stableHash };
function stage(row, id) { return row.stageLifecycle?.[id] ?? null; }
function participated(row, id) {
  const s = stage(row, id);
  return !!s?.reached && (Number(s.actualWork ?? 0) > 0 || Number(s.actualNodes ?? 0) > 0);
}
function censored(row) { return !!(row.error || row.deadlineTruncated || row.censored || /deadline|timeout|error/.test(String(row.status))); }
function validSolve(row) { return row.ok === true && row.refereeValid === true; }
function winningStage(row) {
  return row.winningStage ?? row.attempts?.find(attempt => attempt?.ok === true)?.stageId ?? null;
}
function solutionHash(row) { return row.solutionHash ?? (Array.isArray(row.solution) ? stableHash(row.solution) : null); }
function precedingStagesHash(row, targetStage) {
  if (row.earlierStageWorkHash) return row.earlierStageWorkHash;
  if (!row.stageLifecycle || typeof row.stageLifecycle !== 'object') return null;
  const entries = Object.entries(row.stageLifecycle)
    .filter(([id]) => id !== targetStage)
    .map(([id, value]) => [id, {
      reached: value?.reached ?? false, attempts: value?.attempts ?? 0,
      actualNodes: value?.actualNodes ?? null, actualWork: value?.actualWork ?? null,
    }]);
  return stableHash(entries);
}
function retryEnvelopeHash(row, targetStage) {
  const attempts = row.attempts?.filter(attempt => attempt.stageId === targetStage) ?? [];
  if (!attempts.length) return null;
  const attempt = attempts[0];
  return stableHash({
    allocatedBudgetMs: attempt.allocatedBudgetMs ?? null,
    allocatedNodeCeiling: attempt.allocatedNodeCeiling ?? null,
    allocatedWorkCeiling: attempt.allocatedWorkCeiling ?? null,
  });
}
function validateArmIdentity(controlRows, treatmentRows, identity, expectedFlag) {
  const reasons = [];
  if (!identity || typeof identity !== 'object') return ['missing resolved arm identity'];
  for (const field of ['configurationHash', 'populationHash', 'resolvedSha', 'schedulerMode', 'experimentId', 'researchQuestion', 'preflight']) {
    if (!identity[field]) reasons.push(`missing arm identity ${field}`);
  }
  if (identity.treatmentFlag !== expectedFlag) reasons.push('wrong resolved treatment flag');
  if (identity.globalPortalCoarseStateMerge === true) reasons.push('global portal-coarse merge is forbidden');
  if (!identity.effectiveConfig || typeof identity.effectiveConfig !== 'object') reasons.push('missing effective arm configuration');
  else {
    if (identity.effectiveConfig.STRATEGY_PORTAL_COARSE_STATE_MERGE === true) reasons.push('effective config globally enables portal-coarse merge');
    if (identity.effectiveConfig.STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY !== true) reasons.push('retry shell must be enabled in both arms');
    if ((identity.effectiveConfig.STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT === true) !== expectedFlag) reasons.push('effective retry treatment selector mismatch');
  }
  const ids = rows => rows.map(row => String(row.id)).sort();
  if (identity.populationHash && identity.populationHash !== stableHash(ids(expectedFlag ? treatmentRows : controlRows))) reasons.push('arm population hash mismatch');
  return reasons;
}

export function armIdentityFromSweep(document, treatmentFlag) {
  const summary = document?.summary;
  if (!summary?.effectiveConfig || !summary?.effectiveConfigDigest) throw new Error('sweep is missing resolved effectiveConfig identity');
  const rows = document.levels ?? [];
  return {
    configurationHash: summary.effectiveConfigDigest.startsWith('sha256:') ? summary.effectiveConfigDigest : `sha256:${summary.effectiveConfigDigest}`,
    populationHash: stableHash(rows.map(row => String(row.id)).sort()),
    resolvedSha: summary.commit,
    schedulerMode: summary.schedulerMode,
    treatmentFlag,
    experimentId: summary.experimentId,
    researchQuestion: summary.researchQuestion,
    preflight: summary.preflight,
    globalPortalCoarseStateMerge: summary.effectiveConfig.ablation?.STRATEGY_PORTAL_COARSE_STATE_MERGE === true,
    effectiveConfig: summary.effectiveConfig.ablation ?? {},
  };
}

export function analyzeClass4Canary({ controlRows, treatmentRows, nonPortalControlIds, controlIdentity, treatmentIdentity }) {
  const control = new Map(controlRows.map(row => [row.id, row]));
  const treatment = new Map(treatmentRows.map(row => [row.id, row]));
  const missing = [...CLASS4_FRESHNESS_IDS, CLASS4_SENTINEL_ID, ...nonPortalControlIds]
    .filter(id => !control.has(id) || !treatment.has(id));
  if (missing.length) return { decision: 'invalid-execution', reasons: [`missing paired rows: ${missing.join(', ')}`] };
  const freshness = CLASS4_FRESHNESS_IDS.map(id => treatment.get(id));
  const controlFreshness = CLASS4_FRESHNESS_IDS.map(id => control.get(id));
  const participants = freshness.filter(row => participated(row, CLASS4_TARGET_STAGE));
  const controlParticipants = controlFreshness.filter(row => participated(row, CLASS4_TARGET_STAGE));
  const gains = freshness.filter(row => validSolve(row) && winningStage(row) === CLASS4_TARGET_STAGE);
  const invalidSolves = freshness.filter(row => row.ok === true && winningStage(row) === CLASS4_TARGET_STAGE && row.refereeValid !== true);
  const sentinelSame = control.get(CLASS4_SENTINEL_ID).ok === treatment.get(CLASS4_SENTINEL_ID).ok
    && solutionHash(control.get(CLASS4_SENTINEL_ID)) === solutionHash(treatment.get(CLASS4_SENTINEL_ID))
    && winningStage(treatment.get(CLASS4_SENTINEL_ID)) !== CLASS4_TARGET_STAGE;
  const nonPortalParticipation = nonPortalControlIds.filter(id => participated(treatment.get(id), CLASS4_TARGET_STAGE));
  const missingEarlierTelemetry = treatmentRows.filter(row => precedingStagesHash(row, CLASS4_TARGET_STAGE) == null || precedingStagesHash(control.get(row.id), CLASS4_TARGET_STAGE) == null).map(row => row.id);
  const earlierDivergence = treatmentRows.filter(row => precedingStagesHash(row, CLASS4_TARGET_STAGE) !== precedingStagesHash(control.get(row.id), CLASS4_TARGET_STAGE)).map(row => row.id);
  const retryEnvelopeDivergence = treatmentRows.filter(row => retryEnvelopeHash(row, CLASS4_TARGET_STAGE) !== retryEnvelopeHash(control.get(row.id), CLASS4_TARGET_STAGE)).map(row => row.id);
  const deadlineBinding = treatmentRows.some(row => row.deadlineTruncated === true);
  const reasons = [];
  reasons.push(...validateArmIdentity(controlRows, treatmentRows, controlIdentity, false));
  reasons.push(...validateArmIdentity(controlRows, treatmentRows, treatmentIdentity, true));
  if (controlIdentity?.effectiveConfig && treatmentIdentity?.effectiveConfig) {
    const withoutTreatment = value => ({ ...value, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: false });
    if (stableHash(withoutTreatment(controlIdentity.effectiveConfig)) !== stableHash(withoutTreatment(treatmentIdentity.effectiveConfig))) reasons.push('unintended arm configuration difference');
  }
  if (controlIdentity?.resolvedSha && treatmentIdentity?.resolvedSha && controlIdentity.resolvedSha !== treatmentIdentity.resolvedSha) reasons.push('arm base SHA mismatch');
  if (controlIdentity?.schedulerMode && treatmentIdentity?.schedulerMode && controlIdentity.schedulerMode !== treatmentIdentity.schedulerMode) reasons.push('arm scheduler mismatch');
  if (missingEarlierTelemetry.length) reasons.push(`missing earlier-stage telemetry: ${missingEarlierTelemetry.join(', ')}`);
  if (invalidSolves.length) reasons.push('a claimed retry solve failed referee validation');
  if (!sentinelSame) reasons.push('R01273 earlier production solution/path changed');
  if (nonPortalParticipation.length) reasons.push(`non-portal participation: ${nonPortalParticipation.join(', ')}`);
  if (earlierDivergence.length) reasons.push(`earlier-stage divergence: ${earlierDivergence.join(', ')}`);
  if (retryEnvelopeDivergence.length) reasons.push(`retry envelope divergence: ${retryEnvelopeDivergence.join(', ')}`);
  if (deadlineBinding) reasons.push('wall deadline bound at least one row');
  if (participants.some(row => Number(stage(row, CLASS4_TARGET_STAGE)?.actualWork ?? 0) <= 0)) reasons.push('retry participation lacked fresh nonzero work');
  if (controlParticipants.length !== 8) reasons.push('control shell did not genuinely participate on all freshness rows');
  let decision = reasons.length ? 'stop' : gains.length > 0 ? 'advance-to-113' : participants.length === 8 ? 'stop-zero-of-eight' : 'insufficient-participation';
  return { decision, reasons, freshnessParticipants: participants.length, controlFreshnessParticipants: controlParticipants.length, refereeValidRetrySolves: gains.length, sentinelSame, nonPortalParticipation, earlierDivergence, retryEnvelopeDivergence, missingEarlierTelemetry, deadlineBinding };
}

/** Freeze only control-side rows that prove every structural and lifecycle prerequisite. */
export function materializeClass2Cohort(rows, provenance) {
  for (const field of ['seed', 'selectionVersion', 'corpusHash', 'baseSha', 'controlConfig', 'treatmentConfig', 'controlConfigHash', 'treatmentConfigHash', 'envelope', 'stageOrder']) {
    if (provenance[field] == null) throw new Error(`missing freeze provenance: ${field}`);
  }
  const eligible = rows.filter(row => !CLASS2_EXCLUDED_IDS.has(row.id)).filter(row => {
    const evidence = row.class2ControlEligibility;
    if (!evidence || typeof evidence !== 'object') throw new Error(`required participation evidence missing for ${row.id}`);
    if (evidence.hasMustTurn !== true || evidence.childStructuralEligible !== true || evidence.childInsertionPointReached !== true) return false;
    const ordinary = stage(row, 'late-repair-search');
    if (evidence.ordinaryLateRepairParticipated !== true || !ordinary || ordinary.reached !== true || (Number(ordinary.actualWork ?? 0) <= 0 && Number(ordinary.actualNodes ?? 0) <= 0)) {
      throw new Error(`required participation evidence missing for ${row.id}`);
    }
    return true;
  });
  const rank = row => stableHash([provenance.seed, provenance.selectionVersion, row.id]);
  // R03049 is a dose/allocation case: it may serve as control-solved collateral but never as a
  // must-turn-guidance gain nomination.
  const gain = eligible.filter(row => row.id !== 'R03049' && row.ok !== true).sort((a, b) => rank(a).localeCompare(rank(b)));
  const lateRepairOrder = SOLVER_STAGE_IDS.indexOf('late-repair-search');
  const collateral = eligible.filter(row => row.ok === true && SOLVER_STAGE_IDS.indexOf(winningStage(row)) > lateRepairOrder)
    .sort((a, b) => rank(a).localeCompare(rank(b)));
  const selectedCollateral = collateral.slice(0, 20);
  const gainTarget = 40 + (20 - selectedCollateral.length);
  const selectedGain = gain.slice(0, gainTarget);
  if (selectedGain.length < gainTarget) throw new Error(`insufficient eligible gain participants: need ${gainTarget}, found ${selectedGain.length}`);
  const entries = [...selectedGain.map(row => ({ id: row.id, stratum: 'gain' })), ...selectedCollateral.map(row => ({ id: row.id, stratum: 'collateral' }))];
  const populationHash = stableHash(entries);
  return { schemaVersion: 1, kind: 'ws2-class2-frozen-cohort', ...provenance, entries, populationHash, counts: { gain: selectedGain.length, collateral: selectedCollateral.length, total: entries.length } };
}

export function analyzeClass2Economics({ manifest, controlRows, treatmentRows }) {
  if (manifest.populationHash !== stableHash(manifest.entries)) return { decision: 'invalid-execution', reasons: ['population hash mismatch'] };
  const control = new Map(controlRows.map(row => [row.id, row]));
  const treatment = new Map(treatmentRows.map(row => [row.id, row]));
  const expected = manifest.entries.map(entry => entry.id);
  const reasons = [];
  if (new Set(expected).size !== expected.length) reasons.push('duplicate manifest IDs');
  if (expected.some(id => !control.has(id) || !treatment.has(id))) reasons.push('missing paired rows');
  if (controlRows.some(row => !expected.includes(row.id)) || treatmentRows.some(row => !expected.includes(row.id))) reasons.push('arm population differs from manifest');
  if (controlRows.some(row => row.configHash !== manifest.controlConfigHash) || treatmentRows.some(row => row.configHash !== manifest.treatmentConfigHash)) reasons.push('resolved treatment/config identity mismatch');
  if (reasons.length) return { decision: 'invalid-execution', reasons };
  const pairs = manifest.entries.map(entry => ({ entry, c: control.get(entry.id), t: treatment.get(entry.id) }));
  const missingReferee = pairs.filter(({ c, t }) => (c.ok === true && c.refereeValid !== true) || (t.ok === true && t.refereeValid !== true)).map(({ entry }) => entry.id);
  if (missingReferee.length) reasons.push(`missing/invalid referee verdict: ${missingReferee.join(', ')}`);
  const gains = pairs.filter(({ c, t }) => !validSolve(c) && validSolve(t));
  const losses = pairs.filter(({ c, t }) => validSolve(c) && !validSolve(t));
  const gainRows = pairs.filter(pair => pair.entry.stratum === 'gain');
  const collateralRows = pairs.filter(pair => pair.entry.stratum === 'collateral');
  const gainParticipation = gainRows.filter(({ t }) => participated(t, CLASS2_TARGET_STAGE)).length;
  const collateralReach = collateralRows.filter(({ t }) => stage(t, CLASS2_TARGET_STAGE)?.reached === true).length;
  const downstreamStarved = collateralRows.filter(({ c, t }) => !validSolve(t) && winningStage(c) && Number(stage(t, winningStage(c))?.actualWork ?? 0) === 0).map(({ entry }) => entry.id);
  const asymmetricCensoring = pairs.filter(({ c, t }) => censored(c) !== censored(t)).map(({ entry }) => entry.id);
  const targetWorkDelta = pairs.reduce((sum, { c, t }) => sum + Number(stage(t, CLASS2_TARGET_STAGE)?.actualWork ?? 0) - Number(stage(c, CLASS2_TARGET_STAGE)?.actualWork ?? 0), 0);
  const wholeWorkDelta = pairs.reduce((sum, { c, t }) => sum + Number(t.workSpent ?? 0) - Number(c.workSpent ?? 0), 0);
  const coverageValid = gainParticipation >= Math.ceil(gainRows.length * .75) && collateralReach >= Math.ceil(collateralRows.length * .75);
  if (!coverageValid) reasons.push('participation/reach coverage below 75%');
  if (asymmetricCensoring.length) reasons.push('asymmetric censoring');
  if (losses.length) reasons.push('credible referee-valid solve loss');
  if (downstreamStarved.length) reasons.push('downstream capability starvation');
  const targetStageGains = gains.filter(({ t }) => winningStage(t) === CLASS2_TARGET_STAGE && participated(t, CLASS2_TARGET_STAGE));
  let decision = reasons.length ? 'stop' : targetStageGains.length > 0 ? 'advance' : gainParticipation >= 30 ? 'stop-zero-gain' : 'insufficient-participation';
  return { decision, reasons, gains: gains.map(x => x.entry.id), losses: losses.map(x => x.entry.id), targetStageGains: targetStageGains.map(x => x.entry.id), gainParticipation, collateralReach, downstreamStarved, asymmetricCensoring, targetWorkDelta, wholeWorkDelta };
}
