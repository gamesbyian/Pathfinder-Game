import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { attemptIdentityTerms } from '../modules/solver/attempt-identity.mjs';
import { SOLVER_STAGE_IDS, solverStageIdentityTerms } from '../modules/solver/stage-id-normalization.mjs';
import { ROUTING_REGIMES, routingRegimeIdentityTerms } from '../modules/solver/routing-regime-normalization.mjs';
import { parseResearchCloseoutCapsule } from './investigation-report-metadata.mjs';
import { validateResearchRepositoryRef } from './research-repository-ref-lib.mjs';

const REPORT_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const METADATA = /^# (.+)\r?\n\r?\n> \*\*Status:\*\* ([a-z-]+)\r?\n> \*\*Last evidence:\*\* (\d{4}-\d{2}-\d{2}) — (.+)\r?\n> \*\*Decision:\*\* (.+)\r?\n> \*\*Remaining gate:\*\* (.+)$/m;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g;
const ARTIFACT_PATH = /`((?:data|logs|reports)\/[A-Za-z0-9_./*{}<>-]+)`/g;

function reportMetadataValue(source, label) {
    const prefix = `> **${label}:** `;
    const line = source.split(/\r?\n/u).find(candidate =>
        candidate.toLowerCase().startsWith(prefix.toLowerCase()));
    return line ? line.slice(prefix.length).trim() : null;
}

function metadataScalar(source, label) {
    const value = reportMetadataValue(source, label);
    if (!value || /^none$/iu.test(value)) return null;
    return value.replaceAll('`', '').trim();
}

function metadataList(source, label) {
    const value = reportMetadataValue(source, label);
    if (!value || /^none$/iu.test(value)) return [];
    return value.split(',').map(item => item.replaceAll('`', '').trim()).filter(Boolean);
}

function tableRows(source, heading) {
    const start = source.indexOf(heading);
    if (start < 0) return [];
    const lines = source.slice(start).split(/\r?\n/).slice(1);
    const rows = [];
    let entered = false;
    for (const line of lines) {
        if (line.startsWith('## ')) break;
        if (!line.startsWith('|')) { if (entered && line.trim()) break; continue; }
        entered = true;
        if (/^\|[ :|-]+\|$/u.test(line)) continue;
        rows.push(line.split('|').slice(1, -1).map(cell => cell.trim()));
    }
    return rows.slice(1);
}

const WORKSTREAM_EXECUTION_STATES = Object.freeze([
    'active',
    'supporting',
    'method-complete',
    'subsumed',
    'closed',
    'on-demand',
]);

function workstreamStatusFromExecutionState(value) {
    switch (value) {
        case 'active': return 'active';
        case 'supporting': return 'pending';
        case 'method-complete': return 'completed';
        case 'subsumed': return 'superseded';
        case 'closed': return 'rejected';
        case 'on-demand': return 'pending';
        default: throw new Error(`unknown workstream execution state: ${value}`);
    }
}

const EXPERIMENT_PROMOTION_STATES = Object.freeze([
    'closed',
    'open',
    'no-current-gate',
    'not-promotion-candidate',
]);

function experimentStatusFromPromotionState(value) {
    switch (value) {
        case 'closed': return 'rejected';
        case 'open': return 'active';
        case 'no-current-gate': return 'pending';
        case 'not-promotion-candidate': return 'pending';
        default: throw new Error(`unknown experiment promotion state: ${value}`);
    }
}

// Legacy-only compatibility for pre-structured workstream tables. New control-plane state must use explicit tokens.
const normalizedLegacyWorkstreamState = value => {
    const state = value.replace(/\*\*/g, '').toLowerCase();
    if (state.includes('superseded')) return 'superseded';
    if (state.includes('active') || state.includes('shipping') || state.includes('promotion gate')) return 'active';
    if (state.includes('promoted') || state.includes('default-on')) return 'promoted';
    if (state.includes('negative') || state.includes('negligible') || state.includes('closed')) return 'rejected';
    if (state.includes('complete')) return 'completed';
    return 'pending';
};

function repositoryPath(root, reportPath, destination) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(destination)) return null;
    const resolved = path.resolve(root, path.dirname(reportPath), destination);
    const relative = path.relative(root, resolved).split(path.sep).join('/');
    return relative.startsWith('../') ? null : relative;
}

function reportTitle(source, fallback) {
    return /^#\s+(.+)$/m.exec(source)?.[1]?.trim() || fallback;
}

function reportHeadings(source) {
    return [...source.matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim()).slice(0, 16);
}

function reportMachineMetadata(source, reportPath) {
    const legacy = METADATA.exec(source);
    const closeout = parseResearchCloseoutCapsule(source);
    if (!closeout) {
        if (!legacy) return null;
        return {
            source: 'legacy-status-block',
            status: legacy[2],
            title: legacy[1],
            lastEvidenceDate: legacy[3],
            lastEvidenceSummary: legacy[4],
            decision: legacy[5],
            remainingGate: legacy[6],
            researchQuestion: metadataScalar(source, 'Research question'),
            premiseRefs: metadataList(source, 'Premise refs'),
            measurementOpportunities: metadataList(source, 'Measurement opportunity'),
            evidenceRole: metadataScalar(source, 'Evidence role'),
            selection: metadataScalar(source, 'Selection'),
            populationIdentity: metadataScalar(source, 'Population identity'),
            selectionHistory: metadataScalar(source, 'Selection history'),
            inferenceScope: metadataScalar(source, 'Inference scope'),
            sourceArtifacts: [],
        };
    }

    if (legacy) {
        const mismatches = [];
        if (legacy[2] !== closeout.status) mismatches.push('status');
        if (legacy[3] !== closeout.lastEvidenceDate) mismatches.push('lastEvidenceDate');
        const proseQuestion = metadataScalar(source, 'Research question');
        if (closeout.joins?.researchQuestion && proseQuestion && closeout.joins.researchQuestion !== proseQuestion) {
            mismatches.push('researchQuestion');
        }
        const proseEvidenceRole = metadataScalar(source, 'Evidence role');
        if (closeout.evidenceRole && proseEvidenceRole && closeout.evidenceRole !== proseEvidenceRole) {
            mismatches.push('evidenceRole');
        }
        const prosePopulation = metadataScalar(source, 'Population identity');
        if (closeout.scope?.populationIdentity && prosePopulation && closeout.scope.populationIdentity !== prosePopulation) {
            mismatches.push('populationIdentity');
        }
        if (mismatches.length) {
            throw new Error(`${reportPath}: structured research closeout disagrees with canonical status metadata: ${mismatches.join(', ')}`);
        }
    }

    const measurementOpportunity = closeout.joins?.measurementOpportunity;
    return {
        source: 'structured-closeout',
        status: closeout.status,
        title: reportTitle(source, reportPath),
        lastEvidenceDate: closeout.lastEvidenceDate,
        lastEvidenceSummary: legacy?.[4] ?? 'Structured research closeout recorded.',
        decision: closeout.decision,
        remainingGate: closeout.remainingGate,
        researchQuestion: closeout.joins?.researchQuestion ?? metadataScalar(source, 'Research question'),
        premiseRefs: closeout.joins?.premiseRefs?.length ? closeout.joins.premiseRefs : metadataList(source, 'Premise refs'),
        measurementOpportunities: measurementOpportunity ? [measurementOpportunity] : metadataList(source, 'Measurement opportunity'),
        evidenceRole: closeout.evidenceRole ?? metadataScalar(source, 'Evidence role'),
        selection: closeout.scope?.selection ?? metadataScalar(source, 'Selection'),
        populationIdentity: closeout.scope?.populationIdentity ?? metadataScalar(source, 'Population identity'),
        selectionHistory: metadataScalar(source, 'Selection history'),
        inferenceScope: closeout.scope?.inferenceScope ?? metadataScalar(source, 'Inference scope'),
        sourceArtifacts: closeout.sourceArtifacts ?? [],
    };
}

export function buildResearchStatusIndex(root, { allowHistoricalWorkstreamTable = false } = {}) {
    const reportsRoot = path.join(root, 'reports');
    const topics = [];
    const legacyEvidence = [];
    for (const name of readdirSync(reportsRoot).sort()) {
        const filename = REPORT_NAME.exec(name);
        if (!filename) continue;
        const reportPath = `reports/${name}`;
        const source = readFileSync(path.join(root, reportPath), 'utf8');
        const metadata = reportMachineMetadata(source, reportPath);
        if (!metadata) {
            legacyEvidence.push({
                topicId: filename[2], date: filename[1], title: reportTitle(source, filename[2]),
                headings: reportHeadings(source), report: reportPath,
            });
            continue;
        }
        const linkedPaths = [...source.matchAll(MARKDOWN_LINK)]
            .map(match => repositoryPath(root, reportPath, match[1])).filter(Boolean);
        const linkedCurrentDocs = linkedPaths.filter(link => link.startsWith('docs/') &&
            !link.startsWith('docs/archive/') && existsSync(path.join(root, link)));
        const sourceArtifacts = [...new Set(metadata.sourceArtifacts ?? [])].sort();
        const sourceArtifactSet = new Set(sourceArtifacts);
        const linkedArtifacts = [...new Set([
            ...linkedPaths.filter(link => /^(?:data|logs|reports)\//.test(link)),
            ...[...source.matchAll(ARTIFACT_PATH)].map(match => match[1]),
        ])].filter(link => !sourceArtifactSet.has(link)).sort();
        const artifacts = [...new Set([...sourceArtifacts, ...linkedArtifacts])].sort();
        topics.push({
            topicId: filename[2], status: metadata.status, title: metadata.title,
            metadataSource: metadata.source,
            linkedCurrentDocs: [...new Set(linkedCurrentDocs)].sort(),
            authorities: [...new Set(linkedCurrentDocs)].sort(),
            authorityRelation: 'hyperlink-discovery-only',
            latestEvidence: { date: metadata.lastEvidenceDate, summary: metadata.lastEvidenceSummary, report: reportPath },
            decision: metadata.decision, remainingGate: metadata.remainingGate,
            sourceArtifacts,
            linkedArtifacts,
            artifactRelation: sourceArtifacts.length ? 'structured-source+linked-discovery' : 'linked-discovery-only',
            artifacts,
            researchQuestion: metadata.researchQuestion,
            premiseRefs: metadata.premiseRefs,
            measurementOpportunities: metadata.measurementOpportunities,
            evidenceRole: metadata.evidenceRole,
            selection: metadata.selection,
            populationIdentity: metadata.populationIdentity,
            selectionHistory: metadata.selectionHistory,
            inferenceScope: metadata.inferenceScope,
        });
    }
    const workstreamsPath = 'docs/solver-optimization-workstreams.md';
    const workstreamsSource = existsSync(path.join(root, workstreamsPath)) ? readFileSync(path.join(root, workstreamsPath), 'utf8') : '';
    // Preserve the public `queue` collection name for index consumers, but source it from the
    // current authority. Workstream IDs are stable identifiers, explicitly not execution ranks.
    const structuredWorkstreamRows = tableRows(workstreamsSource, '## Workstream state');
    if (!structuredWorkstreamRows.length && !allowHistoricalWorkstreamTable) {
        throw new Error(`${workstreamsPath}: current authority requires structured ## Workstream state table`);
    }
    const legacyWorkstreamRows = structuredWorkstreamRows.length
        ? []
        : tableRows(workstreamsSource, '## Active workstreams');
    const queue = structuredWorkstreamRows.length
        ? structuredWorkstreamRows.map(([id, question, executionStateRaw, state, gate, questionRef]) => {
            const executionState = String(executionStateRaw ?? '').replaceAll('`', '').trim();
            if (!WORKSTREAM_EXECUTION_STATES.includes(executionState)) {
                throw new Error(`${workstreamsPath}: unknown workstream execution state ${executionState || '(missing)'} for ${id}`);
            }
            return {
                topicId: `workstream-${id}`,
                workstreamId: /^\d+$/u.test(id) ? Number(id) : id,
                question,
                executionState,
                status: workstreamStatusFromExecutionState(executionState),
                authority: workstreamsPath,
                authorityKind: 'workstreams',
                state,
                remainingGate: gate,
                questionRef: questionRef && questionRef !== '—' ? questionRef.replaceAll('`', '').trim() : null,
            };
        })
        : legacyWorkstreamRows.map(([id, question, state, gate, questionRef]) => ({
            topicId: `workstream-${id}`, workstreamId: /^\d+$/u.test(id) ? Number(id) : id, question,
            executionState: null,
            status: normalizedLegacyWorkstreamState(state), authority: workstreamsPath, authorityKind: 'workstreams',
            state, remainingGate: gate,
            questionRef: questionRef && questionRef !== '—' ? questionRef.replaceAll('`', '').trim() : null,
        }));
    const ledgerPath = 'docs/solver-opt-in-experiment-ledger.md';
    const ledgerSource = existsSync(path.join(root, ledgerPath)) ? readFileSync(path.join(root, ledgerPath), 'utf8') : '';
    const experiments = tableRows(ledgerSource, '## Current production-default-OFF flags')
        .map(([flag, promotionStateRaw, disposition]) => {
            const promotionState = String(promotionStateRaw ?? '').replaceAll('`', '').trim();
            if (!EXPERIMENT_PROMOTION_STATES.includes(promotionState)) {
                throw new Error(`${ledgerPath}: unknown promotion state ${promotionState || '(missing)'} for ${flag}`);
            }
            return {
                experimentId: flag.replace(/`/g, ''),
                promotionState,
                status: experimentStatusFromPromotionState(promotionState),
                disposition,
                latestEvidenceOrGate: disposition,
                authority: ledgerPath,
                authorityKind: 'opt-in-ledger',
            };
        });
    const promotions = tableRows(ledgerSource, '## Recently promoted/default-ON mechanisms worth remembering')
        .map(([mechanismRaw, decisionEvidenceRaw, disposition]) => {
            const mechanisms = [...String(mechanismRaw ?? '').matchAll(/`([A-Z0-9_]+)`/gu)]
                .map(match => match[1]);
            if (!mechanisms.length) {
                throw new Error(`${ledgerPath}: promoted/default-ON row has no mechanism identity: ${mechanismRaw}`);
            }
            const decisionEvidenceRef = decisionEvidenceRaw && decisionEvidenceRaw !== '—'
                ? String(decisionEvidenceRaw).replaceAll('`', '').trim()
                : null;
            if (decisionEvidenceRef) {
                validateResearchRepositoryRef(decisionEvidenceRef, {
                    root,
                    requireFile: true,
                    label: `${ledgerPath} decision evidence ref for ${mechanisms.join('+')}`,
                });
            }
            return {
                promotionId: mechanisms.join('+'),
                mechanisms,
                status: 'promoted',
                decisionEvidenceRef,
                disposition,
                authority: ledgerPath,
                authorityKind: 'opt-in-ledger-promotion-history',
            };
        });
    return { schemaVersion: 4, scope: 'current-authority-and-top-level-evidence',
        authorityOrder: ['workstreams', 'opt-in-ledger', 'structured-closeout-report', 'legacy-status-block-report', 'legacy-report'], queue, experiments, promotions,
        evidence: topics, legacyEvidence };
}

function compactEntry(kind, entry) {
    if (kind === 'queue') return { kind, id: entry.topicId, workstreamId: entry.workstreamId ?? null, status: entry.status,
        executionState: entry.executionState ?? null,
        question: entry.question, questionRef: entry.questionRef ?? null, gate: entry.remainingGate, authority: entry.authority };
    if (kind === 'experiment') return { kind, id: entry.experimentId, status: entry.status,
        promotionState: entry.promotionState ?? null,
        decision: entry.disposition, evidence: entry.latestEvidenceOrGate, authority: entry.authority };
    if (kind === 'promotion') return { kind, id: entry.promotionId, status: entry.status,
        mechanisms: entry.mechanisms ?? [], decisionEvidenceRef: entry.decisionEvidenceRef ?? null,
        decision: entry.disposition, authority: entry.authority };
    if (kind === 'legacy-evidence') return { kind, id: entry.topicId, date: entry.date, title: entry.title,
        headings: entry.headings, report: entry.report };
    return { kind, id: entry.topicId, status: entry.status, title: entry.title,
        date: entry.latestEvidence.date, decision: entry.decision, gate: entry.remainingGate,
        metadataSource: entry.metadataSource ?? null,
        report: entry.latestEvidence.report,
        linkedCurrentDocs: entry.linkedCurrentDocs ?? entry.authorities ?? [],
        authorityRelation: entry.authorityRelation ?? 'legacy-unknown',
        authorities: entry.authorities,
        sourceArtifacts: entry.sourceArtifacts ?? [],
        linkedArtifacts: entry.linkedArtifacts ?? [],
        artifactRelation: entry.artifactRelation ?? 'legacy-unknown',
        artifacts: entry.artifacts ?? [],
        researchQuestion: entry.researchQuestion ?? null,
        premiseRefs: entry.premiseRefs ?? [],
        measurementOpportunities: entry.measurementOpportunities ?? [],
        evidenceRole: entry.evidenceRole ?? null,
        selection: entry.selection ?? null,
        populationIdentity: entry.populationIdentity ?? null,
        inferenceScope: entry.inferenceScope ?? null };
}

const ATTEMPT_IDENTITY_PATTERNS = Object.freeze([
    /admissible-order\|tieBreak=[A-Za-z0-9_-]+\|lds=(?:on|off)/gu,
    /repair\|score=repair\|guidance=(?:standard|turn-biased|must-turn-biased)/gu,
    /beam\|score=[A-Za-z0-9_-]+\|bias=(?:[A-Za-z0-9_-]+|none)\|width=[1-9]\d*\|retention=(?:plain|mechanic-buckets)/gu,
    /dfs\|score=[A-Za-z0-9_-]+\|bias=(?:[A-Za-z0-9_-]+|none)/gu,
    /ida:[A-Za-z0-9_-]+(?:\(lds\))?/gu,
    /(?:dfs|beam):[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?(?:@beam[1-9]\d*)?(?:\(diverse\))?(?::repair)?(?:\(mustTurnBiased\)|\(turnBiased\))?/gu,
]);

function aliasReplacementAllowed(term, index, source, kind) {
    const before = term.slice(0, index);
    const after = term.slice(index + source.length);
    const previous = before.at(-1) ?? '';
    const next = after[0] ?? '';
    if (/[a-z0-9_-]/u.test(previous) || /[a-z0-9_-]/u.test(next)) return false;
    if (kind === 'stage' && source === 'admissible-order' && after.startsWith('|tiebreak=')) return false;
    if (kind === 'routing' && /(?:score=|tiebreak=|dfs:|ida:)$/u.test(before)) return false;
    return true;
}

function expandKnownAliases(terms, variants, kind) {
    let added = false;
    const lowerVariants = variants.map(value => value.toLowerCase());
    for (const term of [...terms]) {
        for (const source of lowerVariants) {
            let from = 0;
            while (from <= term.length - source.length) {
                const index = term.indexOf(source, from);
                if (index < 0) break;
                from = index + source.length;
                if (!aliasReplacementAllowed(term, index, source, kind)) continue;
                for (const target of lowerVariants) {
                    const expanded = term.slice(0, index) + target + term.slice(index + source.length);
                    if (!terms.has(expanded)) {
                        terms.add(expanded);
                        added = true;
                    }
                }
            }
        }
    }
    return added;
}

function expandAttemptIdentityAliases(terms) {
    let added = false;
    for (const term of [...terms]) {
        for (const pattern of ATTEMPT_IDENTITY_PATTERNS) {
            pattern.lastIndex = 0;
            for (const match of term.matchAll(pattern)) {
                let variants;
                try { variants = attemptIdentityTerms(match[0]); } catch { continue; }
                for (const target of variants) {
                    const expanded = term.slice(0, match.index) + target.toLowerCase()
                        + term.slice(match.index + match[0].length);
                    if (!terms.has(expanded)) {
                        terms.add(expanded);
                        added = true;
                    }
                }
            }
        }
    }
    return added;
}

function equivalentQueryTerms(query) {
    const raw = query.trim().toLowerCase();
    if (!raw) return [];
    const terms = new Set([raw]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const canonical of SOLVER_STAGE_IDS) {
            changed = expandKnownAliases(terms, solverStageIdentityTerms(canonical), 'stage') || changed;
        }
        for (const canonical of ROUTING_REGIMES) {
            changed = expandKnownAliases(terms, routingRegimeIdentityTerms(canonical), 'routing') || changed;
        }
        changed = expandAttemptIdentityAliases(terms) || changed;
        if (terms.size > 128) throw new Error('research-status query alias expansion exceeded safety bound');
    }
    return [...terms];
}

export function queryResearchStatusIndex(index, { query = '', status = '', kind = '' } = {}) {
    const entries = [
        ...index.queue.map(entry => compactEntry('queue', entry)),
        ...index.experiments.map(entry => compactEntry('experiment', entry)),
        ...(index.promotions ?? []).map(entry => compactEntry('promotion', entry)),
        ...index.evidence.map(entry => compactEntry('evidence', entry)),
        ...(index.legacyEvidence ?? []).map(entry => compactEntry('legacy-evidence', entry)),
    ];
    const queryTerms = equivalentQueryTerms(query);
    const wantedStatus = status.trim().toLowerCase();
    const wantedKind = kind.trim().toLowerCase();
    return entries.filter(entry => {
        if (wantedKind && entry.kind !== wantedKind) return false;
        if (wantedStatus && entry.status !== wantedStatus) return false;
        if (!queryTerms.length) return true;
        const haystack = JSON.stringify(entry).toLowerCase();
        return queryTerms.some(term => haystack.includes(term));
    });
}

export function compactResearchStatusIndex(index, filters = {}) {
    const entries = queryResearchStatusIndex(index, filters);
    return { schemaVersion: 1, count: entries.length, entries };
}

export function writeResearchStatusIndex(index, output) {
    writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`);
}
