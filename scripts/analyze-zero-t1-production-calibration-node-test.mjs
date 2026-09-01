import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeCalibration } from './analyze-zero-t1-production-calibration.mjs';

const synthetic = analyzeCalibration({
    capability: {
        levels: [
            { corpus: 'corpus2', levelId: 'A', productionSolved: true, isolatedOracleSolved: false, solverCount: 0 },
            { corpus: 'corpus2', levelId: 'B', productionSolved: true, isolatedOracleSolved: true, solverCount: 1 },
            { corpus: 'corpus1', levelId: 'C', productionSolved: true, isolatedOracleSolved: false, solverCount: 0 },
        ],
    },
    laterBaseline: {
        corpus: 'fixture',
        levels: [
            { id: 'A', ok: true, winningConfig: 'beam:test', attemptCount: 2, attempts: [{ ok: false }, { ok: true, stageId: 'late', nodesExpanded: 42 }] },
        ],
    },
});
assert.equal(synthetic.summary.frozenCases, 1);
assert.equal(synthetic.summary.laterSolved, 1);
assert.equal(synthetic.summary.laterMissing, 0);
assert.equal(synthetic.rows[0].laterWinningStageId, 'late');
assert.equal(synthetic.evidenceRole, 'observational-development-cross-revision-calibration');

const capability = JSON.parse(readFileSync('reports/stress/technique-niches/2026-09-01/level-capability.json', 'utf8'));
const baseline = JSON.parse(readFileSync('logs/stress-corpus2-baseline.json', 'utf8'));
const actual = analyzeCalibration({ capability, laterBaseline: baseline });
const expectedIds = [
    'R01086', 'R01356', 'R01936', 'R02088', 'R02452', 'R02493', 'R02536',
    'R02655', 'R02690', 'R02842', 'R02887', 'R03195', 'R03230', 'R03238',
];
assert.equal(actual.summary.frozenCases, 14);
assert.deepEqual(actual.rows.map((row) => row.levelId).sort(), expectedIds);
assert.equal(actual.summary.laterMissing, 0, 'compiled Corpus 2 baseline should contain all 14 calibration rows');

console.log('zero-T1 production calibration:', JSON.stringify(actual, null, 2));
console.log('analyze-zero-t1-production-calibration tests passed');
