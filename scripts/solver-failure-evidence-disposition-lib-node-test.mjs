import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateFailureEvidenceDisposition } from './solver-failure-evidence-disposition-lib.mjs';

function makeRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-evidence-disposition-'));
    fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    return root;
}

function writeWorkflow(root, name, source) {
    fs.writeFileSync(path.join(root, '.github', 'workflows', name), source);
}

function writeRegistry(root, producers) {
    fs.writeFileSync(path.join(root, 'docs', 'solver-failure-evidence-disposition.json'),
        JSON.stringify({ schemaVersion: 1, producers }));
}

const STANDARD_WORKFLOW = `
name: standard-producer
run: |
  node scripts/summarize-solver-failure-response.mjs --in=combined.json --out=summary.json
  node scripts/publish-solver-sweep-result.mjs --failure-response-file=summary.json
  echo '{"sideEffects": {"telemetry": "compact"}}'
`;
const WRAPPED_STANDARD_WORKFLOW = `
name: wrapped-standard-producer
run: |
  node scripts/sweep-publish.mjs --primary=combined.json
  echo '{"sideEffects": {"telemetry": "compact"}}'
`;
const LEGACY_NONE_WORKFLOW = `
name: legacy-producer
run: node scripts/publish-solver-sweep-result.mjs
sideEffects: {"hints": "none", "telemetry": "none", "reports": "artifact-only"}
`;
const OPT_OUT_WORKFLOW = `
name: opt-out-producer
run: node scripts/publish-solver-sweep-result.mjs
sideEffects: {"telemetry": "none"}
`;
const UNRELATED_WORKFLOW = `
name: unrelated
run: echo hello
`;

// --- happy path: standard entry whose workflow actually transports the standard layer ---
{
    const root = makeRoot();
    writeWorkflow(root, 'standard.yml', STANDARD_WORKFLOW);
    writeRegistry(root, [{ id: 'standard-producer', workflow: '.github/workflows/standard.yml', disposition: 'standard', reason: null }]);
    assert.deepEqual(validateFailureEvidenceDisposition(root), []);
    fs.rmSync(root, { recursive: true, force: true });
}


// --- extracted wrapper is also a standard transport ---
{
    const root = makeRoot();
    writeWorkflow(root, 'wrapped.yml', WRAPPED_STANDARD_WORKFLOW);
    writeRegistry(root, [{ id: 'wrapped', workflow: '.github/workflows/wrapped.yml', disposition: 'standard', reason: null }]);
    assert.deepEqual(validateFailureEvidenceDisposition(root), []);
    fs.rmSync(root, { recursive: true, force: true });
}


// --- combiner-produced summary passed to publisher is also standard transport ---
{
    const root = makeRoot();
    writeWorkflow(root, 'combined.yml', `
name: combined-standard-producer
run: |
  node scripts/publish-solver-sweep-result.mjs --primary=combined.json --failure-response-file=failure.json
  echo '{"sideEffects": {"telemetry": "compact"}}'
`);
    writeRegistry(root, [{ id: 'combined', workflow: '.github/workflows/combined.yml', disposition: 'standard', reason: null }]);
    assert.deepEqual(validateFailureEvidenceDisposition(root), []);
    fs.rmSync(root, { recursive: true, force: true });
}

// --- an undeclared solver-running workflow fails validation (open-set enumeration) ---
{
    const root = makeRoot();
    writeWorkflow(root, 'legacy.yml', LEGACY_NONE_WORKFLOW);
    writeWorkflow(root, 'unrelated.yml', UNRELATED_WORKFLOW);
    writeRegistry(root, []);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('legacy.yml') && f.includes('no docs/solver-failure-evidence-disposition.json entry')),
        'a solver-running workflow with no registry entry must fail validation');
    assert.ok(!failures.some(f => f.includes('unrelated.yml')), 'a non-solver-running workflow needs no entry');
    fs.rmSync(root, { recursive: true, force: true });
}

// --- opt-out/unsupported without a reason is rejected ---
{
    const root = makeRoot();
    writeWorkflow(root, 'opt-out.yml', OPT_OUT_WORKFLOW);
    writeRegistry(root, [{ id: 'opt-out', workflow: '.github/workflows/opt-out.yml', disposition: 'specialized-opt-out', reason: null }]);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('reason is required')));
    fs.rmSync(root, { recursive: true, force: true });
}

// --- a justified opt-out with a reason and no standard transport is accepted ---
{
    const root = makeRoot();
    writeWorkflow(root, 'opt-out.yml', OPT_OUT_WORKFLOW);
    writeRegistry(root, [{ id: 'opt-out', workflow: '.github/workflows/opt-out.yml', disposition: 'specialized-opt-out', reason: 'not yet migrated' }]);
    assert.deepEqual(validateFailureEvidenceDisposition(root), []);
    fs.rmSync(root, { recursive: true, force: true });
}

// --- stale "telemetry: none" on a declared-standard producer is caught ---
{
    const root = makeRoot();
    writeWorkflow(root, 'stale.yml', `${STANDARD_WORKFLOW}\nsideEffects: {"telemetry": "none"}`);
    writeRegistry(root, [{ id: 'stale', workflow: '.github/workflows/stale.yml', disposition: 'standard', reason: null }]);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('stale declaration')));
    fs.rmSync(root, { recursive: true, force: true });
}

// --- a producer declared standard whose workflow never actually transports the layer is caught ---
{
    const root = makeRoot();
    writeWorkflow(root, 'unwired.yml', OPT_OUT_WORKFLOW);
    writeRegistry(root, [{ id: 'unwired', workflow: '.github/workflows/unwired.yml', disposition: 'standard', reason: null }]);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('does not invoke a standard failure-response transport')));
    fs.rmSync(root, { recursive: true, force: true });
}

// --- an opt-out producer whose workflow already transports the layer must be relabeled ---
{
    const root = makeRoot();
    writeWorkflow(root, 'drifted.yml', STANDARD_WORKFLOW);
    writeRegistry(root, [{ id: 'drifted', workflow: '.github/workflows/drifted.yml', disposition: 'specialized-opt-out', reason: 'still catching up' }]);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('update its disposition to "standard"')));
    fs.rmSync(root, { recursive: true, force: true });
}

// --- unknown disposition value is rejected ---
{
    const root = makeRoot();
    writeWorkflow(root, 'weird.yml', OPT_OUT_WORKFLOW);
    writeRegistry(root, [{ id: 'weird', workflow: '.github/workflows/weird.yml', disposition: 'sort-of', reason: 'x' }]);
    const failures = validateFailureEvidenceDisposition(root);
    assert.ok(failures.some(f => f.includes('disposition must be one of')));
    fs.rmSync(root, { recursive: true, force: true });
}

// --- the real registry validates cleanly against the real repository ---
assert.deepEqual(validateFailureEvidenceDisposition(process.cwd()), []);

console.log('solver failure evidence disposition lib tests passed');
