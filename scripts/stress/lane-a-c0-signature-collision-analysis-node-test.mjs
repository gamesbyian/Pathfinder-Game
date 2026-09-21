import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { historicalLaneACutSignatureFromCaseId, laneACutSignature } from './lane-a-cut-identity-lib.mjs';

assert.equal(
    laneACutSignature({}, { source: { cutSignature: 'R00001:1,2' } }),
    'R00001:1,2',
);
assert.throws(
    () => laneACutSignature({ caseId: 'R00001:1,2::frontier-1' }, {}),
    /historical case-id decoding is disabled/,
);
assert.equal(
    laneACutSignature(
        { caseId: 'R00001:1,2::frontier-1' },
        {},
        { allowHistoricalCaseId: true },
    ),
    'R00001:1,2',
);
assert.equal(
    historicalLaneACutSignatureFromCaseId('R00002:3,4::frontier-9'),
    'R00002:3,4',
);
assert.throws(
    () => historicalLaneACutSignatureFromCaseId('frontier-without-delimiter'),
    /no cut-signature delimiter/,
);

const rows = [
    { caseId: 'R00001:1,2::R00001:frontier-1', levelId: 'R00001', referenceLabel: 'live' },
    { caseId: 'R00001:1,2::R00001:frontier-2', levelId: 'R00001', referenceLabel: 'dead' },
    { caseId: 'R00002:3,4::R00002:frontier-1', levelId: 'R00002', referenceLabel: 'dead' },
    { caseId: 'R00003:5,6::R00003:frontier-1', levelId: 'R00003', referenceLabel: 'timeout/abstain' },
];
const cases = {
    corpus: 'fixture.json',
    cases: [
        { id: rows[0].caseId, levelId: 'R00001', prefix: [10, 11], source: { cutSignature: 'R00001:1,2', interfaceTarget: 'goal', interfaceTargetKey: 90 } },
        { id: rows[1].caseId, levelId: 'R00001', prefix: [12, 11], source: { cutSignature: 'R00001:1,2', interfaceTarget: 'goal', interfaceTargetKey: 90 } },
        { id: rows[2].caseId, levelId: 'R00002', prefix: [20, 21], source: { cutSignature: 'R00002:3,4', interfaceTarget: 'goal', interfaceTargetKey: 91 } },
        { id: rows[3].caseId, levelId: 'R00003', prefix: [30, 31], source: { cutSignature: 'R00003:5,6', interfaceTarget: 'goal', interfaceTargetKey: 92 } },
    ],
};
const geometry = {
    levels: [
        { id: 'R00001', interfaces: [{ target: 'goal', targetKey: 90, cutCells: [1, 2], gateSideCells: [10, 11, 12], remainderSideCells: [13] }] },
        { id: 'R00002', interfaces: [{ target: 'goal', targetKey: 91, cutCells: [3, 4], gateSideCells: [20], remainderSideCells: [21] }] },
        { id: 'R00003', interfaces: [{ target: 'goal', targetKey: 92, cutCells: [5, 6], gateSideCells: [30], remainderSideCells: [31] }] },
    ],
};

const dir = mkdtempSync(path.join(tmpdir(), 'lane-a-sig-collision-test-'));
try {
    const inFile = path.join(dir, 'combined.json');
    const casesFile = path.join(dir, 'cases.json');
    const geometryFile = path.join(dir, 'geometry.json');
    const outFile = path.join(dir, 'analysis.json');
    writeFileSync(inFile, JSON.stringify({ rows }));
    writeFileSync(casesFile, JSON.stringify(cases));
    writeFileSync(geometryFile, JSON.stringify(geometry));

    const stdout = execFileSync('node', [
        path.resolve(import.meta.dirname, 'lane-a-c0-signature-collision-analysis.mjs'),
        `--in=${inFile}`,
        `--cases=${casesFile}`,
        `--geometry=${geometryFile}`,
        `--out=${outFile}`,
    ], { encoding: 'utf8' });

    const printed = JSON.parse(stdout);
    assert.equal(printed.totalRows, 4);
    assert.equal(printed.decisiveRows, 3);
    assert.equal(printed.abstainRows, 1);
    assert.equal(printed.abstainRate, 0.25);
    assert.equal(printed.distinctSignatures, 2);
    assert.equal(printed.multiMemberGroups, 1);
    assert.equal(printed.mixedGroups, 1);
    assert.deepEqual(printed.endpointSideCounts, { gate: 2, remainder: 1, cut: 0 });

    const written = JSON.parse(readFileSync(outFile, 'utf8'));
    assert.equal(written.kind, 'lane-a-c0-signature-collision-analysis');
    assert.match(written.signatureDefinition, /side\/region/u);
    const mixedGroup = written.groups.find(group => group.mixed);
    assert.equal(mixedGroup.signature, JSON.stringify(['R00001:1,2', 'gate']));
    assert.deepEqual(mixedGroup.labels, ['dead', 'live']);
} finally {
    rmSync(dir, { recursive: true, force: true });
}

console.log('lane-a c0 signature-collision analysis tests passed');
