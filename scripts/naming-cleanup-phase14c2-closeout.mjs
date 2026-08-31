#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOTS = Object.freeze(['modules', 'tests', 'scripts']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const SELF = new Set([
  'scripts/naming-cleanup-phase14c2-closeout.mjs',
  'scripts/naming-cleanup-phase14c2-closeout-node-test.mjs',
]);
const EXTRA_FILES = Object.freeze(['eslint.config.mjs']);
const RETIRED_ENGINE_ROOT = new RegExp('\\b' + 'ENGINE' + '\\b', 'u');

function collect(root, relativeDir, out) {
  const absolute = path.join(root, relativeDir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) collect(root, rel, out);
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name)) && !SELF.has(rel)) out.push(rel);
  }
}

export function findPhase14C2Residue(relativePath, content) {
  return RETIRED_ENGINE_ROOT.test(content)
    ? [`${relativePath}: retired mutable AppState root spelling remains`]
    : [];
}

export function checkPhase14C2(root = process.cwd()) {
  const files = [];
  for (const rootDir of ROOTS) collect(root, rootDir, files);
  for (const rel of EXTRA_FILES) if (fs.existsSync(path.join(root, rel))) files.push(rel);
  const failures = [];
  for (const relativePath of files) {
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    failures.push(...findPhase14C2Residue(relativePath, content));
  }

  const stateSource = fs.readFileSync(path.join(root, 'modules/state.ts'), 'utf8');
  if (!/export type AppState = \{ engineState: EngineState \};/u.test(stateSource)) {
    failures.push('modules/state.ts: AppState must expose engineState: EngineState');
  }
  if (/\bENGINE\s*:/u.test(stateSource)) {
    failures.push('modules/state.ts: retired ENGINE AppState property remains');
  }

  const appSource = fs.readFileSync(path.join(root, 'modules/app.ts'), 'utf8');
  if (!/State:\s*\{\s*get engineState\(\)/u.test(appSource)) {
    failures.push('modules/app.ts: debug facade must expose State.engineState');
  }
  if (/State:\s*\{\s*get ENGINE\(\)/u.test(appSource)) {
    failures.push('modules/app.ts: retired debug State.ENGINE getter remains');
  }

  return { failures: [...new Set(failures)], scanned: files.length };
}

function main() {
  const { failures, scanned } = checkPhase14C2();
  if (failures.length) {
    console.error('Phase-14C2 engine-state root closeout failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-14C2 engine-state root closeout passed: ${scanned} code/test/tool surfaces contain no retired ENGINE AppState root spelling.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
