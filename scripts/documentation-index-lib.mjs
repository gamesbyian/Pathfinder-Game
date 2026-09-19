import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const normalize = value => value.split(path.sep).join('/');

export function currentDocumentationReferences(root = process.cwd()) {
    const indexPath = path.join(root, 'docs/README.md');
    if (!existsSync(indexPath)) return [];
    const lines = readFileSync(indexPath, 'utf8').split(/\r?\n/u);
    const start = lines.findIndex(line => line.trim() === '## Current references');
    if (start < 0) return [];

    const rows = [];
    for (const line of lines.slice(start + 1)) {
        if (line.startsWith('## ')) break;
        const match = /^\| \[\`([^\`]+)\`\]\(([^)]+)\) \| (.+) \|$/u.exec(line);
        if (!match) continue;
        const destination = match[2].split('#', 1)[0].trim();
        if (!destination || /^[a-z][a-z0-9+.-]*:/iu.test(destination)) continue;
        const target = normalize(path.relative(root, path.resolve(root, 'docs', destination)));
        rows.push({
            label: match[1],
            destination,
            path: target,
            ownership: match[3].trim(),
        });
    }
    return rows;
}

export function currentDocumentationMarkdownPaths(root = process.cwd()) {
    return currentDocumentationReferences(root)
        .map(row => row.path)
        .filter(relative => relative.endsWith('.md'));
}
