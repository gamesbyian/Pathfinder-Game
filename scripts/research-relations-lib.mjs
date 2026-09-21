import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildResearchStatusIndex } from './research-status-index-lib.mjs';
import {
    loadResearchQuestionRegistry,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';
import {
    assertResearchBlock,
    researchBlockEligibility,
    summarizeResearchConsumption,
} from './solver-research-block-lineage.mjs';
import { researchSemanticHash as stableHash } from './research-semantic-identity-lib.mjs';
import { loadPremiseMap } from './research-premise-map-lib.mjs';
import { extractResearchArtifactEnvelope } from './research-artifact-envelope-lib.mjs';
import { durableBundleManifestStoredPath } from './durable-evidence-bundle-lib.mjs';

export const RESEARCH_RELATION_CONTRACTS = Object.freeze({
    questions: { identity: 'id', source: 'docs/solver-research-question-relations.json' },
    assets: { identity: 'id', source: 'docs/solver-research-data-assets.json' },
    assetRelationships: { identity: 'id', source: 'docs/solver-research-data-assets.json#relationships' },
    measurementOpportunities: { identity: 'id', source: 'docs/solver-premise-map-measurement-opportunities.json' },
    evidenceIntegrity: { identity: 'evidenceId', source: 'reports/stress/solver-evidence-integrity-index.json' },
    evidence: { identity: 'topicId', source: 'reports/*.md via research-status-index' },
    queue: { identity: 'topicId', source: 'docs/solver-optimization-workstreams.md via research-status-index' },
    experiments: { identity: 'experimentId', source: 'docs/solver-opt-in-experiment-ledger.md via research-status-index' },
    promotions: { identity: 'promotionId', source: 'docs/solver-opt-in-experiment-ledger.md#recently-promoted via research-status-index' },
    premiseSnapshots: { identity: 'snapshotId', source: 'docs/solver-premise-map-snapshot-v*.json' },
    premiseAdmissions: { identity: 'premiseId', source: 'docs/solver-premise-map-v2-admissions.json' },
    premises: { identity: 'premiseId', source: 'active solver-premise-map snapshot canonicalPremiseFiles' },
    premiseEdges: { identity: 'from + type + to + sourceIndex', source: 'active solver-premise-map snapshot relationFiles' },
    durableEvidence: { identity: 'bundlePath', source: 'reports/stress/experiment-evidence/**/bundle.json' },
    researchBlocks: { identity: 'blockId', source: 'explicit/discovered research manifests/captures' },
    researchParents: { identity: 'blockId + parentId', source: 'derived from research blocks' },
});

function readJson(root, relative, { optional = false } = {}) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) {
        if (optional) return null;
        throw new Error(`missing research relation source: ${relative}`);
    }
    return JSON.parse(readFileSync(absolute, 'utf8'));
}

const withSource = (row, relation, source) => ({
    ...row,
    _researchSource: { relation, source },
});

export function exactPathIntegrityRecords(asset, records) {
    const paths = new Set((asset?.locations ?? [])
        .map(location => location?.path)
        .filter(value => typeof value === 'string' && value.length > 0));
    if (paths.size === 0) return [];
    const seen = new Set();
    return (records ?? []).filter(record => {
        if (!record?.evidenceId || seen.has(record.evidenceId)) return false;
        if (!(record.sourcePaths ?? []).some(sourcePath => paths.has(sourcePath))) return false;
        seen.add(record.evidenceId);
        return true;
    });
}

function artifactEnrichmentKind(document) {
    if (['observation', 'exact', 'treatment', 'artifact'].includes(document?.researchEnrichmentKind)) {
        return document.researchEnrichmentKind;
    }
    if (document?.kind === 'd1-production-inert-decision-capture') return 'observation';
    if (document?.kind === 'd1-production-inert-decision-annotation') return 'exact';
    if (document?.experiment) return 'treatment';
    return 'artifact';
}

function withoutConsumption(block) {
    if (!block) return block;
    const { consumptionEvents: _events, ...rest } = block;
    return rest;
}

function mergeConsumptionEvents(left = [], right = []) {
    const byValue = new Map();
    for (const event of [...left, ...right]) byValue.set(stableHash(event), event);
    return [...byValue.values()];
}

function walkFiles(root, relative, predicate, out = []) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) return out;
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
        for (const name of readdirSync(absolute).sort()) {
            walkFiles(root, path.join(relative, name), predicate, out);
        }
    } else if (predicate(relative, stat)) out.push(relative);
    return out;
}

export function discoverResearchArtifactPaths(root = process.cwd()) {
    const transientRoots = [
        'tmp/research-generation',
        'tmp/research-populations',
        'tmp/research-blocks',
        'tmp/d1-research',
        'tmp/search-loss-evidence',
    ];
    const candidates = [
        ...transientRoots.flatMap(relativeRoot => walkFiles(
            root,
            relativeRoot,
            (relative, stat) => relative.endsWith('.json') && stat.size <= 32 * 1024 * 1024,
        )),
        ...walkFiles(root, 'reports/stress/experiment-evidence',
            (relative, stat) => path.basename(relative) === 'manifest.json' && stat.size <= 32 * 1024 * 1024),
    ];
    const discovered = [];
    for (const relative of candidates) {
        try {
            const document = JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
            const { researchBlock, populationIdentity } = extractResearchArtifactEnvelope(document);
            if (researchBlock && populationIdentity && Array.isArray(researchBlock.parentIds)) {
                discovered.push(relative);
            }
        } catch {
            // Discovery is intentionally best-effort over mixed temporary/artifact directories.
        }
    }
    return [...new Set(discovered)].sort();
}

function durableBundleManifestPath(root, bundlePath, bundle) {
    const bundleDir = path.dirname(bundlePath);
    let stored;
    try {
        stored = durableBundleManifestStoredPath(bundle);
    } catch (error) {
        throw new Error(`durable evidence bundle manifest edge is invalid: ${bundlePath}: ${error.message}`);
    }

    const resolved = path.resolve(root, bundleDir, stored);
    const base = path.resolve(root, bundleDir);
    const relativeToBundle = path.relative(base, resolved);
    if (relativeToBundle === '..' || relativeToBundle.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToBundle)) {
        throw new Error(`durable evidence manifest edge escapes bundle directory: ${bundlePath} -> ${stored}`);
    }
    const relative = path.relative(root, resolved).split(path.sep).join('/');
    if (!existsSync(resolved)) throw new Error(`durable evidence manifest edge is missing: ${bundlePath} -> ${relative}`);
    return relative;
}

function buildDurableEvidenceRelations(root) {
    const bundles = walkFiles(root, 'reports/stress/experiment-evidence',
        relative => path.basename(relative) === 'bundle.json');
    return bundles.map(bundlePath => {
        const bundle = JSON.parse(readFileSync(path.join(root, bundlePath), 'utf8'));
        const manifestPath = durableBundleManifestPath(root, bundlePath, bundle);
        return {
            ...bundle,
            bundlePath,
            manifestPath,
            questionId: bundle?.researchQuestion?.questionId ?? bundle?.researchBlock?.questionId ?? null,
            measurementOpportunity: bundle?.researchQuestion?.measurementOpportunity ?? null,
            blockId: bundle?.researchBlock?.blockId ?? null,
            _researchSource: { relation: 'durableEvidence', source: bundlePath },
        };
    });
}

function buildResearchArtifactRelations(root, artifactPaths, eligibility = null) {
    const blocks = new Map();
    for (const artifactPath of artifactPaths) {
        const absolute = path.isAbsolute(artifactPath) ? artifactPath : path.join(root, artifactPath);
        if (!existsSync(absolute)) throw new Error(`missing research artifact: ${artifactPath}`);
        const document = JSON.parse(readFileSync(absolute, 'utf8'));
        const { researchBlock, populationIdentity } = extractResearchArtifactEnvelope(document);
        if (!researchBlock) throw new Error(`research artifact has no researchBlock: ${artifactPath}`);
        assertResearchBlock(researchBlock, { populationIdentity });

        const existing = blocks.get(researchBlock.blockId);
        if (existing) {
            if (existing.populationIdentity !== populationIdentity
                || stableHash(withoutConsumption(existing.researchBlock)) !== stableHash(withoutConsumption(researchBlock))) {
                throw new Error(`conflicting research block definitions for ${researchBlock.blockId}`);
            }
            existing.researchBlock = {
                ...existing.researchBlock,
                consumptionEvents: mergeConsumptionEvents(
                    existing.researchBlock.consumptionEvents,
                    researchBlock.consumptionEvents,
                ),
            };
            existing.artifactRefs.push(artifactPath);
            existing.enrichments[artifactEnrichmentKind(document)].push(artifactPath);
        } else {
            const enrichments = { observation: [], exact: [], treatment: [], artifact: [] };
            enrichments[artifactEnrichmentKind(document)].push(artifactPath);
            blocks.set(researchBlock.blockId, {
                blockId: researchBlock.blockId,
                questionId: researchBlock.questionId,
                populationIdentity,
                researchBlock: { ...researchBlock },
                artifactRefs: [artifactPath],
                enrichments,
            });
        }
    }

    const blockRows = [...blocks.values()].map(row => {
        const block = row.researchBlock;
        const eligibilityResult = eligibility?.questionId
            ? researchBlockEligibility(block, eligibility)
            : null;
        return {
            ...row,
            sourceRegime: block.sourceRegime,
            sourceRevision: block.sourceRevision,
            evidenceRole: block.evidenceRole,
            independentUnit: block.independentUnit,
            parentCount: block.parentIds.length,
            consumptionCount: block.consumptionEvents.length,
            consumptionSummary: summarizeResearchConsumption(block),
            eligibility: eligibilityResult,
            _researchSource: { relation: 'researchBlocks', source: [...row.artifactRefs] },
        };
    }).sort((a, b) => a.blockId.localeCompare(b.blockId));

    const parentRows = blockRows.flatMap(row => row.researchBlock.parentIds.map((parentId, index) => ({
        blockId: row.blockId,
        questionId: row.questionId,
        parentId,
        parentContentIdentity: row.researchBlock.parentContentIdentities[index],
        sourceRegime: row.sourceRegime,
        sourceRevision: row.sourceRevision,
        evidenceRole: row.evidenceRole,
        independentUnit: row.independentUnit,
        artifactRefs: [...row.artifactRefs],
        enrichments: row.enrichments,
        eligibility: row.eligibility,
        _researchSource: { relation: 'researchParents', source: [...row.artifactRefs] },
    })));

    return { blockRows, parentRows };
}

export function normalizePremiseAdmissions(doc) {
    if (!doc) return [];
    let rows = null;
    if (Array.isArray(doc)) rows = doc;
    else {
        for (const key of ['admissions', 'premises', 'records']) {
            if (Array.isArray(doc[key])) { rows = doc[key]; break; }
        }
    }
    if (!rows) return [];

    return rows.map((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw new Error(`premise admission row ${index} must be an object`);
        }
        const candidates = [row.premiseId, row.id, row.propositionId]
            .filter(value => value != null)
            .map(String);
        const distinct = [...new Set(candidates)];
        if (distinct.length === 0) throw new Error(`premise admission row ${index} lacks premiseId`);
        if (distinct.length > 1) {
            throw new Error(`premise admission row ${index} has conflicting premise identity aliases: ${distinct.join(', ')}`);
        }
        const { id: _legacyId, propositionId: _legacyPropositionId, premiseId: _premiseId, ...rest } = row;
        return { ...rest, premiseId: distinct[0] };
    });
}

export function buildResearchRelations(root = process.cwd(), { artifactPaths = [], eligibility = null, discoverArtifacts = false } = {}) {
    const questions = loadResearchQuestionRegistry(root);
    const questionErrors = validateResearchQuestionRegistry(questions);
    if (questionErrors.length) {
        throw new Error(`Invalid solver research question registry:\n- ${questionErrors.join('\n- ')}`);
    }

    if (eligibility?.questionId) {
        const knownQuestionIds = new Set(questions.questions.map(question => question.id));
        if (!knownQuestionIds.has(eligibility.questionId)) {
            throw new Error(`unknown eligibility question: ${eligibility.questionId}`);
        }
        for (const related of eligibility.relatedQuestionIds ?? []) {
            if (!knownQuestionIds.has(related)) throw new Error(`unknown related eligibility question: ${related}`);
        }
    }

    const assets = readJson(root, 'docs/solver-research-data-assets.json');
    const audits = readJson(root, 'docs/solver-research-resource-contract-audits.json');
    const auditedById = new Map((audits.auditedResources ?? []).map(row => [row.assetId, row]));
    const measurement = readJson(root, 'docs/solver-premise-map-measurement-opportunities.json');
    const evidenceIntegrity = readJson(root, 'reports/stress/solver-evidence-integrity-index.json', { optional: true });
    const integrityRecords = evidenceIntegrity?.records ?? [];
    const status = buildResearchStatusIndex(root);
    const v1 = readJson(root, 'docs/solver-premise-map-snapshot-v1.json', { optional: true });
    const v2 = readJson(root, 'docs/solver-premise-map-snapshot-v2.json', { optional: true });
    const admissions = readJson(root, 'docs/solver-premise-map-v2-admissions.json', { optional: true });
    const premiseMap = loadPremiseMap(root);
    const durableEvidence = buildDurableEvidenceRelations(root);
    const resolvedArtifactPaths = [...new Set([
        ...artifactPaths,
        ...(discoverArtifacts ? discoverResearchArtifactPaths(root) : []),
    ])];

    const artifactRelations = buildResearchArtifactRelations(root, resolvedArtifactPaths, eligibility);

    const relations = {
        questions: questions.questions.map(row => withSource(row, 'questions', RESEARCH_RELATION_CONTRACTS.questions.source)),
        assets: (assets.assets ?? []).map(row => withSource({
            ...row,
            contractGrade: auditedById.has(row.id) ? 'audited' : 'catalogue',
            auditedResourceContract: auditedById.get(row.id) ?? null,
            evidenceIntegrityRecords: exactPathIntegrityRecords(row, integrityRecords),
        }, 'assets', RESEARCH_RELATION_CONTRACTS.assets.source)),
        assetRelationships: (assets.relationships ?? []).map(row =>
            withSource(row, 'assetRelationships', RESEARCH_RELATION_CONTRACTS.assetRelationships.source)),
        measurementOpportunities: (measurement.opportunities ?? []).map(row =>
            withSource(row, 'measurementOpportunities', RESEARCH_RELATION_CONTRACTS.measurementOpportunities.source)),
        evidenceIntegrity: (evidenceIntegrity?.records ?? []).map(row =>
            withSource(row, 'evidenceIntegrity', RESEARCH_RELATION_CONTRACTS.evidenceIntegrity.source)),
        evidence: status.evidence.map(row => withSource(row, 'evidence', RESEARCH_RELATION_CONTRACTS.evidence.source)),
        queue: status.queue.map(row => withSource(row, 'queue', RESEARCH_RELATION_CONTRACTS.queue.source)),
        experiments: status.experiments.map(row => withSource(row, 'experiments', RESEARCH_RELATION_CONTRACTS.experiments.source)),
        promotions: (status.promotions ?? []).map(row => withSource(row, 'promotions', RESEARCH_RELATION_CONTRACTS.promotions.source)),
        premiseSnapshots: [v1, v2].filter(Boolean).map(row =>
            withSource(row, 'premiseSnapshots', 'docs/solver-premise-map-snapshot-v*.json')),
        researchBlocks: artifactRelations.blockRows,
        researchParents: artifactRelations.parentRows,
        premiseAdmissions: normalizePremiseAdmissions(admissions).map(row =>
            withSource(row, 'premiseAdmissions', RESEARCH_RELATION_CONTRACTS.premiseAdmissions.source)),
        premises: premiseMap.premises.map(row => withSource(row, 'premises', row._premiseSource)),
        premiseEdges: premiseMap.edges.map(row => withSource(row, 'premiseEdges', row.sourceFile)),
        durableEvidence,
    };

    return {
        schemaVersion: 1,
        contracts: RESEARCH_RELATION_CONTRACTS,
        relations,
    };
}

export function relationNames(model) {
    return Object.keys(model.relations).sort();
}

function flatten(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === 'object') return Object.entries(value).flatMap(([key, nested]) => [key, ...flatten(nested)]);
    return [String(value)];
}

export function queryRelation(model, relation, { query = '', status = '', limit = Infinity } = {}) {
    const rows = model.relations[relation];
    if (!rows) throw new Error(`unknown research relation: ${relation}`);
    const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
    const wantedStatus = status.trim().toLowerCase();
    const matched = rows.filter(row => {
        if (wantedStatus) {
            const rowStatus = String(row.status ?? row.state ?? row.reliability ?? '').toLowerCase();
            if (!rowStatus.includes(wantedStatus)) return false;
        }
        if (!terms.length) return true;
        const haystack = flatten(row).join('\n').toLowerCase();
        return terms.every(term => haystack.includes(term));
    });
    const bounded = Number.isFinite(limit) ? matched.slice(0, Math.max(0, limit)) : matched;
    return { relation, matched: matched.length, rows: bounded };
}

export function indexBy(rows, key) {
    const out = new Map();
    for (const row of rows) {
        const value = typeof key === 'function' ? key(row) : row?.[key];
        if (value == null) continue;
        if (out.has(String(value))) throw new Error(`duplicate relation identity ${String(value)}`);
        out.set(String(value), row);
    }
    return out;
}

export function leftJoin(leftRows, rightRows, {
    leftKey,
    rightKey = leftKey,
    as = 'joined',
} = {}) {
    if (!leftKey) throw new Error('leftJoin requires leftKey');
    const right = new Map();
    for (const row of rightRows) {
        const key = typeof rightKey === 'function' ? rightKey(row) : row?.[rightKey];
        if (key == null) continue;
        const id = String(key);
        if (!right.has(id)) right.set(id, []);
        right.get(id).push(row);
    }
    return leftRows.map(row => {
        const key = typeof leftKey === 'function' ? leftKey(row) : row?.[leftKey];
        return { ...row, [as]: key == null ? [] : (right.get(String(key)) ?? []) };
    });
}

export function summarizeIndependentSupport(rows, key) {
    const groups = new Map();
    let missing = 0;
    for (const row of rows) {
        const value = typeof key === 'function' ? key(row) : row?.[key];
        if (value == null || value === '') { missing++; continue; }
        const id = String(value);
        groups.set(id, (groups.get(id) ?? 0) + 1);
    }
    return {
        rows: rows.length,
        independentUnits: groups.size,
        missingIndependentUnit: missing,
        largestUnitRows: groups.size ? Math.max(...groups.values()) : 0,
        units: Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
}
