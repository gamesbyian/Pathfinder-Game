import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { buildQuestionDossier } from './research-question-dossier-lib.mjs';

const questionId = 'WS2-D1-PRODUCTION-INERT-OBSERVATION';
const dossier = buildQuestionDossier(process.cwd(), { questionId });
assert.equal(dossier.authority.kind, 'derived-read-only');
assert.equal(dossier.question.id, questionId);
assert.ok(dossier.conceptualContext.explicitPremises.some(row => row.premiseId === 'P091'));
assert.ok(dossier.conceptualContext.measurementOpportunities.some(row => row.id === 'MO-002'));
assert.ok(dossier.acquisition.route);
assert.equal(dossier.acquisition.generationGuidance.automaticGeneration, false);
assert.ok(Array.isArray(dossier.resources.candidateAssets));
assert.ok(Array.isArray(dossier.resources.candidateJoins));
assert.equal(dossier.conceptualContext.premiseDiscoveryHints.authority, 'lexical-discovery-only');
assert.ok(dossier.conceptualContext.premiseDiscoveryHints.rows.length > 0);

const run = spawnSync(process.execPath, [
    'scripts/research-question-dossier.mjs',
    `--question-id=${questionId}`,
], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr);
const cli = JSON.parse(run.stdout);
assert.equal(cli.question.id, questionId);
assert.equal(cli.authority.kind, 'derived-read-only');

console.log('research-question-dossier-node-test: ok');
