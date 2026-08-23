#!/usr/bin/env node
/** Keep source/config/docs textual and `modules/` paths canonically named. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.yaml', '.yml']);
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
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

console.log(`Tracked text-file check passed (${tracked.filter(file => textExtensions.has(extname(file).toLowerCase())).length} files); modules/ path naming is canonical.`);
