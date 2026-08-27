#!/usr/bin/env node
/**
 * Validate every runtime-shipped level and associated stored hint.
 *
 * The normal player corpus plus both admin Dev-Mode stress corpora are copied by vite.config.ts.
 * Structural validity and PLAY-valid hints are therefore one runtime-data invariant, not separate
 * "bundled level" and "published hint" concerns.
 */
import path from 'node:path';
import process from 'node:process';

import { readLevelsWithHints } from './level-data-io.mjs';

const { parseRawLevelDetailed } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

const root = new URL('..', import.meta.url).pathname;
const corpora = [
  { label: 'published', file: path.join(root, 'data', 'levels.json') },
  { label: 'stress-corpus-1', file: path.join(root, 'data', 'stress', 'stress-levels.json') },
  { label: 'stress-corpus-2', file: path.join(root, 'data', 'stress', 'stress-levels-random.json') },
];

let totalLevels = 0;
let totalHints = 0;
const failures = [];

for (const { label, file } of corpora) {
  let levels;
  try {
    levels = readLevelsWithHints(file);
  } catch (error) {
    failures.push(`${label}: failed to read levels/hints: ${error.message}`);
    continue;
  }
  if (levels.length === 0) {
    failures.push(`${label}: corpus is empty`);
    continue;
  }

  for (let i = 0; i < levels.length; i++) {
    totalLevels++;
    const raw = levels[i];
    const parsed = parseRawLevelDetailed(raw, i);
    if (!parsed.ok || !parsed.level) {
      failures.push(`${label} position ${i + 1} (id ${raw?.id ?? 'missing'}): ${parsed.errors.join('; ')}`);
      continue;
    }

    const hints = Array.isArray(raw?.hints) ? raw.hints : [];
    for (let h = 0; h < hints.length; h++) {
      totalHints++;
      const verdict = validateCandidatePath(parsed.level, hints[h]);
      if (!verdict.ok) {
        failures.push(`${label} position ${i + 1} (id ${raw?.id ?? 'missing'}) hint #${h}: ${verdict.reason}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Runtime level/hint validity failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`All ${totalLevels} runtime-shipped levels and ${totalHints} stored hints across ${corpora.length} corpora are structurally/PLAY valid.`);
