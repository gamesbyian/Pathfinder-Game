import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { currentDocumentationMarkdownPaths, currentDocumentationReferences } from './documentation-index-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'pathfinder-doc-index-'));
mkdirSync(path.join(root, 'docs'), { recursive: true });
writeFileSync(path.join(root, 'docs/README.md'), `# Index

## Current references

| Doc | Owns |
|---|---|
| [\`current.md\`](current.md) | current authority |
| [\`data.json\`](data.json) | structured authority |

## History

[old plan](old-plan.md)
[external](https://example.com)
`);

assert.deepEqual(currentDocumentationReferences(root), [
    { label: 'current.md', destination: 'current.md', path: 'docs/current.md', ownership: 'current authority' },
    { label: 'data.json', destination: 'data.json', path: 'docs/data.json', ownership: 'structured authority' },
]);
assert.deepEqual(currentDocumentationMarkdownPaths(root), ['docs/current.md']);
assert.equal(currentDocumentationReferences(process.cwd()).some(row =>
    row.path === 'docs/solver-optimization-workstreams.md'), true);
assert.equal(currentDocumentationReferences(process.cwd()).some(row =>
    row.path === 'docs/solver-research-post-naming-resumption.md'), false,
    'links outside Current references are navigation, not current-authority declarations');

console.log('documentation index parsing tests passed');
