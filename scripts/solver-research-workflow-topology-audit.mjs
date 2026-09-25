#!/usr/bin/env node
/**
 * Static execution-topology census for maintained solver/research GitHub Actions workflows.
 *
 * This deliberately reports structure, not cost. Occurrence counts identify repeated bootstrap,
 * materialization, artifact and execution boundaries that deserve hosted timing evidence; they are
 * not converted into wall-time claims here.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    output: 'tmp/solver-research-workflow-topology.json',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') options.root = argv[++i];
    else if (arg.startsWith('--root=')) options.root = arg.slice('--root='.length);
    else if (arg === '--output') options.output = argv[++i];
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/solver-research-workflow-topology-audit.mjs [--root DIR] [--output FILE]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function nodeVersions(source) {
  return [...source.matchAll(/node-version:\s*['"]?([^'"\s#]+)/gu)].map(match => match[1]);
}

function maxParallelExpressions(source) {
  return [...source.matchAll(/^\s*max-parallel:\s*(.+?)\s*$/gmu)].map(match => match[1]);
}

function classifyWorkflow(name) {
  if (name === 'harvest-solver-evidence.yml') return 'persistence';
  if (/runtime-rehearsal/u.test(name)) return 'rehearsal';
  if (/integrity-guard/u.test(name)) return 'guard';
  if (/combine/u.test(name)) return 'combine';
  if (/diagnostics/u.test(name)) return 'diagnostics';
  if (/confirmation|sweep|refresh|replay|sample/u.test(name)) return 'scientific-batch';
  return 'other';
}

function classifyJob(id, source) {
  if (/solve|shard|sweep|census|probe/u.test(id) && /run-bundled|solve|solver/u.test(source)) return 'scientific-solve';
  if (/plan|generate|freeze|select/u.test(id)) return 'planner-generator';
  if (/combine|publish|summary|compare/u.test(id)) return 'combine-analysis';
  if (/harvest|persist|commit|merge/u.test(id)) return 'persistence';
  if (/audit|guard|check|validate/u.test(id)) return 'guard';
  if (/runtime|rehears/u.test(id)) return 'rehearsal';
  return 'other';
}

function workflowSelected(name) {
  return name === 'harvest-solver-evidence.yml' || /^solver-.*\.yml$/u.test(name);
}

// Dependency-free and intentionally conservative: GitHub workflow job ids are top-level mappings
// exactly two spaces below "jobs:". This does not attempt to be a general YAML parser.
function extractJobs(source) {
  const lines = source.split('\n');
  const jobsStart = lines.findIndex(line => /^jobs:\s*$/u.test(line));
  if (jobsStart < 0) return [];
  const starts = [];
  for (let i = jobsStart + 1; i < lines.length; i += 1) {
    const match = lines[i].match(/^  ([A-Za-z0-9_-]+):\s*$/u);
    if (match) starts.push({ id: match[1], line: i });
  }
  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1].line : lines.length;
    const block = lines.slice(start.line, end).join('\n');
    const versions = nodeVersions(block);
    return {
      id: start.id,
      class: classifyJob(start.id, block),
      checkoutSites: count(block, /actions\/checkout@/gu),
      setupNodeSites: count(block, /actions\/setup-node@/gu),
      nodeVersions: versions,
      floatingMajorOnlyNodeSites: versions.filter(version => /^\d+$/u.test(version)).length,
    exactNode22232Sites: versions.filter(version => version === '22.23.2').length,
      exactNode22232Sites: versions.filter(version => version === '22.23.2').length,
      npmCiSites: count(block, /^\s*(?:run:\s*)?npm ci\s*$/gmu),
      sparseCheckoutSites: count(block, /sparse-checkout:/gu),
      exactDependencyTreeSignals: count(
        block,
        /node_modules.*(?:restore|cache)|dependency-tree|exact[-_ ]dependency|PATHFINDER_.*DEPEND/giu,
      ),
      uploadArtifactSites: count(block, /actions\/upload-artifact@/gu),
      downloadArtifactSites: count(block, /actions\/download-artifact@/gu),
      runBundledSites: count(block, /scripts\/run-bundled\.mjs/gu),
      matrix: /strategy:\s*[\s\S]*?matrix:/u.test(block),
      maxParallelExpressions: maxParallelExpressions(block),
    };
  });
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(options.root);
const workflowsDir = path.join(root, '.github', 'workflows');

const names = fs.readdirSync(workflowsDir)
  .filter(workflowSelected)
  .sort((a, b) => a.localeCompare(b));

const workflows = names.map(name => {
  const file = path.join(workflowsDir, name);
  const source = fs.readFileSync(file, 'utf8');
  const versions = nodeVersions(source);
  const jobs = extractJobs(source);
  return {
    name,
    class: classifyWorkflow(name),
    checkoutSites: count(source, /actions\/checkout@/gu),
    setupNodeSites: count(source, /actions\/setup-node@/gu),
    nodeVersions: versions,
    floatingMajorOnlyNodeSites: versions.filter(version => /^\d+$/u.test(version)).length,
    npmCiSites: count(source, /^\s*(?:run:\s*)?npm ci\s*$/gmu),
    sparseCheckoutSites: count(source, /sparse-checkout:/gu),
    exactDependencyTreeSignals: count(
      source,
      /node_modules.*(?:restore|cache)|dependency-tree|exact[-_ ]dependency|PATHFINDER_.*DEPEND/giu,
    ),
    uploadArtifactSites: count(source, /actions\/upload-artifact@/gu),
    downloadArtifactSites: count(source, /actions\/download-artifact@/gu),
    runBundledSites: count(source, /scripts\/run-bundled\.mjs/gu),
    maxParallelExpressions: maxParallelExpressions(source),
    jobs,
  };
});

const jobs = workflows.flatMap(workflow => workflow.jobs.map(job => ({
  workflow: workflow.name,
  ...job,
})));

const jobClasses = {};
for (const job of jobs) jobClasses[job.class] = (jobClasses[job.class] ?? 0) + 1;

const summary = {
  workflowCount: workflows.length,
  jobCount: jobs.length,
  jobClasses,
  checkoutSites: workflows.reduce((sum, row) => sum + row.checkoutSites, 0),
  setupNodeSites: workflows.reduce((sum, row) => sum + row.setupNodeSites, 0),
  floatingMajorOnlyNodeSites: workflows.reduce((sum, row) => sum + row.floatingMajorOnlyNodeSites, 0),
  exactNode22232Sites: workflows.reduce((sum, row) => sum + row.exactNode22232Sites, 0),
  floatingMajorOnlyWorkflows: workflows.filter(row => row.floatingMajorOnlyNodeSites > 0).map(row => row.name),
  exactNode22232Workflows: workflows.filter(row => row.exactNode22232Sites > 0).map(row => row.name),
  npmCiSites: workflows.reduce((sum, row) => sum + row.npmCiSites, 0),
  workflowsWithSparseCheckout: workflows.filter(row => row.sparseCheckoutSites > 0).length,
  workflowsWithExactDependencyTreeSignals: workflows.filter(row => row.exactDependencyTreeSignals > 0).length,
  uploadArtifactSites: workflows.reduce((sum, row) => sum + row.uploadArtifactSites, 0),
  downloadArtifactSites: workflows.reduce((sum, row) => sum + row.downloadArtifactSites, 0),
  runBundledSites: workflows.reduce((sum, row) => sum + row.runBundledSites, 0),
  nodeVersionValues: [...new Set(workflows.flatMap(row => row.nodeVersions))].sort(),
};

const measurementQueues = {
  shortBootstrapCandidates: jobs
    .filter(job => job.class !== 'scientific-solve' && (job.checkoutSites || job.setupNodeSites || job.npmCiSites))
    .sort((a, b) =>
      (b.checkoutSites + b.setupNodeSites + b.npmCiSites) - (a.checkoutSites + a.setupNodeSites + a.npmCiSites) ||
      a.workflow.localeCompare(b.workflow) ||
      a.id.localeCompare(b.id)),
  matrixSolveBootstrapCandidates: jobs
    .filter(job => job.class === 'scientific-solve' && job.matrix && (job.checkoutSites || job.setupNodeSites || job.npmCiSites))
    .sort((a, b) => a.workflow.localeCompare(b.workflow) || a.id.localeCompare(b.id)),
  sparseInputCandidates: jobs
    .filter(job => job.checkoutSites > 0 && job.sparseCheckoutSites === 0)
    .sort((a, b) =>
      (a.class === 'scientific-solve' ? 1 : 0) - (b.class === 'scientific-solve' ? 1 : 0) ||
      a.workflow.localeCompare(b.workflow) ||
      a.id.localeCompare(b.id)),
};

const output = {
  schemaVersion: 3,
  generatedAt: new Date().toISOString(),
  note: 'Static topology only. Site counts identify candidate measurement/refactor surfaces and are not runtime cost estimates.',
  summary,
  measurementQueues,
  workflows,
};

const outputPath = path.resolve(root, options.output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
