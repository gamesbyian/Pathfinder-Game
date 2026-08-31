#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOTS = Object.freeze(['modules', 'tests']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);
const RETIRED = Object.freeze([
  { label: 'HinterState type', re: /\bHinterState\b/u },
  { label: 'createHinterState constructor', re: /\bcreateHinterState\b/u },
  { label: 'publicDrawPath renderer helper', re: /\bpublicDrawPath\b/u },
  { label: 'pendingAction field', re: /\bpendingAction\b/u },
  { label: 'setPendingAction engine method', re: /\bsetPendingAction\b/u },
  { label: 'clearPendingAction engine method', re: /\bclearPendingAction\b/u },
  { label: 'executePendingAction engine method', re: /\bexecutePendingAction\b/u },
  { label: 'setRuntimePendingAction state action', re: /\bsetRuntimePendingAction\b/u },
  { label: 'clearRuntimePendingAction state action', re: /\bclearRuntimePendingAction\b/u },
]);

function collect(root, relativeDir, out) {
  const absolute = path.join(root, relativeDir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) collect(root, rel, out);
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) out.push(rel);
  }
}

export function findPhase14C1Residue(relativePath, content) {
  const failures = [];
  for (const { label, re } of RETIRED) {
    if (re.test(content)) failures.push(`${relativePath}: retired ${label} remains`);
  }
  return failures;
}

export function checkPhase14C1(root = process.cwd()) {
  const files = [];
  for (const rootDir of ROOTS) collect(root, rootDir, files);
  const failures = [];
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    failures.push(...findPhase14C1Residue(relativePath, content));
  }
  return { failures: [...new Set(failures)], scanned: files.length };
}

function main() {
  const { failures, scanned } = checkPhase14C1();
  if (failures.length) {
    console.error('Phase-14C1 local-name closeout failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-14C1 local-name closeout passed: ${scanned} module/test surfaces contain no retired hint-display, renderer-helper, or confirmation-action names.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
