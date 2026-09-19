import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Synthetic combined result mirroring the real shape: row.caseId is
// `${cutSignature}::${originalCaseId}`, cutSignature has no separate field. Two rows share a cut
// (mixed live/dead -> a real signature-collision group), one cut has a single member (excluded from
// multi-member stats), and one row is timeout/abstain (excluded from the decisive-row analysis but
// counted in the abstain rate).
const rows = [
    { caseId: 'R00001:1,2::R00001:frontier-1', levelId: 'R00001', referenceLabel: 'live' },
    { caseId: 'R00001:1,2::R00001:frontier-2', levelId: 'R00001', referenceLabel: 'dead' },
    { caseId: 'R00002:3,4::R00002:frontier-1', levelId: 'R00002', referenceLabel: 'dead' },
    { caseId: 'R00003:5,6::R00003:frontier-1', levelId: 'R00003', referenceLabel: 'timeout/abstain' },
];

const dir = mkdtempSync(path.join(tmpdir(), 'lane-a-sig-collision-test-'));
try {
    const inFile = path.join(dir, 'combined.json');
    const outFile = path.join(dir, 'analysis.json');
    writeFileSync(inFile, JSON.stringify({ rows }));

    const stdout = execFileSync('node', [
        path.resolve(import.meta.dirname, 'lane-a-c0-signature-collision-analysis.mjs'),
        `--in=${inFile}`,
        `--out=${outFile}`,
    ], { encoding: 'utf8' });

    const printed = JSON.parse(stdout);
    assert.equal(printed.totalRows, 4);
    assert.equal(printed.decisiveRows, 3);
    assert.equal(printed.abstainRows, 1);
    assert.equal(printed.abstainRate, 0.25);
    assert.equal(printed.distinctSignatures, 2, 'two distinct cutSignatures among decisive rows');
    assert.equal(printed.multiMemberGroups, 1, 'only R00001:1,2 has more than one decisive member');
    assert.equal(printed.mixedGroups, 1, 'R00001:1,2 mixes live and dead');

    const written = JSON.parse(readFileSync(outFile, 'utf8'));
    assert.equal(written.kind, 'lane-a-c0-signature-collision-analysis');
    const mixedGroup = written.groups.find(g => g.mixed);
    assert.equal(mixedGroup.signature, 'R00001:1,2');
    assert.deepEqual(mixedGroup.labels, ['dead', 'live']);
} finally {
    rmSync(dir, { recursive: true, force: true });
}

console.log('lane-a c0 signature-collision analysis tests passed');
