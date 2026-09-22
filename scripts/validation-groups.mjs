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
if (registry.schemaVersion !== 1) fail(`unsupported validation-groups schemaVersion ${registry.schemaVersion}`);

for (const familyName of VALID_FAMILIES) {
  if (!registry[familyName] || typeof registry[familyName] !== 'object') {
    fail(`validation registry: missing family ${familyName}`);
  }
}

const validatorInventory = flattenFamily(registry.validators);
const nodeInventory = flattenFamily(registry.nodeTests);
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
      + `${nodeInventory.flat.length} Node/CLI harnesses.`,
    );
  }
  process.exit(process.exitCode ?? 0);
}

if (process.exitCode) process.exit(process.exitCode);

const args = process.argv.slice(2);
const familyName = args.shift();
if (!VALID_FAMILIES.has(familyName)) {
  fail('usage: validation-groups.mjs --check | <validators|nodeTests> <group> [group ...]');
}
if (args.length === 0) fail('select at least one validation group');

const selected = [];
const selectedSet = new Set();
for (const group of args) {
  if (!VALID_GROUPS.has(group)) fail(`unknown validation group: ${group}`);
  for (const member of registry[familyName][group] ?? []) {
    if (!selectedSet.has(member)) {
      selectedSet.add(member);
      selected.push(member);
    }
  }
}

if (selected.length === 0) {
  console.log(`No ${familyName} members selected.`);
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
