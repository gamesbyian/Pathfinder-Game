#!/usr/bin/env node
/**
 * Pre-winner canonical-work census.
 *
 * Opportunity sizing only. For each successful sequential solve row, sum canonical workSpent from
 * attempts before the first successful attempt. This is an oracle upper bound on work removable by
 * perfect winner-first action selection. It does NOT claim that any runtime-legal selector can know
 * the winner, and it does not use elapsed time or heterogeneous node counts as substitutes.
 *
 * Supported rows: doc.levels / doc.data.levels / doc.results.
 * Requires attempt.workSpent on every attempt through the winner. Rows without canonical attempt
 * work are reported as unavailable and excluded from canonical-work rates.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const i = arg.indexOf('=');
    out.set(i >= 0 ? arg.slice(0, i) : arg, i >= 0 ? arg.slice(i + 1) : true);
  }
  return out;
}

const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const isSuccess = row => row?.ok === true || row?.status === 'success';
const attemptSuccess = attempt => attempt?.ok === true || attempt?.status === 'success' || attempt?.outcome === 'success';

function rowsOf(doc) {
  if (Array.isArray(doc)) return doc;
  if (Array.isArray(doc?.levels)) return doc.levels;
  if (Array.isArray(doc?.data?.levels)) return doc.data.levels;
  if (Array.isArray(doc?.results)) return doc.results;
  return [];
}

function keyOfAttempt(attempt) {
  return String(attempt?.actionKey ?? attempt?.configKey ?? [
    attempt?.stageId ?? 'stage?',
    attempt?.profile ?? attempt?.scoringProfileId ?? attempt?.technique ?? 'action?',
    attempt?.template ?? attempt?.orderingBiasId ?? '',
    attempt?.beamWidth != null ? `beam${attempt.beamWidth}` : '',
  ].filter(Boolean).join('|'));
}

function pct(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.max(0, Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1));
  return sorted[i];
}

function round(value, places = 6) {
  if (!Number.isFinite(value)) return null;
  const m = 10 ** places;
  return Math.round(value * m) / m;
}

export function analyzePreWinnerWork(doc, { source = null } = {}) {
  const rows = rowsOf(doc);
  const solved = rows.filter(isSuccess);
  const observations = [];
  const unavailable = [];

  for (const row of solved) {
    const attempts = Array.isArray(row?.attempts) ? row.attempts : [];
    const winnerIndex = attempts.findIndex(attemptSuccess);
    if (winnerIndex < 0) {
      unavailable.push({ id: row?.id ?? row?.level ?? null, reason: 'successful-row-without-successful-attempt' });
      continue;
    }
    const throughWinner = attempts.slice(0, winnerIndex + 1);
    if (!throughWinner.every(a => finite(a?.workSpent) !== null)) {
      unavailable.push({
        id: row?.id ?? row?.level ?? null,
        reason: 'attempt-workSpent-unavailable',
        winnerIndex,
        attemptsThroughWinner: throughWinner.length,
      });
      continue;
    }

    const pre = throughWinner.slice(0, -1);
    const winner = throughWinner.at(-1);
    const preWork = pre.reduce((sum, a) => sum + finite(a.workSpent), 0);
    const winnerWork = finite(winner.workSpent);
    const throughWinnerWork = preWork + winnerWork;
    const parentWork = finite(row?.workSpent);
    const denominator = parentWork != null && parentWork >= throughWinnerWork ? parentWork : throughWinnerWork;
    const preActionCounts = new Map();
    for (const a of pre) {
      const key = keyOfAttempt(a);
      preActionCounts.set(key, (preActionCounts.get(key) ?? 0) + 1);
    }
    const repeatedPreActions = [...preActionCounts.entries()].filter(([,n]) => n > 1).map(([key,n]) => ({ key, n }));
    observations.push({
      id: row?.id ?? row?.level ?? null,
      winnerIndex,
      winnerStageId: winner?.stageId ?? null,
      winnerActionKey: keyOfAttempt(winner),
      preWinnerAttempts: pre.length,
      distinctPreWinnerActions: preActionCounts.size,
      repeatedPreActions,
      preWinnerWork: preWork,
      winnerWork,
      throughWinnerWork,
      parentWork,
      denominatorWork: denominator,
      preWinnerShare: denominator > 0 ? preWork / denominator : 0,
    });
  }

  const sum = (key) => observations.reduce((s, row) => s + Number(row[key] ?? 0), 0);
  const totalPre = sum('preWinnerWork');
  const totalDen = sum('denominatorWork');
  const shares = observations.map(x => x.preWinnerShare).sort((a,b) => a-b);
  const preAttemptCounts = observations.map(x => x.preWinnerAttempts).sort((a,b) => a-b);

  const byWinner = new Map();
  for (const row of observations) {
    const key = row.winnerActionKey;
    const agg = byWinner.get(key) ?? { rows: 0, preWinnerWork: 0, denominatorWork: 0 };
    agg.rows++;
    agg.preWinnerWork += row.preWinnerWork;
    agg.denominatorWork += row.denominatorWork;
    byWinner.set(key, agg);
  }

  const preActionWork = new Map();
  for (const row of solved) {
    const attempts = Array.isArray(row?.attempts) ? row.attempts : [];
    const winnerIndex = attempts.findIndex(attemptSuccess);
    if (winnerIndex < 0) continue;
    const pre = attempts.slice(0, winnerIndex);
    if (!pre.every(a => finite(a?.workSpent) !== null)) continue;
    for (const a of pre) {
      const key = keyOfAttempt(a);
      preActionWork.set(key, (preActionWork.get(key) ?? 0) + finite(a.workSpent));
    }
  }

  return {
    schemaVersion: 1,
    kind: 'pathfinder-pre-winner-canonical-work-census',
    evidenceRole: 'opportunity-sizing',
    source,
    inferenceScope: 'oracle upper bound on sequential successful-solve work before first successful attempt; not selector achievability',
    population: {
      rows: rows.length,
      solvedRows: solved.length,
      canonicalWorkRows: observations.length,
      unavailableSolvedRows: unavailable.length,
      canonicalCoverageRate: solved.length ? observations.length / solved.length : null,
    },
    summary: {
      totalPreWinnerWork: totalPre,
      totalDenominatorWork: totalDen,
      aggregatePreWinnerWorkShare: totalDen > 0 ? totalPre / totalDen : null,
      rowsWithAnyPreWinnerWork: observations.filter(x => x.preWinnerWork > 0).length,
      rowsWithAnyPreWinnerWorkRate: observations.length ? observations.filter(x => x.preWinnerWork > 0).length / observations.length : null,
      medianRowPreWinnerShare: pct(shares, 0.5),
      p90RowPreWinnerShare: pct(shares, 0.9),
      medianPreWinnerAttempts: pct(preAttemptCounts, 0.5),
      p90PreWinnerAttempts: pct(preAttemptCounts, 0.9),
      rowsWithRepeatedPreWinnerAction: observations.filter(x => x.repeatedPreActions.length > 0).length,
    },
    byWinnerAction: [...byWinner.entries()].map(([actionKey, v]) => ({
      actionKey,
      rows: v.rows,
      preWinnerWork: v.preWinnerWork,
      denominatorWork: v.denominatorWork,
      aggregatePreWinnerWorkShare: v.denominatorWork > 0 ? v.preWinnerWork / v.denominatorWork : null,
    })).sort((a,b) => b.preWinnerWork - a.preWinnerWork),
    preWinnerWorkByFailedAction: [...preActionWork.entries()].map(([actionKey, work]) => ({ actionKey, work }))
      .sort((a,b) => b.work - a.work),
    topRows: [...observations].sort((a,b) => b.preWinnerWork - a.preWinnerWork).slice(0, 50),
    unavailable,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args.get('--in');
  if (!input || input === true) throw new Error('missing --in=<combined-result.json>');
  const output = String(args.get('--out') || 'tmp/pre-winner-canonical-work.json');
  const doc = JSON.parse(readFileSync(String(input), 'utf8'));
  const report = analyzePreWinnerWork(doc, { source: String(input) });
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, population: report.population, summary: report.summary }, null, 2));
}

if (process.argv[1] && path.basename(process.argv[1]).includes('pre-winner-work-census')) {
  await main();
}
