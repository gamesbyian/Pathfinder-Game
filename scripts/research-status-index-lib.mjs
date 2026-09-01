import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { attemptIdentityTerms } from '../modules/solver/attempt-identity.mjs';
import { SOLVER_STAGE_IDS, solverStageIdentityTerms } from '../modules/solver/stage-id-normalization.mjs';
import { ROUTING_REGIMES, routingRegimeIdentityTerms } from '../modules/solver/routing-regime-normalization.mjs';

const REPORT_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const METADATA = /^# (.+)\r?\n\r?\n> \*\*Status:\*\* ([a-z-]+)\r?\n> \*\*Last evidence:\*\* (\d{4}-\d{2}-\d{2}) — (.+)\r?\n> \*\*Decision:\*\* (.+)\r?\n> \*\*Remaining gate:\*\* (.+)$/m;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g;
const ARTIFACT_PATH = /`((?:data|logs|reports)\/[A-Za-z0-9_./*{}<>-]+)`/g;

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

const normalizedState = value => {
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

export function buildResearchStatusIndex(root) {
    const reportsRoot = path.join(root, 'reports');
    const topics = [];
    const legacyEvidence = [];
    for (const name of readdirSync(reportsRoot).sort()) {
        const filename = REPORT_NAME.exec(name);
        if (!filename) continue;
        const reportPath = `reports/${name}`;
        const source = readFileSync(path.join(root, reportPath), 'utf8');
        const metadata = METADATA.exec(source);
        if (!metadata) {
            legacyEvidence.push({
                topicId: filename[2], date: filename[1], title: reportTitle(source, filename[2]),
                headings: reportHeadings(source), report: reportPath,
            });
            continue;
        }
        const linkedPaths = [...source.matchAll(MARKDOWN_LINK)]
            .map(match => repositoryPath(root, reportPath, match[1])).filter(Boolean);
        const currentAuthorities = linkedPaths.filter(link => link.startsWith('docs/') &&
            !link.startsWith('docs/archive/') && existsSync(path.join(root, link)));
        const artifacts = new Set([
            ...linkedPaths.filter(link => /^(?:data|logs|reports)\//.test(link)),
            ...[...source.matchAll(ARTIFACT_PATH)].map(match => match[1]),
        ]);
        topics.push({
            topicId: filename[2], status: metadata[2], title: metadata[1],
            authorities: [...new Set(currentAuthorities)].sort(),
            latestEvidence: { date: metadata[3], summary: metadata[4], report: reportPath },
            decision: metadata[5], remainingGate: metadata[6], artifacts: [...artifacts].sort(),
        });
    }
    const workstreamsPath = 'docs/solver-optimization-workstreams.md';
    const workstreamsSource = existsSync(path.join(root, workstreamsPath)) ? readFileSync(path.join(root, workstreamsPath), 'utf8') : '';
    // Preserve the public `queue` collection name for index consumers, but source it from the
    // current authority. Workstream IDs are stable identifiers, explicitly not execution ranks.
    const queue = tableRows(workstreamsSource, '## Active workstreams').map(([id, question, state, gate]) => ({
        topicId: `workstream-${id}`, workstreamId: Number(id), question,
        status: normalizedState(state), authority: workstreamsPath, authorityKind: 'workstreams',
        state, remainingGate: gate,
    }));
    const ledgerPath = 'docs/solver-opt-in-experiment-ledger.md';
    const ledgerSource = existsSync(path.join(root, ledgerPath)) ? readFileSync(path.join(root, ledgerPath), 'utf8') : '';
    const experiments = tableRows(ledgerSource, '## Current production-default-OFF flags')
        .map(([flag, disposition, evidence]) => ({
            experimentId: flag.replace(/`/g, ''), status: normalizedState(disposition), disposition,
            latestEvidenceOrGate: evidence, authority: ledgerPath, authorityKind: 'opt-in-ledger',
        }));
    return { schemaVersion: 3, scope: 'current-authority-and-top-level-evidence',
        authorityOrder: ['workstreams', 'opt-in-ledger', 'structured-report', 'legacy-report'], queue, experiments,
        evidence: topics, legacyEvidence };
}

function compactEntry(kind, entry) {
    if (kind === 'queue') return { kind, id: entry.topicId, workstreamId: entry.workstreamId ?? null, status: entry.status,
        question: entry.question, gate: entry.remainingGate, authority: entry.authority };
    if (kind === 'experiment') return { kind, id: entry.experimentId, status: entry.status,
        decision: entry.disposition, evidence: entry.latestEvidenceOrGate, authority: entry.authority };
    if (kind === 'legacy-evidence') return { kind, id: entry.topicId, date: entry.date, title: entry.title,
        headings: entry.headings, report: entry.report };
    return { kind, id: entry.topicId, status: entry.status, title: entry.title,
        date: entry.latestEvidence.date, decision: entry.decision, gate: entry.remainingGate,
        report: entry.latestEvidence.report, authorities: entry.authorities };
}

const ATTEMPT_IDENTITY_PATTERNS = Object.freeze([
    /admissible-order\|tieBreak=[A-Za-z0-9_-]+\|lds=(?:on|off)/gu,
    /repair\|score=repair\|guidance=(?:standard|turn-biased|must-turn-biased)/gu,
    /beam\|score=[A-Za-z0-9_-]+\|bias=(?:[A-Za-z0-9_-]+|none)\|width=[1-9]\d*\|retention=(?:plain|mechanic-buckets)/gu,
    /dfs\|score=[A-Za-z0-9_-]+\|bias=(?:[A-Za-z0-9_-]+|none)/gu,
    /ida:[A-Za-z0-9_-]+(?:\(lds\))?/gu,
    /(?:dfs|beam):[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?(?:@beam[1-9]\d*)?(?:\(diverse\))?(?::repair)?(?:\(mustTurnBiased\)|\(turnBiased\))?/gu,
]);

function expandKnownAliases(terms, variants) {
    let added = false;
    const lowerVariants = variants.map(value => value.toLowerCase());
    for (const term of [...terms]) {
        for (const source of lowerVariants) {
            if (!term.includes(source)) continue;
            for (const target of lowerVariants) {
                const expanded = term.replaceAll(source, target);
                if (!terms.has(expanded)) {
                    terms.add(expanded);
                    added = true;
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
            changed = expandKnownAliases(terms, solverStageIdentityTerms(canonical)) || changed;
        }
        for (const canonical of ROUTING_REGIMES) {
            changed = expandKnownAliases(terms, routingRegimeIdentityTerms(canonical)) || changed;
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
