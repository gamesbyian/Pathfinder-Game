#!/usr/bin/env node
import assert from 'node:assert/strict';
import { analyzePreWinnerWork } from './pre-winner-work-census.mjs';

const doc = {
  levels: [
    {
      id: 'A',
      ok: true,
      workSpent: 100,
      attempts: [
        { actionKey: 'x', ok: false, workSpent: 30 },
        { actionKey: 'y', ok: true, workSpent: 20 },
      ],
    },
    {
      id: 'B',
      status: 'success',
      workSpent: 40,
      attempts: [
        { actionKey: 'z', outcome: 'success', workSpent: 40 },
      ],
    },
    {
      id: 'C',
      ok: true,
      workSpent: 50,
      attempts: [
        { actionKey: 'x', ok: false, nodesExpanded: 99 },
        { actionKey: 'x', ok: true, workSpent: 10 },
      ],
    },
  ],
};

const report = analyzePreWinnerWork(doc, { source: 'fixture' });
assert.equal(report.population.solvedRows, 3);
assert.equal(report.population.canonicalWorkRows, 2);
assert.equal(report.population.unavailableSolvedRows, 1);
assert.equal(report.summary.totalPreWinnerWork, 30);
assert.equal(report.summary.totalDenominatorWork, 140);
assert.equal(report.summary.rowsWithAnyPreWinnerWork, 1);
assert.equal(report.summary.rowsWithRepeatedPreWinnerAction, 0);
assert.equal(report.byWinnerAction.find(row => row.actionKey === 'y').preWinnerWork, 30);
assert.equal(report.unavailable[0].reason, 'attempt-workSpent-unavailable');

console.log('pre-winner-work-census-node-test: ok');
