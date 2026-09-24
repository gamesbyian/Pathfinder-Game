#!/usr/bin/env node
/**
 * Semantic validation-group registry runner and parity checker.
 *
 * Phase 0 deliberately does not change the universal CI gate. package.json's
 * check:validators and test:node remain authoritative while this script proves
 * that scripts/validation-groups.json is an exact, non-duplicating ownership
 * partition of those existing members.
 *
 * Usage:
 *   node scripts/validation-groups.mjs --check
 *   node scripts/validation-groups.mjs validators repo research
 *   node scripts/validation-groups.mjs nodeTests research shared
 *   node scripts/validation-groups.mjs nodeTests research --list
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, 'scripts', 'validation-groups.json');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const VALID_FAMILIES = new Set(['validators', 'nodeTests']);
const VALID_GROUPS = new Set(['repo', 'game', 'persistence', 'solver', 'research', 'data', 'shared']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function directParallelMembers(command, owner) {
  if (typeof command !== 'string') fail(`${owner}: package script is missing`);
  const tokens = command.trim().split(/\s+/u);
  const runnerIndex = tokens.findIndex(token => token.endsWith('run-scripts-parallel.mjs'));
  if (runnerIndex === -1) fail(`${owner}: expected run-scripts-parallel.mjs composition`);
  return tokens.slice(runnerIndex + 1);
}

function flattenFamily(family) {
  const seen = new Map();
  const flat = [];
  for (const [group, members] of Object.entries(family)) {
    if (!VALID_GROUPS.has(group)) fail(`validation registry: unknown group ${group}`);
    if (!Array.isArray(members)) fail(`validation registry: ${group} must be an array`);
    for (const member of members) {
      if (typeof member !== 'string' || member.length === 0) fail(`validation registry: invalid member in ${group}`);
      if (seen.has(member)) fail(`validation registry: ${member} appears in both ${seen.get(member)} and ${group}`);
      seen.set(member, group);
      flat.push(member);
    }
  }
  return { flat, seen };
}

function compareExact(label, registered, authoritative) {
  const registeredSet = new Set(registered);
  const authoritativeSet = new Set(authoritative);
  const missing = authoritative.filter(member => !registeredSet.has(member));
  const extra = registered.filter(member => !authoritativeSet.has(member));
  if (missing.length || extra.length) {
    console.error(`${label}: registry parity failed`);
    if (missing.length) console.error(`  missing from registry: ${missing.join(', ')}`);
    if (extra.length) console.error(`  not in authoritative aggregate: ${extra.join(', ')}`);
    process.exitCode = 1;
  }
}

if (!fs.existsSync(REGISTRY_PATH)) fail('missing scripts/validation-groups.json');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
if (![1, 2].includes(registry.schemaVersion)) fail(`unsupported validation-groups schemaVersion ${registry.schemaVersion}`);

for (const familyName of VALID_FAMILIES) {
  if (!registry[familyName] || typeof registry[familyName] !== 'object') {
    fail(`validation registry: missing family ${familyName}`);
  }
}

const validatorInventory = flattenFamily(registry.validators);
const nodeInventory = flattenFamily(registry.nodeTests);
const inventories = { validators: validatorInventory, nodeTests: nodeInventory };
const contractSurfaces = registry.contractSurfaces ?? {};

function validateContractSurfaces() {
  for (const [familyName, mappings] of Object.entries(contractSurfaces)) {
    if (!VALID_FAMILIES.has(familyName)) fail(`validation registry: contractSurfaces has unknown family ${familyName}`);
    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
      fail(`validation registry: contractSurfaces.${familyName} must be an object`);
    }
    for (const [member, surfaces] of Object.entries(mappings)) {
      if (!inventories[familyName].seen.has(member)) {
        fail(`validation registry: contractSurfaces.${familyName} names unregistered contract ${member}`);
      }
      if (!Array.isArray(surfaces) || surfaces.length === 0) {
        fail(`validation registry: contractSurfaces.${familyName}.${member} must be a non-empty array`);
      }
      const unique = new Set();
      for (const surface of surfaces) {
        if (!VALID_GROUPS.has(surface) || surface === 'shared') {
          fail(`validation registry: invalid semantic surface ${surface} for ${member}`);
        }
        if (unique.has(surface)) fail(`validation registry: duplicate semantic surface ${surface} for ${member}`);
        unique.add(surface);
      }
    }
  }
}
validateContractSurfaces();

const contractDependencies = registry.contractDependencies ?? {};

function validateContractDependencies() {
  const validScopes = new Set(['repo-inputs', 'fixture-only']);
  const validKeys = new Set(['filesystemScope', 'repoPaths', 'processEntrypoints']);

  for (const [familyName, mappings] of Object.entries(contractDependencies)) {
    if (!VALID_FAMILIES.has(familyName)) fail(`validation registry: contractDependencies has unknown family ${familyName}`);
    if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
      fail(`validation registry: contractDependencies.${familyName} must be an object`);
    }
    for (const [member, declaration] of Object.entries(mappings)) {
      if (!inventories[familyName].seen.has(member)) {
        fail(`validation registry: contractDependencies.${familyName} names unregistered contract ${member}`);
      }
      if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)) {
        fail(`validation registry: contractDependencies.${familyName}.${member} must be an object`);
      }
      for (const key of Object.keys(declaration)) {
        if (!validKeys.has(key)) fail(`validation registry: unsupported dependency key ${key} for ${member}`);
      }

      const scope = declaration.filesystemScope;
      if (scope != null && !validScopes.has(scope)) {
        fail(`validation registry: invalid filesystemScope ${scope} for ${member}`);
      }

      const repoPaths = declaration.repoPaths ?? [];
      if (!Array.isArray(repoPaths) || repoPaths.some(p => typeof p !== 'string' || !p || path.isAbsolute(p))) {
        fail(`validation registry: repoPaths for ${member} must be non-empty repo-relative strings`);
      }
      if (scope === 'repo-inputs' && repoPaths.length === 0) {
        fail(`validation registry: repo-inputs contract ${member} must declare repoPaths`);
      }
      if (scope === 'fixture-only' && repoPaths.length > 0) {
        fail(`validation registry: fixture-only contract ${member} must not declare repoPaths`);
      }

      const processEntrypoints = declaration.processEntrypoints ?? [];
      if (!Array.isArray(processEntrypoints) || processEntrypoints.some(p => typeof p !== 'string' || !p || path.isAbsolute(p))) {
        fail(`validation registry: processEntrypoints for ${member} must be repo-relative strings`);
      }
      for (const entrypoint of processEntrypoints) {
        if (!fs.existsSync(path.join(ROOT, entrypoint))) {
          fail(`validation registry: processEntrypoint for ${member} does not exist: ${entrypoint}`);
        }
      }
    }
  }
}
validateContractDependencies();

function semanticSurfacesFor(familyName, member) {
  const explicit = contractSurfaces?.[familyName]?.[member];
  if (explicit) return explicit;
  return [inventories[familyName].seen.get(member)];
}
const validatorAuthority = directParallelMembers(packageJson.scripts?.['check:validators'], 'check:validators');
const nodeAuthority = directParallelMembers(packageJson.scripts?.['test:node'], 'test:node');

compareExact('validators', validatorInventory.flat, validatorAuthority);
compareExact('nodeTests', nodeInventory.flat, nodeAuthority);

for (const [familyName, inventory] of [
  ['validators', validatorInventory],
  ['nodeTests', nodeInventory],
]) {
  for (const member of inventory.flat) {
    if (typeof packageJson.scripts?.[member] !== 'string') {
      console.error(`${familyName}: registered package script does not exist: ${member}`);
      process.exitCode = 1;
    }
  }
}

if (process.argv.includes('--check')) {
  if (!process.exitCode) {
    console.log(
      `Validation ownership registry is in exact parity: ${validatorInventory.flat.length} validators, `
      + `${nodeInventory.flat.length} Node/CLI harnesses; `
      + `${Object.values(contractSurfaces).reduce((sum, mappings) => sum + Object.keys(mappings ?? {}).length, 0)} contract(s) declare explicit multi-surface ownership; `
      + `${Object.values(contractDependencies).reduce((sum, mappings) => sum + Object.keys(mappings ?? {}).length, 0)} contract(s) declare explicit dependency metadata.`,
    );
  }
  process.exit(process.exitCode ?? 0);
}

if (process.exitCode) process.exit(process.exitCode);

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
if (listOnly) args.splice(args.indexOf('--list'), 1);
const familyName = args.shift();
if (!VALID_FAMILIES.has(familyName)) {
  fail('usage: validation-groups.mjs --check | <validators|nodeTests> <group> [group ...] [--list]');
}
if (args.length === 0) fail('select at least one validation group');

const selected = [];
const selectedSet = new Set();
for (const group of args) {
  if (!VALID_GROUPS.has(group)) fail(`unknown validation group: ${group}`);

  // "shared" is retained as the conservative execution-owner request: when the
  // classifier cannot narrow ownership, run the whole shared bucket exactly as
  // before. Named semantic surfaces additionally select any explicitly
  // multi-surface contracts whose contractSurfaces declaration intersects.
  for (const member of inventories[familyName].flat) {
    const ownedByRequestedShared = group === 'shared' && inventories[familyName].seen.get(member) === 'shared';
    const touchesRequestedSurface = semanticSurfacesFor(familyName, member).includes(group);
    if ((ownedByRequestedShared || touchesRequestedSurface) && !selectedSet.has(member)) {
      selectedSet.add(member);
      selected.push(member);
    }
  }
}

if (selected.length === 0) {
  console.log(`No ${familyName} members selected.`);
  process.exit(0);
}

if (listOnly) {
  console.log(JSON.stringify({
    family: familyName,
    requestedSurfaces: args,
    selected,
  }, null, 2));
  process.exit(0);
}

console.log(`Running ${familyName} groups [${args.join(', ')}]: ${selected.length} command(s)`);
const result = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts', 'run-scripts-parallel.mjs'), ...selected],
  { cwd: ROOT, stdio: 'inherit' },
);
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
