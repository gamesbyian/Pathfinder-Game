import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'search-loss-pipeline-'));
try {
    const decisions = path.join(temp, 'decisions.json');
    const metadata = path.join(temp, 'metadata.json');
    const captureFile = path.join(temp, 'capture.json');
    fs.writeFileSync(decisions, JSON.stringify({ records: [0, 1, 2].map(i => ({
        decisionId: `d-${i}`, parentId: i === 2 ? 'B' : 'A', stageId: 'score-width-culled',
        candidateIds: ['[1,2]', '[1,3]'], orderedCandidateIds: ['[1,2]', '[1,3]'], retainedCandidateIds: ['[1,2]'],
        workSpentBefore: 10 + i, workSpentAfter: 10 + i, context: { depth: i, nodeProgress: i },
    })) }));
    const hash = char => `sha256:${char.repeat(64)}`;
    fs.writeFileSync(metadata, JSON.stringify({
        run: { runId: 'run-1', solverRef: 'beam-v3', resolvedSha: 'a'.repeat(40), producer: 'fixture', protocolHash: hash('b'), configurationHash: hash('c'), levelBlind: true },
        population: { source: 'fixture-population', populationIdentity: hash('d') },
        captureProfileId: 'bounded-cull-v1', observerParityVerified: true,
        levelRevisions: { A: 'v1:A', B: 'v1:B' },
        parentOutcomes: { A: false, B: true },
    }));
    execFileSync('node', ['scripts/capture-search-loss-evidence.mjs', `--in=${decisions}`, `--metadata=${metadata}`, '--selector-limit=2', `--out=${captureFile}`]);
    const capture = JSON.parse(fs.readFileSync(captureFile));
    assert.equal(capture.capture.selectorSummaries['score-width-cull'].observed, 3);
    assert.equal(capture.capture.selectorSummaries['score-width-cull'].retained, 2);
    assert.equal(capture.capture.selectorSummaries['score-width-cull'].truncated, true);
    assert.equal(capture.capsules.length, 2);
    assert.ok(capture.capsules.every(row => row.replayBasis === 'replayable'));

    const exact = path.join(temp, 'exact.json');
    const annotation = path.join(temp, 'annotation.json');
    fs.writeFileSync(exact, JSON.stringify({ results: [
        { capsuleId: capture.capsules[0].capsuleId, value: 'LIVE', cost: { work: 12 }, refereeValid: true },
        { capsuleId: capture.capsules[1].capsuleId, status: 'timeout' },
    ] }));
    execFileSync('node', ['scripts/annotate-search-loss-exact.mjs', `--capture=${captureFile}`, `--results=${exact}`, '--model=fixture-exact', `--out=${annotation}`]);
    const annotated = JSON.parse(fs.readFileSync(annotation));
    assert.deepEqual(annotated.annotations.map(row => row.value).sort(), ['LIVE', 'UNKNOWN']);
    assert.equal(annotated.populationIdentity, capture.population.populationIdentity);
    const queried = JSON.parse(execFileSync('node', ['scripts/search-loss-query.mjs', `--in=${captureFile},${annotation}`, '--exact=LIVE'], { encoding: 'utf8' }));
    assert.equal(queried.rows.length, 1);
    assert.equal(queried.summary.independentParents, 1, 'prevalence denominator is parents, not raw capsule count');
    const bad = path.join(temp, 'bad.json');
    fs.writeFileSync(bad, JSON.stringify([{ capsuleId: hash('f'), value: 'DEAD' }]));
    assert.throws(() => execFileSync('node', ['scripts/annotate-search-loss-exact.mjs', `--capture=${captureFile}`, `--results=${bad}`, '--model=x', `--out=${annotation}`]));
    console.log('search-loss pipeline tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
