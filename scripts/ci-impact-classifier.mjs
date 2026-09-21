#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'scripts', 'ci-impact-rules.json');

export function loadImpactRules(root = ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'ci-impact-rules.json'), 'utf8'));
  if (config.schemaVersion !== 1) throw new Error(`unsupported ci-impact-rules schemaVersion ${config.schemaVersion}`);
  const surfaces = new Set(config.surfaces ?? []);
  if (!surfaces.size) throw new Error('ci-impact-rules surfaces must be non-empty');
  const compiled = (config.rules ?? []).map(rule => {
    if (!rule.id || !rule.pattern || !Array.isArray(rule.surfaces) || !rule.surfaces.length) {
      throw new Error('invalid ci-impact rule');
    }
    for (const surface of rule.surfaces) {
      if (surface !== 'all' && !surfaces.has(surface)) throw new Error(`${rule.id}: unknown surface ${surface}`);
    }
    return { ...rule, regex: new RegExp(rule.pattern, 'u') };
  });
  return { ...config, surfaceSet: surfaces, compiled };
}

export function classifyPaths(paths, config = loadImpactRules()) {
  const selected = new Set();
  const files = [];
  let full = false;

  for (const file of paths) {
    const rule = config.compiled.find(candidate => candidate.regex.test(file));
    if (!rule) {
      full = true;
      files.push({ path: file, rule: null, reason: 'unclassified path', surfaces: ['all'] });
      continue;
    }
    const fileSurfaces = [...rule.surfaces];
    if (fileSurfaces.includes('all')) full = true;
    for (const surface of fileSurfaces) if (surface !== 'all') selected.add(surface);
    files.push({ path: file, rule: rule.id, reason: rule.reason, surfaces: fileSurfaces });
  }

  if (full) {
    selected.clear();
    for (const surface of config.surfaces) selected.add(surface);
  }

  return {
    full,
    surfaces: [...selected].sort(),
    files,
  };
}

function parseArgs(argv) {
  const paths = [];
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--file') {
      const value = argv[index + 1];
      if (!value) throw new Error('--file requires a path');
      paths.push(value);
      index += 1;
      continue;
    }
    if (arg === '--files-from') {
      const value = argv[index + 1];
      if (!value) throw new Error('--files-from requires a file');
      const text = fs.readFileSync(value, 'utf8');
      paths.push(...text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean));
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  return { paths, json };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { paths, json } = parseArgs(process.argv.slice(2));
    if (!paths.length) {
      console.error('usage: node scripts/ci-impact-classifier.mjs [--json] (--file <path> | --files-from <file>)...');
      process.exit(2);
    }
    const result = classifyPaths(paths);
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`CI impact: ${result.full ? 'FULL' : result.surfaces.join(', ')}`);
      for (const file of result.files) {
        console.log(`  ${file.path}: ${file.rule ?? 'UNCLASSIFIED'} -> ${file.surfaces.join(', ')}`);
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
