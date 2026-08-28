#!/usr/bin/env node
/**
 * Runs the repo lint (`eslint modules/ scripts/ --max-warnings=0`) with
 * ESLint's per-file result cache, keyed so it can never go stale.
 *
 * A plain `--cache` is not safe here: ESLint invalidates its cache by hashing
 * its own version plus the *serialized* config, and this repo's architecture
 * rules are inline rule *functions* in eslint.config.mjs — functions don't
 * serialize, so editing a rule implementation (or upgrading a plugin package)
 * would silently keep stale per-file results and skip re-linting files the
 * changed rule should now flag. Instead the cache file's name embeds a hash of
 * eslint.config.mjs and package-lock.json, so any config/rule/dependency
 * change starts from an empty cache; within a cache generation, per-file
 * validity uses content hashes (--cache-strategy content), not mtimes. Stale
 * generations are deleted on each run. The cache lives under .cache/eslint
 * rather than node_modules so local runs can reuse it and GitHub Actions can
 * persist the same content-addressed results across compatible commits.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, '.cache', 'eslint');

const hash = createHash('sha256');
for (const file of ['eslint.config.mjs', 'package-lock.json']) {
  hash.update(fs.readFileSync(path.join(ROOT, file)));
}
const cacheFile = `cache-${hash.digest('hex').slice(0, 16)}`;

fs.mkdirSync(CACHE_DIR, { recursive: true });
for (const entry of fs.readdirSync(CACHE_DIR)) {
  if (entry !== cacheFile) fs.rmSync(path.join(CACHE_DIR, entry), { force: true });
}

const result = spawnSync(process.execPath, [
  path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js'),
  'modules/', 'scripts/',
  '--max-warnings=0',
  '--cache',
  '--cache-strategy', 'content',
  '--cache-location', path.join(CACHE_DIR, cacheFile),
], { stdio: 'inherit' });

process.exit(result.status ?? 1);
