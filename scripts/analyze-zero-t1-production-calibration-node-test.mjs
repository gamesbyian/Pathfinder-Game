import assert from 'node:assert/strict';
import { analyzeCalibration } from './analyze-zero-t1-production-calibration.mjs';

const capability = {
    levels: [
        { corpus: 'corpus2', levelId: 'A', productionSolved: true, isolatedOracleSolved: false, solverCount: 0 },
        { corpus: 'corpus2', levelId: 'B', productionSolved: true, isolatedOracleSolved: true, solverCount: 1 },
        { corpus: 'corpus1', levelId: 'C', productionSolved: true, isolatedOracleSolved: false, solverCount: 0 },
        { corpus: 'corpus2', levelId: 'D', productionSolved: false, isolatedOracleSolved: false, solverCount: 0 },
    ],
};
const laterBaseline = {
    compiledAt: '2026-01-01T00:00:00.000Z',
    corpus: 'fixture',
    solved: 1,
    total: 2,
    levels: [
        { id: 'A', ok: true, winningConfig: 'beam:test', attemptCount: 2, attempts: [{ ok: false }, { ok: true, stageId: 'late', nodesExpanded: 42 }] },
    ],
};
const result = analyzeCalibration({ capability, laterBaseline });
assert.equal(result.summary.frozenCases, 1);
assert.equal(result.summary.laterSolved, 1);
assert.equal(result.summary.laterUnsolved, 0);
assert.equal(result.summary.laterMissing, 0);
assert.equal(result.rows[0].laterWinningStageId, 'late');
assert.equal(result.rows[0].laterWinningNodesExpanded, 42);
assert.equal(result.evidenceRole, 'observational-development-cross-revision-calibration');
assert.match(result.interpretationGuardrail, /does not establish current-head technique capability/);

assert.throws(() => analyzeCalibration({ capability: {}, laterBaseline }), /levels/);
assert.throws(() => analyzeCalibration({ capability, laterBaseline: {} }), /levels/);

console.log('analyze-zero-t1-production-calibration tests passed');
