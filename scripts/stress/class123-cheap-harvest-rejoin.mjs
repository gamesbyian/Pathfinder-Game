#!/usr/bin/env node
/**
 * Cheap current-capability rejoin for residual classes 1-3.
 * No solving: joins an existing residual atlas to current attempt-policy shape so known isolated
 * winners can be separated into already-priced/closed forms versus genuinely unpriced exposure.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [k, ...v] = x.split('='); return [k, v.join('=')];
}));
const ATLAS = args.get('--atlas') ?? 'tmp/post-1048-atlas.json';
const CORPUS = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const OUT = args.get('--out') ?? 'tmp/class123-cheap-harvest-rejoin.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT } = await import('../../modules/solver/orchestration.js');
const Solver = createSolver();
const { getAttemptConfigs, attemptConfigKey } = SOLVER_TESTING_API;
const atlas = JSON.parse(readFileSync(path.resolve(ATLAS), 'utf8'));
const levels = new Map(readLevelsWithHints(CORPUS).map(row => [String(row.id), row]));

const VERY_HIGH_REQINT = 7;
const rows = [];
for (const row of atlas.rows ?? []) {
    if (row.primaryClass > 3) continue;
    const entry = levels.get(String(row.id));
    if (!entry) throw new Error(`Missing level ${row.id}`);
    const { id: _id, stressMeta: _stressMeta, hints: _hints, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const configs = getAttemptConfigs(level, null);
    const policyIds = new Set(configs.map(attemptConfigKey));
    const main = configs.filter(c => !c.repair && !c.admissibleOrder);
    const mainIds = new Set(main.map(attemptConfigKey));
    const primaryWins = (row.t1Wins ?? []).filter(w => w.class === row.primaryClass);
    const strictHighIntClosed = row.primaryClass === 1
        && row.routingRegime === 'intersection-heavy'
        && Number(row.features?.reqInt) >= VERY_HIGH_REQINT;
    const decisionWins = primaryWins.map(win => ({
        identity: win.identity,
        nodes: win.nodes ?? null,
        currentlyInPolicyMenu: policyIds.has(win.identity),
        currentlyInMainMenu: mainIds.has(win.identity),
        dispatched: win.dispatched ?? null,
        familyReached: win.familyReached ?? null,
        familyStarved: win.familyStarved ?? null,
    }));
    rows.push({
        levelId: row.id,
        primaryClass: row.primaryClass,
        routingRegime: row.routingRegime,
        reqInt: row.features?.reqInt ?? null,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
        bucket: row.bucket ?? null,
        policyConfigCount: configs.length,
        mainConfigCount: main.length,
        lateReserveConfigCount: MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT,
        reserveWindowHeadroom: Math.max(0, MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT - main.length),
        strictHighIntAdditionClosed: strictHighIntClosed,
        decisionWins,
    });
}

const class1 = rows.filter(r => r.primaryClass === 1);
const class2 = rows.filter(r => r.primaryClass === 2);
const class3 = rows.filter(r => r.primaryClass === 3);
const class1OutsideClosed = class1.filter(r => !r.strictHighIntAdditionClosed);
const output = {
    schemaVersion: 2,
    atlas: ATLAS,
    counts: { class1: class1.length, class2: class2.length, class3: class3.length },
    class1: {
        strictHighIntClosedCount: class1.filter(r => r.strictHighIntAdditionClosed).length,
        outsideClosedCount: class1OutsideClosed.length,
        outsideClosedWithReserveHeadroom: class1OutsideClosed.filter(r => r.reserveWindowHeadroom > 0).length,
        rows: class1,
    },
    class2: { rows: class2 },
    class3: { rows: class3 },
    interpretationGuard: 'This is nomination/headroom evidence only. A missing action with zero reserve headroom does not earn an additive strict-work treatment; classes 2/3 require reconciliation with existing tier/policy dispositions.',
};
mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
    counts: output.counts,
    class1StrictHighIntClosed: output.class1.strictHighIntClosedCount,
    class1OutsideClosed: output.class1.outsideClosedCount,
    class1OutsideWithReserveHeadroom: output.class1.outsideClosedWithReserveHeadroom,
    outside: class1OutsideClosed.map(r => ({ levelId:r.levelId, mainConfigCount:r.mainConfigCount, reserveWindowHeadroom:r.reserveWindowHeadroom, wins:r.decisionWins })),
    class2PolicyMisses: class2.filter(r => r.decisionWins.some(w => !w.currentlyInPolicyMenu)).map(r => ({ levelId:r.levelId, mustTurn:r.mustTurn, wins:r.decisionWins.filter(w => !w.currentlyInPolicyMenu) })),
}, null, 2));
