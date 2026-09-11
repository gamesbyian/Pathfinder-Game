#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { provenanceEventIdentity } from '../../modules/domain/hint-runtime.mjs';
import {
    EVIDENCE_PURPOSES,
    classifyEvidenceApplicability,
    provenanceDependencyStratum,
    summarizeProvenanceEvidence,
} from './provenance-source-taxonomy.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));

const corpusAliases = {
    published: 'data/levels.json',
    stress1: 'data/stress/stress-levels.json',
    corpus1: 'data/stress/stress-levels.json',
    stress2: 'data/stress/stress-levels-random.json',
    corpus2: 'data/stress/stress-levels-random.json',
};

const requested = args.get('--corpus') || 'all';
const corpora = requested === 'all'
    ? [
        ['published', corpusAliases.published],
        ['stress1', corpusAliases.stress1],
        ['stress2', corpusAliases.stress2],
    ]
    : [[requested, corpusAliases[requested] || requested]];

function auditSemanticDuplicates(hints) {
    let duplicateEvents = 0;
    let hintsWithDuplicates = 0;
    for (const hint of hints) {
        const seen = new Set();
        let dupOnHint = false;
        for (const event of hint.provenance || []) {
            const key = provenanceEventIdentity(event);
            if (seen.has(key)) {
                duplicateEvents++;
                dupOnHint = true;
            } else {
                seen.add(key);
            }
        }
        if (dupOnHint) hintsWithDuplicates++;
    }
    return { duplicateEvents, hintsWithDuplicates };
}

function flattenHints(levels) {
    return levels.flatMap(level => level?.hintRecords || []);
}

function auditPurposes(hints, comparableSolverVersions) {
    const result = {};
    for (const purpose of EVIDENCE_PURPOSES) {
        const applicability = { admissible: 0, 'context-bound': 0, inadmissible: 0 };
        const reasons = new Map();
        let independentSupportStrata = 0;
        let hintsWithDependentCollapse = 0;
        let hintsWithAdmissibleEvidence = 0;
        for (const hint of hints) {
            const entries = hint.provenance?.length ? hint.provenance : [null];
            let hintAdmissible = false;
            let hintAdmissibleEvents = 0;
            const hintStrata = new Set();
            for (const entry of entries) {
                const classification = classifyEvidenceApplicability(entry, purpose, { comparableSolverVersions });
                applicability[classification.applicability]++;
                reasons.set(classification.reason, (reasons.get(classification.reason) || 0) + 1);
                if (classification.applicability === 'admissible') {
                    hintAdmissible = true;
                    hintAdmissibleEvents++;
                    if (entry) hintStrata.add(provenanceDependencyStratum(entry));
                }
            }
            if (hintAdmissible) hintsWithAdmissibleEvidence++;
            const support = hintStrata.size || (hintAdmissible ? 1 : 0);
            independentSupportStrata += support;
            if (hintAdmissibleEvents > support) hintsWithDependentCollapse++;
        }
        result[purpose] = {
            events: applicability,
            hintsWithAdmissibleEvidence,
            independentSupportStrata,
            hintsWithDependentCollapse,
            rawAdmissibleEventsPerStratum: independentSupportStrata
                ? Number((applicability.admissible / independentSupportStrata).toFixed(2)) : null,
            reasons: Object.fromEntries([...reasons].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        };
    }
    return result;
}

function auditVersions(hints, currentSolverVersion) {
    const versions = new Map();
    for (const hint of hints) for (const entry of hint.provenance || []) {
        const version = entry?.solver?.version || 'unknown';
        versions.set(version, (versions.get(version) || 0) + 1);
    }
    return {
        currentSolverVersion,
        distinctVersions: versions.size,
        eventsOnCurrentVersion: versions.get(currentSolverVersion) || 0,
        eventsByVersion: Object.fromEntries([...versions].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    };
}

function auditLegacyAmbiguity(hints) {
    const fields = ['usedExistingHints', 'hintGuided', 'isolatedTechnique'];
    const missingContextFields = Object.fromEntries(fields.map(field => [field, 0]));
    let entriesMissingAnyCapabilityContext = 0;
    let nominalColdLegacyContextAmbiguity = 0;
    for (const hint of hints) for (const entry of hint.provenance || []) {
        const missing = fields.filter(field => !Object.hasOwn(entry?.context || {}, field));
        if (missing.length) entriesMissingAnyCapabilityContext++;
        for (const field of missing) missingContextFields[field]++;
        const classification = classifyEvidenceApplicability(entry, 'current-production-capability');
        if (classification.reason === 'legacy-context-ambiguity') nominalColdLegacyContextAmbiguity++;
    }
    return { entriesMissingAnyCapabilityContext, nominalColdLegacyContextAmbiguity, missingContextFields };
}

const report = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 2,
    evidenceAxes: {
        origin: 'mutually-exclusive producer identity',
        facets: 'overlapping search/run properties',
        admissibility: 'strict and narrow production cold-capability classification',
        purposeApplicability: 'query-dependent applicability with within-hint dependency strata',
    },
    corpora: {},
};
const currentSolverVersion = args.get('--current-solver-version') || null;
const comparableSolverVersions = (args.get('--comparable-solver-versions') || currentSolverVersion || '')
    .split(',').map(value => value.trim()).filter(Boolean);

for (const [label, corpusPath] of corpora) {
    const levels = readLevelsWithHints(corpusPath);
    const hints = flattenHints(levels);
    const evidence = summarizeProvenanceEvidence(hints);
    const dedupAudit = auditSemanticDuplicates(hints);
    report.corpora[label] = {
        corpusPath,
        levels: levels.length,
        ...evidence,
        evidencePurposeAudit: auditPurposes(hints, comparableSolverVersions),
        solverRegimeAudit: auditVersions(hints, currentSolverVersion),
        legacyAmbiguityAudit: auditLegacyAmbiguity(hints),
        semanticDedupAudit: dedupAudit,
    };
}

const totals = Object.values(report.corpora);
function combinePurposeAudits(corpora) {
    return Object.fromEntries(EVIDENCE_PURPOSES.map(purpose => {
        const rows = corpora.map(corpus => corpus.evidencePurposeAudit[purpose]);
        const reasons = new Map();
        for (const row of rows) for (const [reason, count] of Object.entries(row.reasons)) {
            reasons.set(reason, (reasons.get(reason) || 0) + count);
        }
        const events = {
            admissible: rows.reduce((sum, row) => sum + row.events.admissible, 0),
            'context-bound': rows.reduce((sum, row) => sum + row.events['context-bound'], 0),
            inadmissible: rows.reduce((sum, row) => sum + row.events.inadmissible, 0),
        };
        const independentSupportStrata = rows.reduce((sum, row) => sum + row.independentSupportStrata, 0);
        return [purpose, {
            events,
            hintsWithAdmissibleEvidence: rows.reduce((sum, row) => sum + row.hintsWithAdmissibleEvidence, 0),
            independentSupportStrata,
            hintsWithDependentCollapse: rows.reduce((sum, row) => sum + row.hintsWithDependentCollapse, 0),
            rawAdmissibleEventsPerStratum: independentSupportStrata
                ? Number((events.admissible / independentSupportStrata).toFixed(2)) : null,
            reasons: Object.fromEntries([...reasons].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        }];
    }));
}
report.total = {
    levels: totals.reduce((n, c) => n + c.levels, 0),
    hints: totals.reduce((n, c) => n + c.hints, 0),
    provenanceEntries: totals.reduce((n, c) => n + c.provenanceEntries, 0),
    unattributedHints: totals.reduce((n, c) => n + c.unattributedHints, 0),
    multiOriginHints: totals.reduce((n, c) => n + c.multiOriginHints, 0),
    duplicateEvents: totals.reduce((n, c) => n + c.semanticDedupAudit.duplicateEvents, 0),
    hintsWithDuplicates: totals.reduce((n, c) => n + c.semanticDedupAudit.hintsWithDuplicates, 0),
    evidencePurposeAudit: combinePurposeAudits(totals),
    legacyAmbiguityAudit: {
        entriesMissingAnyCapabilityContext: totals.reduce((sum, corpus) =>
            sum + corpus.legacyAmbiguityAudit.entriesMissingAnyCapabilityContext, 0),
        nominalColdLegacyContextAmbiguity: totals.reduce((sum, corpus) =>
            sum + corpus.legacyAmbiguityAudit.nominalColdLegacyContextAmbiguity, 0),
        missingContextFields: Object.fromEntries(['usedExistingHints', 'hintGuided', 'isolatedTechnique']
            .map(field => [field, totals.reduce((sum, corpus) =>
                sum + corpus.legacyAmbiguityAudit.missingContextFields[field], 0)])),
    },
};

const json = JSON.stringify(report, null, 2);
const out = args.get('--out');
if (out) {
    writeFileSync(out, `${json}\n`);
    console.error(`wrote ${path.resolve(out)}`);
}
console.log(json);

if (argv.includes('--fail-on-duplicates') && report.total.duplicateEvents > 0) process.exitCode = 1;
