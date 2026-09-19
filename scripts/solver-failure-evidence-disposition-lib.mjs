/**
 * Validates docs/solver-failure-evidence-disposition.json (the plan's Phase 3 disposition contract):
 * every solver-running GitHub Actions workflow must declare `standard`, `specialized-opt-out`, or
 * `unsupported`, opt-outs/unsupported must carry a reason, and the registry's claim must agree with
 * what the workflow file itself actually does -- a `standard` entry whose workflow never invokes the
 * shared summarizer, or an opt-out/unsupported entry whose workflow already does, is caught as a
 * stale declaration. The workflow enumeration is open-set: a new solver-running workflow with no
 * entry here fails validation, rather than silently passing until someone remembers to register it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const DISPOSITION_REGISTRY_PATH = 'docs/solver-failure-evidence-disposition.json';
const DISPOSITIONS = new Set(['standard', 'specialized-opt-out', 'unsupported']);
const STANDARD_TRANSPORT_MARKERS = ['summarize-solver-failure-response.mjs', 'sweep-publish.mjs'];

function nonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function listWorkflowFiles(root) {
    const dir = path.join(root, '.github', 'workflows');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(name => /\.ya?ml$/iu.test(name)).map(name => path.join('.github', 'workflows', name)).sort();
}

/**
 * A workflow "requires a disposition" if it declares an experiment-contract sideEffects block or
 * invokes the shared experiment-contract writer/publisher -- i.e. it is a solver-running workflow
 * capable of producing attempt-shaped results this layer covers.
 */
function isSolverRunningWorkflow(source) {
    return /sideEffects\s*:/u.test(source)
        || source.includes('write-solver-experiment-contract.mjs')
        || source.includes('publish-solver-sweep-result.mjs')
        || source.includes('sweep-publish.mjs');
}

function declaresStandardTransport(source) {
    return STANDARD_TRANSPORT_MARKERS.some(marker => source.includes(marker));
}

/**
 * Best-effort extraction of every literal `telemetry: '...'` value from inline sideEffects
 * declarations (workflows use both JSON and JS-object quoting). A workflow normally declares its
 * contract exactly once; this returns all literals found so a stale one is caught even if it is not
 * the first sideEffects-shaped text in the file. Returns [] when no literal is found (e.g. a
 * variable is used instead) -- that is "indeterminate", never a violation on its own.
 */
function declaredTelemetryLiterals(source) {
    return [...source.matchAll(/sideEffects[\s\S]{0,200}?telemetry['"]?\s*:\s*['"]([^'"]+)['"]/gu)].map(match => match[1]);
}

export function validateFailureEvidenceDisposition(root = process.cwd()) {
    const registryPath = path.join(root, DISPOSITION_REGISTRY_PATH);
    if (!existsSync(registryPath)) return [`missing registry ${DISPOSITION_REGISTRY_PATH}`];

    let registry;
    try {
        registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    } catch (error) {
        return [`cannot parse ${DISPOSITION_REGISTRY_PATH}: ${error.message}`];
    }

    const failures = [];
    if (registry.schemaVersion !== 1) failures.push(`unsupported schemaVersion ${registry.schemaVersion}; expected 1`);
    if (!Array.isArray(registry.producers) || registry.producers.length === 0) {
        failures.push('producers must be a non-empty array');
    }

    const ids = new Set();
    const byWorkflow = new Map();
    for (const [index, producer] of (registry.producers ?? []).entries()) {
        const label = `producers[${index}]`;
        if (!producer || typeof producer !== 'object' || Array.isArray(producer)) {
            failures.push(`${label} must be an object`);
            continue;
        }
        if (!nonEmptyString(producer.id)) {
            failures.push(`${label}.id must be a non-empty string`);
        } else if (ids.has(producer.id)) {
            failures.push(`${label}.id duplicates ${producer.id}`);
        } else {
            ids.add(producer.id);
        }
        if (!nonEmptyString(producer.workflow) || !existsSync(path.join(root, producer.workflow))) {
            failures.push(`${label}.workflow does not exist: ${producer.workflow}`);
            continue;
        }
        if (byWorkflow.has(producer.workflow)) failures.push(`${label}.workflow duplicates an entry for ${producer.workflow}`);
        byWorkflow.set(producer.workflow, producer);

        if (!DISPOSITIONS.has(producer.disposition)) {
            failures.push(`${label}.disposition must be one of ${[...DISPOSITIONS].join(', ')}`);
        }
        if (producer.disposition !== 'standard' && !nonEmptyString(producer.reason)) {
            failures.push(`${label}.reason is required for disposition "${producer.disposition}"`);
        }

        const source = readFileSync(path.join(root, producer.workflow), 'utf8');
        const transports = declaresStandardTransport(source);
        if (producer.disposition === 'standard' && !transports) {
            failures.push(`${label} declares disposition "standard" but ${producer.workflow} does not invoke a standard failure-response transport (${STANDARD_TRANSPORT_MARKERS.join(' or ')})`);
        }
        if (producer.disposition !== 'standard' && transports) {
            failures.push(`${label} declares disposition "${producer.disposition}" but ${producer.workflow} already invokes ${STANDARD_TRANSPORT_MARKER}; update its disposition to "standard"`);
        }
        const telemetryLiterals = declaredTelemetryLiterals(source);
        if (producer.disposition === 'standard' && telemetryLiterals.includes('none')) {
            failures.push(`${label} declares disposition "standard" but ${producer.workflow} still declares sideEffects.telemetry: 'none' (stale declaration)`);
        }
    }

    for (const workflow of listWorkflowFiles(root)) {
        const source = readFileSync(path.join(root, workflow), 'utf8');
        if (isSolverRunningWorkflow(source) && !byWorkflow.has(workflow)) {
            failures.push(`${workflow} looks solver-running (declares sideEffects or uses the shared experiment-contract writer/publisher) but has no ${DISPOSITION_REGISTRY_PATH} entry`);
        }
    }

    return failures;
}
