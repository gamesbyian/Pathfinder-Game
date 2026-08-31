#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOTS = Object.freeze(['modules']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);
const RETIRED = Object.freeze([
  { label: 'LevelUtils facade import', re: /(?:from\s+|import\s*\()['"][^'"]*level-utils\.js['"]/u },
  { label: 'createLevelUtils constructor', re: /\bcreateLevelUtils\b/u },
  { label: 'LevelUtils facade type/name', re: /\bLevelUtils\b/u },
  { label: 'levelUtils dependency/property', re: /\blevelUtils\b/u },
]);

function collect(root, relativeDir, out) {
  const absolute = path.join(root, relativeDir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) collect(root, rel, out);
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(rel);
  }
}

export function findPhase14BResidue(relativePath, content) {
  const failures = [];
  for (const { label, re } of RETIRED) {
    if (re.test(content)) failures.push(`${relativePath}: retired ${label} remains`);
  }
  return failures;
}

export function checkPhase14B(root = process.cwd()) {
  const failures = [];
  if (fs.existsSync(path.join(root, 'modules/level-utils.ts'))) {
    failures.push('modules/level-utils.ts must be deleted');
  }
  if (fs.existsSync(path.join(root, 'modules/level-utils.test.ts'))) {
    failures.push('modules/level-utils.test.ts must be deleted with the facade');
  }

  const files = [];
  for (const rootDir of ROOTS) collect(root, rootDir, files);
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    failures.push(...findPhase14BResidue(relativePath, content));
  }

  for (const required of [
    'modules/level-data.ts',
    'modules/input/grid-coordinates.ts',
    'modules/editor/level-coordinate-transforms.ts',
  ]) {
    if (!fs.existsSync(path.join(root, required))) failures.push(`${required} must own extracted LevelUtils behavior`);
  }

  return { failures: [...new Set(failures)], scanned: files.length };
}

function main() {
  const { failures, scanned } = checkPhase14B();
  if (failures.length) {
    console.error('Phase-14B LevelUtils facade closeout failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-14B LevelUtils facade closeout passed: ${scanned} module surfaces contain no retired facade import, type, constructor, or dependency.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
