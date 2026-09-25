#!/usr/bin/env node
/**
 * Validate structural parseability of every runtime-shipped level.
 *
 * Canonical Hint artifact ownership/decode/PLAY-referee validity is intentionally owned by the
 * permanent `test:validate-all-hint-stores` Node contract. Keeping that proof in one place avoids
 * rehydrating and referee-validating the same large Hint stores twice on full-impact PRs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { prChangedFiles } from './repository-file-view.mjs';

const { parseRawLevelDetailed } = await import('../modules/domain/level-codec.js');

const root = new URL('..', import.meta.url).pathname;
const allCorpora = [
  { label: 'published', relativeFile: 'data/levels.json' },
  { label: 'stress-corpus-1', relativeFile: 'data/stress/stress-levels.json' },
  { label: 'stress-corpus-2', relativeFile: 'data/stress/stress-levels-random.json' },
];

const changed = prChangedFiles(root);
const semanticsChanged = changed?.some(file =>
  file.startsWith('modules/domain/')
  || file === 'scripts/check-level-data-validity.mjs');

const selectedCorpora = !changed || semanticsChanged
  ? allCorpora
  : allCorpora.filter(corpus => changed.includes(corpus.relativeFile));

if (selectedCorpora.length === 0) {
  console.log('Runtime level structural validity: no relevant PR changes; base commit already owns this invariant.');
  process.exit(0);
}

let totalLevels = 0;
const failures = [];

for (const { label, relativeFile } of selectedCorpora) {
  const file = path.join(root, relativeFile);
  let levels;
  try {
    const document = JSON.parse(readFileSync(file, 'utf8'));
    levels = Array.isArray(document) ? document : document?.levels;
  } catch (error) {
    failures.push(`${label}: failed to read level document: ${error.message}`);
    continue;
  }
  if (!Array.isArray(levels) || levels.length === 0) {
    failures.push(`${label}: corpus is empty or does not expose a levels array`);
    continue;
  }

  for (let i = 0; i < levels.length; i++) {
    totalLevels++;
    const raw = levels[i];
    const parsed = parseRawLevelDetailed(raw, i);
    if (!parsed.ok || !parsed.level) {
      failures.push(`${label} position ${i + 1} (id ${raw?.id ?? 'missing'}): ${parsed.errors.join('; ')}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Runtime level structural validity failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `All ${totalLevels} checked runtime levels across ${selectedCorpora.length} corpus`
  + `${selectedCorpora.length === 1 ? '' : 'es'} are structurally valid; `
  + 'canonical Hint decode/ownership/PLAY validity is owned by test:validate-all-hint-stores.',
);
