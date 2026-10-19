/**
 * PG-L experimental exact future-fact replay.
 *
 * ABSENT from production: prep._experimentalConnectivityReplay is created only
 * by the explicit offline SolveOpts experiment. The baseline isConnected()
 * executes exactly as before. Fully reconstructs fresh _reached scratch on a
 * cache hit; a Boolean-only cache is forbidden.
 */
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, SolverSearchState } from './types.js';
import { isConnected, connectivityReachRowsForResearch, restoreConnectivityReachRowsForExperiment } from './topology.js';
import { assertStrictWorkChargeAllowed, CONNECTIVITY_WORK_UNITS, workMeter } from './work-meter.js';

const profiles = new Set(['objectiveFirst','intersectionHarvest']);
const assert = (ok: boolean,msg: string): void => { if (!ok) throw new Error(msg); };

/** Research-only, conservative exact semantic state identity within one PrepLevel/board. */
export function experimentalConnectivityReplayKey(
    pos: number, state: SolverSearchState, prep: PrepLevel, gateKey: number,
): string {
    const cells = [...new Set(state.path)].sort((a,b)=>a-b);
    const cfg = prep._cfg;
    const flags = cfg ? Object.keys(cfg).sort().map(k=>[k,cfg[k]]) : null;
    return JSON.stringify([
        gateKey,pos,state.path,state.ints,state.mustMask,state.mustCrossMask,
        Array.from(state.crossCounts),state.mpVisitedMask,state.portalJumps,
        state.flipperUsedMask,!!state.lastWasPortalJump,state.surroundMask,
        Array.from(state.surroundNeighborRemainingMasks),
        state.mustTurnMask,state.adjTurnMask,
        cells.map(k=>[k,state.visited[k],state.edgeUsage[k]]),flags
    ]);
}

/** Runs only when explicit default-OFF PG-L experimental replay is set. */
export function evaluateExperimentalConnectivityReplay(
    pos: number,state: SolverSearchState,level: NormalizedLevel,prep: PrepLevel,
): boolean {
    const context=prep._beamResearchAttemptContext;
    const memo=prep._experimentalConnectivityReplay;
    if (!memo || !context || context.beamWidth!==5000 ||
        !profiles.has(context.scoringProfileId)) {
        return isConnected(pos,state,level,prep);
    }
    const stats=memo.stats;
    const key=experimentalConnectivityReplayKey(pos,state,prep,context.gateKey);
    stats.lookups++;
    const prior=memo.cache.get(key);
    if (prior && prior.producerProfile!==context.scoringProfileId
        && prior.producerOrdinal < context.attemptOrdinal) {
        // Neutral mode retains EXACT canonical work, including atomic strict
        // cap refusal semantics, then restores fresh bit rows. Saving mode
        // skips the original 12-unit work charge entirely.
        if (memo.mode==='neutral') {
            if (prep._atomicStrictWorkCap !== undefined) {
                assertStrictWorkChargeAllowed(prep._workMeter.units,
                    prep._atomicStrictWorkCap, CONNECTIVITY_WORK_UNITS, 'isConnected');
            }
            workMeter.units+=CONNECTIVITY_WORK_UNITS;
            prep._workMeter.units+=CONNECTIVITY_WORK_UNITS;
        } else {
            assert(memo.mode==='saving','unknown PG-L replay dose');
            stats.nativeWorkDisplaced+=CONNECTIVITY_WORK_UNITS;
        }
        restoreConnectivityReachRowsForExperiment(level,prior.reachedRows);
        stats.chronologicalHits++;
        if (prior.connected) stats.trueHits++;
        else stats.falseHits++;
        return prior.connected;
    }

    // Fresh original fill is always authoritative for every cache miss,
    // same-profile repetition and ineligible technique/width.
    const connected=isConnected(pos,state,level,prep);
    stats.misses++;
    if (!prior && !stats.storageCensored) {
        const length=key.length;
        if (memo.cache.size>=memo.maxKeys
          ||stats.serializedKeyCharacters+length>memo.maxChars) {
            stats.storageCensored=true;
        } else {
            const reachRows=connectivityReachRowsForResearch(level);
            memo.cache.set(key,{connected,reachedRows:reachRows,
              producerOrdinal:context.attemptOrdinal,
              producerProfile:context.scoringProfileId});
            stats.storedKeys=memo.cache.size;
            stats.serializedKeyCharacters+=length;
            stats.rawReachRowBytes+=4*reachRows.length;
        }
    }
    return connected;
}
