#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const RULES_PATH = path.join(ROOT, 'scripts', 'ci-impact-rules.json');

function deriveRegisteredEntrypointOwnership(root) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'validation-groups.json'), 'utf8'));
  const ownership = new Map();

  for (const familyName of ['validators', 'nodeTests']) {
    for (const [group, members] of Object.entries(registry[familyName] ?? {})) {
      for (const member of members) {
        const command = packageJson.scripts?.[member];
        for (const entrypoint of commandLocalPaths(command)) {
          if (!ownership.has(entrypoint)) ownership.set(entrypoint, new Set());
          ownership.get(entrypoint).add(group);
        }
      }
    }
  }

  return new Map(
    [...ownership.entries()].map(([entrypoint, surfaces]) => [entrypoint, [...surfaces].sort()]),
  );
}

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
  return { ...config, surfaceSet: surfaces, compiled, exactOwnership: deriveRegisteredEntrypointOwnership(root) };
}

export function classifyPaths(paths, config = loadImpactRules()) {
  const selected = new Set();
  const files = [];
  let full = false;

  for (const file of paths) {
    const exactSurfaces = config.exactOwnership?.get(file);
    const rule = exactSurfaces ? null : config.compiled.find(candidate => candidate.regex.test(file));
    if (!exactSurfaces && !rule) {
      full = true;
      files.push({ path: file, rule: null, reason: 'unclassified path', surfaces: ['all'] });
      continue;
    }
    const fileSurfaces = exactSurfaces ? [...exactSurfaces] : [...rule.surfaces];
    if (fileSurfaces.includes('all')) full = true;
    for (const surface of fileSurfaces) if (surface !== 'all') selected.add(surface);
    files.push({ path: file, rule: exactSurfaces ? 'registered-validation-entrypoint' : rule.id, reason: exactSurfaces ? 'ownership derived from validation-groups.json + package.json' : rule.reason, surfaces: fileSurfaces });
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


function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function commandLocalPaths(command) {
  if (typeof command !== 'string') return [];
  const matches = [...command.matchAll(/(?:^|\s)((?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|tsx))(?:\s|$)/gu)];
  return matches.map(match => match[1].replace(/^\.\//u, ''));
}

function fullPackageImpact(config, reason, changedKeys = []) {
  return {
    full: true,
    surfaces: [...config.surfaces].sort(),
    reason,
    changedKeys,
    scriptChanges: [],
  };
}

/**
 * Classify a package.json change by semantic content rather than treating every script-registration
 * edit as equivalent to dependency/build/toolchain mutation.
 *
 * Safety rule: anything except scripts-only mutation is full impact. A changed script is narrow
 * only when every changed command resolves to one or more local scripts whose path ownership is
 * already known. Opaque commands, deleted commands with no surviving local-path evidence, and
 * commands touching CI/router infrastructure escalate to full.
 */
export function classifyPackageJsonDocuments(baseDocument, headDocument, config = loadImpactRules()) {
  const base = typeof baseDocument === 'string' ? JSON.parse(baseDocument) : baseDocument;
  const head = typeof headDocument === 'string' ? JSON.parse(headDocument) : headDocument;
  const keys = [...new Set([...Object.keys(base ?? {}), ...Object.keys(head ?? {})])].sort();
  const changedKeys = keys.filter(key => stableJson(base?.[key]) !== stableJson(head?.[key]));

  if (changedKeys.length === 0) {
    return { full: false, surfaces: [], reason: 'package.json unchanged', changedKeys, scriptChanges: [] };
  }
  if (changedKeys.some(key => key !== 'scripts')) {
    return fullPackageImpact(config, 'package metadata/dependency/build authority changed', changedKeys);
  }

  const baseScripts = base?.scripts ?? {};
  const headScripts = head?.scripts ?? {};
  const scriptNames = [...new Set([...Object.keys(baseScripts), ...Object.keys(headScripts)])].sort();
  const changedScripts = scriptNames.filter(
    name => baseScripts[name] !== headScripts[name],
  );
  const selected = new Set();
  const scriptChanges = [];

  for (const name of changedScripts) {
    const before = baseScripts[name] ?? null;
    const after = headScripts[name] ?? null;
    const paths = [...new Set([...commandLocalPaths(before), ...commandLocalPaths(after)])];

    if (paths.length === 0) {
      return fullPackageImpact(
        config,
        `package script ${name} changed without classifiable local script entrypoints`,
        changedKeys,
      );
    }

    const classified = classifyPaths(paths, config);
    scriptChanges.push({ name, before, after, paths, impact: classified });
    if (classified.full) {
      return fullPackageImpact(
        config,
        `package script ${name} reaches full-impact or unknown entrypoint`,
        changedKeys,
      );
    }
    for (const surface of classified.surfaces) selected.add(surface);
  }

  return {
    full: false,
    surfaces: [...selected].sort(),
    reason: 'scripts-only package change classified from local entrypoints',
    changedKeys,
    scriptChanges,
  };
}


/**
 * Classify Git-style changed-file records. Rename/copy records include both the previous and current
 * path so ownership cannot be narrowed merely by moving a file across a semantic boundary. Deleted
 * files retain their old-path impact. Unknown statuses fail broad.
 */
export function classifyChanges(changes, config = loadImpactRules()) {
  const paths = [];
  let invalidStatus = false;
  const normalized = [];

  for (const change of changes) {
    const status = change?.status;
    const currentPath = change?.path ?? null;
    const previousPath = change?.previousPath ?? null;
    if (!['A', 'C', 'D', 'M', 'R', 'T'].includes(status)) invalidStatus = true;

    const ownedPaths = [];
    if (previousPath) ownedPaths.push(previousPath);
    if (currentPath) ownedPaths.push(currentPath);
    if (!ownedPaths.length) invalidStatus = true;
    paths.push(...ownedPaths);
    normalized.push({ status, path: currentPath, previousPath, ownedPaths });
  }

  const impact = classifyPaths([...new Set(paths)], config);
  if (invalidStatus && !impact.full) {
    impact.full = true;
    impact.surfaces = [...config.surfaces].sort();
  }
  return {
    ...impact,
    changes: normalized,
    invalidStatus,
  };
}


/**
 * Whole-change-set composition used by backtests and the future CI router.
 * package.json is classified semantically when both revisions are supplied; otherwise its ordinary
 * path rule remains the conservative full-impact fallback.
 */
export function classifyChangeSet(
  changes,
  { packageBase = null, packageHead = null, config = loadImpactRules() } = {},
) {
  const packageTouched = changes.some(change => change.path === 'package.json' || change.previousPath === 'package.json');
  const ordinaryChanges = packageBase != null && packageHead != null
    ? changes.filter(change => change.path !== 'package.json' && change.previousPath !== 'package.json')
    : changes;
  const ordinary = classifyChanges(ordinaryChanges, config);
  const selected = new Set(ordinary.surfaces);
  let full = ordinary.full;
  let packageImpact = null;

  if (packageTouched && packageBase != null && packageHead != null) {
    packageImpact = classifyPackageJsonDocuments(packageBase, packageHead, config);
    if (packageImpact.full) full = true;
    for (const surface of packageImpact.surfaces) selected.add(surface);
  }

  if (full) {
    selected.clear();
    for (const surface of config.surfaces) selected.add(surface);
  }

  return {
    full,
    surfaces: [...selected].sort(),
    ordinary,
    packageImpact,
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
