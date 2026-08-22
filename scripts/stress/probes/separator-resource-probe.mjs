// Sound pendant-chamber resource probe. For each in-scope mandatory chamber, exhaustively enumerate
// one covering gateway-to-gateway excursion using real move legality, then convolve chamber spectra.
// Empty non-truncated spectrum proves death. Otherwise goalDist + minimum excursion steps and minimum
// excursion intersections are necessary resource bounds. Any truncated chamber forces abstention.
// Multiple excursions into the same chamber are out of scope, causing missed catches only.
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

    if (anyProvenEmpty) {
        return {
            verdict: 'reject', abstained: false,
            reason: 'a mandatory chamber has no covering excursion under the full remaining step budget',
            chambers: chambers.length, chamberReports,
        };
    }
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
