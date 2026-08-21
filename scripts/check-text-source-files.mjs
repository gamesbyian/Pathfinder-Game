#!/usr/bin/env node
/** Keep source/config/docs textual so Git hosting and PR tooling can render their diffs. */
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
console.log(`Tracked text-file check passed (${tracked.filter(file => textExtensions.has(extname(file).toLowerCase())).length} files).`);
