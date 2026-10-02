#!/usr/bin/env node
/**
 * BC1-V soundness harness (volume consequence of theorem BC1). Replays every referee-valid stored solution
 * (hint) of each corpus level through the real search state; at every strict prefix that passes ordinary
 * connectivity, BC1-V must NOT reject: (freshVolume - strandedFresh) + intNeeded >= rSteps. Any rejection is a
 * soundness alarm. Also records how much slack the witness states keep and how often anything is stranded.
 * Usage: node --import tsx scripts/stress/bc1v-witness-soundness.mjs [--levels=<file>] [--max-paths=3] [--out=<file>]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const maxLevels = Number(args.get('--max-levels') ?? 1000000);
const maxPathsPerLevel = Number(args.get('--max-paths') ?? 3);
const outFile = args.get('--out') ?? 'reports/stress/bc1v-witness-soundness.json';
const vertexCuts = args.get('--vertex-cuts') === 'true'; // BC1-VX: also strand goal-free blocks behind non-revisitable cut vertices
installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const levels = readLevelCorpusDocumentWithHints(levelsFile).levels.filter(l => l.hints?.length > 0).slice(0, maxLevels);
let states = 0, strandedStates = 0, nullStates = 0, volumeMismatch = 0, pathsReplayed = 0, levelsDone = 0, minSlack = Infinity;
const alarms = [];
for (const raw of levels) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level); prep._cfg = null; prep._metrics = { nodesExpanded: 0 };
    for (const hint of raw.hints.slice(0, maxPathsPerLevel)) {
        if (!Solver.validateCandidatePath(level, hint).ok) continue;
        pathsReplayed++;
        const state = api.createState(hint[0], level, prep);
        const undos = [];
        let realLen = 0;
        for (let i = 1; i < hint.length - 1; i++) {
            const pos = hint[i - 1], next = hint[i];
            const pAt = level.portalMap.get(pos);
            const isJump = !!(pAt && !state.lastWasPortalJump && pAt.dest === next);
            if (!isJump) realLen++;
            undos.push(api.applyMove(next, state, level, prep, isJump));
            if (!api.isConnected(next, state, level, prep)) continue; // production precondition
            const v = api.bc1StrandedFreshVolume(next, state, level, vertexCuts);
            if (!v) { nullStates++; continue; }
            states++;
            const rSteps = level.requiredLength - realLen;
            const intNeeded = level.requiredIntersections - state.ints;
            if (v.freshVolume + intNeeded < rSteps) volumeMismatch++; // isConnected passed, so this would mean a count mismatch
            if (v.strandedFresh > 0) strandedStates++;
            const slack = v.freshVolume - v.strandedFresh + intNeeded - rSteps;
            if (slack < minSlack) minSlack = slack;
            if (v.bc1Conflict || v.vertexConflict) alarms.push({ levelId: raw.id, step: i, kind: v.bc1Conflict ? 'bc1' : 'vertex-mandatory' });
            if (slack < 0) alarms.push({ levelId: raw.id, step: i, freshVolume: v.freshVolume, strandedFresh: v.strandedFresh, intNeeded, rSteps });
        }
        for (let i = undos.length - 1; i >= 0; i--) api.undoMove(undos[i], state);
    }
    levelsDone++;
}
const doc = { kind: 'pathfinder-bc1v-witness-soundness', levelsFile, vertexCuts, levelsDone, pathsReplayed, states, strandedStates, nullStates, volumeMismatch, minSlack, alarmCount: alarms.length, alarms: alarms.slice(0, 50) };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ ...doc, alarms: alarms.length }));
