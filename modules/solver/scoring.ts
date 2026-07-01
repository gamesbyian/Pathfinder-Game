import { getDistanceFromArray } from './distance.js';
import { AXIS_H, popcount } from './encoding.js';
import { getRealLengthFromState } from './solution.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel, ScoringProfile, StructuralTemplate } from './types.js';

// Pre-compute template bonus for a candidate move.
// Returns the bonus to add to the DFS score (higher = preferred).
export function computeTemplateBonus(target: number, pos: number, level: NormalizedLevel, template: StructuralTemplate | null | undefined, rRatio: number): number {
    if (!template) return 0;
    const { w, h } = level.grid;
    const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
    const px = pos   & 0xFFFF, py = (pos   >>> 16) & 0xFFFF;
    const edgeNow  = Math.min(px, py, (w - 1) - px, (h - 1) - py);
    const edgeNext = Math.min(tx, ty, (w - 1) - tx, (h - 1) - ty);
    let bonus = 0;

    if (template.perimeterDir) {
        // Phase-aware perimeter gradient: mirrors V1's harvest→knot transition.
        // During harvest (rRatio<0.45): full perimeter pull. During knot (rRatio>0.45):
        // gradually relax so the solver can build interior intersections.
        const perimScale = rRatio > 0.45
            ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)
            : 1.0;
        if (edgeNext === 0) {
            bonus += Math.round(42 * perimScale);
        } else {
            bonus -= Math.round(edgeNext * 16 * perimScale);
        }
        // Directional bias when moving perimeter-to-perimeter (CW vs CCW)
        if (edgeNow === 0 && edgeNext === 0) {
            const cx = (w - 1) / 2, cy = (h - 1) / 2;
            const cross = (px - cx) * (ty - cy) - (py - cy) * (tx - cx);
            if (cross !== 0) {
                const correctDir = (template.perimeterDir === 'cw') ? (cross < 0) : (cross > 0);
                bonus += correctDir ? (template.branchBiasBoost ?? 0) : -(template.directionPenalty ?? 0);
            }
        }
        // Penalty for leaving perimeter, scaled with phase (relaxes in knot phase)
        if (edgeNow === 0 && edgeNext > 0) {
            bonus -= Math.round((template.edgeDriftPenalty ?? 0) * perimScale);
        }
    }

    if (template.prefersCorner) {
        if (rRatio < 0.58) {
            const cornerDist = Math.min(tx + ty, (w - 1 - tx) + ty, tx + (h - 1 - ty), (w - 1 - tx) + (h - 1 - ty));
            if (cornerDist <= 2) {
                bonus += 48;
            } else {
                bonus -= cornerDist * 9;  // -27 at dist 3, -36 at dist 4, etc.
            }
        }
    }

    if (template.prefersSide && rRatio < 0.65 && w > 4) {
        const midX = (w - 1) / 2;
        const pSide = px - midX, tSide = tx - midX;
        const pSign = Math.sign(pSide), tSign = Math.sign(tSide);
        if (pSign !== 0) {
            if (tSign === pSign)       bonus += 22;  // reward staying on same side
            else if (tSign === -pSign) bonus -= 38;  // strongly penalise crossing
        }
    }

    if (template.sideAxis && rRatio < 0.68) {
        const mid    = template.sideAxis === 'x' ? (w - 1) / 2 : (h - 1) / 2;
        const tCoord = template.sideAxis === 'x' ? tx : ty;
        const side   = Math.sign(tCoord - mid);
        if (side === template.sideDir)       bonus += (template.sideBiasBoost ?? 0) * 3;
        else if (side === -(template.sideDir ?? 0)) bonus -= (template.sideViolation ?? 0)  * 3;
    }

    return bonus;
}

// Score a candidate move `target` from `pos` in `state`.
// Higher score = better (explored first).
// prep._cfg: optional ablation config — null means all features enabled (default behaviour).
export function scoreMoveV2(target: number, pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, rStepsAfterMove: number, template?: StructuralTemplate | null): number {
    const w = profile.goalAttractionWeight       ?? 1;
    const wo = profile.objectiveAttractionWeight  ?? 1;
    const wf = profile.finishCommitmentWeight     ?? 1;
    const wp = profile.perimeterBiasWeight        ?? 1;
    const wmp = profile.mustPassUrgencyWeight     ?? 1;
    const wmc = profile.mustCrossUrgencyWeight    ?? 1;
    const wi = profile.intersectionSetupWeight    ?? 1;
    const wdt = profile.antiDitherWeight          ?? 1;
    const wrv = profile.revisitPenaltyWeight      ?? 1;

    const cfg = prep._cfg; // null when no ablation config (fast-path: !cfg is true → run normally)

    // Phase-based multipliers — mirroring V1's harvest/finish phase policy.
    // Harvest (early path, rRatio < 0.45): weaken goal pull so the DFS builds
    // structural layout before committing to a direction.
    // Finish (late path, rRatio > 0.82): strengthen goal pull to commit to ending.
    const rRatio = level.reqLen > 0 ? Math.max(0, 1 - rStepsAfterMove / level.reqLen) : 1;
    let phaseGoalScale = 1.0;
    if (rRatio < 0.45) {
        phaseGoalScale = 0.65 + (rRatio / 0.45) * 0.35;  // 0.65 at rRatio=0, 1.0 at 0.45
    } else if (rRatio > 0.82) {
        const t = (rRatio - 0.82) / 0.18;
        phaseGoalScale = 1.0 + t * 1.8;                   // 1.0 at 0.82, 2.8 at 1.0
    }
    // Phase-based perimeter scaling: mirrors V1's harvest→knot transition.
    // V1 drops perimeterBias from 1.65 (harvest) to 0.45 (knot) so the solver can
    // leave the perimeter to build intersections / MC crossings in the mid phase.
    // Only applies to directional CW/CCW templates to avoid disturbing non-perimeter configs.
    const phasePerimScale = (template && template.perimeterDir && rRatio > 0.45)
        ? Math.max(0.22, 1.0 - (rRatio - 0.45) * 1.42)  // 1.0→0.22 over rRatio 0.45→1.0
        : 1.0;

    // Ablation: when SCORE_PHASE_SCALING is disabled, all phase multipliers collapse to 1.0.
    const _phaseGoalScale  = (!cfg || cfg.SCORE_PHASE_SCALING) ? phaseGoalScale  : 1.0;
    const _phasePerimScale = (!cfg || cfg.SCORE_PHASE_SCALING) ? phasePerimScale : 1.0;

    let score = 0;

    // Goal attraction: reward moves that reduce distance to goal
    const goalDistCur    = getDistanceFromArray(prep.goalDistArr, pos);
    const goalDistTarget = getDistanceFromArray(prep.goalDistArr, target);
    if (!cfg || cfg.SCORE_GOAL_ATTRACTION) {
        if (Number.isFinite(goalDistCur) && Number.isFinite(goalDistTarget)) {
            const gain = goalDistCur - goalDistTarget;
            score += w * _phaseGoalScale * gain * 10;
        }
    }

    // Finish commitment: bonus when close to goal (small rSteps)
    if (!cfg || cfg.SCORE_FINISH_COMMITMENT) {
        if (rStepsAfterMove <= 4 && Number.isFinite(goalDistTarget)) {
            score += wf * (5 - rStepsAfterMove) * 8;
        }
    }

    // Objective attraction: reward moves toward nearest unsatisfied objective
    if ((!cfg || cfg.SCORE_OBJECTIVE_ATTRACTION) && (state.mustMask !== 0 || state.mustCrossMask !== 0)) {
        let bestObjDist = Infinity;
        for (let oi = 0; oi < prep.objectiveKeys.length; oi++) {
            const objKey = prep.objectiveKeys[oi];
            const mpIdx = prep.mustPassIndex.get(objKey);
            const mcIdx = prep.mustCrossIndex.get(objKey);
            const satisfied = (mpIdx !== undefined && (state.mustMask & (1 << mpIdx)) === 0)
                           || (mcIdx !== undefined && (state.mustCrossMask & (1 << mcIdx)) === 0);
            if (satisfied) continue;
            const d = getDistanceFromArray(prep.objDistArrs[oi], target);
            if (Number.isFinite(d)) bestObjDist = Math.min(bestObjDist, d);
        }
        if (Number.isFinite(bestObjDist)) {
            score += wo * (10 / (1 + bestObjDist));
        }
    }

    // Must-pass urgency: bonus for moving toward must-pass
    if ((!cfg || cfg.SCORE_MUST_PASS_URGENCY) && state.mustMask !== 0) {
        for (let i = 0; i < level.mustPassKeys.length; i++) {
            if ((state.mustMask & (1 << i)) === 0) continue;
            const dCur    = getDistanceFromArray(prep.mpDistArrs[i], pos);
            const dTarget = getDistanceFromArray(prep.mpDistArrs[i], target);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 5;
            }
        }
    }

    // Must-cross urgency
    if ((!cfg || cfg.SCORE_MUST_CROSS_URGENCY) && state.mustCrossMask !== 0) {
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
            if ((state.mustCrossMask & (1 << i)) === 0) continue;

            // 2nd-visit approach guidance (independently togglable)
            if ((!cfg || cfg.SCORE_MC_APPROACH_GUIDANCE) && state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
                // 2nd visit needed: guide toward the perpendicular-axis approach cells,
                // not the MC cell itself (which is axis-blocked from the used direction).
                const mcKey = level.mustCrossKeys[i];
                const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
                const aMap  = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
                if (aMap.size > 0) {
                    const dCur    = aMap.get(pos)    ?? Infinity;
                    const dTarget = aMap.get(target) ?? Infinity;
                    if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                        score += wmc * (dCur - dTarget) * 15;
                    }
                    continue;
                }
            }

            // 1st visit (or approach map unavailable / guidance disabled): standard urgency
            const dCur    = getDistanceFromArray(prep.mcDistArrs[i], pos);
            const dTarget = getDistanceFromArray(prep.mcDistArrs[i], target);
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmc * (dCur - dTarget) * 5;
            }
        }
    }

    // Surround urgency: reward moves toward nearest unvisited neighbor of each pending surround cell
    const _snDistMaps = prep.surroundNeighborDistMaps, _snKeys = prep.surroundNeighborKeys;
    if (state.surroundMask !== 0 && _snDistMaps && _snDistMaps.length > 0 && _snKeys) {
        const snN = (level.surroundKeys || []).length;
        for (let i = 0; i < snN; i++) {
            if ((state.surroundMask & (1 << i)) === 0) continue;
            const remainBits  = state.surroundNeighborRemainingMasks[i];
            const nbrDistMaps = _snDistMaps[i];
            const nbrKeys     = _snKeys[i];
            let bestGain = -Infinity;
            for (let j = 0; j < nbrKeys.length; j++) {
                if (!(remainBits & (1 << j))) continue;
                const dCur    = nbrDistMaps[j].get(pos)    ?? Infinity;
                const dTarget = nbrDistMaps[j].get(target) ?? Infinity;
                if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                    const gain = dCur - dTarget;
                    if (gain > bestGain) bestGain = gain;
                }
            }
            if (Number.isFinite(bestGain)) score += wmp * bestGain * 5;
        }
    }

    // Adjacent-turn urgency: reward moves toward any adjacent cell of pending adj-turn objects
    const _atDistMaps = prep.adjTurnDistMaps;
    if (state.adjTurnMask !== 0 && _atDistMaps && _atDistMaps.length > 0) {
        const atN = (level.adjacentTurnKeys || []).length;
        for (let i = 0; i < atN; i++) {
            if ((state.adjTurnMask & (1 << i)) === 0) continue;
            const dCur    = _atDistMaps[i].get(pos)    ?? Infinity;
            const dTarget = _atDistMaps[i].get(target) ?? Infinity;
            if (Number.isFinite(dCur) && Number.isFinite(dTarget)) {
                score += wmp * (dCur - dTarget) * 4;
            }
        }
    }

    // Flipping filter approach urgency (harvest phase only, rRatio < 0.45).
    // Rewards moves toward the entry zone of each accessible unused flipper.
    // This is critical when flipper access is order-dependent (global-flip rule):
    // e.g. when one flipper (axisV) must be approached from above/below before another
    // becomes accessible from a non-flipper cell — without this urgency the beam/DFS heads
    // toward the nearer MC/MP cells and never reaches the order-gated flippers.
    if ((!cfg || cfg.SCORE_FLIPPER_URGENCY) && rRatio < 0.45 && prep.flipperApproachEven.length > 0) {
        const _parityOdd = (popcount(state.flipperUsedMask) & 1) === 1;
        const _aMaps = _parityOdd ? prep.flipperApproachOdd : prep.flipperApproachEven;
        for (let _fi = 0; _fi < _aMaps.length; _fi++) {
            if (state.flipperUsedMask & (1 << _fi)) continue;
            const _aMap = _aMaps[_fi];
            if (_aMap.size === 0) continue;
            const _dCur    = _aMap.get(pos)    ?? Infinity;
            const _dTarget = _aMap.get(target) ?? Infinity;
            if (Number.isFinite(_dCur) && Number.isFinite(_dTarget)) {
                score += 2.0 * (_dCur - _dTarget) * 5;
            }
        }
    }

    // Intersection setup: reward second visit to a non-gate, non-goal cell if ints needed
    if (!cfg || cfg.SCORE_INTERSECTION_SETUP) {
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateSet.has(target)) {
            score += wi * 12;
        } else if (intNeeded > 0) {
            score += wi * 1;
        }
    }

    // Perimeter bias: prefer cells on the grid edge
    if (!cfg || cfg.SCORE_PERIMETER_BIAS) {
        const gw = level.grid.w, gh = level.grid.h;
        const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
        if (tx === 0 || ty === 0 || tx === gw - 1 || ty === gh - 1) score += wp * _phasePerimScale * 3;
    }

    // Anti-dither: penalise immediate U-turns
    if ((!cfg || cfg.SCORE_ANTI_DITHER) && state.path.length >= 2) {
        const prevPrev = state.path[state.path.length - 2];
        if (prevPrev === target) score -= wdt * 15;
    }

    // Revisit penalty
    if ((!cfg || cfg.SCORE_REVISIT_PENALTY) && state.visited[target] > 0) score -= wrv * 8;

    // Structural template bias (overrides/supplements profile heuristics)
    if ((!cfg || cfg.SCORE_TEMPLATE_BONUS) && template) score += computeTemplateBonus(target, pos, level, template, rRatio);

    return score;
}

// Reusable scratch buffer for scoreAndSort (max 4 neighbors on a 4-directional grid).
const _sas = new Float64Array(4); // scores indexed by neighbor position

// Sort neighbors in-place: best-first at index 0 (DFS iterates with childIdx++).
export function scoreAndSort(neighbors: number[], pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, profile: ScoringProfile, template?: StructuralTemplate | null): void {
    const n = neighbors.length;
    if (n <= 1) return;
    const realLen = getRealLengthFromState(state);
    const portalEntry = level.portalMap.get(pos);
    for (let i = 0; i < n; i++) {
        const nk = neighbors[i];
        const isJump = !!(portalEntry && portalEntry.dest === nk);
        const nRSteps = level.reqLen - realLen - (isJump ? 0 : 1);
        _sas[i] = scoreMoveV2(nk, pos, state, level, prep, profile, nRSteps, template);
    }
    // Insertion sort (tiny arrays ≤4)
    for (let i = 1; i < n; i++) {
        const si = _sas[i], ki = neighbors[i];
        let j = i - 1;
        while (j >= 0 && _sas[j] < si) { _sas[j + 1] = _sas[j]; neighbors[j + 1] = neighbors[j]; j--; }
        _sas[j + 1] = si; neighbors[j + 1] = ki;
    }
}
