#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, queryResearchStatusIndex } from './research-status-index-lib.mjs';
import { formatResearchCloseoutCapsule } from './investigation-report-metadata.mjs';
import {
    isTerminalResearchQuestionState,
    loadResearchQuestionRegistry,
    normalizeResearchQuestionStatus,
    queryResearchQuestions,
    RESEARCH_QUESTION_STATES,
    researchQuestionLifecycleClass,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'research-status-'));
mkdirSync(path.join(root, 'reports')); mkdirSync(path.join(root, 'docs'));
writeFileSync(path.join(root, 'docs/topic.md'), '# Topic\n');
writeFileSync(path.join(root, 'docs/solver-optimization-workstreams.md'), `# Solver optimization workstreams
## Workstream state
| ID | Workstream | Execution state | State / context | Next gate | Stable question ref |
|---:|---|---|---|---|---|
| 2 | Current question | \`active\` | **ACTIVE** | Run current gate. | \`WS2-CURRENT\` |
`);
writeFileSync(path.join(root, 'docs/solver-opt-in-experiment-ledger.md'), `# Ledger
## Current production-default-OFF flags
| Flag | Promotion state | Disposition / reopen condition |
|---|---|---|
| \`FLAG_ONE\` | \`closed\` | **CLOSED NEGATIVE.** Historical test rejected it. |
| \`FLAG_TWO\` | \`open\` | **OPEN.** Awaiting a bounded promotion test. |
| \`FLAG_THREE\` | \`no-current-gate\` | **RETAINED, NO CURRENT PROMOTION GATE.** Counterfactual only. |
| \`FLAG_FOUR\` | \`not-promotion-candidate\` | **NEW architecture prerequisite, not itself a promotion candidate.** |

## Recently promoted/default-ON mechanisms worth remembering
| Mechanism | Decision evidence ref | Current disposition |
|---|---|---|
| \`PROMOTED_ONE\` + \`PROMOTED_TWO\` | \`reports/2026-08-21-example.md\` | Both default-ON after the fixture decision. |
| \`PROMOTED_HISTORICAL\` | — | Historical default-ON mechanism without a retained primary decision report. |
`);
writeFileSync(path.join(root, 'docs/solver-research-question-relations.json'), JSON.stringify({
    schemaVersion: 1,
    questions: [
        {
            id: 'WS2-CURRENT',
            question: 'Can the current seam solve more levels?',
            owner: 'WS2',
            state: 'active-candidate',
            answeredBy: [],
            result: null,
            implies: ['WS2-FOLLOWUP'],
        },
        {
            id: 'WS2-FOLLOWUP',
            question: 'Did the bounded follow-up close cleanly?',
            owner: 'WS2',
            state: 'closed-tested-form',
            answeredBy: ['reports/2026-08-21-example.md'],
            result: 'Yes.',
            triggeredBy: ['WS2-CURRENT'],
        },
    ],
}, null, 2));
const exampleCloseout = formatResearchCloseoutCapsule({
    status: 'active',
    lastEvidenceDate: '2026-08-21',
    decision: 'Continue measurement.',
    remainingGate: 'Run the held-out corpus.',
    researchQuestion: 'WS2-CURRENT',
    premiseRefs: ['P032', 'P204'],
    measurementOpportunity: 'MO-002',
    evidenceRole: 'confirmation',
    populationIdentity: 'fixture-population',
    selection: 'prespecified',
    inferenceScope: 'fixture-only',
    sourceArtifacts: ['logs/example/run.json'],
});
writeFileSync(path.join(root, 'reports/2026-08-21-example.md'), `# Example investigation

> **Status:** active
> **Last evidence:** 2026-08-21 — Synthetic fixture passed.
> **Decision:** Continue measurement.
> **Remaining gate:** Run the held-out corpus.
> **Research question:** \`WS2-CURRENT\`
> **Premise refs:** \`P032\`, \`P204\`
> **Measurement opportunity:** \`MO-002\`
> **Evidence role:** confirmation
> **Selection:** prespecified
> **Population identity:** fixture-population
> **Selection history:** solver-blind fixture
> **Inference scope:** fixture-only

Authority: [topic](../docs/topic.md). Artifact: \`logs/example/run.json\`.

${exampleCloseout}
`);
writeFileSync(path.join(root, 'reports/2026-08-22-legacy-metadata.md'), `# Legacy structured-status report

> **Status:** concluded-negative
> **Last evidence:** 2026-08-22 — Legacy metadata-only fixture.
> **Decision:** Keep the tested form closed.
> **Remaining gate:** none
`);
writeFileSync(path.join(root, 'reports/2026-01-01-legacy.md'), `# Legacy report without metadata

## Orientation anomaly
Details live here.

## Repair-probe / early-main-loop node starvation
Historical mechanism evidence used the pre-rename stage vocabulary.

## High-intersection-burden cohort
Historical routing evidence used the pre-rename routing label.

## beam:intersectionHarvest@beam5000(diverse) missing exposure
Historical attempt identity appears only in compact pre-rename syntax.

## main-loop|beam:intersectionHarvest@beam5000(diverse) action reach
Historical composite action identity uses both legacy stage and compact attempt syntax.
`);
writeFileSync(path.join(root, 'reports/2026-01-02-decoy.md'), `# Alias decoys

## dfs:general
A scoring-profile string must not be invented by expanding the routing-regime alias default -> general.

## admissible-order-fallback|tieBreak=default|lds=off
A canonical attempt identity must not be rewritten as though its search-family token were a stage id.
`);
const index = buildResearchStatusIndex(root);
assert.equal(index.queue[0].authorityKind, 'workstreams', 'dated evidence cannot override the current workstreams authority');
assert.equal(index.queue[0].executionState, 'active');
assert.equal(index.queue[0].questionRef, 'WS2-CURRENT');
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'experiment' }).map(x => x.id), [
    'FLAG_ONE', 'FLAG_TWO', 'FLAG_THREE', 'FLAG_FOUR',
]);
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_ONE')?.promotionState, 'closed');
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_TWO')?.promotionState, 'open');
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_TWO')?.status, 'active');
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_THREE')?.promotionState, 'no-current-gate');
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_THREE')?.status, 'pending');
assert.equal(index.experiments.find(row => row.experimentId === 'FLAG_FOUR')?.promotionState, 'not-promotion-candidate');
assert.deepEqual(index.promotions.map(row => row.promotionId), [
    'PROMOTED_ONE+PROMOTED_TWO',
    'PROMOTED_HISTORICAL',
]);
assert.deepEqual(index.promotions[0].mechanisms, ['PROMOTED_ONE', 'PROMOTED_TWO']);
assert.equal(index.promotions[0].decisionEvidenceRef, 'reports/2026-08-21-example.md');
assert.equal(index.promotions[1].decisionEvidenceRef, null);
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'promotion' }).map(x => x.id), [
    'PROMOTED_ONE+PROMOTED_TWO',
    'PROMOTED_HISTORICAL',
]);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'held-out' }).map(x => x.id), ['example']);
const taggedEvidence = index.evidence.find(row => row.topicId === 'example');
assert.equal(taggedEvidence.metadataSource, 'structured-closeout');
assert.equal(taggedEvidence.authorityRelation, 'hyperlink-discovery-only');
assert.ok(taggedEvidence.linkedCurrentDocs.includes('docs/topic.md'));
assert.ok(taggedEvidence.artifacts.includes('logs/example/run.json'),
    'structured closeout source artifacts must participate in status-index artifact discovery');
assert.deepEqual(taggedEvidence.sourceArtifacts, ['logs/example/run.json']);
assert.equal(taggedEvidence.linkedArtifacts.includes('logs/example/run.json'), false,
    'an authored source edge should not be duplicated as a weaker discovered link');
assert.equal(taggedEvidence.artifactRelation, 'structured-source+linked-discovery');
assert.equal(taggedEvidence.researchQuestion, 'WS2-CURRENT');
assert.deepEqual(taggedEvidence.premiseRefs, ['P032', 'P204']);
assert.deepEqual(taggedEvidence.measurementOpportunities, ['MO-002']);
assert.equal(taggedEvidence.evidenceRole, 'confirmation');
assert.equal(taggedEvidence.selection, 'prespecified');
assert.equal(taggedEvidence.populationIdentity, 'fixture-population');
assert.equal(taggedEvidence.inferenceScope, 'fixture-only');
assert.equal(index.evidence.find(row => row.topicId === 'legacy-metadata')?.metadataSource, 'legacy-status-block',
    'historical metadata-only reports must remain indexed through the legacy fallback');
assert.deepEqual(queryResearchStatusIndex(index, { query: 'orientation anomaly' }).map(x => x.id), ['legacy']);
assert.deepEqual(queryResearchStatusIndex(index, { query: 'early-repair-search' }).map(x => x.id), ['legacy'],
    'canonical stage query must discover reports written only with the historical repair-probe name');
assert.deepEqual(queryResearchStatusIndex(index, { query: 'main-search' }).map(x => x.id), ['legacy'],
    'canonical main-search query must discover reports written only with the historical main-loop name');
assert.deepEqual(queryResearchStatusIndex(index, { query: 'intersection-heavy' }).map(x => x.id), ['legacy'],
    'canonical routing query must discover reports written only with the historical high-intersection-burden label');
assert.deepEqual(queryResearchStatusIndex(index, {
    query: 'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
}).map(x => x.id), ['legacy'],
'canonical attempt query must discover reports written only with the compact historical identity');
assert.deepEqual(queryResearchStatusIndex(index, {
    query: 'main-search|beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
}).map(x => x.id), ['legacy'],
'canonical composite action query must cross-expand both stage and attempt identity');
assert.deepEqual(queryResearchStatusIndex(index, {
    query: 'main-loop|beam:intersectionHarvest@beam5000(diverse)',
}).map(x => x.id), ['legacy'],
'legacy composite action query must remain discoverable after canonicalization');
assert.deepEqual(queryResearchStatusIndex(index, {
    query: 'dfs|score=default|bias=none',
}).map(x => x.id), [],
'routing alias default -> general must not rewrite a scoring-profile component');
assert.deepEqual(queryResearchStatusIndex(index, {
    query: 'admissible-order|tieBreak=default|lds=off',
}).map(x => x.id), [],
'admissible-order attempt family must not be rewritten as the admissible-order-fallback stage');
assert.deepEqual(queryResearchStatusIndex(index, { kind: 'legacy-evidence' }).map(x => x.report), [
    'reports/2026-01-01-legacy.md',
    'reports/2026-01-02-decoy.md',
]);
assert.deepEqual(queryResearchStatusIndex(index, { status: 'rejected' }).map(x => x.id), ['FLAG_ONE']);
assert.deepEqual(queryResearchStatusIndex(index, { status: 'active', kind: 'experiment' }).map(x => x.id), ['FLAG_TWO'],
    'explicit promotion state, not prose keywords, must determine experiment lifecycle status');
const compact = compactResearchStatusIndex(index, { query: 'current question' });
assert.equal(compact.count, 1);
assert.equal(compact.entries[0].kind, 'queue');
assert.equal(compact.entries[0].authority, 'docs/solver-optimization-workstreams.md');
assert.equal(compact.entries[0].workstreamId, 2, 'workstream ID is identity, not a priority rank');

const questionRegistry = loadResearchQuestionRegistry(root);
assert.deepEqual(validateResearchQuestionRegistry(questionRegistry), []);
assert.equal(normalizeResearchQuestionStatus('active-candidate'), 'active');
assert.equal(normalizeResearchQuestionStatus('closed-tested-form'), 'closed');
assert.equal(researchQuestionLifecycleClass('active-candidate'), 'active');
assert.equal(researchQuestionLifecycleClass('deferred-reopen'), 'deferred');
assert.equal(researchQuestionLifecycleClass('concluded-positive'), 'concluded');
assert.equal(isTerminalResearchQuestionState('closed-tested-form'), true);
assert.equal(isTerminalResearchQuestionState('concluded-negative'), true);
assert.equal(isTerminalResearchQuestionState('deferred-reopen'), false);
assert.ok(RESEARCH_QUESTION_STATES.includes('mixed'));
assert.deepEqual(queryResearchQuestions(questionRegistry, { kind: 'question', status: 'active' }).map(x => x.id), ['WS2-CURRENT']);
assert.deepEqual(queryResearchQuestions(questionRegistry, { query: 'bounded follow-up' }).map(x => x.id), ['WS2-FOLLOWUP']);
assert.deepEqual(queryResearchQuestions(questionRegistry, { query: 'bounded follow up' }).map(x => x.id), ['WS2-FOLLOWUP'],
    'ordinary spaced vocabulary must discover a hyphenated question');
assert.deepEqual(queryResearchQuestions(questionRegistry, { kind: 'experiment' }), [],
    'question query helper must not leak questions into other compact kinds');
const invalidState = JSON.parse(JSON.stringify(questionRegistry));
invalidState.questions[0].state = 'active-ish';
assert.deepEqual(validateResearchQuestionRegistry(invalidState), [
    'questions[0].state is unknown: active-ish',
]);

const missingDeferredAcquisition = JSON.parse(JSON.stringify(questionRegistry));
missingDeferredAcquisition.questions[0].state = 'deferred-reopen';
delete missingDeferredAcquisition.questions[0].acquisitionNeed;
assert.deepEqual(validateResearchQuestionRegistry(missingDeferredAcquisition), [
    'questions[0].acquisitionNeed is required for deferred-reopen questions',
]);

const invalidAcquisition = JSON.parse(JSON.stringify(questionRegistry));
invalidAcquisition.questions[0].acquisitionNeed = 'generate-something';
assert.deepEqual(validateResearchQuestionRegistry(invalidAcquisition), [
    'questions[0].acquisitionNeed is unknown: generate-something',
]);

const invalidAnsweredBy = JSON.parse(JSON.stringify(questionRegistry));
invalidAnsweredBy.questions[0].answeredBy = ['not-a-repository-edge'];
assert.deepEqual(validateResearchQuestionRegistry(invalidAnsweredBy), [
    'questions[0].answeredBy must start with one of docs, reports, scripts, data, logs',
]);

const duplicateAnsweredBy = JSON.parse(JSON.stringify(questionRegistry));
duplicateAnsweredBy.questions[0].answeredBy = [
    'reports/example.md',
    'reports/example.md',
];
assert.deepEqual(validateResearchQuestionRegistry(duplicateAnsweredBy), [
    'questions[0].answeredBy duplicates reports/example.md',
]);

const invalidRelations = JSON.parse(JSON.stringify(questionRegistry));
invalidRelations.questions[0].implies = ['WS2-MISSING'];
assert.deepEqual(validateResearchQuestionRegistry(invalidRelations), [
    'questions[0].implies references unknown question WS2-MISSING',
]);
const invalidSupersession = JSON.parse(JSON.stringify(questionRegistry));
invalidSupersession.questions[0].supersedes = ['WS2-MISSING'];
assert.deepEqual(validateResearchQuestionRegistry(invalidSupersession), [
    'questions[0].supersedes references unknown question WS2-MISSING',
]);

const duplicateQuestionEdge = JSON.parse(JSON.stringify(questionRegistry));
duplicateQuestionEdge.questions[0].implies = ['WS2-FOLLOWUP', 'WS2-FOLLOWUP'];
assert.deepEqual(validateResearchQuestionRegistry(duplicateQuestionEdge), [
    'questions[0].implies duplicates WS2-FOLLOWUP',
]);

const asymmetricCalibration = JSON.parse(JSON.stringify(questionRegistry));
asymmetricCalibration.questions[0].calibratedBy = ['WS2-FOLLOWUP'];
assert.deepEqual(validateResearchQuestionRegistry(asymmetricCalibration), [
    'questions[0].calibratedBy WS2-FOLLOWUP is missing reciprocal calibrates edge',
]);

const reciprocalCalibration = JSON.parse(JSON.stringify(questionRegistry));
reciprocalCalibration.questions[0].calibratedBy = ['WS2-FOLLOWUP'];
reciprocalCalibration.questions[1].calibrates = ['WS2-CURRENT'];
assert.deepEqual(validateResearchQuestionRegistry(reciprocalCalibration), []);

const selfQuestionEdge = JSON.parse(JSON.stringify(questionRegistry));
selfQuestionEdge.questions[0].implies = ['WS2-CURRENT'];
assert.deepEqual(validateResearchQuestionRegistry(selfQuestionEdge), [
    'questions[0].implies self-references WS2-CURRENT',
]);
const invalidConstraint = JSON.parse(JSON.stringify(questionRegistry));
invalidConstraint.questions[0].constrainedBy = ['WS2-MISSING'];
assert.deepEqual(validateResearchQuestionRegistry(invalidConstraint), [
    'questions[0].constrainedBy references neither a known question nor a repository path: WS2-MISSING',
]);

const conflictingPath = path.join(root, 'reports/2026-08-23-conflicting-closeout.md');
writeFileSync(conflictingPath, `# Conflicting closeout

> **Status:** active
> **Last evidence:** 2026-08-23 — Human-readable mirror.
> **Decision:** Continue.
> **Remaining gate:** next

${formatResearchCloseoutCapsule({
    status: 'concluded-negative',
    lastEvidenceDate: '2026-08-23',
    decision: 'Close.',
    remainingGate: 'none',
})}
`);
assert.throws(() => buildResearchStatusIndex(root), /structured research closeout disagrees with canonical status metadata: status/u,
    'canonical structured/prose disagreement must fail instead of choosing a parser implicitly');
unlinkSync(conflictingPath);

const paraphrasePath = path.join(root, 'reports/2026-08-24-paraphrased-closeout.md');
writeFileSync(paraphrasePath, `# Paraphrased closeout

> **Status:** concluded-negative
> **Last evidence:** 2026-08-24 — Human-readable mirror.
> **Decision:** A fuller human explanation of why the form is closed.
> **Remaining gate:** Reopen only if the premise changes materially.

${formatResearchCloseoutCapsule({
    status: 'concluded-negative',
    lastEvidenceDate: '2026-08-24',
    decision: 'close tested form',
    remainingGate: 'materially changed premise',
})}
`);
const paraphrasedIndex = buildResearchStatusIndex(root);
const paraphrased = paraphrasedIndex.evidence.find(row => row.topicId === 'paraphrased-closeout');
assert.equal(paraphrased.decision, 'close tested form',
    'machine decision must come from the structured capsule, not the human prose paraphrase');
assert.equal(paraphrased.remainingGate, 'materially changed premise');
unlinkSync(paraphrasePath);

const repositoryIndex = buildResearchStatusIndex(process.cwd());
assert.ok(repositoryIndex.queue.length > 0, 'current workstream authority must remain visible through the research-status queue relation');
assert.ok(repositoryIndex.queue.some(row => String(row.workstreamId) === '2' && row.status === 'active'),
    'WS2 active gate must remain discoverable through the research-status queue relation');
assert.equal(repositoryIndex.queue.find(row => String(row.workstreamId) === '2')?.questionRef,
    'WS2-FAILURE-RESPONSE-RECONNAISSANCE',
    'active WS2 gate must carry the stable question reference');
assert.ok(repositoryIndex.queue.some(row => row.workstreamId === '6/7'),
    'composite workstream identities must survive indexing without numeric coercion');

const repositoryRegistry = loadResearchQuestionRegistry(process.cwd());
assert.deepEqual(validateResearchQuestionRegistry(repositoryRegistry), [],
    'tracked solver research question relations must not contain dangling question-id edges');
const idsFor = filters => queryResearchQuestions(repositoryRegistry, filters).map(entry => entry.id);
assert(idsFor({ query: 'portal coarse', status: 'concluded-positive' }).includes('WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION'),
    'ordinary portal vocabulary must expose the concluded allocation successor, not only the closed global form');
assert.deepEqual(idsFor({ query: 'admissible order', status: 'deferred-reopen' }).sort(), [
    'WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION',
    'WS2-ADMISSIBLE-ORDER-RETRY-REPRICING',
].sort(),
    'admissible-order descendants must remain deferred until their distinct evidence gates reopen them');
assert(idsFor({ query: 'full pool', status: 'closed' }).includes('WS2-CATEGORICAL-FULL-POOL'),
    'ordinary full-pool vocabulary must find the already-run categorical projection');
assert.deepEqual(idsFor({ query: 'topology', status: 'active' }), [],
    'the topology microscope is no longer active after the F3 descriptor/expansion closeout');
assert.deepEqual(idsFor({ query: 'topology', status: 'mixed' }), ['WS2-OPEN-PATH-TOPOLOGY-DESCRIPTOR'],
    'topology discovery must route to the qualified F3 descriptor disposition after its microscope ran');
assert(idsFor({ query: 'topology', status: 'concluded-positive' }).includes('WS2-OPEN-PATH-TOPOLOGY-SIGNATURE'),
    'the open-path topology signature question must remain discoverable as the concluded premise upstream of F3');
assert.deepEqual(idsFor({ query: 'D1', status: 'active' }), [],
    'D1 production-inert observation, its post-D1 discriminator selection, and the work-ladder economics follow-on are all closed; no D1-referencing research gate remains active');
assert(idsFor({ query: 'D1', status: 'concluded-negative' }).includes('WS2-WORK-LADDER-ECONOMICS'),
    'the work-ladder economics follow-on must remain discoverable as the concluded-negative D1-referencing result');
assert(idsFor({ query: 'must turn', status: 'closed' }).includes('WS2-MUST-TURN-LATE-ADDITIVE'),
    'ordinary must-turn vocabulary must find the closed-negative economics result');

await import('./corpus-query-node-test.mjs');
console.log('research status index check passed');
