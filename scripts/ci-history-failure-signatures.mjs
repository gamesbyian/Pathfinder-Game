#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = {
    repo: process.env.GITHUB_REPOSITORY || 'gamesbyian/Pathfinder-Game',
    episodes: 'tmp/ci-audit/repair-episodes.json',
    output: 'tmp/ci-audit/failure-signatures.json',
    maxEpisodes: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') out.repo = argv[++i];
    else if (arg.startsWith('--repo=')) out.repo = arg.slice(7);
    else if (arg === '--episodes') out.episodes = argv[++i];
    else if (arg.startsWith('--episodes=')) out.episodes = arg.slice(11);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--max-episodes') out.maxEpisodes = Number(argv[++i]);
    else if (arg.startsWith('--max-episodes=')) out.maxEpisodes = Number(arg.slice(15));
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-history-failure-signatures.mjs [--repo owner/name] [--episodes repair-episodes.json] [--output file] [--max-episodes N]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!out.repo.includes('/')) throw new Error('--repo must be owner/name');
  if (out.maxEpisodes !== null && (!Number.isSafeInteger(out.maxEpisodes) || out.maxEpisodes < 1)) {
    throw new Error('--max-episodes must be a positive integer');
  }
  return out;
}

function runGh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function jobLog(repo, runId, jobId) {
  try {
    return runGh(['run', 'view', String(runId), '--repo', repo, '--job', String(jobId), '--log']);
  } catch (error) {
    return null;
  }
}

function extractCommandTimings(log) {
  const rows = [];
  for (const line of log.split('\n')) {
    const match = line.match(/\b(PASS|FAIL)\s+((?:check|test):[A-Za-z0-9:_-]+)\s+\(([0-9.]+)s\)/u);
    if (!match) continue;
    rows.push({
      conclusion: match[1] === 'PASS' ? 'success' : 'failure',
      name: match[2],
      durationSeconds: Number(match[3]),
    });
  }
  return rows;
}

function extractDetectors(log) {
  const detectors = [];
  const seen = new Set();
  const push = (kind, name, raw) => {
    const key = `${kind}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    detectors.push({ kind, name, raw });
  };

  for (const line of log.split('\n')) {
    let match = line.match(/\bFAIL\s+(check:[A-Za-z0-9:_-]+)\b/u);
    if (match) { push('check', match[1], line.trim()); continue; }
    match = line.match(/\bFAIL\s+(test:[A-Za-z0-9:_-]+)\b/u);
    if (match) { push('test', match[1], line.trim()); continue; }
    match = line.match(/CI fast-gate group\s+([A-Z_]+)\s+finished with failure/u);
    if (match) { push('fast-group', match[1], line.trim()); continue; }
    match = line.match(/^.*\b(FAILED?|Failure):\s+(.+)$/u);
    if (match && /deep|proof|coverage|firestore|canary|build|lint/i.test(match[2])) {
      push('named-failure', match[2].trim(), line.trim());
    }
  }
  return detectors;
}

function summarizeTimings(rows) {
  const commands = new Map();
  for (const row of rows) {
    for (const job of row.jobs ?? []) {
      for (const timing of job.commandTimings ?? []) {
        if (!commands.has(timing.name)) commands.set(timing.name, []);
        commands.get(timing.name).push(timing.durationSeconds);
      }
    }
  }
  const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return null;
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index];
  };
  return [...commands.entries()].map(([name, values]) => ({
    name,
    observedExecutions: values.length,
    observedTotalSeconds: values.reduce((sum, value) => sum + value, 0),
    medianSeconds: percentile(values, 50),
    p90Seconds: percentile(values, 90),
  })).sort((a, b) => b.observedTotalSeconds - a.observedTotalSeconds || a.name.localeCompare(b.name));
}

function summarize(rows) {
  const counts = new Map();
  for (const row of rows) {
    for (const detector of row.detectors) {
      const key = `${detector.kind}:${detector.name}`;
      if (!counts.has(key)) counts.set(key, { kind: detector.kind, name: detector.name, representativeEpisodes: 0 });
      counts.get(key).representativeEpisodes += 1;
    }
  }
  return [...counts.values()].sort((a, b) =>
    b.representativeEpisodes - a.representativeEpisodes || a.name.localeCompare(b.name));
}

const options = parseArgs(process.argv.slice(2));
const document = JSON.parse(fs.readFileSync(options.episodes, 'utf8'));
let episodes = document.episodes ?? [];
if (options.maxEpisodes !== null) episodes = episodes.slice(0, options.maxEpisodes);

const rows = [];
const gaps = [];

for (let index = 0; index < episodes.length; index += 1) {
  const episode = episodes[index];
  const representative = episode.failures?.[0];
  if (!representative) continue;

  const jobRows = [];
  const detectors = [];
  const seen = new Set();

  for (const failedJob of representative.failedJobs ?? []) {
    if (!failedJob.jobId) continue;
    const log = jobLog(options.repo, representative.runId, failedJob.jobId);
    if (log === null) {
      gaps.push({
        episodeId: episode.id,
        runId: representative.runId,
        jobId: failedJob.jobId,
        type: 'job-log-unavailable',
      });
      continue;
    }
    const found = extractDetectors(log);
    const commandTimings = extractCommandTimings(log);
    jobRows.push({
      jobId: failedJob.jobId,
      jobName: failedJob.name,
      failedSteps: failedJob.failedSteps ?? [],
      detectors: found,
      commandTimings,
    });
    for (const detector of found) {
      const key = `${detector.kind}:${detector.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      detectors.push(detector);
    }
  }

  rows.push({
    episodeId: episode.id,
    branch: episode.branch,
    representativeRunId: representative.runId,
    representativeHeadSha: representative.headSha,
    pullRequestNumber: representative.pullRequestNumber ?? null,
    startedAt: episode.startedAt,
    failureRunCount: episode.failures.length,
    jobs: jobRows,
    detectors,
  });

  if ((index + 1) % 50 === 0 || index + 1 === episodes.length) {
    console.log(`failure-signature progress: ${index + 1}/${episodes.length} episodes; gaps=${gaps.length}`);
  }
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceEpisodes: options.episodes,
  representativePolicy: 'first failing run in each mechanical repair episode',
  episodesRequested: episodes.length,
  episodesWithSignatures: rows.filter(row => row.detectors.length > 0).length,
  gaps,
  detectorSummary: summarize(rows),
  commandTimingSummary: summarizeTimings(rows),
  episodes: rows,
};

fs.mkdirSync(path.dirname(options.output), { recursive: true });
fs.writeFileSync(options.output, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  episodesRequested: output.episodesRequested,
  episodesWithSignatures: output.episodesWithSignatures,
  retrievalGaps: gaps.length,
  topDetectors: output.detectorSummary.slice(0, 20),
  topObservedCost: output.commandTimingSummary.slice(0, 20),
}, null, 2));
