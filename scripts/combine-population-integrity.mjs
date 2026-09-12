#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { hashPopulation } from './solver-experiment-contract.mjs';

export function combinePopulationIntegrity(inputs, { kind = 'multi-population', identityBasis = 'population-label-and-subject-id' } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('at least one labeled integrity input is required');
  const labels = new Set();
  for (const input of inputs) {
    if (!input?.label || labels.has(input.label)) throw new Error(`population labels must be non-empty and unique: ${input?.label ?? ''}`);
    labels.add(input.label);
    if (!Array.isArray(input.integrity?.expectedIds)) throw new Error(`${input.label}: integrity record lacks expectedIds`);
    if (!input.integrity?.outcomes || typeof input.integrity.outcomes !== 'object') throw new Error(`${input.label}: integrity record lacks outcomes`);
  }
  const expectedIds = inputs.flatMap(({ label, integrity }) => integrity.expectedIds.map(id => `${label}:${id}`));
  const outcomeKeys = [...new Set(inputs.flatMap(({ integrity }) => Object.keys(integrity.outcomes)))].sort();
  return {
    complete: inputs.every(({ integrity }) => integrity.complete === true),
    expectedCount: inputs.reduce((sum, { integrity }) => sum + integrity.expectedCount, 0),
    observedCount: inputs.reduce((sum, { integrity }) => sum + integrity.observedCount, 0),
    duplicateIds: inputs.flatMap(({ label, integrity }) => integrity.duplicateIds.map(id => `${label}:${id}`)),
    unexpectedIds: inputs.flatMap(({ label, integrity }) => integrity.unexpectedIds.map(id => `${label}:${id}`)),
    missingIds: inputs.flatMap(({ label, integrity }) => integrity.missingIds.map(id => `${label}:${id}`)),
    expectedIds,
    outcomes: Object.fromEntries(outcomeKeys.map(key => [key, inputs.reduce((sum, { integrity }) => sum + (integrity.outcomes[key] ?? 0), 0)])),
    populationIdentityHash: hashPopulation({ kind, identityBasis, identities: expectedIds }).identityHash,
    components: inputs.map(({ label, integrity }) => ({ label, populationIdentityHash: integrity.populationIdentityHash ?? null,
      expectedCount: integrity.expectedCount, observedCount: integrity.observedCount, complete: integrity.complete })),
  };
}

function main() {
  const args = process.argv.slice(2);
  const inputArgs = args.filter(arg => arg.startsWith('--input=')).map(arg => arg.slice('--input='.length));
  const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
  const out = value('out');
  if (!out || inputArgs.length === 0) throw new Error('usage: --input=<label>:<file> [...] --out=<file> [--kind=<kind>] [--identity-basis=<basis>]');
  const inputs = inputArgs.map(spec => {
    const separator = spec.indexOf(':');
    if (separator <= 0) throw new Error(`invalid --input=${spec}; expected <label>:<file>`);
    const label = spec.slice(0, separator);
    const file = spec.slice(separator + 1);
    return { label, integrity: JSON.parse(fs.readFileSync(file, 'utf8')) };
  });
  const combined = combinePopulationIntegrity(inputs, {
    kind: value('kind') ?? 'multi-population',
    identityBasis: value('identity-basis') ?? 'population-label-and-subject-id',
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(combined, null, 2)}\n`);
  console.log(`Combined ${inputs.length} integrity records: ${combined.observedCount}/${combined.expectedCount} observed; complete=${combined.complete}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`combine-population-integrity: ${error.message}`); process.exit(2); }
}
