#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
    for (const explicit of line.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/gi)) anchors.add(explicit[1]);
  }
  anchorCache.set(target, anchors);
  return anchors;
}

const historicalDocumentation = file => file.startsWith('reports/') ||
  (file.startsWith('docs/archive/snapshots/') && file !== 'docs/archive/snapshots/README.md');

for (const file of markdownFiles) {
  // Frozen snapshots preserve byte-for-byte historical text from another directory. Their relative
  // links intentionally describe the original location; current navigation lives in their stubs.
  if (historicalDocumentation(file)) continue;

  const source = readFileSync(resolve(ROOT, file), 'utf8');
  for (const match of source.matchAll(markdownLink)) {
    let destination = match[1].trim();
    if (destination.startsWith('<') && destination.endsWith('>')) destination = destination.slice(1, -1);
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
      if (!markdownAnchors(target).has(fragment)) failures.push(`${file}: missing anchor target: ${destination}`);
    }
  }
}

for (const prefix of ['docs/archive/']) {
  const index = `${prefix}README.md`;
  const indexSource = readFileSync(resolve(ROOT, index), 'utf8');
  for (const file of markdownFiles.filter((path) => dirname(path) === prefix.slice(0, -1))) {
    if (file === index) continue;
    const basename = file.slice(prefix.length);
    if (!indexSource.includes(`(${basename})`)) failures.push(`${file}: not linked from ${index}`);
  }
}

const routerRequirements = [
  ['AGENTS.md', ['docs/tooling-catalog.md', 'docs/solver-optimization-current-queue.md', 'docs/variant-level-research.md', 'docs/solver-research-operating-model.md', 'docs/solver-opt-in-experiment-ledger.md', 'docs/testing.md', 'reports/README.md']],
  ['CLAUDE.md', ['AGENTS.md', 'DEVELOPER_REFERENCE.md']],
  ['.github/copilot-instructions.md', ['AGENTS.md']],
  ['docs/tooling-catalog.md', ['package.json', 'scripts/README.md', '.github/workflows/README.md', 'variant-level-research.md']],
  ['docs/solver-research-operating-model.md', ['solver-optimization-current-queue.md', 'solver-level-blindness.md', 'variant-level-research.md']],
];
for (const [file, requiredStrings] of routerRequirements) {
  const target = resolve(ROOT, file);
  if (!existsSync(target)) {
    failures.push(`${file}: required repository navigation surface is missing`);
    continue;
  }
  const source = readFileSync(target, 'utf8');
  for (const required of requiredStrings) {
    if (!source.includes(required)) failures.push(`${file}: navigation surface does not reference ${required}`);
  }
}

// Explicit current authorities are checked more strictly than retained evidence. The docs index is
// the authority boundary: unindexed legacy design notes and dated reports remain searchable, but
// do not make historical commands/paths current contracts merely by existing in Git.
const docsIndex = readFileSync(resolve(ROOT, 'docs/README.md'), 'utf8');
const currentAuthorityFiles = new Set([
  'AGENTS.md', 'CLAUDE.md', 'DEVELOPER_REFERENCE.md', 'docs/README.md', 'reports/README.md',
  'scripts/README.md', '.github/workflows/README.md', 'modules/solver/README.md',
]);
for (const match of docsIndex.matchAll(markdownLink)) {
  const destination = match[1].split('#', 1)[0];
  if (destination && !/^[a-z][a-z0-9+.-]*:/i.test(destination)) {
    const target = relative(ROOT, resolve(ROOT, 'docs', destination)).split('\\').join('/');
    if (target.endsWith('.md')) currentAuthorityFiles.add(target);
  }
}

// Current reference docs must name actual TypeScript source paths, not the .js import specifiers
// used inside TypeScript source. Import statements are outside this Markdown-only authority set.
for (const file of [...currentAuthorityFiles].filter(file => existsSync(resolve(ROOT, file)))) {
  const source = readFileSync(resolve(ROOT, file), 'utf8');
  for (const match of source.matchAll(/`(modules\/[A-Za-z0-9_./*-]+\.(?:[cm]?js|ts))`/g)) {
    const documented = match[1];
    if (documented.includes('*')) continue;
    const documentedTarget = resolve(ROOT, documented);
    if (existsSync(documentedTarget)) continue;
    const tsTarget = documented.replace(/\.js$/, '.ts');
    if (existsSync(resolve(ROOT, tsTarget))) {
      failures.push(`${file}: stale source path ${documented}; document actual source path ${tsTarget}`);
    } else {
      failures.push(`${file}: missing documented source path ${documented}`);
    }
  }
}

// Commands presented as runnable documentation should continue to exist. This deliberately checks
// only `npm run <alias>` forms; arbitrary shell snippets may invoke binaries or temporary scripts.
const packageScripts = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).scripts ?? {};
for (const file of currentAuthorityFiles) {
  if (!existsSync(resolve(ROOT, file))) continue;
  const source = readFileSync(resolve(ROOT, file), 'utf8');
  for (const match of source.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) {
    if (!(match[1] in packageScripts)) failures.push(`${file}: documented npm alias does not exist: npm run ${match[1]}`);
  }
}

// Make the expensive off-main family dataset impossible to lose from the agent-facing map.
const variantReference = readFileSync(resolve(ROOT, 'docs/variant-level-research.md'), 'utf8');
for (const required of [
  'claude/variant-levels-solver-insights-tpk4qg',
  'data/families/',
  'logs/family-census/',
  'reports/families/',
  'family-wide-trove.yml',
]) {
  if (!variantReference.includes(required)) failures.push(`docs/variant-level-research.md: missing variant-trove locator ${required}`);
}

// OPT_IN_FEATURES is a polarity registry, not a backlog, but the disposition ledger must cover
// every retained default-off switch so an agent never has to infer status from code comments.
const ablationSource = readFileSync(resolve(ROOT, 'modules/solver/ablation-config.ts'), 'utf8');
const optInStart = ablationSource.indexOf('export const OPT_IN_FEATURES = new Set([');
const optInEnd = optInStart < 0 ? -1 : ablationSource.indexOf(']);', optInStart);
if (optInStart < 0 || optInEnd < 0) {
  failures.push('modules/solver/ablation-config.ts: could not locate OPT_IN_FEATURES for ledger coverage check');
} else {
  const optInBlock = ablationSource.slice(optInStart, optInEnd);
  const optInFlags = [...optInBlock.matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
  const ledger = readFileSync(resolve(ROOT, 'docs/solver-opt-in-experiment-ledger.md'), 'utf8');
  for (const flag of optInFlags) {
    if (!ledger.includes(`\`${flag}\``)) failures.push(`docs/solver-opt-in-experiment-ledger.md: missing current OPT_IN_FEATURES member ${flag}`);
  }
}

const workflowDir = resolve(ROOT, '.github/workflows');
const workflowIndex = readFileSync(resolve(workflowDir, 'README.md'), 'utf8');
for (const name of readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name)).sort()) {
  if (!workflowIndex.includes(name)) failures.push(`.github/workflows/${name}: not named in .github/workflows/README.md`);
}

const reportStatusValues = 'active|concluded-positive|concluded-negative|inconclusive|superseded|cancelled';
const reportMetadataPattern = new RegExp(
  `^# .+\\r?\\n\\r?\\n> \\*\\*Status:\\*\\* (${reportStatusValues})\\r?\\n` +
  '> \\*\\*Last evidence:\\*\\* \\d{4}-\\d{2}-\\d{2} — .+\\r?\\n' +
  '> \\*\\*Decision:\\*\\* .+\\r?\\n' +
  '> \\*\\*Remaining gate:\\*\\* .+',
  'm',
);
for (const name of readdirSync(resolve(ROOT, 'reports')).filter((name) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name))) {
  if (name.slice(0, 10) < '2026-08-20') continue;
  const source = readFileSync(resolve(ROOT, 'reports', name), 'utf8');
  if (source.includes('<!-- report-metadata: generated -->')) continue;
  if (!reportMetadataPattern.test(source)) {
    failures.push(`reports/${name}: missing or malformed Status / Last evidence / Decision / Remaining gate block`);
  }
}

if (failures.length > 0) {
  console.error(`Documentation/navigation check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation/navigation check passed (${markdownFiles.length} Markdown files).`);
