#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const values = new Map();
const includes = [];
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
  const value = eq === -1 ? 'true' : arg.slice(eq + 1);
  if (key === 'include') includes.push(value);
  else values.set(key, value);
}

const primary = values.get('primary');
if (!primary) {
  console.error('publish-solver-sweep-result: --primary=<path> is required');
  process.exit(2);
}
const outDir = values.get('out') || 'logs/solver-sweep-result';
const sourceArtifact = values.get('source-artifact') || null;
const numberArg = key => values.has(key) && String(values.get(key)).trim() !== '' ? Number(values.get(key)) : null;
const shardsExpected = numberArg('shards-expected');
const shardsObserved = numberArg('shards-observed');
const shardsBasis = values.get('shards-basis') || null;
const provenanceOut = values.get('provenance-out') || null;
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function copyRequested(source, role) {
  if (!fs.existsSync(source)) return { role, source, published: null, missing: true };
  const stat = fs.statSync(source);
  const relative = role === 'primary'
    ? (stat.isDirectory() ? 'result' : `result${path.extname(source) || '.txt'}`)
    : path.join('files', path.basename(source));
  const destination = path.join(outDir, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: stat.isDirectory() });
  return { role, source, published: relative.replaceAll('\\', '/'), missing: false };
}

const entries = [copyRequested(primary, 'primary'), ...includes.map(p => copyRequested(p, 'include'))];

function collectJsonFiles(root, limit = 24) {
  const found = [];
  function visit(current) {
    if (found.length >= limit || !fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current).sort()) {
        visit(path.join(current, name));
        if (found.length >= limit) break;
      }
    } else if (current.endsWith('.json') && path.basename(current) !== 'manifest.json') found.push(current);
  }
  visit(root);
  return found;
}

function buildStageStats(levels) {
  const byStage = new Map();
  for (const level of levels) {
    const seen = new Set();
    for (const attempt of level?.attempts || []) {
      const stageId = attempt?.stageId;
      if (!stageId) continue;
      if (!byStage.has(stageId)) {
        byStage.set(stageId, {
          stageId,
          reach: 0,
          attempts: 0,
          solves: 0,
          nodes: 0,
          work: 0,
          workReported: 0,
        });
      }
      const stage = byStage.get(stageId);
      if (!seen.has(stageId)) {
        stage.reach += 1;
        seen.add(stageId);
      }
      stage.attempts += 1;
      stage.solves += attempt?.ok ? 1 : 0;
      stage.nodes += Number(attempt?.nodesExpanded) || 0;
      if (Number.isFinite(attempt?.workSpent)) {
        stage.work += attempt.workSpent;
        stage.workReported += 1;
      }
    }
  }
  return [...byStage.values()].sort((a, b) => b.attempts - a.attempts || a.stageId.localeCompare(b.stageId));
}

function levelStats(file) {
  try {
    // Full production reports can exceed the old 25 MiB guard once attempt/stage telemetry is
    // included. Parsing one bounded result in the final GHA job is cheap and is exactly where the
    // work/stage observability is needed when artifact downloads are unavailable to an agent.
    if (fs.statSync(file).size > 128 * 1024 * 1024) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed?.levels) ? parsed.levels : null;
    if (!levels) return null;
    const workRows = levels.filter(row => Number.isFinite(row?.workSpent));
    return {
      file,
      levels,
      solved: levels.filter(row => row?.ok).length,
      total: levels.length,
      work: workRows.reduce((n, row) => n + row.workSpent, 0),
      workReported: workRows.length,
      nodes: levels.reduce((n, row) => n + (Number(row?.nodesExpanded) || 0), 0),
      stages: buildStageStats(levels),
    };
  } catch {
    return null;
  }
}

const stats = collectJsonFiles(outDir).map(levelStats).filter(Boolean);
function statsForSource(re) {
  const e = entries.find(x => !x.missing && re.test(x.source));
  if (!e) return null;
  const p = path.join(outDir, e.published);
  return p.endsWith('.json') && fs.existsSync(p) ? levelStats(p) : null;
}
const control = statsForSource(/control/i);
const treatment = statsForSource(/treatment/i);
let comparison = null;
if (control && treatment) {
  const idOf = row => row?.id ?? row?.level;
  const a = new Set(control.levels.filter(x => x?.ok).map(idOf));
  const b = new Set(treatment.levels.filter(x => x?.ok).map(idOf));
  comparison = {
    gained: [...b].filter(id => !a.has(id)).sort(),
    lost: [...a].filter(id => !b.has(id)).sort(),
    workDeltaPct: control.work ? 100 * (treatment.work - control.work) / control.work : null,
  };
}

const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;
let dispatchInputs = {};
try {
  if (process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    dispatchInputs = event?.inputs && typeof event.inputs === 'object' ? event.inputs : {};
  }
} catch (error) {
  console.warn('publish-solver-sweep-result: could not read dispatch inputs:', error.message);
}

const shardCompleteness = Number.isFinite(shardsExpected) && Number.isFinite(shardsObserved)
  ? {
      expected: shardsExpected,
      observed: shardsObserved,
      complete: shardsExpected === shardsObserved,
      basis: shardsBasis,
    }
  : null;

const manifest = {
  schemaVersion: 1,
  kind: 'pathfinder-solver-sweep-result',
  status: entries[0].missing ? 'missing-primary' : 'published',
  workflow: process.env.GITHUB_WORKFLOW || null,
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  event: process.env.GITHUB_EVENT_NAME || null,
  repository: process.env.GITHUB_REPOSITORY || null,
  ref: process.env.GITHUB_REF || null,
  refName: process.env.GITHUB_REF_NAME || null,
  sha: process.env.GITHUB_SHA || null,
  runUrl,
  sourceArtifact,
  dispatchInputs,
  shardCompleteness,
  entries,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

if (provenanceOut) {
  fs.mkdirSync(path.dirname(provenanceOut), { recursive: true });
  fs.writeFileSync(provenanceOut, JSON.stringify({
    kind: 'pathfinder-gha-source-run',
    workflow: manifest.workflow,
    runId: manifest.runId,
    runAttempt: manifest.runAttempt,
    runUrl: manifest.runUrl,
    sha: manifest.sha,
    ref: manifest.ref,
    refName: manifest.refName,
    event: manifest.event,
    dispatchInputs,
    shardCompleteness,
  }, null, 2) + '\n');
}

const lines = ['# Solver sweep result', ''];
if (manifest.workflow) lines.push(`- Workflow: ${manifest.workflow}`);
if (manifest.runId) lines.push(`- Run: ${runUrl ? `[${manifest.runId}](${runUrl})` : manifest.runId}`);
if (manifest.sha) lines.push(`- Commit: \`${manifest.sha}\``);
if (manifest.refName) lines.push(`- Ref: \`${manifest.refName}\``);
if (sourceArtifact) lines.push(`- Legacy/specialized artifact: \`${sourceArtifact}\``);
if (Object.keys(dispatchInputs).length) lines.push('- Dispatch inputs: recorded in `manifest.json`');
if (shardCompleteness) lines.push(`- Shards: ${shardCompleteness.observed}/${shardCompleteness.expected} ${shardCompleteness.complete ? 'complete' : '**INCOMPLETE**'}${shardCompleteness.basis ? ` (${shardCompleteness.basis})` : ''}`);
lines.push('- Standard artifact: `solver-sweep-result`');
lines.push(`- Primary result: ${entries[0].missing ? '**missing**' : `\`${entries[0].published}\``}`);

const missing = entries.filter(e => e.missing);
if (missing.length) {
  lines.push('', '## Missing requested outputs', '');
  for (const e of missing) lines.push(`- \`${e.source}\``);
}
if (stats.length) {
  lines.push('', '## Result summary', '');
  for (const s of stats.slice(0, 12)) {
    const rel = path.relative(outDir, s.file).replaceAll('\\', '/');
    lines.push(`- \`${rel}\`: ${s.solved}/${s.total} solved, work=${s.work} (${s.workReported}/${s.total} levels reported), nodes=${s.nodes}`);
  }
}

const stagedStats = stats.filter(s => s.stages.length).slice(0, 12);
if (stagedStats.length) {
  lines.push('', '## Stage participation', '');
  lines.push('Production-style results expose `attempts[].stageId`; isolated/reference-model outputs without stage IDs are omitted here.');
  for (const s of stagedStats) {
    const rel = path.relative(outDir, s.file).replaceAll('\\', '/');
    lines.push('', `### \`${rel}\``, '');
    lines.push('| stage | reach | attempts | solves | nodesExpanded | attempt workSpent |');
    lines.push('|---|---:|---:|---:|---:|---:|');
    for (const stage of s.stages) {
      const work = stage.workReported ? `${stage.work} (${stage.workReported}/${stage.attempts})` : 'n/a';
      lines.push(`| \`${stage.stageId}\` | ${stage.reach}/${s.total} | ${stage.attempts} | ${stage.solves} | ${stage.nodes} | ${work} |`);
    }
  }
}
if (comparison) {
  lines.push('', '## Control/treatment comparison', '');
  lines.push(`- Gained: ${comparison.gained.length}${comparison.gained.length ? ` (\`${comparison.gained.join(', ')}\`)` : ''}`);
  lines.push(`- Lost: ${comparison.lost.length}${comparison.lost.length ? ` (\`${comparison.lost.join(', ')}\`)` : ''}`);
  if (comparison.workDeltaPct != null) lines.push(`- Work delta: ${comparison.workDeltaPct.toFixed(2)}%`);
}
lines.push('', 'Read `manifest.json` for provenance and source-to-published file mapping.');
const summary = lines.join('\n') + '\n';
fs.writeFileSync(path.join(outDir, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary.trimEnd());
