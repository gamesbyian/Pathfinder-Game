#!/usr/bin/env node
import fs from 'node:fs';
import { writeResearchWorkflowOutcome } from './research-workflow-outcome.mjs';

function rowId(row) {
  const value = row?.id ?? row?.levelId ?? row?.level ?? null;
  return value == null ? null : String(value);
}

function assertExactPairedPopulation(control, treatment, integrity) {
  if (!integrity || integrity.coverageComplete !== true || integrity.decisionValidComplete !== true) {
    throw new Error('paired integrity must be coverage-complete and decision-valid before classification');
  }
  if (!Array.isArray(integrity.expectedIds) || !integrity.populationIdentityHash) {
    throw new Error('paired integrity must carry expectedIds and populationIdentityHash');
  }
  if (integrity.expectedCount !== integrity.expectedIds.length
      || integrity.observedCount !== integrity.expectedIds.length) {
    throw new Error('paired integrity counts do not match its exact expectedIds');
  }

  const expected = [...integrity.expectedIds].map(String).sort();
  for (const [label, rows] of [['control', control], ['treatment', treatment]]) {
    const ids = rows.map(rowId);
    if (ids.some(id => id == null)) throw new Error(`${label} result contains a row without an identity`);
    if (new Set(ids).size !== ids.length) throw new Error(`${label} result contains duplicate row identities`);
    const actual = [...ids].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${label} result does not match paired integrity expectedIds`);
    }
  }
}

export function classifyPairedSolverOutcome(control, treatment, gate, integrity) {
  assertExactPairedPopulation(control, treatment, integrity);
  const controlSolved = new Set(control.filter(row => row?.ok).map(rowId));
  const treatmentSolved = new Set(treatment.filter(row => row?.ok).map(rowId));
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
    const controlFile = args.get('control');
    const treatmentFile = args.get('treatment');
    const integrityFile = args.get('integrity');
    const out = args.get('outcome-out');
    if (!controlFile || !treatmentFile || !integrityFile || !out) {
      throw new Error('--control, --treatment, --integrity, and --outcome-out are required');
    }
    const maxWorkText = args.get('max-work-delta-pct') ?? '';
    const maxWorkDeltaPct = maxWorkText === '' ? null : Number(maxWorkText);
    if (maxWorkDeltaPct !== null && !Number.isFinite(maxWorkDeltaPct)) throw new Error('max-work-delta-pct must be finite or blank');
    const gate = {
      minGains: nonnegativeInteger(args.get('min-gains'), 'min-gains'),
      maxLosses: nonnegativeInteger(args.get('max-losses'), 'max-losses'),
      maxWorkDeltaPct,
    };
    const control = JSON.parse(fs.readFileSync(controlFile, 'utf8')).levels ?? [];
    const treatment = JSON.parse(fs.readFileSync(treatmentFile, 'utf8')).levels ?? [];
    const integrity = JSON.parse(fs.readFileSync(integrityFile, 'utf8'));
    const result = classifyPairedSolverOutcome(control, treatment, gate, integrity);
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
