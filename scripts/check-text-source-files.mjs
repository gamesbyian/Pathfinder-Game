#!/usr/bin/env node
/** Keep source/config/docs textual and `modules/` paths canonically named.
 *
 * Local/manual checks scan every tracked text file. PR CI may set PATHFINDER_PR_INCREMENTAL=1:
 * only files changed by the PR can newly violate these byte/path invariants, so immutable archive
 * blobs need not be materialized and reread on every unrelated change.
 */
import { extname } from 'node:path';
import process from 'node:process';

import {
  listRepositoryFiles,
  prChangedFiles,
  readRepositoryText,
} from './repository-file-view.mjs';

const ROOT = process.cwd();
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.yaml', '.yml']);
const tracked = listRepositoryFiles(ROOT);
const incremental = prChangedFiles(ROOT);
const candidates = incremental ?? tracked;
const invalid = [];

for (const file of candidates) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  if (readRepositoryText(ROOT, file).includes('\0')) invalid.push(file);
}
if (invalid.length) {
  console.error('NUL bytes make tracked text files appear binary; use an escaped string such as "\\0" instead:');
  for (const file of invalid) console.error(`  - ${file}`);
  process.exit(1);
}

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const lowercaseToken = /^[a-z0-9]+$/;
const invalidModulePaths = [];
const modulePaths = (incremental ?? tracked).filter(file => file.startsWith('modules/'));
for (const file of modulePaths) {
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

const checkedText = candidates.filter(file => textExtensions.has(extname(file).toLowerCase())).length;
console.log(`${incremental ? 'Changed' : 'Tracked'} text-file check passed (${checkedText} file${checkedText === 1 ? '' : 's'} scanned); modules/ path naming is canonical.`);
