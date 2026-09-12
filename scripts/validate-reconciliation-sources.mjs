#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { stableHash } from './solver-experiment-contract.mjs';

export function validateReconciliationSources(sources) {
  if (!sources.length) throw new Error('no source manifests supplied');
  const normalized = sources.map(({ runId, manifest }) => {
    const resolvedSha = manifest?.experiment?.resolvedSha ?? manifest?.sha ?? null;
    const configurationHash = manifest?.experiment?.configurationHash ?? manifest?.configurationHash ?? null;
    if (!resolvedSha) throw new Error(`source run ${runId} has no actual resolved SHA`);
    if (!configurationHash) throw new Error(`source run ${runId} has no configuration hash`);
    return { runId: String(runId), runAttempt: manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt ?? null,
      resolvedSha, configurationHash, populationIdentityHash: manifest?.population?.identityHash ?? manifest?.populationIdentityHash ?? null };
  });
  for (const field of ['resolvedSha', 'configurationHash']) {
    if (new Set(normalized.map(source => source[field])).size !== 1) throw new Error(`source runs disagree on ${field}`);
  }
  return { sources: normalized, resolvedSha: normalized[0].resolvedSha, configurationHash: normalized[0].configurationHash,
    sourceSetHash: stableHash(normalized) };
}

function main() {
  const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=')]; }));
  const root = args.get('sources-dir'); const out = args.get('out');
  if (!root || !out) throw new Error('--sources-dir=<dir> and --out=<file> are required');
  const sources = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const manifestPath = path.join(root, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error(`source run ${entry.name} has no manifest.json`);
    return { runId: entry.name, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
  });
  const result = validateReconciliationSources(sources);
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Validated ${sources.length} compatible source run manifests (${result.sourceSetHash}).`);
}

if (process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`) {
  try { main(); } catch (error) { console.error(`validate-reconciliation-sources: ${error.message}`); process.exit(2); }
}
