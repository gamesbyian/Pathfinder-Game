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
  if (/integrity-guard/u.test(name)) return 'guard';
  if (/combine/u.test(name)) return 'combine';
  if (/diagnostics/u.test(name)) return 'diagnostics';
  if (/confirmation|sweep|refresh|replay|sample/u.test(name)) return 'scientific-batch';
  return 'other';
}

function workflowSelected(name) {
  return name === 'harvest-solver-evidence.yml' || /^solver-.*\.yml$/u.test(name);
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
  const checkoutSites = count(source, /actions\/checkout@/gu);
  const setupNodeSites = count(source, /actions\/setup-node@/gu);
  const npmCiSites = count(source, /^\s*(?:run:\s*)?npm ci\s*$/gmu);
  const sparseCheckoutSites = count(source, /sparse-checkout:/gu);
  const uploadArtifactSites = count(source, /actions\/upload-artifact@/gu);
  const downloadArtifactSites = count(source, /actions\/download-artifact@/gu);
  const runBundledSites = count(source, /scripts\/run-bundled\.mjs/gu);
  const exactDependencyTreeSignals = count(
    source,
    /node_modules.*(?:restore|cache)|dependency-tree|exact[-_ ]dependency|PATHFINDER_.*DEPEND/giu,
  );

  return {
    name,
    class: classifyWorkflow(name),
    checkoutSites,
    setupNodeSites,
    nodeVersions: versions,
    floatingMajorOnlyNodeSites: versions.filter(version => /^\d+$/u.test(version)).length,
    npmCiSites,
    sparseCheckoutSites,
    exactDependencyTreeSignals,
    uploadArtifactSites,
    downloadArtifactSites,
    runBundledSites,
    maxParallelExpressions: maxParallelExpressions(source),
  };
});

const summary = {
  workflowCount: workflows.length,
  checkoutSites: workflows.reduce((sum, row) => sum + row.checkoutSites, 0),
  setupNodeSites: workflows.reduce((sum, row) => sum + row.setupNodeSites, 0),
  floatingMajorOnlyNodeSites: workflows.reduce((sum, row) => sum + row.floatingMajorOnlyNodeSites, 0),
  npmCiSites: workflows.reduce((sum, row) => sum + row.npmCiSites, 0),
  workflowsWithSparseCheckout: workflows.filter(row => row.sparseCheckoutSites > 0).length,
  workflowsWithExactDependencyTreeSignals: workflows.filter(row => row.exactDependencyTreeSignals > 0).length,
  uploadArtifactSites: workflows.reduce((sum, row) => sum + row.uploadArtifactSites, 0),
  downloadArtifactSites: workflows.reduce((sum, row) => sum + row.downloadArtifactSites, 0),
  runBundledSites: workflows.reduce((sum, row) => sum + row.runBundledSites, 0),
  nodeVersionValues: [...new Set(workflows.flatMap(row => row.nodeVersions))].sort(),
};

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  note: 'Static topology only. Site counts identify candidate measurement/refactor surfaces and are not runtime cost estimates.',
  summary,
  workflows,
};

const outputPath = path.resolve(root, options.output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
