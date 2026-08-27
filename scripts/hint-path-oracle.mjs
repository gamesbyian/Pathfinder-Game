/**
 * Hint-Path Oracle (G1 from solver improvement plan)
 *
 * Validates all hint paths from data/levels.json against their level constraints WITHOUT
 * using the paths to guide the solver — via the same PLAY-context referee
 * (modules/domain/path-validator.ts :: validateCandidatePath) the player's own drawn path is
 * checked against, and scripts/check-hint-validity.mjs also uses. Purpose:
 *   1. CI gate: assert every hint path satisfies all hard level constraints
 *   2. Diagnostic: record which levels have valid/invalid hint paths after solver changes,
 *      with a per-level, per-hint breakdown (--output) that check:hint-validity doesn't provide
 *
 * Usage:
 *   npm run test:hint-path-oracle -- [--levels=pos:92,pos:108,pos:134] [--verbose] [--output=path.json]
 *
 * Exit code: 0 = all checked paths pass, 1 = one or more paths fail.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readLevelsWithHints, parseLevelPositions } from './level-data-io.mjs';
import path from 'node:path';
import process from 'node:process';

const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

// --- CLI args ---
const args = process.argv.slice(2);
const argMap = new Map(
  args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.split('='); return [k, v ?? '']; })
);
const verbose = argMap.has('--verbose');
const outputFile = argMap.get('--output') || null;
const filterLevels = parseLevelPositions(argMap.get('--levels'));

// --- Load levels from data/levels.json + the split hints artifact (data/hints/) ---
function loadAllLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const filePath = path.join(root, 'data', 'levels.json');
  const levels = readLevelsWithHints(filePath);
  if (levels.length === 0) {
    throw new Error('data/levels.json is empty or not an array');
  }
  return levels;
}

// --- Validate a single hint path against level constraints, via the real PLAY referee ---
function validateHintPath(level, hintPath) {
  const v = validateCandidatePath(level, hintPath);
  return v.ok ? { ok: true, errors: [] } : { ok: false, errors: [v.reason] };
}

// --- Main ---
async function main() {
  const levels = loadAllLevels();
  console.log(`Loaded ${levels.length} levels.`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < levels.length; i++) {
    const levelNumber = i + 1;
    if (filterLevels && !filterLevels.has(levelNumber)) {
      skipped++;
      continue;
    }

    const raw = levels[i];
    if (!Array.isArray(raw.hints) || raw.hints.length === 0) {
      if (verbose) console.log(`  L${levelNumber}: no hints — skip`);
      skipped++;
      results.push({ levelNumber, status: 'no-hints' });
      continue;
    }

    // Parsing/normalization is level-scoped, not hint-scoped. A level can carry thousands of
    // stored hints; reparsing the identical raw level for every path used to dominate this oracle.
    const level = parseRawLevel(raw, i);
    const hintAnalyses = raw.hints.map((hintPath, hi) => {
      const result = level
        ? validateHintPath(level, hintPath)
        : { ok: false, errors: ['level failed to parse (structural validity is covered by validate-bundled-levels)'] };
      return {
        hintIndex: hi,
        status: result.ok ? 'valid' : 'invalid',
        errors: result.errors
      };
    });
    const firstValid = hintAnalyses.find(entry => entry.status === 'valid') || null;
    const invalidHints = hintAnalyses.filter(entry => entry.status === 'invalid');
    const result = firstValid || hintAnalyses[0];
    const status = invalidHints.length === 0 ? 'pass' : 'warn-invalid-hints';

    if (invalidHints.length === 0) {
      passed++;
      if (verbose) {
        console.log(`  L${levelNumber}: PASS (all ${raw.hints.length} hint(s) valid)`);
      }
    } else {
      failed++;
      console.log(`  L${levelNumber}: WARN (${invalidHints.length}/${raw.hints.length} hint(s) invalid)`);
      for (const invalid of invalidHints) {
        console.log(`    hints[${invalid.hintIndex}] invalid:`);
        for (const e of invalid.errors) console.log(`      error: ${e}`);
      }
    }

    results.push({
      levelNumber,
      status,
      invalidHintCount: invalidHints.length,
      totalHintCount: raw.hints.length,
      representativeHintIndex: result?.hintIndex ?? 0,
      hintAnalyses
    });
  }

  const checked = passed + failed;
  console.log(`\nHint-path oracle: ${passed} passed, ${failed} failed, ${skipped} skipped (${checked} checked of ${levels.length} total)`);

  if (outputFile) {
    const dir = path.dirname(outputFile);
    await mkdir(dir, { recursive: true });
    await writeFile(
      outputFile,
      JSON.stringify({ timestamp: new Date().toISOString(), passed, failed, skipped, results }, null, 2),
      'utf8'
    );
    console.log(`Results written to ${outputFile}`);
  }

  if (failed > 0) {
    console.log('\nSome levels include invalid hint variants (see output for per-hint reasons).');
    process.exit(1);
  }
  console.log('All checked hint variants pass validation.');
}

main().catch(err => {
  console.error('hint-path-oracle error:', err);
  process.exit(1);
});
