#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Include staged/tracked and non-ignored untracked files so a new document is checked before its
// first commit, not only after it enters the index.
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT })
  .toString()
  .split('\0')
  .filter(Boolean);
const markdownFiles = tracked.filter((path) => extname(path).toLowerCase() === '.md');
const failures = [];
const markdownLink = /!?(?<!\!)\[[^\]]*\]\(([^)]+)\)/g;
const anchorCache = new Map();

function githubHeadingSlug(heading) {
  return heading
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .trim()
    .toLowerCase()
    // GitHub removes punctuation but preserves hyphens/underscores and does not collapse the two
    // spaces left around removed punctuation (so "A — B" becomes "a--b").
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\p{Connector_Punctuation}\- ]/gu, '')
    .replace(/ /g, '-');
}

function markdownAnchors(target) {
  if (anchorCache.has(target)) return anchorCache.get(target);
  const anchors = new Set();
  const slugCounts = new Map();
  for (const line of readFileSync(target, 'utf8').split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (heading) {
      const base = githubHeadingSlug(heading[1]);
      const seen = slugCounts.get(base) ?? 0;
      slugCounts.set(base, seen + 1);
      anchors.add(seen === 0 ? base : `${base}-${seen}`);
    }
    for (const explicit of line.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/gi)) {
      anchors.add(explicit[1]);
    }
  }
  anchorCache.set(target, anchors);
  return anchors;
}

for (const file of markdownFiles) {
  const source = readFileSync(resolve(ROOT, file), 'utf8');
  for (const match of source.matchAll(markdownLink)) {
    let destination = match[1].trim();
    if (destination.startsWith('<') && destination.endsWith('>')) {
      destination = destination.slice(1, -1);
    }
    // Optional Markdown titles follow a whitespace boundary. Repository paths do not contain spaces.
    destination = destination.split(/\s+["']/)[0];
    if (/^[a-z][a-z0-9+.-]*:/i.test(destination)) continue;

    const [destinationWithoutFragment, encodedFragment] = destination.split('#', 2);
    const pathPart = destinationWithoutFragment.split('?', 1)[0];

    let decoded;
    try {
      decoded = decodeURIComponent(pathPart);
    } catch {
      failures.push(`${file}: malformed encoded link: ${destination}`);
      continue;
    }

    const target = pathPart ? resolve(ROOT, dirname(file), decoded) : resolve(ROOT, file);
    if (!target.startsWith(`${ROOT}/`) && target !== ROOT) {
      failures.push(`${file}: link escapes repository: ${destination}`);
    } else if (!existsSync(target)) {
      failures.push(`${file}: missing link target: ${destination}`);
    } else if (statSync(target).isDirectory() && !existsSync(resolve(target, 'README.md'))) {
      failures.push(`${file}: linked directory has no README.md: ${destination}`);
    } else if (encodedFragment && statSync(target).isFile()) {
      let fragment;
      try {
        fragment = decodeURIComponent(encodedFragment);
      } catch {
        failures.push(`${file}: malformed encoded anchor: ${destination}`);
        continue;
      }
      if (!markdownAnchors(target).has(fragment)) {
        failures.push(`${file}: missing anchor target: ${destination}`);
      }
    }
  }
}

// Top-level docs are navigation surfaces. Every current doc and every archived record must be
// discoverable from its directory index; reports are intentionally indexed at collection level.
for (const prefix of ['docs/', 'docs/archive/']) {
  const index = `${prefix}README.md`;
  const indexSource = readFileSync(resolve(ROOT, index), 'utf8');
  for (const file of markdownFiles.filter((path) => dirname(path) === prefix.slice(0, -1))) {
    if (file === index) continue;
    const basename = file.slice(prefix.length);
    if (!indexSource.includes(`(${basename})`)) {
      failures.push(`${file}: not linked from ${index}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Documentation link check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation link check passed (${markdownFiles.length} Markdown files).`);
