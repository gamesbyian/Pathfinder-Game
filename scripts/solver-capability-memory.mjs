#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { buildCapabilityMemory } from './solver-capability-memory-lib.mjs';

function parseArgs(argv) {
  return new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...rest] = arg.slice(2).split('=');
    return [key, rest.join('=')];
  }));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function resolveFromManifest(manifestFile, value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.resolve(path.dirname(manifestFile), value);
}

export function buildFromManifest(manifest, manifestFile = path.resolve('capability-memory-manifest.json')) {
  if (manifest?.schemaVersion !== 1) throw new Error(`Unsupported manifest schemaVersion: ${manifest?.schemaVersion}`);
  if (!manifest?.baseline?.path) throw new Error('Manifest baseline.path is required');
  if (!Array.isArray(manifest?.candidates) || manifest.candidates.length === 0) throw new Error('Manifest candidates[] must be non-empty');

  const baselinePath = resolveFromManifest(manifestFile, manifest.baseline.path);
  const baseline = readJson(baselinePath);
  const candidates = manifest.candidates.map(candidate => {
    if (!candidate?.id) throw new Error('Every manifest candidate needs id');
    if (candidate.path && candidate.signature) throw new Error(`Candidate ${candidate.id} cannot specify both path and signature`);
    if (candidate.path) {
      return {
        ...candidate,
        path: resolveFromManifest(manifestFile, candidate.path),
        rows: readJson(resolveFromManifest(manifestFile, candidate.path)),
      };
    }
    if (candidate.signature) return candidate;
    throw new Error(`Candidate ${candidate.id} needs path or signature`);
  });

  return buildCapabilityMemory({
    baselineId: manifest.baseline.id ?? path.basename(baselinePath),
    baselineRows: baseline,
    candidates,
  });
}

function renderSummary(result) {
  const lines = [];
  lines.push('# Solver capability-memory summary');
  lines.push('');
  lines.push(`Baseline: ${result.baseline.id}; solved ${result.baseline.solved}/${result.baseline.population}; residual ${result.baseline.residual}.`);
  lines.push('');
  lines.push('| Candidate | Mode | Disposition | Current residual nominations | Confirmed current-baseline gains | Unique nominations | Losses | Residual work/gain |');
  lines.push('|---|---|---|---:|---:|---:|---:|---:|');
  for (const candidate of result.candidates) {
    const nominations = candidate.currentResidualNominationIds?.length ?? 0;
    const confirmed = candidate.currentResidualConfirmedGains ?? 0;
    const losses = candidate.losses ?? candidate.demonstratedLosses ?? 0;
    const workPerGain = candidate.workPerGainOnObservedResidual == null ? 'n/a' : candidate.workPerGainOnObservedResidual.toFixed(0);
    lines.push(`| ${candidate.id} | ${candidate.sourceMode} | ${candidate.disposition ?? ''} | ${nominations} | ${confirmed} | ${candidate.uniqueCurrentResidualNominations ?? 0} | ${losses} | ${workPerGain} |`);
  }
  lines.push('');
  lines.push(`Union of current-residual nominations: ${result.union.nominated}/${result.union.residual} (${result.union.nominationCoverage == null ? 'n/a' : `${(100 * result.union.nominationCoverage).toFixed(1)}%`}).`);
  lines.push('');
  lines.push('Interpretation: historical-signature rows are nomination evidence only. They must not be treated as current capability or used for exact-level runtime routing.');
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestArg = args.get('manifest');
  if (!manifestArg) {
    console.error('Usage: node scripts/solver-capability-memory.mjs --manifest=<manifest.json> [--out=<result.json>] [--summary-out=<summary.md>]');
    process.exit(2);
  }
  const manifestFile = path.resolve(manifestArg);
  const result = buildFromManifest(readJson(manifestFile), manifestFile);
  const out = args.get('out');
  const summaryOut = args.get('summary-out');
  if (out) {
    const file = path.resolve(out);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (summaryOut) {
    const file = path.resolve(summaryOut);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, renderSummary(result));
  }
  if (!out && !summaryOut) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(`solver-capability-memory: ${error.message}`); process.exit(2); }
}
