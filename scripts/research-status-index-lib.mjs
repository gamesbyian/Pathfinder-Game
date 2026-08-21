import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPORT_NAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const METADATA = /^# (.+)\r?\n\r?\n> \*\*Status:\*\* ([a-z-]+)\r?\n> \*\*Last evidence:\*\* (\d{4}-\d{2}-\d{2}) — (.+)\r?\n> \*\*Decision:\*\* (.+)\r?\n> \*\*Remaining gate:\*\* (.+)$/m;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g;
const ARTIFACT_PATH = /`((?:data|logs|reports)\/[A-Za-z0-9_./*{}<>-]+)`/g;

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
    return { schemaVersion: 1, scope: 'structured-investigation-reports', topics };
}

export function writeResearchStatusIndex(index, output) {
    writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`);
}
