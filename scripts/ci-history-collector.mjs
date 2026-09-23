#!/usr/bin/env node
/**
 * Collect GitHub Actions history for the CI historical-value audit.
 *
 * Design goals:
 * - paginate to exhaustion rather than sampling;
 * - preserve workflow/run/attempt/job/step identities and timings;
 * - join runs to PRs from one repository-wide PR index rather than per-run lookups;
 * - fetch detailed job/step trees for non-successful/rerun runs by default;
 * - keep raw job logs and per-green-run step trees out of the default corpus;
 * - make retention/API gaps explicit instead of treating them as "never happened".
 *
 * Requires an authenticated `gh` CLI with read access to Actions and pull requests.
 *
 * Examples:
 *   node scripts/ci-history-collector.mjs
 *   node scripts/ci-history-collector.mjs --repo gamesbyian/Pathfinder-Game --out tmp/ci-audit
 *   node scripts/ci-history-collector.mjs --max-runs 50
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_REPO = 'gamesbyian/Pathfinder-Game';
const DEFAULT_WORKFLOWS = [
  { file: 'ci.yml', role: 'pull-request-gate' },
  { file: 'main-push-validation.yml', role: 'main-push-validation' },
];

function parseArgs(argv) {
  const out = {
    repo: DEFAULT_REPO,
    outDir: 'tmp/ci-audit',
    maxRuns: null,
    workflows: [...DEFAULT_WORKFLOWS],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') out.repo = argv[++i];
    else if (arg.startsWith('--repo=')) out.repo = arg.slice(7);
    else if (arg === '--out') out.outDir = argv[++i];
    else if (arg.startsWith('--out=')) out.outDir = arg.slice(6);
    else if (arg === '--max-runs') out.maxRuns = Number(argv[++i]);
    else if (arg.startsWith('--max-runs=')) out.maxRuns = Number(arg.slice(11));
    else if (arg === '--workflow') {
      const file = argv[++i];
      out.workflows = [{ file, role: 'custom' }];
    } else if (arg.startsWith('--workflow=')) {
      out.workflows = [{ file: arg.slice(11), role: 'custom' }];
    } else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-history-collector.mjs [--repo owner/name] [--out dir] [--max-runs N] [--workflow file.yml]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!out.repo.includes('/')) throw new Error('--repo must be owner/name');
  if (out.maxRuns !== null && (!Number.isSafeInteger(out.maxRuns) || out.maxRuns < 1)) {
    throw new Error('--max-runs must be a positive integer');
  }
  return out;
}

function ghJson(endpoint) {
  const stdout = execFileSync('gh', ['api', endpoint], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

function ghPaginated(endpoint, arrayKey) {
  const rows = [];
  let page = 1;
  while (true) {
    const joiner = endpoint.includes('?') ? '&' : '?';
    const payload = ghJson(`${endpoint}${joiner}per_page=100&page=${page}`);
    const batch = Array.isArray(payload) ? payload : payload[arrayKey];
    if (!Array.isArray(batch)) {
      throw new Error(`expected array '${arrayKey}' from ${endpoint}`);
    }
    rows.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return rows;
}

function isoDurationMs(start, end) {
  if (!start || !end) return null;
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.max(0, b - a) : null;
}

function normalizedStep(step) {
  return {
    number: step.number ?? null,
    name: step.name ?? null,
    status: step.status ?? null,
    conclusion: step.conclusion ?? null,
    startedAt: step.started_at ?? null,
    completedAt: step.completed_at ?? null,
    durationMs: isoDurationMs(step.started_at, step.completed_at),
  };
}

function normalizedJob(job, attempt) {
  return {
    jobId: job.id,
    runId: job.run_id ?? null,
    attempt,
    name: job.name ?? null,
    status: job.status ?? null,
    conclusion: job.conclusion ?? null,
    startedAt: job.started_at ?? null,
    completedAt: job.completed_at ?? null,
    durationMs: isoDurationMs(job.started_at, job.completed_at),
    runnerName: job.runner_name ?? null,
    runnerGroupName: job.runner_group_name ?? null,
    htmlUrl: job.html_url ?? null,
    steps: (job.steps ?? []).map(normalizedStep),
  };
}

function getAttemptJobs(repo, runId, attempt) {
  const attemptEndpoint = `/repos/${repo}/actions/runs/${runId}/attempts/${attempt}/jobs`;
  try {
    return ghPaginated(attemptEndpoint, 'jobs');
  } catch (error) {
    if (attempt !== 1) throw error;
    // Very old/single-attempt runs may be easier to retrieve through the generic endpoint.
    return ghPaginated(`/repos/${repo}/actions/runs/${runId}/jobs`, 'jobs');
  }
}

function normalizePr(pr) {
  return {
    number: pr.number,
    state: pr.state ?? null,
    mergedAt: pr.merged_at ?? null,
    createdAt: pr.created_at ?? null,
    updatedAt: pr.updated_at ?? null,
    baseSha: pr.base?.sha ?? null,
    headSha: pr.head?.sha ?? null,
    mergeCommitSha: pr.merge_commit_sha ?? null,
    changedFilesCount: pr.changed_files ?? null,
  };
}

function loadPullRequestIndex(repo) {
  const pulls = ghPaginated(`/repos/${repo}/pulls?state=all&sort=created&direction=desc`, null);
  const byNumber = new Map();
  const byHeadSha = new Map();
  for (const pr of pulls) {
    const normalized = normalizePr(pr);
    byNumber.set(normalized.number, normalized);
    if (normalized.headSha && !byHeadSha.has(normalized.headSha)) byHeadSha.set(normalized.headSha, normalized);
  }
  return { byNumber, byHeadSha, count: pulls.length };
}

function resolvePr(run, index) {
  const refs = run.pull_requests ?? [];
  if (refs.length === 1 && index.byNumber.has(refs[0].number)) return index.byNumber.get(refs[0].number);
  if (run.head_sha && index.byHeadSha.has(run.head_sha)) return index.byHeadSha.get(run.head_sha);
  return null;
}

function shouldCollectJobs(run) {
  return run.conclusion !== 'success' || (run.run_attempt ?? 1) > 1;
}

function normalizedRun(run, workflow, attempts, pr) {
  return {
    schemaVersion: 1,
    workflowFile: workflow.file,
    workflowRole: workflow.role,
    workflowId: run.workflow_id ?? null,
    workflowName: run.name ?? null,
    runId: run.id,
    runNumber: run.run_number ?? null,
    runAttempt: run.run_attempt ?? 1,
    event: run.event ?? null,
    status: run.status ?? null,
    conclusion: run.conclusion ?? null,
    createdAt: run.created_at ?? null,
    updatedAt: run.updated_at ?? null,
    runStartedAt: run.run_started_at ?? null,
    durationMs: isoDurationMs(run.run_started_at ?? run.created_at, run.updated_at),
    headSha: run.head_sha ?? null,
    headBranch: run.head_branch ?? null,
    path: run.path ?? null,
    htmlUrl: run.html_url ?? null,
    pullRequestNumber: pr?.number ?? null,
    pullRequest: pr,
    attempts,
    detailedJobsCollected: attempts.some(attempt => Array.isArray(attempt.jobs) && attempt.jobs.length > 0),
  };
}

function writeJsonl(file, rows) {
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function summarize(records, gaps, startedAt) {
  const attempts = records.flatMap(run => run.attempts);
  const jobs = attempts.flatMap(attempt => attempt.jobs);
  const failedJobs = jobs.filter(job => job.conclusion && !['success', 'skipped', 'neutral'].includes(job.conclusion));
  const prNumbers = new Set(records.map(run => run.pullRequestNumber).filter(Boolean));
  const created = records.map(run => run.createdAt).filter(Boolean).sort();
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    collectorStartedAt: startedAt,
    oldestRunCreatedAt: created[0] ?? null,
    newestRunCreatedAt: created.at(-1) ?? null,
    runs: records.length,
    attempts: attempts.length,
    jobs: jobs.length,
    failedJobs: failedJobs.length,
    pullRequestsRepresented: prNumbers.size,
    pullRequestsIndexed: prIndex.count,
    detailedRunJobsCollected: records.filter(run => run.detailedJobsCollected).length,
    successfulRunJobDetailsSkipped: records.filter(run => run.conclusion === 'success' && !run.detailedJobsCollected).length,
    workflows: Object.fromEntries(
      [...new Set(records.map(run => run.workflowFile))].sort().map(file => [
        file,
        records.filter(run => run.workflowFile === file).length,
      ]),
    ),
    conclusions: Object.fromEntries(
      [...new Set(records.map(run => run.conclusion ?? 'null'))].sort().map(value => [
        value,
        records.filter(run => (run.conclusion ?? 'null') === value).length,
      ]),
    ),
    gaps,
    note: 'This is an availability statement, not proof that unobserved checks never failed. GitHub retention and historical workflow changes can create blind spots.',
  };
}

const options = parseArgs(process.argv.slice(2));
const startedAt = new Date().toISOString();
fs.mkdirSync(options.outDir, { recursive: true });

const records = [];
const gaps = [];
let prIndex = { byNumber: new Map(), byHeadSha: new Map(), count: 0 };
try {
  prIndex = loadPullRequestIndex(options.repo);
} catch (error) {
  gaps.push({ type: 'pull-request-index-unavailable', error: error.message });
}

for (const workflow of options.workflows) {
  let runs;
  try {
    runs = ghPaginated(`/repos/${options.repo}/actions/workflows/${workflow.file}/runs`, 'workflow_runs');
  } catch (error) {
    gaps.push({ type: 'workflow-runs-unavailable', workflow: workflow.file, error: error.message });
    continue;
  }
  if (options.maxRuns !== null) runs = runs.slice(0, options.maxRuns);

  for (const run of runs) {
    const attemptCount = Math.max(1, run.run_attempt ?? 1);
    const attempts = [];
    if (shouldCollectJobs(run)) {
      for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
        try {
          const jobs = getAttemptJobs(options.repo, run.id, attempt);
          attempts.push({
            attempt,
            jobs: jobs.map(job => normalizedJob(job, attempt)),
          });
        } catch (error) {
          gaps.push({
            type: 'attempt-jobs-unavailable',
            workflow: workflow.file,
            runId: run.id,
            attempt,
            error: error.message,
          });
          attempts.push({ attempt, jobs: [], unavailable: true });
        }
      }
    } else {
      attempts.push({ attempt: attemptCount, jobs: [], detailSkipped: 'successful-run' });
    }

    const pr = resolvePr(run, prIndex);
    records.push(normalizedRun(run, workflow, attempts, pr));
  }
}

records.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
const summary = summarize(records, gaps, startedAt);

writeJsonl(path.join(options.outDir, 'history.jsonl'), records);
fs.writeFileSync(path.join(options.outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(options.outDir, 'gaps.json'), `${JSON.stringify(gaps, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
