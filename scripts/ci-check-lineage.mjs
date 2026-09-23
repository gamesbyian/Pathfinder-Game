#!/usr/bin/env node
/**
 * Build a mechanical lineage inventory for CI checks across git history.
 *
 * This intentionally does not guess semantic equivalence. It records when executable
 * package scripts and named CI workflow steps appear/disappear, leaving alias/supersession
 * adjudication to the audit's explicit lineage overrides.
 *
 * Usage:
 *   node scripts/ci-check-lineage.mjs
 *   node scripts/ci-check-lineage.mjs --out tmp/ci-audit/lineage-mechanical.json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const AUTHORITIES = [
  'package.json',
  '.github/workflows/ci.yml',
  '.github/workflows/main-push-validation.yml',
  'scripts/validation-groups.json',
  'vitest.config.mjs',
];

function parseArgs(argv) {
  let out = 'tmp/ci-audit/lineage-mechanical.json';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') out = argv[++i];
    else if (arg.startsWith('--out=')) out = arg.slice(6);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-check-lineage.mjs [--out file]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return { out };
}

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', allowFailure ? 'ignore' : 'pipe'],
    });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function showFile(sha, file) {
  return git(['show', `${sha}:${file}`], { allowFailure: true });
}

function relevantPackageScripts(text) {
  if (!text) return [];
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    return [];
  }
  return Object.entries(pkg.scripts ?? {})
    .filter(([name]) =>
      name === 'build' ||
      name === 'ci' ||
      name.startsWith('ci:') ||
      name.startsWith('check:') ||
      name.startsWith('test:')
    )
    .map(([name, command]) => ({
      kind: 'package-script',
      key: name,
      command,
    }));
}

function workflowSteps(text, workflowFile) {
  if (!text) return [];
  const lines = text.split(/\r?\n/u);
  const result = [];
  let currentJob = null;
  let inJobs = false;
  let jobsIndent = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^jobs:\s*$/u.test(line)) {
      inJobs = true;
      jobsIndent = 0;
      continue;
    }
    if (!inJobs) continue;

    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/u);
    if (jobMatch) {
      currentJob = jobMatch[1];
      continue;
    }

    const stepName = line.match(/^\s{6}- name:\s*(.+?)\s*$/u);
    if (stepName && currentJob) {
      const raw = stepName[1].replace(/^['"]|['"]$/gu, '');
      result.push({
        kind: 'workflow-step',
        key: `${workflowFile}#${currentJob}#${raw}`,
        workflowFile,
        job: currentJob,
        name: raw,
        line: i + 1,
      });
    }

    if (jobsIndent !== null && line.length && !/^\s/u.test(line) && !/^jobs:/u.test(line)) {
      inJobs = false;
      currentJob = null;
    }
  }
  return result;
}

function commitMetadata(sha) {
  const line = git(['show', '-s', '--format=%H%x09%cI%x09%s', sha]).trim();
  const [commit, committedAt, ...subjectParts] = line.split('\t');
  return { sha: commit, committedAt, subject: subjectParts.join('\t') };
}

function historyCommits() {
  const output = git([
    'log',
    '--reverse',
    '--format=%H',
    '--',
    ...AUTHORITIES,
  ]);
  return output.split(/\r?\n/u).map(value => value.trim()).filter(Boolean);
}

function snapshotAt(sha) {
  const packageRows = relevantPackageScripts(showFile(sha, 'package.json'));
  const workflowRows = [
    ...workflowSteps(showFile(sha, '.github/workflows/ci.yml'), 'ci.yml'),
    ...workflowSteps(showFile(sha, '.github/workflows/main-push-validation.yml'), 'main-push-validation.yml'),
  ];
  return [...packageRows, ...workflowRows];
}

function updateIntervals(state, currentKeys, metadata, rowsByKey) {
  for (const [key, entry] of state) {
    if (entry.active && !currentKeys.has(key)) {
      entry.active = false;
      entry.intervals.at(-1).removedAt = metadata.committedAt;
      entry.intervals.at(-1).removedBy = metadata.sha;
    }
  }

  for (const key of currentKeys) {
    const row = rowsByKey.get(key);
    let entry = state.get(key);
    if (!entry) {
      entry = {
        id: key,
        kind: row.kind,
        firstSeenAt: metadata.committedAt,
        firstSeenCommit: metadata.sha,
        lastObservedAt: metadata.committedAt,
        lastObservedCommit: metadata.sha,
        active: true,
        intervals: [{
          addedAt: metadata.committedAt,
          addedBy: metadata.sha,
          removedAt: null,
          removedBy: null,
        }],
        observations: 1,
        latest: row,
      };
      state.set(key, entry);
      continue;
    }

    if (!entry.active) {
      entry.active = true;
      entry.intervals.push({
        addedAt: metadata.committedAt,
        addedBy: metadata.sha,
        removedAt: null,
        removedBy: null,
      });
    }
    entry.lastObservedAt = metadata.committedAt;
    entry.lastObservedCommit = metadata.sha;
    entry.observations += 1;
    entry.latest = row;
  }
}

const { out } = parseArgs(process.argv.slice(2));
const commits = historyCommits();
if (!commits.length) throw new Error('no CI-authority history found');

const state = new Map();
const commitRows = [];

for (const sha of commits) {
  const metadata = commitMetadata(sha);
  const rows = snapshotAt(sha);
  const rowsByKey = new Map(rows.map(row => [`${row.kind}:${row.key}`, row]));
  const keys = new Set(rowsByKey.keys());
  updateIntervals(state, keys, metadata, rowsByKey);
  commitRows.push({
    ...metadata,
    executableCount: rows.length,
  });
}

const head = git(['rev-parse', 'HEAD']).trim();
const headMeta = commitMetadata(head);
const entries = [...state.values()]
  .map(entry => ({
    ...entry,
    // Active means present in the latest authority-changing snapshot. Verify against HEAD
    // because HEAD itself may not have touched an authority file.
    activeAtHead: snapshotAt(head).some(row => `${row.kind}:${row.key}` === entry.id),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  head: headMeta,
  authorities: AUTHORITIES,
  authorityChangingCommits: commits.length,
  entries,
  commits: commitRows,
  limitations: [
    'Mechanical identity is name-based and does not imply semantic equivalence across renames.',
    'Workflow steps are extracted from named CI/main-push steps only; unnamed action steps are omitted.',
    'A bundled package script can contain many underlying tests; individual historical visibility depends on logs and later incident adjudication.',
  ],
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({
  out,
  authorityChangingCommits: commits.length,
  entries: entries.length,
  activeAtHead: entries.filter(entry => entry.activeAtHead).length,
}, null, 2));
