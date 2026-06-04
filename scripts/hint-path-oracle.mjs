/**
 * Hint-Path Oracle (G1 from solver improvement plan)
 *
 * Validates all hint paths from levels.js against their level constraints WITHOUT
 * using the paths to guide the solver. Purpose:
 *   1. CI gate: assert every hint path satisfies all hard level constraints
 *   2. Diagnostic: record which levels have valid/invalid hint paths after solver changes
 *
 * Usage:
 *   node scripts/hint-path-oracle.mjs [--levels=92,108,134] [--verbose] [--output=path.json]
 *
 * Exit code: 0 = all checked paths pass, 1 = one or more paths fail.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';

// --- CLI args ---
const args = process.argv.slice(2);
const argMap = new Map(
  args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.split('='); return [k, v ?? '']; })
);
const verbose = argMap.has('--verbose');
const outputFile = argMap.get('--output') || null;
const filterLevels = (() => {
  const raw = argMap.get('--levels');
  if (!raw) return null;
  return new Set(raw.split(',').map(v => Number(v.trim())).filter(n => Number.isFinite(n) && n > 0));
})();

// --- Key encoding: mirrors APP.LevelUtils in index.html (0-indexed) ---
const PACK = (x, y) => (y << 16) | x;
const UNPACK = k => ({ x: k & 0xFFFF, y: (k >> 16) & 0xFFFF });
// Level data uses 1-indexed coordinates; normalizeLevel subtracts 1
const adj = v => v - 1;
const packLevelCoord = (x, y) => PACK(adj(x), adj(y));

// --- Load levels from levels.js ---
async function loadAllLevels() {
  const root = new URL('..', import.meta.url).pathname;
  const window = {};
  const ctx = vm.createContext({ window });

  const file = 'levels.js';
  const filePath = path.join(root, file);
  if (!existsSync(filePath)) throw new Error('levels.js not found');
  const src = await readFile(filePath, 'utf8');
  vm.runInContext(src, ctx, { filename: file });

  const levels = ctx.window.RAW_LEVELS;
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error('Failed to load RAW_LEVELS from levels.js');
  }
  return levels;
}

// --- Normalize a raw level (mirrors normalizeLevel in index.html) ---
function normalizeRaw(raw) {
  const goalKey = packLevelCoord(raw.goal.x, raw.goal.y);
  const gateKeys = new Set(raw.gates.map(g => packLevelCoord(g.x, g.y)));
  const blockSet = new Set((raw.blocks || []).map(b => packLevelCoord(b.x, b.y)));
  const mustPassKeys = new Set((raw.mustPass || []).map(m => packLevelCoord(m.x, m.y)));
  const mustCrossKeys = new Set((raw.mustCross || []).map(m => packLevelCoord(m.x, m.y)));

  const portalMap = new Map();
  for (const p of (raw.portals || [])) {
    const k1 = packLevelCoord(p.x1, p.y1);
    const k2 = packLevelCoord(p.x2, p.y2);
    portalMap.set(k1, k2);
    portalMap.set(k2, k1);
  }

  return {
    reqLen: raw.reqLen || 0,
    reqInt: raw.reqInt || 0,
    goalKey,
    gateKeys,
    blockSet,
    mustPassKeys,
    mustCrossKeys,
    portalMap,
    grid: raw.grid,
  };
}

// --- Validate a single hint path against level constraints ---
// Mirrors the logic in validateCandidatePath (LegacySolver.js:13622) and
// areWinMetricsSatisfied (index.html:2339).
function validateHintPath(raw, hintPath, levelNumber) {
  const level = normalizeRaw(raw);
  const { reqLen, reqInt, goalKey, gateKeys, blockSet, mustPassKeys, mustCrossKeys, portalMap, grid } = level;
  const { w, h } = grid;

  const errors = [];
  const warnings = [];

  if (!Array.isArray(hintPath) || hintPath.length < 2) {
    return { ok: false, errors: ['hint path must have at least 2 entries'], warnings: [] };
  }

  // validateCandidatePath requires path[0] to be a gate
  if (!gateKeys.has(hintPath[0])) {
    const p = UNPACK(hintPath[0]);
    const gatesStr = [...gateKeys].map(k => { const gp = UNPACK(k); return `(${gp.x+1},${gp.y+1})`; }).join(', ');
    errors.push(`path starts at key ${hintPath[0]} → 0-indexed (${p.x},${p.y}) / 1-indexed (${p.x+1},${p.y+1}), not a gate [${gatesStr}]`);
  }

  const visitCounts = new Map();
  const portalJumpIndices = new Set();
  const dupeIndices = new Set();
  let intersections = 0;

  // Count first cell
  visitCounts.set(hintPath[0], 1);

  for (let i = 1; i < hintPath.length; i++) {
    const prev = hintPath[i - 1];
    const cur = hintPath[i];
    const curP = UNPACK(cur);

    // Consecutive duplicate: noise artifact in some hint paths (not a real move).
    // Skip adjacency/intersection checks and don't update visitCounts so that
    // the next natural revisit of this cell is counted correctly.
    if (cur === prev) {
      dupeIndices.add(i);
      continue;
    }

    // Bounds check
    if (curP.x < 0 || curP.x >= w || curP.y < 0 || curP.y >= h) {
      errors.push(`step ${i}: key ${cur} → 0-indexed (${curP.x},${curP.y}) out of bounds for grid ${w}x${h}`);
    }

    // Block check
    if (blockSet.has(cur)) {
      const p = UNPACK(cur);
      errors.push(`step ${i}: key ${cur} → 1-indexed (${p.x+1},${p.y+1}) is a block`);
    }

    // Resolve the real previous cell (skip over any preceding dupe indices)
    let prevReal = prev;
    for (let j = i - 1; j >= 1 && dupeIndices.has(j); j--) prevReal = hintPath[j - 1];

    // Determine if this is a portal jump
    const isPortalJump = portalMap.has(prevReal) && portalMap.get(prevReal) === cur;

    if (isPortalJump) {
      portalJumpIndices.add(i);
    } else {
      // Regular step: must be adjacent to the real previous cell
      const prevP = UNPACK(prevReal);
      const dx = Math.abs(curP.x - prevP.x);
      const dy = Math.abs(curP.y - prevP.y);
      if (dx + dy !== 1) {
        errors.push(`step ${i}: non-adjacent and non-portal step from 0-indexed (${prevP.x},${prevP.y}) to (${curP.x},${curP.y})`);
      }
    }

    // Track visits and intersections
    const c = visitCounts.get(cur) || 0;
    if (c > 0 && cur !== goalKey && !gateKeys.has(cur)) {
      intersections++;
    }
    visitCounts.set(cur, c + 1);
  }

  // --- realLength = path.length - 1 - portalJumps - dupes (dupes are noise, not real steps) ---
  const realLength = hintPath.length - 1 - portalJumpIndices.size - dupeIndices.size;
  if (realLength !== reqLen) {
    errors.push(`realLength ${realLength} ≠ reqLen ${reqLen} (path has ${hintPath.length} entries, ${portalJumpIndices.size} portal jumps, ${dupeIndices.size} dupes)`);
  }

  // --- reqInt: EXACT match ---
  // Runtime validation (APP.Engine.areWinMetricsSatisfied) requires exact equality.
  if (intersections !== reqInt) {
    errors.push(`intersections ${intersections} ≠ reqInt ${reqInt}`);
  }

  // --- Goal check ---
  const lastKey = hintPath[hintPath.length - 1];
  if (lastKey !== goalKey) {
    const lastP = UNPACK(lastKey);
    const goalP = UNPACK(goalKey);
    errors.push(`path ends at 0-indexed (${lastP.x},${lastP.y}), goal is 0-indexed (${goalP.x},${goalP.y})`);
  }

  // --- mustPass: every mustPass cell visited at least once ---
  for (const mpKey of mustPassKeys) {
    if (!visitCounts.has(mpKey)) {
      const p = UNPACK(mpKey);
      errors.push(`mustPass 1-indexed (${p.x+1},${p.y+1}) not visited`);
    }
  }

  // --- mustCross: every mustCross cell visited at least twice ---
  for (const mcKey of mustCrossKeys) {
    const count = visitCounts.get(mcKey) || 0;
    if (count < 2) {
      const p = UNPACK(mcKey);
      errors.push(`mustCross 1-indexed (${p.x+1},${p.y+1}) visited ${count} times (need ≥2)`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { realLength, intersections, reqLen, reqInt, pathEntries: hintPath.length, portalJumps: portalJumpIndices.size, dupes: dupeIndices.size }
  };
}

// --- Main ---
async function main() {
  const levels = await loadAllLevels();
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

    const hintAnalyses = raw.hints.map((hintPath, hi) => {
      const result = validateHintPath(raw, hintPath, levelNumber);
      return {
        hintIndex: hi,
        status: result.ok ? 'valid' : 'invalid',
        errors: result.errors || [],
        warnings: result.warnings || [],
        stats: result.stats || null
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

    if (result.warnings?.length) {
      for (const w of result.warnings) {
        if (verbose) console.log(`    warn:  ${w}`);
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
  } else {
    console.log('All checked hint variants pass validation.');
  }
}

main().catch(err => {
  console.error('hint-path-oracle error:', err);
  process.exit(1);
});
