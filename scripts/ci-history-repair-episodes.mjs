#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = {
    input: 'tmp/ci-audit/history.jsonl',
    output: 'tmp/ci-audit/repair-episodes.json',
    gapHours: 6,
    currentEraStart: '2026-09-04T00:00:00.000Z',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') out.input = argv[++i];
    else if (arg.startsWith('--input=')) out.input = arg.slice(8);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--gap-hours') out.gapHours = Number(argv[++i]);
    else if (arg.startsWith('--gap-hours=')) out.gapHours = Number(arg.slice(12));
    else if (arg === '--current-era-start') out.currentEraStart = argv[++i];
    else if (arg.startsWith('--current-era-start=')) out.currentEraStart = arg.slice(20);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-history-repair-episodes.mjs [--input history.jsonl] [--output repair-episodes.json] [--gap-hours 6] [--current-era-start ISO]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isFinite(out.gapHours) || out.gapHours <= 0) throw new Error('--gap-hours must be positive');
  if (!Number.isFinite(Date.parse(out.currentEraStart))) throw new Error('--current-era-start must be ISO-like');
  return out;
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
    });
}

function failedJobs(run) {
  const jobs = [];
  for (const attempt of run.attempts ?? []) {
    for (const job of attempt.jobs ?? []) {
      if (job.conclusion === 'failure') {
        jobs.push({
          name: job.name ?? null,
          jobId: job.jobId ?? null,
          failedSteps: (job.steps ?? []).filter(step => step.conclusion === 'failure').map(step => step.name ?? null),
        });
      }
    }
  }
  return jobs;
}

function laneOutcomes(run) {
  const out = {};
  for (const attempt of run.attempts ?? []) {
    for (const job of attempt.jobs ?? []) {
      if (job.name === 'fast-gate' || job.name === 'deep-verification') out[job.name] = job.conclusion ?? null;
    }
  }
  return out;
}

function buildEpisodes(runs, gapMs) {
  const byBranch = new Map();
  for (const run of runs) {
    const key = run.headBranch ?? '(unknown)';
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key).push(run);
  }

  const episodes = [];
  let nextId = 1;
  for (const [branch, rows] of byBranch) {
    rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    let episode = null;
    let lastFailureAt = null;

    for (const run of rows) {
      if (run.conclusion === 'success') {
        episode = null;
        lastFailureAt = null;
        continue;
      }
      if (run.conclusion !== 'failure') continue;

      const at = Date.parse(run.createdAt);
      if (!episode || (lastFailureAt !== null && at - lastFailureAt > gapMs)) {
        episode = {
          id: nextId++,
          branch,
          startedAt: run.createdAt,
          endedAt: run.createdAt,
          failures: [],
        };
        episodes.push(episode);
      }
      episode.endedAt = run.createdAt;
      episode.failures.push({
        runId: run.runId,
        headSha: run.headSha,
        createdAt: run.createdAt,
        pullRequestNumber: run.pullRequestNumber ?? null,
        failedJobs: failedJobs(run),
        lanes: laneOutcomes(run),
      });
      lastFailureAt = at;
    }
  }
  return episodes;
}

function summarizeLaneEpisode(episode) {
  const visible = episode.failures
    .map(row => [row.lanes['fast-gate'], row.lanes['deep-verification']])
    .filter(([fast, deep]) => fast || deep);
  const hasDeepOnly = visible.some(([fast, deep]) => fast === 'success' && deep === 'failure');
  const hasBoth = visible.some(([fast, deep]) => fast === 'failure' && deep === 'failure');
  const allFastOnly = visible.length > 0 && visible.every(([fast, deep]) => fast === 'failure' && deep === 'success');
  if (hasDeepOnly) return 'contains-deep-only-transition';
  if (allFastOnly) return 'fast-only';
  if (hasBoth) return 'both-at-some-point';
  return 'incomplete-or-transition-era';
}

function cancellationSupersession(runs) {
  const byBranch = new Map();
  for (const run of runs) {
    const key = run.headBranch ?? '(unknown)';
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key).push(run);
  }
  const minutes = [];
  for (const rows of byBranch.values()) {
    rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    for (let i = 0; i < rows.length - 1; i += 1) {
      if (rows[i].conclusion !== 'cancelled') continue;
      minutes.push((Date.parse(rows[i + 1].createdAt) - Date.parse(rows[i].createdAt)) / 60000);
    }
  }
  minutes.sort((a, b) => a - b);
  const percentile = p => {
    if (!minutes.length) return null;
    const index = Math.min(minutes.length - 1, Math.max(0, Math.ceil((p / 100) * minutes.length) - 1));
    return minutes[index];
  };
  return {
    cancellationsWithLaterSameBranchRun: minutes.length,
    medianMinutes: percentile(50),
    p75Minutes: percentile(75),
    p90Minutes: percentile(90),
    within10Minutes: minutes.filter(value => value <= 10).length,
    within10MinutesFraction: minutes.length ? minutes.filter(value => value <= 10).length / minutes.length : null,
  };
}

const options = parseArgs(process.argv.slice(2));
const records = readJsonl(options.input);
const prCi = records.filter(run => run.workflowFile === 'ci.yml');
const episodes = buildEpisodes(prCi, options.gapHours * 60 * 60 * 1000);
const currentStart = Date.parse(options.currentEraStart);
const currentEpisodes = episodes.filter(episode => Date.parse(episode.endedAt) >= currentStart);
const laneCounts = {};
for (const episode of currentEpisodes) {
  const key = summarizeLaneEpisode(episode);
  laneCounts[key] = (laneCounts[key] ?? 0) + 1;
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  parameters: {
    input: options.input,
    gapHours: options.gapHours,
    currentEraStart: options.currentEraStart,
    note: 'Mechanical candidate families only. Semantic adjudication may split or merge episodes.',
  },
  summary: {
    prCiRuns: prCi.length,
    prCiFailures: prCi.filter(run => run.conclusion === 'failure').length,
    prCiCancellations: prCi.filter(run => run.conclusion === 'cancelled').length,
    repairEpisodes: episodes.length,
    currentEraRepairEpisodes: currentEpisodes.length,
    currentEraLaneEpisodeCounts: laneCounts,
    cancellationSupersession: cancellationSupersession(prCi),
  },
  episodes,
};

fs.mkdirSync(path.dirname(options.output), { recursive: true });
fs.writeFileSync(options.output, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
