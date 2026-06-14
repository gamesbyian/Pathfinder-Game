#!/usr/bin/env node
/**
 * Fails on direct HTML injection, trusted-HTML helper reintroduction, and innerText writes.
 *
 * Dynamic user/server-facing strings should use textContent, renderTextList,
 * or explicit DOM node construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SEARCH_DIRS = ['modules', 'scripts'];
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full);
      continue;
    }
    if (!entry.isFile() || !/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    const rel = path.normalize(path.relative(ROOT, full));
    const source = fs.readFileSync(full, 'utf8');
    source.split(/\r?\n/).forEach((line, index) => {
      if (/\.innerHTML\s*=/.test(line) || /\.innerText\s*=/.test(line) || /\bset(?:Trusted)?HTML\s*\(/.test(line)) {
        violations.push({ file: rel, line: index + 1, text: line.trim() });
      }
    });
  }
}

for (const dir of SEARCH_DIRS) {
  if (fs.existsSync(dir)) walk(path.join(ROOT, dir));
}

if (violations.length > 0) {
  console.error('Direct HTML injection/innerText writes are not allowed:');
  for (const v of violations) console.error(`  - ${v.file}:${v.line}: ${v.text}`);
  console.error('\nUse textContent/renderTextList/DOM construction instead.');
  process.exit(1);
}

console.log('No raw HTML injection calls or innerText writes found.');
