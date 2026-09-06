#!/usr/bin/env node
/**
 * Cheap preflight for solver experiments: estimate how many levels can actually demonstrate the
 * proposed effect before paying for a broad A/B.
 *
 * This consumes independent/control-side evidence only. It does NOT use treatment outcomes.
 * Opportunity modes:
 *   rescue       = control failed AND (if --stage is supplied) target stage did real work/nodes.
 *   stage-impact = target stage did real work/nodes, regardless of control solve outcome.
 *   control-fail = every control failure, ignoring stage reach.
 *
 * The sizing output is a value-of-information guide, not a significance calculator. It answers:
 * "At the observed opportunity rate, roughly how many total rows buy K informative rows?" and
 * "How many opportunity rows are needed for a chosen chance of seeing >=1 event if the conditional
 * event rate is p?" A larger representative no-harm population can still be justified separately.
 *
 * Usage:
 *   node scripts/experiment-opportunity-audit.mjs --control=<combined.json>
 *   node scripts/experiment-opportunity-audit.mjs --control=<combined.json> --stage=<stageId> \
 *     --mode=rescue --target-opportunities=20 --proposed-total=500
 *   node scripts/experiment-opportunity-audit.mjs --control=<combined.json> \
 *     --conditional-event-rate=0.10 --detection-probability=0.90
 */
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  return new Map(argv.filter(arg => arg.startsWith('--')).map(arg => {
    const eq = arg.indexOf('=');
    return eq === -1 ? [arg.slice(2), 'true'] : [arg.slice(2, eq), arg.slice(eq + 1)];
  }));
}

function numberOption(value, name, { min = -Infinity, max = Infinity, integer = false } = {}) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${name} must be ${integer ? 'an integer' : 'a number'} in [${min}, ${max}]`);
  }
  return n;
}

export function wilsonInterval(successes, total, z = 1.96) {
  if (!Number.isInteger(successes) || !Number.isInteger(total) || successes < 0 || total < 1 || successes > total) {
    throw new Error('invalid binomial counts');
  }
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const half = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total) / denominator;
  return { low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

export function opportunitySampleSizeForAtLeastOne(eventRate, detectionProbability = 0.8) {
  if (!(eventRate > 0 && eventRate <= 1)) throw new Error('eventRate must be in (0, 1]');
  if (!(detectionProbability > 0 && detectionProbability < 1)) throw new Error('detectionProbability must be in (0, 1)');
  if (eventRate === 1) return 1;
  return Math.ceil(Math.log(1 - detectionProbability) / Math.log(1 - eventRate));
}

function realStageParticipation(row, stageId) {
  return (row?.attempts ?? []).some(attempt => attempt?.stageId === stageId &&
    ((Number(attempt?.workSpent) || 0) > 0 || (Number(attempt?.nodesExpanded) || 0) > 0));
}

export function analyzeOpportunity({
  levels,
  stageId = null,
  mode = 'rescue',
  targetOpportunities = null,
  proposedTotal = null,
  conditionalEventRate = null,
  detectionProbability = 0.8,
}) {
  if (!Array.isArray(levels) || levels.length === 0) throw new Error('control evidence must contain a non-empty levels array');
  if (!['rescue', 'stage-impact', 'control-fail'].includes(mode)) throw new Error(`unsupported opportunity mode ${mode}`);
  if (mode === 'stage-impact' && !stageId) throw new Error('stage-impact mode requires --stage');

  const controlFailed = levels.filter(row => !row?.ok);
  const stageParticipated = stageId ? levels.filter(row => realStageParticipation(row, stageId)) : [];
  let opportunities;
  if (mode === 'control-fail') opportunities = controlFailed;
  else if (mode === 'stage-impact') opportunities = stageParticipated;
  else opportunities = levels.filter(row => !row?.ok && (!stageId || realStageParticipation(row, stageId)));

  const total = levels.length;
  const opportunityCount = opportunities.length;
  const rate = opportunityCount / total;
  const interval = wilsonInterval(opportunityCount, total);
  const warnings = [];
  if (opportunityCount === 0) warnings.push('ZERO_OPPORTUNITY: this evidence shows no rows on which the proposed effect could be observed.');
  if (controlFailed.length / total < 0.05 && (mode === 'rescue' || mode === 'control-fail')) {
    warnings.push(`CEILING: control solves ${(100 * (1 - controlFailed.length / total)).toFixed(1)}%; rescue headroom is under 5%.`);
  }
  if (stageId && stageParticipated.length / total < 0.05) {
    warnings.push(`LOW_PARTICIPATION: ${stageId} does real work on only ${stageParticipated.length}/${total} rows.`);
  }

  let sizing = null;
  if (targetOpportunities != null) {
    const pointTotal = rate > 0 ? Math.ceil(targetOpportunities / rate) : null;
    const conservativeTotal = interval.low > 0 ? Math.ceil(targetOpportunities / interval.low) : null;
    sizing = { targetOpportunities, pointTotal, conservativeTotal };
    if (proposedTotal != null && pointTotal != null) {
      const expectedAtProposed = proposedTotal * rate;
      sizing.proposedTotal = proposedTotal;
      sizing.expectedOpportunitiesAtProposed = expectedAtProposed;
      const reference = conservativeTotal ?? pointTotal;
      if (reference && proposedTotal > 2 * reference) {
        warnings.push(`OVERPROVISIONED: proposed N=${proposedTotal} is >2x the conservative N=${reference} needed for ${targetOpportunities} opportunity rows. State the separate no-harm/precision/generalization reason or reduce N.`);
      }
      if (expectedAtProposed < targetOpportunities) {
        warnings.push(`UNDERPOWERED_OPPORTUNITY: proposed N=${proposedTotal} yields only about ${expectedAtProposed.toFixed(1)} opportunity rows at the observed rate.`);
      }
    }
  }

  let detection = null;
  if (conditionalEventRate != null) {
    const neededOpportunityRows = opportunitySampleSizeForAtLeastOne(conditionalEventRate, detectionProbability);
    detection = {
      conditionalEventRate,
      detectionProbability,
      opportunityRowsForAtLeastOneEvent: neededOpportunityRows,
      pointTotalRows: rate > 0 ? Math.ceil(neededOpportunityRows / rate) : null,
      conservativeTotalRows: interval.low > 0 ? Math.ceil(neededOpportunityRows / interval.low) : null,
    };
  }

  return {
    mode,
    stageId,
    total,
    controlSolved: total - controlFailed.length,
    controlFailed: controlFailed.length,
    stageParticipated: stageId ? stageParticipated.length : null,
    opportunities: opportunityCount,
    opportunityRate: rate,
    opportunityRateWilson95: interval,
    opportunityIds: opportunities.map(row => row?.id ?? row?.levelId ?? row?.level).filter(Boolean),
    sizing,
    detection,
    warnings,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const controlFile = args.get('control');
  if (!controlFile) throw new Error('--control=<combined control-side report> is required');
  const data = JSON.parse(fs.readFileSync(controlFile, 'utf8'));
  const targetOpportunities = numberOption(args.get('target-opportunities'), '--target-opportunities', { min: 1, integer: true });
  const proposedTotal = numberOption(args.get('proposed-total'), '--proposed-total', { min: 1, integer: true });
  const conditionalEventRate = numberOption(args.get('conditional-event-rate'), '--conditional-event-rate', { min: Number.EPSILON, max: 1 });
  const detectionProbability = numberOption(args.get('detection-probability') ?? '0.8', '--detection-probability', { min: Number.EPSILON, max: 1 - Number.EPSILON });
  const result = analyzeOpportunity({
    levels: data.levels,
    stageId: args.get('stage') || null,
    mode: args.get('mode') || 'rescue',
    targetOpportunities,
    proposedTotal,
    conditionalEventRate,
    detectionProbability,
  });

  console.log(`Opportunity audit: ${result.opportunities}/${result.total} (${(100 * result.opportunityRate).toFixed(2)}%) rows can demonstrate mode=${result.mode}${result.stageId ? ` at stage=${result.stageId}` : ''}.`);
  console.log(`Control: ${result.controlSolved}/${result.total} solved; ${result.controlFailed}/${result.total} failed.`);
  if (result.stageId) console.log(`Real stage participation: ${result.stageParticipated}/${result.total}.`);
  console.log(`Opportunity-rate Wilson 95% interval: ${(100 * result.opportunityRateWilson95.low).toFixed(2)}%..${(100 * result.opportunityRateWilson95.high).toFixed(2)}%.`);
  if (result.sizing) {
    console.log(`For ${result.sizing.targetOpportunities} opportunity rows: point N=${result.sizing.pointTotal ?? 'unbounded'}, conservative N=${result.sizing.conservativeTotal ?? 'unbounded'}.`);
    if (result.sizing.proposedTotal) console.log(`Proposed N=${result.sizing.proposedTotal}: expected opportunity rows ≈${result.sizing.expectedOpportunitiesAtProposed.toFixed(1)}.`);
  }
  if (result.detection) {
    console.log(`If the conditional event rate is ${(100 * result.detection.conditionalEventRate).toFixed(1)}%, ${result.detection.opportunityRowsForAtLeastOneEvent} opportunity rows give ${(100 * result.detection.detectionProbability).toFixed(1)}% chance of >=1 event; total N≈${result.detection.pointTotalRows ?? 'unbounded'} (conservative ${result.detection.conservativeTotalRows ?? 'unbounded'}).`);
  }
  for (const warning of result.warnings) console.log(`WARNING: ${warning}`);
  if (args.get('json') === 'true') console.log(JSON.stringify(result, null, 2));
  if (args.get('check') === 'true' && result.opportunities === 0) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`experiment-opportunity-audit: ${error.message}`); process.exit(2); }
}
