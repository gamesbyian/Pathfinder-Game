#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const output = process.argv[2] ?? 'reports/experiments/2026-08-13-technique-tuning/ett-021-family-input-audit.json';
const lines = value => value.split('\n').map(row => row.trim()).filter(Boolean);
const tracked = lines(execFileSync('git', ['ls-files'], { encoding:'utf8' }));
// This repository's path history is much larger than execFileSync's 1 MiB default buffer.
const history = lines(execFileSync('git', ['log', '--all', '--name-only', '--pretty=format:'],
    { encoding:'utf8', maxBuffer:64 * 1024 * 1024 }));
const unique = values => [...new Set(values)].sort();
const isWideAttemptCandidate = file => /(?:wide.*(?:attempt|variant|result)|(?:attempt|variant|result).*wide).*\.json$/iu.test(file);
const familyManifests = tracked.filter(file => /^data\/families\/.*manifest\.json$/u.test(file));
const trackedWideAttemptCandidates = tracked.filter(isWideAttemptCandidate);
const historicalWideAttemptCandidates = unique(history.filter(isWideAttemptCandidate));
const familyResultDocuments = [];
for (const file of tracked.filter(path => /^(?:reports|logs)\/.*\.json$/u.test(path))) {
    let document;
    try { document = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const rows = Array.isArray(document) ? document
        : ['levels','results','attempts'].map(key => document?.[key]).find(Array.isArray) ?? [];
    const familyRows = rows.filter(row => /^F\d+/u.test(String(row?.variantId ?? row?.id ?? '')));
    if (!familyRows.length) continue;
    const fullyNamespacedRows = familyRows.filter(row => row.parentCorpus != null && row.parentId != null &&
        (row.variantId != null || row.id != null)).length;
    const sourceCorpus = document.corpus ?? document.summary?.corpus ?? null;
    familyResultDocuments.push({ file, familyRows:familyRows.length, fullyNamespacedRows,
        generatedAt:document.generatedAt ?? document.summary?.generatedAt ?? null,
        commit:document.commit ?? document.summary?.commit ?? null,
        budgetMs:document.budgetMs ?? document.summary?.budgetMs ?? null,
        sourceCorpus, sourceCorpusTracked:sourceCorpus ? tracked.includes(sourceCorpus) : null });
}
const requiredToolInputs = ['manifests','canonical','variants'];
const audit = {
    schemaVersion: 1,
    evidenceClass: 'offline-observational-input-availability',
    generatedAt: new Date().toISOString(),
    repositoryCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim(),
    method: 'tracked-file and all-local-history filename census; no solver invocation',
    familyBoundaryRequiredInputs: requiredToolInputs,
    counts: {
        trackedFiles: tracked.length,
        familyManifestFiles: familyManifests.length,
        trackedWideAttemptCandidates: trackedWideAttemptCandidates.length,
        historicalWideAttemptCandidates: historicalWideAttemptCandidates.length,
        schemaDetectedFamilyResultDocuments: familyResultDocuments.length,
        schemaDetectedFamilyRows: familyResultDocuments.reduce((sum, row) => sum + row.familyRows, 0),
        fullyNamespacedFamilyRows: familyResultDocuments.reduce((sum, row) => sum + row.fullyNamespacedRows, 0),
        documentsWithMissingDeclaredCorpus: familyResultDocuments.filter(row => row.sourceCorpus && !row.sourceCorpusTracked).length,
    },
    familyManifestPathSha256: createHash('sha256').update(familyManifests.join('\n')).digest('hex'),
    trackedWideAttemptCandidates,
    historicalWideAttemptCandidates,
    familyResultDocuments,
    availableCanonicalCandidates: tracked.filter(file => /(?:solver-winning-attempts|baseline).*\.json$/iu.test(file)),
    disposition: familyResultDocuments.some(row => row.fullyNamespacedRows === row.familyRows)
        ? 'candidate inputs exist with complete row identity; inspect corpus coverage before boundary generation'
        : 'blocked on identity/provenance: family result artifacts exist, but none provides complete (parentCorpus,parentId,variantId) identity on every detected row',
    limitations: [
        'Schema census recognizes result rows only when their id/variantId starts with F followed by digits.',
        'Local git history cannot inspect deleted remote-only refs.',
        'Family manifests alone do not contain the wide attempt outcomes required by --variants.',
    ],
};
writeFileSync(output, `${JSON.stringify(audit)}\n`);
console.log(`${audit.disposition}\nWrote ${output}`);
