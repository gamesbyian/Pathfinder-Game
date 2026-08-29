#!/usr/bin/env node
/**
 * Guard the repository's plain-Node tool boundary.
 *
 * Several naming-cleanup regressions survived because .mjs tools imported TypeScript source
 * directly and happened to work under a newer local runtime/bundler, while the supported Node 20
 * runtime rejected them. This check derives plain-`node` script roots from package.json and live
 * workflow shell commands, follows literal local imports through script helpers, and rejects:
 *
 * - explicit .ts/.tsx/.mts/.cts runtime imports from that plain-Node graph;
 * - .js/.mjs specifiers whose only repository target is a TypeScript sibling.
 *
 * Bundled/tsx targets are intentionally outside this boundary. A command such as
 * `node scripts/run-bundled.mjs scripts/foo.mjs` contributes run-bundled.mjs as the plain-Node
 * root; foo.mjs executes under the bundler and is not falsely classified as native Node loading.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflowDir = path.join(root, '.github', 'workflows');

const sources = [
  ...Object.values(packageJson.scripts ?? {}),
  ...readdirSync(workflowDir)
    .filter(name => /\.ya?ml$/iu.test(name))
    .map(name => readFileSync(path.join(workflowDir, name), 'utf8')),
];

const plainNodeRoots = new Set();
for (const source of sources) {
  for (const match of source.matchAll(/\bnode\s+((?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js))/gu)) {
    plainNodeRoots.add(match[1].replace(/^\.\//u, ''));
  }
}

const STATIC_IMPORT_PATTERN = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu;
const DYNAMIC_IMPORT_PATTERN = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/gu;

function localSpecifiers(source, { includeDynamic }) {
  const found = new Set();
  for (const pattern of includeDynamic ? [STATIC_IMPORT_PATTERN, DYNAMIC_IMPORT_PATTERN] : [STATIC_IMPORT_PATTERN]) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      if (match[1].startsWith('.') || match[1].startsWith('/')) found.add(match[1]);
    }
  }
  return [...found].sort();
}

function repoRelative(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/');
}

function resolveNativeNodeImport(importer, specifier) {
  const importerDir = path.dirname(path.join(root, importer));
  const base = specifier.startsWith('/')
    ? path.join(root, specifier.slice(1))
    : path.resolve(importerDir, specifier);

  if (/\.(?:ts|tsx|mts|cts)$/u.test(base)) {
    return { failure: 'explicit TypeScript runtime import', target: repoRelative(base) };
  }

  if (existsSync(base)) return { resolved: repoRelative(base) };

  if (base.endsWith('.js')) {
    const tsSibling = base.slice(0, -3) + '.ts';
    const tsxSibling = base.slice(0, -3) + '.tsx';
    if (existsSync(tsSibling)) return { failure: '.js specifier resolves only to TypeScript source', target: repoRelative(tsSibling) };
    if (existsSync(tsxSibling)) return { failure: '.js specifier resolves only to TypeScript source', target: repoRelative(tsxSibling) };
  }

  if (base.endsWith('.mjs')) {
    const mtsSibling = base.slice(0, -4) + '.mts';
    if (existsSync(mtsSibling)) return { failure: '.mjs specifier resolves only to TypeScript source', target: repoRelative(mtsSibling) };
  }

  return { resolved: null };
}

const failures = [];
const visited = new Set();
const queue = [...plainNodeRoots].sort();

while (queue.length) {
  const importer = queue.shift();
  if (visited.has(importer)) continue;
  visited.add(importer);

  const absolute = path.join(root, importer);
  if (!existsSync(absolute)) continue;
  const source = readFileSync(absolute, 'utf8');

  // Dynamic imports in a plain-Node root are part of that root's runtime contract. For nested
  // helpers, follow static module loading only: a helper can expose a pure function to a native
  // Node unit test while reserving a dynamic TypeScript import for its separately bundled CLI path.
  for (const specifier of localSpecifiers(source, { includeDynamic: plainNodeRoots.has(importer) })) {
    const result = resolveNativeNodeImport(importer, specifier);
    if (result.failure) {
      failures.push(`${importer} -> ${specifier}: ${result.failure} (${result.target})`);
      continue;
    }

    const resolved = result.resolved;
    if (
      resolved
      && resolved.startsWith('scripts/')
      && /\.(?:mjs|cjs|js)$/u.test(resolved)
    ) {
      queue.push(resolved);
    }
  }
}

if (failures.length) {
  console.error('Plain-Node import boundary check failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('\nUse a plain-JS compatibility/normalization module, run the target through the supported bundler/tsx boundary, or otherwise make the runtime contract explicit.');
  process.exit(1);
}

console.log(`Plain-Node import boundary valid: ${plainNodeRoots.size} surfaced roots, ${visited.size} script files traced, no TypeScript-only runtime imports.`);
