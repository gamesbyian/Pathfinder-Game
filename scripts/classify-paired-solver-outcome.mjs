#!/usr/bin/env node
import fs from 'node:fs';
import { writeResearchWorkflowOutcome } from './research-workflow-outcome.mjs';

export function classifyPairedSolverOutcome(control, treatment, gate) {
  const idOf = row => row?.id ?? String(row?.level);
  const controlSolved = new Set(control.filter(row => row?.ok).map(idOf));
  const treatmentSolved = new Set(treatment.filter(row => row?.ok).map(idOf));
  const gained = [...treatmentSolved].filter(id => !controlSolved.has(id)).sort();
  const lost = [...controlSolved].filter(id => !treatmentSolved.has(id)).sort();
  const workOf = rows => rows.reduce((total, row) => total + (Number(row?.workSpent) || 0), 0);
  const controlWork = workOf(control);
  const treatmentWork = workOf(treatment);
  const workDeltaPct = controlWork === 0 ? (treatmentWork === 0 ? 0 : Infinity) : 100 * (treatmentWork - controlWork) / controlWork;
  const positive = gained.length >= gate.minGains
    && lost.length <= gate.maxLosses
    && (gate.maxWorkDeltaPct === null || workDeltaPct <= gate.maxWorkDeltaPct);
  const printableWorkDelta = Number.isFinite(workDeltaPct) ? workDeltaPct.toFixed(2) : String(workDeltaPct);
  return {
    controlSolved: controlSolved.size,
    treatmentSolved: treatmentSolved.size,
    gained,
    lost,
    controlWork,
    treatmentWork,
    workDeltaPct,
    researchOutcome: {
      outcome: positive ? 'completed-positive' : 'completed-negative',
      reason: `Observed gains=${gained.length}, losses=${lost.length}, workDeltaPct=${printableWorkDelta}; frozen gate minGains=${gate.minGains}, maxLosses=${gate.maxLosses}, maxWorkDeltaPct=${gate.maxWorkDeltaPct ?? 'none'} was ${positive ? 'met' : 'not met'}.`,
    },
  };
}

function nonnegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => { const [key, ...parts] = arg.slice(2).split('='); return [key, parts.join('=')]; }));
  try {
    const controlFile = args.get('--control');
    const treatmentFile = args.get('--treatment');
    const out = args.get('--outcome-out');
    if (!controlFile || !treatmentFile || !out) throw new Error('--control, --treatment, and --outcome-out are required');
    const maxWorkText = args.get('--max-work-delta-pct') ?? '';
    const maxWorkDeltaPct = maxWorkText === '' ? null : Number(maxWorkText);
    if (maxWorkDeltaPct !== null && !Number.isFinite(maxWorkDeltaPct)) throw new Error('max-work-delta-pct must be finite or blank');
    const gate = {
      minGains: nonnegativeInteger(args.get('--min-gains'), 'min-gains'),
      maxLosses: nonnegativeInteger(args.get('--max-losses'), 'max-losses'),
      maxWorkDeltaPct,
    };
    const control = JSON.parse(fs.readFileSync(controlFile, 'utf8')).levels ?? [];
    const treatment = JSON.parse(fs.readFileSync(treatmentFile, 'utf8')).levels ?? [];
    const result = classifyPairedSolverOutcome(control, treatment, gate);
    writeResearchWorkflowOutcome(out, result.researchOutcome);
    console.log(`control solved: ${result.controlSolved}/${control.length}, work=${result.controlWork}`);
    console.log(`treatment solved: ${result.treatmentSolved}/${treatment.length}, work=${result.treatmentWork} (${Number.isFinite(result.workDeltaPct) ? result.workDeltaPct.toFixed(2) : result.workDeltaPct}% vs control)`);
    console.log(`gained (${result.gained.length}): ${result.gained.join(',')}`);
    console.log(`lost (${result.lost.length}): ${result.lost.join(',')}`);
    console.log(`${result.researchOutcome.outcome}: ${result.researchOutcome.reason}`);
  } catch (error) {
    console.error(`classify-paired-solver-outcome: ${error.message}`);
    process.exit(2);
  }
}
