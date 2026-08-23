#!/usr/bin/env node
/** Keep source/config/docs textual, `modules/` paths canonically named, and live source references resolvable. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.yaml', '.yml']);
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const trackedSet = new Set(tracked);
const invalid = [];
for (const file of tracked) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  if (readFileSync(file).includes(0)) invalid.push(file);
}
if (invalid.length) {
  console.error('NUL bytes make tracked text files appear binary; use an escaped string such as "\\0" instead:');
  for (const file of invalid) console.error(`  - ${file}`);
  process.exit(1);
}

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const lowercaseToken = /^[a-z0-9]+$/;
const invalidModulePaths = [];
for (const file of tracked.filter(file => file.startsWith('modules/'))) {
  const parts = file.split('/');
  const badDir = parts.slice(1, -1).find(part => !kebab.test(part));
  if (badDir) {
    invalidModulePaths.push(`${file} (directory '${badDir}')`);
    continue;
  }

  const filename = parts.at(-1);
  if (filename === 'README.md') continue;
  const [stem, ...suffixes] = filename.split('.');
  if (!kebab.test(stem) || suffixes.length === 0 || suffixes.some(suffix => !lowercaseToken.test(suffix))) {
    invalidModulePaths.push(file);
  }
}
if (invalidModulePaths.length) {
  console.error('modules/ paths must use lowercase kebab-case; conventional README.md is exempt:');
  for (const file of invalidModulePaths) console.error(`  - ${file}`);
  process.exit(1);
}

// Source files are a high-value navigation surface even when a research CLI is rarely executed.
// Keep literal docs/*.md breadcrumbs live, and catch case-sensitive relative imports that can work
// unnoticed on a developer filesystem but fail on Linux. JavaScript import specifiers may resolve
// to TypeScript source by repository convention, so a missing relative .js path is accepted when
// the same path with .ts exists.
const sourceFiles = tracked.filter(file => /^(?:modules|scripts)\/.*\.(?:[cm]?js|ts)$/.test(file));
const staleReferences = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');

  for (const match of source.matchAll(/\b(docs\/[a-zA-Z0-9_./-]+\.md)\b/g)) {
    if (!trackedSet.has(match[1])) staleReferences.push(`${file}: missing documentation reference ${match[1]}`);
  }

  for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)['"](\.\.?\/[A-Za-z0-9_./-]+\.(?:[cm]?js|ts))['"]/g)) {
    const specifier = match[1];
    const target = resolve(dirname(file), specifier);
    if (existsSync(target)) continue;
    if (specifier.endsWith('.js') && existsSync(target.slice(0, -3) + '.ts')) continue;
    staleReferences.push(`${file}: missing relative import ${specifier}`);
  }
}
if (staleReferences.length) {
  console.error('Live source contains stale documentation references or relative imports:');
  for (const reference of staleReferences) console.error(`  - ${reference}`);
  process.exit(1);
}

console.log(`Tracked text-file check passed (${tracked.filter(file => textExtensions.has(extname(file).toLowerCase())).length} files); modules/ path naming and live source references are canonical.`);
