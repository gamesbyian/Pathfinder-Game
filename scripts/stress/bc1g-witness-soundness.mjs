#!/usr/bin/env node
/**
 * WS2-CUT-BALANCE-PROJECTION BC1-G soundness harness. Replays every referee-valid stored solution (hint) of
 * each corpus level through the real search state; at every strict prefix that passes ordinary connectivity,
 * theorem predicates must NOT flag the state (a valid solution passes through it). BC1 and BC1-G are both checked;
 * any flag is a soundness alarm. Also counts, over the same states, how often BC1-G fires on non-solution states
 * is NOT measured here (only valid-path states are visited).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const maxLevels = Number(args.get('--max-levels') ?? 1000000);
const maxPathsPerLevel = Number(args.get('--max-paths') ?? 3);
const outFile = args.get('--out') ?? 'reports/stress/bc1g-witness-soundness.json';
installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const levels = readLevelCorpusDocumentWithHints(levelsFile).levels.filter(l => l.hints?.length > 0).slice(0, maxLevels);
let states = 0, bc1Flags = 0, bc1gFlags = 0, nullBc1g = 0, pathsReplayed = 0, levelsDone = 0;
const alarms = [];
for (const raw of levels) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level); prep._cfg = null; prep._metrics = { nodesExpanded: 0 };
    for (const hint of raw.hints.slice(0, maxPathsPerLevel)) {
        if (!Solver.validateCandidatePath(level, hint).ok) continue;
        pathsReplayed++;
        const state = api.createState(hint[0], level, prep);
        const undos = [];
        for (let i = 1; i < hint.length - 1; i++) {
            const pos = hint[i - 1], next = hint[i];
            const pAt = level.portalMap.get(pos);
            const isJump = !!(pAt && !state.lastWasPortalJump && pAt.dest === next);
            undos.push(api.applyMove(next, state, level, prep, isJump));
            if (!api.isConnected(next, state, level, prep)) continue; // ordinary connectivity (the production precondition)
            states++;
            const a = api.bc1HasConflictFast(next, state, level, false);
            const b = api.bc1HasConflictFast(next, state, level, true);
            if (a === true) { bc1Flags++; alarms.push({ levelId: raw.id, kind: 'bc1', step: i }); }
            if (b === true) { bc1gFlags++; alarms.push({ levelId: raw.id, kind: 'bc1g', step: i }); }
            if (b === null) nullBc1g++;
        }
        for (let i = undos.length - 1; i >= 0; i--) api.undoMove(undos[i], state);
    }
    levelsDone++;
}
const doc = { kind: 'pathfinder-bc1g-witness-soundness', levelsFile, levelsDone, pathsReplayed, states, bc1Flags, bc1gFlags, nullBc1g, alarms: alarms.slice(0, 50) };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ ...doc, alarms: alarms.length }));
