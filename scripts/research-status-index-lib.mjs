import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

export function buildResearchStatusIndex(root) {
    const reportsRoot = path.join(root, 'reports');
    const topics = [];
    for (const name of readdirSync(reportsRoot).sort()) {
        const filename = REPORT_NAME.exec(name);
        if (!filename) continue;
        const reportPath = `reports/${name}`;
        const source = readFileSync(path.join(root, reportPath), 'utf8');
        const metadata = METADATA.exec(source);
        if (!metadata) continue; // Older evidence predates the structured report convention.
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
    const queuePath = 'docs/solver-optimization-current-queue.md';
    const queueSource = existsSync(path.join(root, queuePath)) ? readFileSync(path.join(root, queuePath), 'utf8') : '';
    const queue = tableRows(queueSource, '## Ranked queue').map(([priority, question, state, gate]) => ({
        topicId: `queue-${priority}`, priority: Number(priority), question,
        status: normalizedState(state), authority: queuePath, authorityKind: 'current-queue',
        state, remainingGate: gate,
    }));
    const ledgerPath = 'docs/solver-opt-in-experiment-ledger.md';
    const ledgerSource = existsSync(path.join(root, ledgerPath)) ? readFileSync(path.join(root, ledgerPath), 'utf8') : '';
    const experiments = tableRows(ledgerSource, '## Current production-default-OFF flags')
        .map(([flag, disposition, evidence]) => ({
            experimentId: flag.replace(/`/g, ''), status: normalizedState(disposition), disposition,
            latestEvidenceOrGate: evidence, authority: ledgerPath, authorityKind: 'opt-in-ledger',
        }));
    return { schemaVersion: 2, scope: 'current-authority-and-structured-evidence',
        authorityOrder: ['current-queue', 'opt-in-ledger', 'structured-report'], queue, experiments,
        evidence: topics };
}

export function writeResearchStatusIndex(index, output) {
    writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`);
}
