#!/usr/bin/env node
/**
 * Phase-13 merged-tree closeout guard.
 *
 * The file-level reqLen/reqInt ownership manifest remains the broad compatibility ratchet.
 * This consumer-inward pass closes the loophole exposed by topology.test.ts in 13B: a file that
 * legitimately contains raw fixtures must not thereby hide a normalized object that still reads a
 * legacy metric property.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BOUNDARY_PATH = 'docs/naming-cleanup-level-metric-boundaries.json';
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx']);
const ROOTS = Object.freeze(['modules', 'scripts']);
const SELF_PATHS = new Set(['scripts/naming-cleanup-phase13-closeout.mjs', 'scripts/naming-cleanup-phase13-closeout-node-test.mjs']);
const NORMALIZED_TYPES = '(?:NormalizedLevel|EngineLevel)';
const NORMALIZED_FACTORIES = '(?:normalizeRawLevel|parseRawLevel|processRawLevel|normalizeLevel|canonicalCloneLevel|deepCloneLevel|cloneLevelWithReq|prepareLevelForSolver)';
const MODULE_NORMALIZEDISH_NAMES = /\b(?:level|normalized|norm|parsed|clone|candidateLevel|probeLevel|solverLevel|engineLevel)\??\.(reqLen|reqInt)\b/gu;

function collectSourceFiles(root, relativeDir, out) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(root, relativePath, out);
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(relativePath);
  }
}

function collectNormalizedIdentifiers(content) {
  const identifiers = new Set();

  const typed = new RegExp('\\b([A-Za-z_$][\\w$]*)\\s*:\\s*(?:Readonly<\\s*)?' + NORMALIZED_TYPES + '\\s*>?', 'gu');
  for (const match of content.matchAll(typed)) identifiers.add(match[1]);

  const factory = new RegExp(
    '\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:await\\s+)?(?:[A-Za-z_$][\\w$]*\\.)?' + NORMALIZED_FACTORIES + '\\s*\\(',
    'gu',
  );
  for (const match of content.matchAll(factory)) identifiers.add(match[1]);

  return identifiers;
}

export function findPhase13NormalizedMetricResidue(relativePath, content) {
  const failures = [];
  const normalizedIdentifiers = collectNormalizedIdentifiers(content);

  for (const identifier of normalizedIdentifiers) {
    const access = new RegExp('\\b' + identifier.replace(/[$]/g, '\\$&') + '\\??\\.(reqLen|reqInt)\\b', 'gu');
    for (const match of content.matchAll(access)) {
      failures.push(`${relativePath}: normalized identifier ${identifier} reads legacy ${match[1]}`);
    }
  }

  // In application/domain/solver modules the generic name "level" and its common normalized
  // aliases mean the in-memory level shape. Raw boundaries intentionally use names such as raw,
  // wire, levelData, source, or explicit fixture objects. This is the consumer-inward rule that
  // would have caught topology.test.ts even though the file also contained legitimate raw fixtures.
  if (relativePath.startsWith('modules/')) {
    for (const match of content.matchAll(MODULE_NORMALIZEDISH_NAMES)) {
      failures.push(`${relativePath}: module normalized-level access still uses legacy ${match[1]}`);
    }
  }

  // Explicitly typed normalized object literals may not be referenced by a typed variable before
  // use, so guard the literal itself too.
  const typedLiteral = new RegExp(
    '\\{[^{}]{0,800}\\b(reqLen|reqInt)\\s*:[^{}]{0,800}\\}\\s*(?:as|satisfies)\\s*' + NORMALIZED_TYPES,
    'gu',
  );
  for (const match of content.matchAll(typedLiteral)) {
    failures.push(`${relativePath}: explicitly typed normalized level literal contains legacy ${match[1]} key`);
  }

  if (/\b(?:NormalizedLevel|EngineLevel)\s*\[\s*['"]req(?:Len|Int)['"]\s*\]/u.test(content)) {
    failures.push(`${relativePath}: normalized level type indexes a legacy metric key`);
  }

  return [...new Set(failures)];
}

export function checkPhase13Closeout(root = process.cwd()) {
  const failures = [];
  const boundaryFile = path.join(root, BOUNDARY_PATH);
  const boundary = JSON.parse(fs.readFileSync(boundaryFile, 'utf8'));

  if (boundary.normalizedMigrationComplete !== true) failures.push('level-metric boundary manifest is not marked normalizedMigrationComplete');
  for (const key of ['normalizedRuntimeConsumer', 'mixedRawAndNormalized', 'ambiguousUnclassified']) {
    if (!Array.isArray(boundary[key]) || boundary[key].length !== 0) {
      failures.push(`${BOUNDARY_PATH}: ${key} must be an empty array after Phase 13B`);
    }
  }

  const files = [];
  for (const relativeRoot of ROOTS) collectSourceFiles(root, relativeRoot, files);
  for (const relativePath of files) {
    if (SELF_PATHS.has(relativePath)) continue;
    const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
    failures.push(...findPhase13NormalizedMetricResidue(relativePath, content));
  }

  const schema = fs.readFileSync(path.join(root, 'modules/domain/level-schema.ts'), 'utf8');
  if (!/interface RawLevel[\s\S]*?\breqLen:\s*number;[\s\S]*?\breqInt:\s*number;/u.test(schema)) {
    failures.push('RawLevel must retain reqLen/reqInt wire fields');
  }
  if (!/interface EngineLevel[\s\S]*?\brequiredLength:\s*number;[\s\S]*?\brequiredIntersections:\s*number;/u.test(schema)) {
    failures.push('EngineLevel must expose requiredLength/requiredIntersections');
  }

  const codec = fs.readFileSync(path.join(root, 'modules/domain/level-codec.ts'), 'utf8');
  if (!/function readRawChallengeMetrics\b/u.test(codec)) failures.push('level-codec.ts must own readRawChallengeMetrics');
  if (!/requiredLength:\s*(?:Number\()?raw\?\.reqLen/u.test(codec) || !/requiredIntersections:\s*(?:Number\()?raw\?\.reqInt/u.test(codec)) {
    failures.push('level-codec.ts must project raw reqLen/reqInt into canonical runtime metric names');
  }
  if (!/reqLen:\s*level\.requiredLength/u.test(codec) || !/reqInt:\s*level\.requiredIntersections/u.test(codec)) {
    failures.push('level-codec.ts must serialize canonical runtime metrics back to raw reqLen/reqInt');
  }

  const solverNormalization = fs.readFileSync(path.join(root, 'modules/solver/normalization.ts'), 'utf8');
  if (/\b(?:reqLen|reqInt)\b/u.test(solverNormalization)) {
    failures.push('solver/normalization.ts must not be a second raw challenge-metric compatibility owner');
  }
  if (!/readRawChallengeMetrics/u.test(solverNormalization)) {
    failures.push('solver/normalization.ts must delegate challenge-metric projection to level-codec.ts');
  }

  return { failures: [...new Set(failures)], scanned: files.length };
}

function main() {
  const { failures, scanned } = checkPhase13Closeout();
  if (failures.length) {
    console.error('Phase-13 normalized level metric closeout check failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-13 normalized level metric closeout check passed: ${scanned} module/script surfaces contain no normalized legacy metric access; raw wire compatibility remains centralized.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
