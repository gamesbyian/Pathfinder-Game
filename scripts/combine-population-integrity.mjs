#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { encodeResearchScopedIdentity, hashResearchPopulation as hashPopulation } from './research-population-identity-lib.mjs';
import { normalizeResearchPopulationIntegrity } from './research-observation-integrity-lib.mjs';

export const encodeScopedPopulationIdentity = encodeResearchScopedIdentity;

export function combinePopulationIntegrity(inputs, { kind = 'multi-population', identityBasis = 'population-label-and-subject-id' } = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error('at least one labeled integrity input is required');
  const labels = new Set();
  const normalizedInputs = inputs.map(input => {
    if (!input?.label || labels.has(input.label)) throw new Error(`population labels must be non-empty and unique: ${input?.label ?? ''}`);
    labels.add(input.label);
    const integrity = normalizeResearchPopulationIntegrity(input.integrity, { requireExpectedIds: true });
    if (!input.integrity?.outcomes || typeof input.integrity.outcomes !== 'object') throw new Error(`${input.label}: integrity record lacks outcomes`);
    return { ...input, integrity };
  });
  const expectedIds = normalizedInputs.flatMap(({ label, integrity }) => integrity.expectedIds.map(id => `${label}:${id}`));
  const canonicalExpectedIds = normalizedInputs.flatMap(({ label, integrity }) =>
    integrity.expectedIds.map(id => encodeScopedPopulationIdentity(String(label), String(id))));
  const outcomeKeys = [...new Set(normalizedInputs.flatMap(({ integrity }) => Object.keys(integrity.outcomes)))].sort();
  const coverageComplete = normalizedInputs.every(({ integrity }) => integrity.coverageComplete === true);
  // Fresh decision authority is explicit and non-inferable. A combined population must not
  // re-upgrade a legacy component merely because its older coverage/outcome shape looks clean.
  const decisionValidComplete = normalizedInputs.every(({ integrity }) => integrity.decisionValidComplete === true);
  return {
    coverageComplete,
    decisionValidComplete,
    expectedCount: normalizedInputs.reduce((sum, { integrity }) => sum + integrity.expectedCount, 0),
    observedCount: normalizedInputs.reduce((sum, { integrity }) => sum + integrity.observedCount, 0),
    duplicateIds: normalizedInputs.flatMap(({ label, integrity }) => integrity.duplicateIds.map(id => `${label}:${id}`)),
    unexpectedIds: normalizedInputs.flatMap(({ label, integrity }) => integrity.unexpectedIds.map(id => `${label}:${id}`)),
    missingIds: normalizedInputs.flatMap(({ label, integrity }) => integrity.missingIds.map(id => `${label}:${id}`)),
    canonicalDuplicateIds: normalizedInputs.flatMap(({ label, integrity }) =>
      integrity.duplicateIds.map(id => encodeScopedPopulationIdentity(String(label), String(id)))),
    canonicalUnexpectedIds: normalizedInputs.flatMap(({ label, integrity }) =>
      integrity.unexpectedIds.map(id => encodeScopedPopulationIdentity(String(label), String(id)))),
    canonicalMissingIds: normalizedInputs.flatMap(({ label, integrity }) =>
      integrity.missingIds.map(id => encodeScopedPopulationIdentity(String(label), String(id)))),
    expectedIds,
    canonicalExpectedIds,
    identityCodec: 'json-tuple-v1',
    identityFields: {
      canonical: 'canonicalExpectedIds/canonicalDuplicateIds/canonicalUnexpectedIds/canonicalMissingIds',
      legacyDisplayOnly: 'expectedIds/duplicateIds/unexpectedIds/missingIds',
    },
    outcomes: Object.fromEntries(outcomeKeys.map(key => [key, normalizedInputs.reduce((sum, { integrity }) => sum + (integrity.outcomes[key] ?? 0), 0)])),
    populationIdentityHash: hashPopulation({ kind, identityBasis, identityCodec: 'json-tuple-v1', identities: canonicalExpectedIds }).identityHash,
    components: normalizedInputs.map(({ label, integrity }) => ({
      label,
      populationIdentityHash: integrity.populationIdentityHash ?? null,
      expectedCount: integrity.expectedCount,
      observedCount: integrity.observedCount,
      coverageComplete: integrity.coverageComplete,
      decisionValidComplete: integrity.decisionValidComplete,
    })),
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
  console.log(`Combined ${inputs.length} integrity records: ${combined.observedCount}/${combined.expectedCount} observed; coverageComplete=${combined.coverageComplete}; decisionValidComplete=${combined.decisionValidComplete}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`combine-population-integrity: ${error.message}`); process.exit(2); }
}
