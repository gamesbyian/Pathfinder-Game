#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const runtimePaths = [
  'data/levels.json',
  'data/level-heatmaps.json',
  'data/themes.json',
  'data/hints',
  'data/stress/stress-levels.json',
  'data/stress/stress-levels-random.json',
  'data/stress/stress-levels-envelope.json',
  'data/stress/hints',
  'data/stress/hints-random',
  'data/stress/hints-envelope',
];

const currentManifestPath = 'tmp/runtime-data-manifest.current.tsv';
const cachedManifestPath = '.ci-cache/runtime-data-manifest.tsv';

function listManifest(ref = 'HEAD') {
  const raw = execFileSync('git', ['ls-tree', '-r', ref, '--', ...runtimePaths], { encoding: 'utf8' });
  return raw.trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(/^[0-9]+\s+blob\s+([0-9a-f]+)\t(.+)$/u);
    if (!match) throw new Error(`unexpected git ls-tree row: ${line}`);
    return { sha: match[1], path: match[2] };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function serialize(rows) {
  return rows.map(row => `${row.sha}\t${row.path}`).join('\n') + '\n';
}

function writeCurrent(rows) {
  fs.mkdirSync(path.dirname(currentManifestPath), { recursive: true });
  fs.writeFileSync(currentManifestPath, serialize(rows));
}

function publishKey(rows) {
  const key = crypto.createHash('sha256').update(serialize(rows)).digest('hex');
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `key=${key}\n`);
  process.stdout.write(`${key}\n`);
}

function parseManifest(file) {
  if (!fs.existsSync(file)) return null;
  const map = new Map();
  for (const line of fs.readFileSync(file, 'utf8').trim().split('\n')) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab < 0) throw new Error(`invalid runtime-data manifest row: ${line}`);
    map.set(line.slice(tab + 1), line.slice(0, tab));
  }
  return map;
}

function materializeFullTree() {
  const patterns = [
    '/data/levels.json',
    '/data/level-heatmaps.json',
    '/data/themes.json',
    '/data/hints/',
    '/data/stress/stress-levels.json',
    '/data/stress/stress-levels-random.json',
    '/data/stress/stress-levels-envelope.json',
    '/data/stress/hints/',
    '/data/stress/hints-random/',
    '/data/stress/hints-envelope/',
  ];
  execFileSync('git', ['sparse-checkout', 'add', ...patterns], { stdio: 'inherit' });
}

function writeBlob(filePath) {
  const bytes = execFileSync('git', ['show', `HEAD:${filePath}`], { encoding: null, maxBuffer: 256 * 1024 * 1024 });
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
}

function reconcile(rows) {
  const cached = parseManifest(cachedManifestPath);
  if (cached === null) {
    materializeFullTree();
  } else {
    const current = new Map(rows.map(row => [row.path, row.sha]));
    let changed = 0;
    let deleted = 0;
    for (const [filePath, sha] of current) {
      if (cached.get(filePath) === sha && fs.existsSync(filePath)) continue;
      writeBlob(filePath);
      changed++;
    }
    for (const filePath of cached.keys()) {
      if (current.has(filePath)) continue;
      fs.rmSync(filePath, { force: true });
      deleted++;
    }
    process.stdout.write(`runtime-data overlay: ${changed} changed/added, ${deleted} deleted\n`);
  }
  fs.mkdirSync(path.dirname(cachedManifestPath), { recursive: true });
  fs.writeFileSync(cachedManifestPath, serialize(rows));
}

const command = process.argv[2] ?? 'key';
const rows = listManifest('HEAD');
if (command === 'key') {
  writeCurrent(rows);
  publishKey(rows);
} else if (command === 'reconcile') {
  reconcile(rows);
} else if (command === 'seed-manifest') {
  fs.mkdirSync(path.dirname(cachedManifestPath), { recursive: true });
  fs.writeFileSync(cachedManifestPath, serialize(rows));
} else if (command === '--json') {
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
} else {
  throw new Error(`unknown command: ${command}`);
}
