#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sourceRoots = [
  'data/hints',
  'data/stress/hints',
  'data/stress/hints-random',
];

const authorityPaths = [
  'scripts/runtime-hint-projection-lib.mjs',
  'modules/domain/hint-runtime.mjs',
  'modules/canonical-json.mjs',
  'vite.config.ts',
];

const cacheRoot = '.cache/runtime-hint-projection';
const cachedManifestPath = path.join(cacheRoot, '_source-git-manifest.tsv');
const currentManifestPath = 'tmp/runtime-hint-projection-source.current.tsv';
const planPath = path.join(cacheRoot, '_reconcile-plan.json');

function lsTree(ref, paths) {
  const raw = execFileSync('git', ['ls-tree', '-r', ref, '--', ...paths], { encoding: 'utf8' });
  return raw.trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(/^[0-9]+\s+blob\s+([0-9a-f]+)\t(.+)$/u);
    if (!match) throw new Error(`unexpected git ls-tree row: ${line}`);
    return { sha: match[1], path: match[2] };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function serialize(rows) {
  return rows.map(row => `${row.sha}\t${row.path}`).join('\n') + '\n';
}

function digest(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function parseManifest(file) {
  if (!fs.existsSync(file)) return new Map();
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean);
  return new Map(rows.map(line => {
    const tab = line.indexOf('\t');
    if (tab < 0) throw new Error(`invalid projection source manifest row: ${line}`);
    return [line.slice(tab + 1), line.slice(0, tab)];
  }));
}

const currentRows = lsTree('HEAD', sourceRoots);
const sourceMaterial = serialize(currentRows);
const sourceKey = digest(sourceMaterial);
const authorityRows = lsTree('HEAD', authorityPaths);
const authorityKey = digest(serialize(authorityRows));

const command = process.argv[2] ?? 'key';
if (command === 'key') {
  fs.mkdirSync(path.dirname(currentManifestPath), { recursive: true });
  fs.writeFileSync(currentManifestPath, sourceMaterial);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `authority_key=${authorityKey}\nsource_key=${sourceKey}\n`);
  }
  process.stdout.write(JSON.stringify({ authorityKey, sourceKey }) + '\n');
} else if (command === 'plan') {
  const cached = parseManifest(cachedManifestPath);
  const current = new Map(currentRows.map(row => [row.path, row.sha]));
  const changed = [];
  const deleted = [];
  for (const [file, sha] of current) {
    if (cached.get(file) !== sha) changed.push(file);
  }
  for (const file of cached.keys()) {
    if (!current.has(file)) deleted.push(file);
  }
  fs.mkdirSync(cacheRoot, { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify({ changed, deleted }, null, 2) + '\n');
  fs.writeFileSync(cachedManifestPath, sourceMaterial);
  process.stdout.write(`runtime Hint projection overlay plan: ${changed.length} changed/added, ${deleted.length} deleted\n`);
} else if (command === 'seed-manifest') {
  fs.mkdirSync(cacheRoot, { recursive: true });
  fs.writeFileSync(cachedManifestPath, sourceMaterial);
} else {
  throw new Error(`unknown command: ${command}`);
}
