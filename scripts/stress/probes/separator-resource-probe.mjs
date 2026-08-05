/**
 * Separator-state resource-spectrum probe — the harness-pluggable prototype implementation of
 * docs/solver-next-frontier-multilingual-research-update-2026-08-02.md section 3 ("separator-state
 * resource dynamic programming"), scoped down to the single case explicitly recommended as the
 * first cut in section 3.2/3.5: opportunistic single-articulation-point pendant chambers, not a
 * general treewidth solver.
 *
 * WHAT IT PROVES (soundness argument). For each in-scope pendant chamber with a pending must-pass
 * obligation, `enumerateChamberSpectrum` exhaustively finds every (extra steps, extra
 * intersections) pair achievable by a single excursion — gateway out, cover every mandatory cell,
 * gateway back in — using the real move-legality primitives, with the excursion depth bounded by
 * the TRUE remaining step budget (not an arbitrary cutoff), so an empty, non-truncated spectrum is
 * a genuine proof that the chamber's obligations can never be satisfied at all.
 *
 * With 2+ mandatory chambers, `convolveSpectra` combines their spectra additively (visiting one
 * doesn't affect another's cost, since each is a self-contained excursion through its own gateway).
 * The cheapest combined (steps, intersections) pair is then checked against the CURRENT position's
 * existing admissible goal-distance bound: any real solution needs at least
 * `goalDist(pos) + comboSteps` total steps (the excursion is a pure round-trip detour, so it's
 * additive regardless of when it happens) and at least `comboInts` additional intersections. Both
 * of those are already-sound quantities (goalDistArr is the solver's own admissible distance
 * bound), so failing either is a real, provable rejection — not a heuristic.
 *
 * WHAT IT DOES NOT PROVE (scope limits — see design doc for the honest accounting):
 * - Multiple separate excursions into the SAME chamber are not modeled (only one covering
 *   excursion is searched for). A level whose only solutions dip into a chamber twice will not be
 *   caught as dead by this probe even if it truly is — that's a missed catch, not a false reject.
 * - A chamber whose enumeration hits the node cap ABSTAINS rather than asserting anything — see
 *   `truncated` handling below. Never treat a truncated chamber's partial spectrum as complete.
 */
import { getDistanceFromArray } from '../../../modules/solver/distance.ts';
import { getRealLengthFromState } from '../../../modules/solver/solution.ts';
import { computeResidualChambers, enumerateChamberSpectrum, convolveSpectra, decodeSpectrumEntry } from '../lib/residual-decomposition.mjs';

export const name = 'separator-resource-spectrum';
export const soundnessClass = 'sound prune (necessary-condition lower bound over pendant-chamber excursions)';

const NODE_CAP = 50000;
const MAX_CHAMBER_SIZE = 10;

export function evaluate({ level, prep, state, pos }) {
    const chambers = computeResidualChambers({ pos, level, prep, state, maxChamberSize: MAX_CHAMBER_SIZE });
    if (chambers.length === 0) {
        return { verdict: 'pass', abstained: true, reason: 'no in-scope mandatory pendant chamber', chambers: 0 };
    }

    const rSteps = level.reqLen - getRealLengthFromState(state);
    const rInts = level.reqInt - state.ints;
    const spectra = [];
    let anyTruncated = false;
    let anyProvenEmpty = false;
    const chamberReports = [];

    for (const chamber of chambers) {
        const { spectrum, truncated } = enumerateChamberSpectrum({ chamber, level, prep, state, maxSteps: rSteps, nodeCap: NODE_CAP });
        chamberReports.push({ gateway: chamber.gateway, cellCount: chamber.cells.size, spectrumSize: spectrum.size, truncated });
        if (truncated) { anyTruncated = true; continue; }
        if (spectrum.size === 0) { anyProvenEmpty = true; continue; }
        spectra.push(spectrum);
    }

    // A chamber that fully enumerated (not truncated) and found ZERO covering excursions is a
    // standalone, unconditional proof of death: no assignment of the OTHER chambers or the trunk
    // can rescue a level requiring a physically-impossible chamber visit.
    if (anyProvenEmpty) {
        return {
            verdict: 'reject', abstained: false,
            reason: 'a mandatory chamber has no covering excursion under the full remaining step budget',
            chambers: chambers.length, chamberReports,
        };
    }
    // Any OTHER chamber truncating means we can't trust the combined spectrum (see file doc) —
    // abstain rather than risk an unsound reject built on an incomplete spectrum.
    if (anyTruncated) {
        return { verdict: 'pass', abstained: true, reason: 'chamber enumeration truncated (node cap)', chambers: chambers.length, chamberReports };
    }

    const combined = convolveSpectra(spectra);
    let minSteps = Infinity, minInts = Infinity;
    for (const e of combined) {
        const { steps, ints } = decodeSpectrumEntry(e);
        if (steps < minSteps) minSteps = steps;
        if (ints < minInts) minInts = ints;
    }

    const goalDist = getDistanceFromArray(prep.goalDistArr, pos, prep.gridW);
    const minTotalSteps = Number.isFinite(goalDist) ? goalDist + minSteps : Infinity;

    if (minTotalSteps > rSteps || minInts > rInts) {
        return {
            verdict: 'reject', abstained: false,
            reason: `mandatory-chamber lower bound exceeds remaining budget (needSteps>=${minTotalSteps} vs rSteps=${rSteps}, needInts>=${minInts} vs rInts=${rInts})`,
            chambers: chambers.length, chamberReports, minTotalSteps, minInts, rSteps, rInts,
        };
    }

    return { verdict: 'pass', abstained: false, chambers: chambers.length, chamberReports, minTotalSteps, minInts, rSteps, rInts };
}
