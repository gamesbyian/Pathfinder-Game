#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: tmp-specialize-plain-score.mjs <scoring.ts>');
let src = readFileSync(file, 'utf8');

function replaceOnce(from, to, label) {
  const first = src.indexOf(from);
  if (first < 0) throw new Error(`patch anchor not found: ${label}`);
  if (src.indexOf(from, first + from.length) >= 0) throw new Error(`patch anchor not unique: ${label}`);
  src = src.slice(0, first) + to + src.slice(first + from.length);
}

replaceOnce(
`    weights: ResolvedWeights | null;\n}`,
`    weights: ResolvedWeights | null;\n    /** True only for the deliberately narrow default-config/no-landmark/no-portal scorer shape. */\n    plainFastPath: boolean;\n}`,
'context field');

replaceOnce(
`const _pooledCtx: CurUrgencyContext = {\n    mpCur: _pooledMpCur, mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null,\n};`,
`const _pooledCtx: CurUrgencyContext = {\n    mpCur: _pooledMpCur, mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null, plainFastPath: false,\n};`,
'pooled context');

replaceOnce(
`    const ctx = pooled ? _pooledCtx : ({\n        mpCur: new Float64Array(mpN), mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null,\n    } as CurUrgencyContext);`,
`    const ctx = pooled ? _pooledCtx : ({\n        mpCur: new Float64Array(mpN), mcCur: null, mcTargetArr: null, mcIsApproach: null, weights: null, plainFastPath: false,\n    } as CurUrgencyContext);`,
'fresh context');

replaceOnce(
`    ctx.weights = profile\n        ? resolveWeightsInto(profile, pooled ? _pooledWeights : { ...(_pooledWeights) })\n        : null;\n\n    const mpCur = ctx.mpCur;`,
`    ctx.weights = profile\n        ? resolveWeightsInto(profile, pooled ? _pooledWeights : { ...(_pooledWeights) })\n        : null;\n    // Compute this once per candidate batch, not once per candidate. includeMcAxisFix excludes\n    // repair-search, whose score balance is intentionally preserved exactly. The remaining\n    // predicates prove every omitted scoreMove term is structurally inert for this level.\n    ctx.plainFastPath = includeMcAxisFix && !prep._cfg && mpN === 0 && mcN === 0\n        && !prep.hasLandmarkConstraints && prep.flipperKeys.length === 0 && level.portalMap.size === 0;\n\n    const mpCur = ctx.mpCur;`,
'eligibility computation');

const helper = `\n// Experimental structural specialization for the plain/default/no-template scorer shape.\n// Arithmetic order matches scoreMove after deleting branches whose predicates are statically false.\nfunction scoreMovePlain(target: number, pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, rStepsAfterMove: number, curCtx: CurUrgencyContext): number {\n    const rw = curCtx.weights;\n    const w   = rw ? rw.w   : (profile.goalAttractionWeight    ?? 1);\n    const wf  = rw ? rw.wf  : (profile.finishCommitmentWeight  ?? 1);\n    const wp  = rw ? rw.wp  : (profile.perimeterBiasWeight     ?? 1);\n    const wi  = rw ? rw.wi  : (profile.intersectionSetupWeight ?? 1);\n    const wdt = rw ? rw.wdt : (profile.antiDitherWeight        ?? 1);\n    const wrv = rw ? rw.wrv : (profile.revisitPenaltyWeight    ?? 1);\n\n    const rRatio = level.reqLen > 0 ? Math.max(0, 1 - rStepsAfterMove / level.reqLen) : 1;\n    let phaseGoalScale = 1.0;\n    if (rRatio < 0.45) {\n        phaseGoalScale = 0.65 + (rRatio / 0.45) * 0.35;\n    } else if (rRatio > 0.82) {\n        const t = (rRatio - 0.82) / 0.18;\n        phaseGoalScale = 1.0 + t * 1.8;\n    }\n\n    let score = 0;\n    const goalDistCur    = getDistanceFromArray(prep.goalDistArr, pos, prep.gridW);\n    const goalDistTarget = getDistanceFromArray(prep.goalDistArr, target, prep.gridW);\n    if (Number.isFinite(goalDistCur) && Number.isFinite(goalDistTarget)) {\n        const gain = goalDistCur - goalDistTarget;\n        score += w * phaseGoalScale * gain * 10;\n    }\n\n    if (rStepsAfterMove <= 4 && Number.isFinite(goalDistTarget)) {\n        score += wf * (5 - rStepsAfterMove) * 8;\n    }\n\n    const intNeeded = level.reqInt - state.ints;\n    if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateFlags[target]) {\n        score += wi * 12;\n    } else if (intNeeded > 0) {\n        score += wi * 1;\n    }\n\n    const gw = level.grid.w, gh = level.grid.h;\n    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;\n    if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * 3;\n\n    if (state.path.length >= 2) {\n        const prevPrev = state.path[state.path.length - 2];\n        if (prevPrev === target) score -= wdt * 15;\n    }\n    if (state.visited[target] > 0) score -= wrv * 8;\n    return score;\n}\n`;

replaceOnce(
`// Score a candidate move \`target\` from \`pos\` in \`state\`.`,
`${helper}\n// Score a candidate move \`target\` from \`pos\` in \`state\`.`,
'helper insertion');

replaceOnce(
`export function scoreMove(target: number, pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, rStepsAfterMove: number, template?: StructuralTemplate | null, curCtx?: CurUrgencyContext | null): number {\n    // Prefer curCtx's precomputed weights`,
`export function scoreMove(target: number, pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, rStepsAfterMove: number, template?: StructuralTemplate | null, curCtx?: CurUrgencyContext | null): number {\n    if (curCtx?.plainFastPath && !template) {\n        return scoreMovePlain(target, pos, state, level, prep, profile, rStepsAfterMove, curCtx);\n    }\n    // Prefer curCtx's precomputed weights`,
'dispatch');

writeFileSync(file, src);
console.log(`Applied plain scorer specialization to ${file}`);
