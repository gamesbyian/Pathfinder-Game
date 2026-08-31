#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkPhase14ACoreCloseout } from './naming-cleanup-phase14-core-closeout.mjs';
import { checkPhase14B } from './naming-cleanup-phase14-level-utils-closeout.mjs';
import { checkPhase14C1 } from './naming-cleanup-phase14c1-closeout.mjs';
import { checkPhase14C2 } from './naming-cleanup-phase14c2-closeout.mjs';

export const RETAINED_QUALIFIED_CORES = Object.freeze([
  'modules/input/editor-toolbar-core.ts',
  'modules/input/false-goal-trigger-scan-core.ts',
  'modules/input/navigation-core.ts',
  'modules/input/pointer-input-core.ts',
  'modules/input/review-core.ts',
  'modules/input/solver-core.ts',
  'modules/input/submission-core.ts',
]);

export const RETAINED_CORE_ACTIONS = 'modules/state/actions/core-actions.ts';

const RETIRED_MUTABLE_ROOT = ['ENG', 'INE'].join('');

const RETIRED_CURRENT_DOC_PATTERNS = Object.freeze({
  soundBus: { label: 'SOUND_BUS adapter', re: /\bSOUND_BUS\b/u },
  mutableRoot: { label: 'mutable state root', re: new RegExp(`\\b${RETIRED_MUTABLE_ROOT}\\b`, 'u') },
  levelUtils: { label: 'LevelUtils facade', re: /\b(?:LevelUtils|levelUtils)\b/u },
  coreBag: { label: 'core dependency bag', re: /`core`/u },
});

export const PHASE14_CURRENT_DOC_RULES = Object.freeze([
  { path: 'docs/architecture.md', patterns: ['soundBus', 'mutableRoot', 'levelUtils', 'coreBag'] },
  { path: 'docs/typing.md', patterns: ['soundBus', 'mutableRoot', 'levelUtils', 'coreBag'] },
  { path: 'AGENTS.md', patterns: ['soundBus', 'mutableRoot', 'levelUtils'] },
  { path: 'docs/change-recipes.md', patterns: ['soundBus', 'mutableRoot', 'levelUtils'] },
  { path: 'docs/adr/0002-state-action-boundary.md', patterns: ['mutableRoot'] },
  { path: 'docs/adr/0006-pure-transition-cores-no-central-dispatcher.md', patterns: ['mutableRoot'] },
  { path: 'docs/adr/0011-full-typescript-migration.md', patterns: ['levelUtils'] },
]);

export const PHASE14_CURRENT_DOCS = Object.freeze(PHASE14_CURRENT_DOC_RULES.map(rule => rule.path));

export function findPhase14CurrentDocResidue(relativePath, content) {
  const failures = [];
  const rule = PHASE14_CURRENT_DOC_RULES.find(candidate => candidate.path === relativePath);
  const patternKeys = rule?.patterns ?? Object.keys(RETIRED_CURRENT_DOC_PATTERNS);
  for (const key of patternKeys) {
    const { label, re } = RETIRED_CURRENT_DOC_PATTERNS[key];
    if (re.test(content)) failures.push(`${relativePath}: retired Phase-14 current-doc vocabulary (${label})`);
  }
  return failures;
}

export function classifyPhase14CorePath(relativePath) {
  if (relativePath === 'modules/core.ts') return 'retired-top-level-facade';
  if (relativePath === RETAINED_CORE_ACTIONS) return 'retained-core-state-actions';
  if (/^modules\/.*-core\.ts$/u.test(relativePath)) return 'retained-qualified-core';
  return 'unrelated';
}

function mergeFailures(result) {
  if (Array.isArray(result)) return result;
  return result?.failures || [];
}

export function checkPhase14Closeout(root = process.cwd()) {
  const failures = [];

  failures.push(...mergeFailures(checkPhase14ACoreCloseout(root)));
  failures.push(...mergeFailures(checkPhase14B(root)));
  failures.push(...mergeFailures(checkPhase14C1(root)));
  failures.push(...mergeFailures(checkPhase14C2(root)));

  const modulesRoot = path.join(root, 'modules');
  const actualQualified = [];
  const collectQualified = (absoluteDir, relativeDir) => {
    if (!fs.existsSync(absoluteDir)) return;
    for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
      const rel = path.posix.join(relativeDir, entry.name);
      const abs = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) collectQualified(abs, rel);
      else if (entry.isFile() && classifyPhase14CorePath(rel) === 'retained-qualified-core') actualQualified.push(rel);
    }
  };
  collectQualified(modulesRoot, 'modules');
  actualQualified.sort();

  const expected = [...RETAINED_QUALIFIED_CORES].sort();
  if (JSON.stringify(actualQualified) !== JSON.stringify(expected)) {
    failures.push(`qualified ADR core inventory drift: expected ${expected.join(', ')}; found ${actualQualified.join(', ')}`);
  }

  if (!fs.existsSync(path.join(root, RETAINED_CORE_ACTIONS))) {
    failures.push(`${RETAINED_CORE_ACTIONS} must remain as the intentional core-state action owner`);
  }

  const vocabulary = fs.readFileSync(path.join(root, 'docs/naming-and-vocabulary.md'), 'utf8');
  if (!/\*-core\.ts/u.test(vocabulary) || !/state\/actions\/core-actions\.ts/u.test(vocabulary)) {
    failures.push('permanent naming authority must document both retained Phase-14 core terminology classes');
  }

  for (const relativePath of PHASE14_CURRENT_DOCS) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      failures.push(`${relativePath}: required current architecture authority is missing`);
      continue;
    }
    failures.push(...findPhase14CurrentDocResidue(relativePath, fs.readFileSync(absolutePath, 'utf8')));
  }

  const app = fs.readFileSync(path.join(root, 'modules/app.ts'), 'utf8');
  for (const retiredFacadeMember of ['Core:', 'LevelUtils:']) {
    if (app.includes(retiredFacadeMember)) failures.push(`modules/app.ts still exposes retired debug facade member ${retiredFacadeMember}`);
  }
  if (!/State:\s*\{\s*get engineState\(\)/u.test(app)) {
    failures.push('modules/app.ts must expose only State.engineState for mutable debug state');
  }

  return {
    failures: [...new Set(failures)],
    retainedQualifiedCoreCount: actualQualified.length,
  };
}

function main() {
  const { failures, retainedQualifiedCoreCount } = checkPhase14Closeout();
  if (failures.length) {
    console.error('Phase-14 merged-tree closeout failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`Phase-14 merged-tree closeout passed: all batch guards are green; ${retainedQualifiedCoreCount} ADR-qualified core modules and core-actions.ts remain intentionally retained.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
