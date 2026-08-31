#!/usr/bin/env node
/**
 * Phase-14A core-facade residue guard.
 *
 * Qualified ADR *-core.ts modules remain intentional. This guard targets only the deleted
 * mixed-responsibility modules/core.ts facade and its dependency-bag API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'modules';
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);

function collect(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.posix.join(dir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) collect(p, out);
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) out.push(p);
  }
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1');
}

export function findCoreFacadeResidue(relativePath, content) {
  const code = stripComments(content);
  const failures = [];
  if (/\bcreateCore\b/u.test(code)) failures.push(`${relativePath}: retired createCore symbol remains`);
  if (/\bSOUND_BUS\b/u.test(code)) failures.push(`${relativePath}: retired SOUND_BUS symbol remains`);
  if (/(?<![-\w])core\s*\./u.test(code)) failures.push(`${relativePath}: retired core dependency bag member access remains`);
  if (/\bcore\s*:/u.test(code)) failures.push(`${relativePath}: retired core dependency property remains`);
  if (/\bCore\s*:/u.test(code) && relativePath === 'modules/app.ts') {
    failures.push(`${relativePath}: mutable debug facade still exposes retired Core member`);
  }
  if (/from\s+['"](?:\.\.\/|\.\/)core\.js['"]/u.test(code)) {
    failures.push(`${relativePath}: import of deleted core module remains`);
  }
  return failures;
}

export function checkPhase14ACoreCloseout(root = process.cwd()) {
  const failures = [];
  for (const retired of ['modules/core.ts', 'modules/core.test.ts']) {
    if (fs.existsSync(path.join(root, retired))) failures.push(`${retired} must be deleted`);
  }
  for (const required of ['modules/app-constants.ts', 'modules/audio-service.ts', 'modules/deep-clone.ts']) {
    if (!fs.existsSync(path.join(root, required))) failures.push(`${required} must exist after core extraction`);
  }
  const files = [];
  collect(path.join(root, ROOT), files);
  for (const absolute of files) {
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    const content = fs.readFileSync(absolute, 'utf8');
    failures.push(...findCoreFacadeResidue(relative, content));
  }
  return [...new Set(failures)];
}

function main() {
  const failures = checkPhase14ACoreCloseout();
  if (failures.length) {
    console.error('Phase-14A core facade closeout failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('Phase-14A core facade closeout passed: mixed core facade is absent and no maintained module uses its dependency-bag API.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
