import { createHash } from 'node:crypto';

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function reportRows(report) {
  if (Array.isArray(report)) return report;
  if (Array.isArray(report?.levels)) return report.levels;
  if (Array.isArray(report?.rows)) return report.rows;
  if (Array.isArray(report?.results)) return report.results;
  throw new Error('Expected report rows in an array, .levels, .rows, or .results');
}

export function rowId(row) {
  const id = row?.id ?? row?.levelId ?? row?.level;
  return id == null ? null : String(id);
}

export function isConclusiveRow(row) {
  if (!row || row.deadlineTruncated || row.truncated || row.hadAttemptError || row.error) return false;
  const status = String(row.status ?? '').toLowerCase();
  if (status === 'error' || status === 'timeout' || status === 'truncated' || status === 'cancelled') return false;
  return typeof row.ok === 'boolean' || typeof row.solved === 'boolean' || status === 'solved' || status === 'unsolved' || status === 'failed' || status === 'node-budget-reached' || status === 'work-budget-reached';
}

export function isSolvedRow(row) {
  if (!row) return false;
  if (row.ok === true || row.solved === true) return true;
  return String(row.status ?? '').toLowerCase() === 'solved';
}

export function indexRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = rowId(row);
    if (!id) throw new Error('Encountered report row without id/levelId/level');
    if (map.has(id)) throw new Error(`Duplicate level id in report: ${id}`);
    map.set(id, row);
  }
  return map;
}

export function hashIds(ids) {
  const normalized = [...new Set((ids ?? []).map(String))].sort();
  return createHash('sha256').update(normalized.join('\n')).digest('hex');
}

export function solvedIds(rows) {
  return rows.filter(row => isConclusiveRow(row) && isSolvedRow(row)).map(rowId).filter(Boolean).sort();
}

export function populationIds(rows) {
  return rows.map(rowId).filter(Boolean).sort();
}

export function diffIdSets(currentIds, previousIds) {
  const current = new Set((currentIds ?? []).map(String));
  const previous = new Set((previousIds ?? []).map(String));
  const gainedIds = [...current].filter(id => !previous.has(id)).sort();
  const lostIds = [...previous].filter(id => !current.has(id)).sort();
  const retainedIds = [...current].filter(id => previous.has(id)).sort();
  return {
    gained: gainedIds.length,
    lost: lostIds.length,
    retained: retainedIds.length,
    gainedIds,
    lostIds,
  };
}

function aggregateCost(rows) {
  return {
    workSpent: rows.reduce((sum, row) => sum + numberOrZero(row?.workSpent), 0),
    nodesExpanded: rows.reduce((sum, row) => sum + numberOrZero(row?.nodesExpanded), 0),
    elapsedMs: rows.reduce((sum, row) => sum + numberOrZero(row?.elapsedMs), 0),
  };
}

function setIntersection(a, b) {
  return new Set([...a].filter(value => b.has(value)));
}

function setUnion(a, b) {
  return new Set([...a, ...b]);
}

function sorted(set) {
  return [...set].sort();
}

export function compareCandidateRows(baselineRows, candidateRows) {
  const baseline = indexRows(baselineRows);
  const candidate = indexRows(candidateRows);
  const gains = new Set();
  const losses = new Set();
  const inconclusive = new Set();
  const observed = [];
  const currentResidualObserved = [];

  for (const [id, candidateRow] of candidate) {
    const baselineRow = baseline.get(id);
    if (!baselineRow) continue;
    observed.push(candidateRow);
    if (!isConclusiveRow(baselineRow) || !isConclusiveRow(candidateRow)) {
      inconclusive.add(id);
      continue;
    }
    const baselineSolved = isSolvedRow(baselineRow);
    const candidateSolved = isSolvedRow(candidateRow);
    if (!baselineSolved) currentResidualObserved.push(candidateRow);
    if (!baselineSolved && candidateSolved) gains.add(id);
    if (baselineSolved && !candidateSolved) losses.add(id);
  }

  const residualObservedCost = aggregateCost(currentResidualObserved);
  return {
    observed: observed.length,
    currentResidualObserved: currentResidualObserved.length,
    gains: gains.size,
    losses: losses.size,
    gainIds: sorted(gains),
    lossIds: sorted(losses),
    inconclusiveIds: sorted(inconclusive),
    costObserved: aggregateCost(observed),
    costOnCurrentResidualObserved: residualObservedCost,
    workPerGainOnObservedResidual: gains.size > 0 ? residualObservedCost.workSpent / gains.size : null,
  };
}

function normalizeSignature(candidate, baselineSolvedSet, baselineResidualSet) {
  const demonstratedGains = new Set((candidate.signature?.gainIds ?? []).map(String));
  const demonstratedLosses = new Set((candidate.signature?.lossIds ?? []).map(String));
  return {
    sourceMode: 'historical-signature',
    demonstratedGains: demonstratedGains.size,
    demonstratedLosses: demonstratedLosses.size,
    demonstratedGainIds: sorted(demonstratedGains),
    demonstratedLossIds: sorted(demonstratedLosses),
    currentResidualNominationIds: sorted(setIntersection(demonstratedGains, baselineResidualSet)),
    currentlySolvedHistoricalGainIds: sorted(setIntersection(demonstratedGains, baselineSolvedSet)),
    currentResidualConfirmedGainIds: [],
    currentResidualConfirmedGains: 0,
    warning: 'Historical signatures nominate capability only. They are not current-code/current-budget confirmation and may not steer production by level identity.',
  };
}

export function buildCapabilityMemory({ baselineId = 'baseline', baselineRows, candidates }) {
  const baseRows = reportRows(baselineRows);
  const basePopulationIds = populationIds(baseRows);
  const conclusiveBaseRows = baseRows.filter(isConclusiveRow);
  const baseSolvedIds = solvedIds(conclusiveBaseRows);
  const baseResidualIds = conclusiveBaseRows.filter(row => !isSolvedRow(row)).map(rowId).filter(Boolean).sort();
  const baseUnknownIds = baseRows.filter(row => !isConclusiveRow(row)).map(rowId).filter(Boolean).sort();
  const baseSolvedSet = new Set(baseSolvedIds);
  const baseResidualSet = new Set(baseResidualIds);

  const normalizedCandidates = candidates.map(candidate => {
    if (!candidate?.id) throw new Error('Every capability-memory candidate needs an id');
    const metadata = {
      id: candidate.id,
      disposition: candidate.disposition ?? null,
      evidenceRole: candidate.evidenceRole ?? 'development',
      mechanismFamily: candidate.mechanismFamily ?? null,
      sourceReport: candidate.sourceReport ?? candidate.path ?? null,
      notes: candidate.notes ?? null,
    };

    if (candidate.rows) {
      const comparison = compareCandidateRows(baseRows, reportRows(candidate.rows));
      return {
        ...metadata,
        sourceMode: 'row-report',
        ...comparison,
        currentResidualConfirmedGains: comparison.gains,
        currentResidualConfirmedGainIds: comparison.gainIds,
        currentResidualNominationIds: comparison.gainIds,
      };
    }
    if (candidate.signature) {
      return { ...metadata, ...normalizeSignature(candidate, baseSolvedSet, baseResidualSet) };
    }
    throw new Error(`Candidate ${candidate.id} needs rows or signature`);
  });

  const nominationSets = new Map(normalizedCandidates.map(candidate => [candidate.id, new Set(candidate.currentResidualNominationIds)]));
  for (const candidate of normalizedCandidates) {
    const own = nominationSets.get(candidate.id);
    const others = new Set();
    for (const [id, values] of nominationSets) {
      if (id === candidate.id) continue;
      for (const value of values) others.add(value);
    }
    candidate.uniqueCurrentResidualNominationIds = sorted(new Set([...own].filter(id => !others.has(id))));
    candidate.uniqueCurrentResidualNominations = candidate.uniqueCurrentResidualNominationIds.length;
  }

  const pairwise = [];
  for (let i = 0; i < normalizedCandidates.length; i++) {
    for (let j = i + 1; j < normalizedCandidates.length; j++) {
      const a = normalizedCandidates[i];
      const b = normalizedCandidates[j];
      const setA = nominationSets.get(a.id);
      const setB = nominationSets.get(b.id);
      const intersection = setIntersection(setA, setB);
      const union = setUnion(setA, setB);
      pairwise.push({
        a: a.id,
        b: b.id,
        overlap: intersection.size,
        union: union.size,
        jaccard: union.size ? intersection.size / union.size : null,
        overlapIds: sorted(intersection),
      });
    }
  }

  const uncovered = new Set(baseResidualSet);
  const remaining = new Set(normalizedCandidates.map(candidate => candidate.id));
  const greedyResidualCoverage = [];
  const covered = new Set();
  while (remaining.size) {
    let best = null;
    for (const id of remaining) {
      const candidate = normalizedCandidates.find(item => item.id === id);
      const values = nominationSets.get(id);
      const marginalIds = sorted(new Set([...values].filter(value => uncovered.has(value))));
      const cost = candidate.costOnCurrentResidualObserved?.workSpent ?? Number.POSITIVE_INFINITY;
      if (!best || marginalIds.length > best.marginalIds.length || (marginalIds.length === best.marginalIds.length && cost < best.cost)) {
        best = { candidate, marginalIds, cost };
      }
    }
    if (!best || best.marginalIds.length === 0) break;
    remaining.delete(best.candidate.id);
    for (const id of best.marginalIds) {
      uncovered.delete(id);
      covered.add(id);
    }
    greedyResidualCoverage.push({
      rank: greedyResidualCoverage.length + 1,
      candidateId: best.candidate.id,
      sourceMode: best.candidate.sourceMode,
      marginalNominations: best.marginalIds.length,
      marginalIds: best.marginalIds,
      cumulativeNominations: covered.size,
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    interpretation: {
      productionBoundary: 'Offline only. Exact-level historical/candidate outcomes are forbidden runtime steering inputs.',
      historicalSignatures: 'Nomination evidence only until reconciled/rerun under current code, population, and budget semantics.',
      rowReports: 'Gain/loss comparisons are valid only for actually observed, conclusive baseline and candidate rows.',
    },
    baseline: {
      id: baselineId,
      population: basePopulationIds.length,
      conclusive: conclusiveBaseRows.length,
      solved: baseSolvedIds.length,
      residual: baseResidualIds.length,
      unknown: baseUnknownIds.length,
      populationIdHash: hashIds(basePopulationIds),
      solvedIdHash: hashIds(baseSolvedIds),
      unknownIdHash: hashIds(baseUnknownIds),
    },
    candidates: normalizedCandidates,
    pairwiseCurrentResidualNominationOverlap: pairwise,
    greedyCurrentResidualNominationCoverage: greedyResidualCoverage,
    union: {
      residual: baseResidualSet.size,
      nominated: covered.size,
      nominationCoverage: baseResidualSet.size ? covered.size / baseResidualSet.size : null,
      nominatedIds: sorted(covered),
      unnominatedIds: sorted(uncovered),
    },
  };
}
