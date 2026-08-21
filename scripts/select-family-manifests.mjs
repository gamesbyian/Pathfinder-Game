#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [resultsFile, policyFile, outputFile] = process.argv.slice(2);
if (!resultsFile || !policyFile || !outputFile) {
    console.error('Usage: select-family-manifests.mjs <selected-results.json> <selection-policy.json> <output.json>');
    process.exit(2);
}
const results = JSON.parse(readFileSync(resultsFile, 'utf8')).levels;
const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
const observed = new Set(results.map(row => `${row.parentCorpus}\u0000${row.parentId}\u0000${row.variantId}`));
const candidates = [];
for (const file of execFileSync('git', ['ls-files', 'data/families'], { encoding:'utf8' }).trim().split('\n')) {
    if (!file.endsWith('manifest.json')) continue;
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    if (Array.isArray(manifest)) continue;
    const parentId = String(manifest.parentLevelId ?? manifest.parentId);
    const edges = (manifest.variants ?? []).map(variant =>
        `${manifest.parentCorpus}\u0000${parentId}\u0000${variant.variantId ?? variant.id}`);
    if (edges.some(edge => observed.has(edge))) candidates.push({ file, manifest, edgeSet:[...edges].sort().join('\n') });
}
const groups = new Map();
for (const candidate of candidates) {
    const values = groups.get(candidate.edgeSet) ?? [];
    values.push(candidate);
    groups.set(candidate.edgeSet, values);
}
const selected = [], excluded = [];
for (const values of groups.values()) {
    if (values.length === 1) { selected.push(values[0]); continue; }
    const parentId = String(values[0].manifest.parentLevelId ?? values[0].manifest.parentId);
    const rules = (policy.manifestOverrides ?? []).filter(rule => String(rule.parentId) === parentId);
    if (rules.length !== 1) throw new Error(`${parentId}: expected one manifest override, found ${rules.length}`);
    const winner = values.find(value => value.file === rules[0].preferredManifest);
    if (!winner) throw new Error(`${parentId}: preferred manifest not among duplicate candidates`);
    selected.push(winner);
    excluded.push(...values.filter(value => value !== winner).map(value => ({ file:value.file, reason:rules[0].reason })));
}
selected.sort((a,b) => a.file.localeCompare(b.file));
writeFileSync(outputFile, `${JSON.stringify({ schemaVersion:1, selectionPolicy:policy.viewId,
    summary:{ selectedFamilies:selected.length, excludedDuplicateManifests:excluded.length },
    sources:selected.map(value => value.file), excluded, manifests:selected.map(value => value.manifest) })}\n`);
console.log(`Selected ${selected.length} observed family manifests -> ${outputFile}`);
