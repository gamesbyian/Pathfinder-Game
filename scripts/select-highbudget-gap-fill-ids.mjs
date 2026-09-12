#!/usr/bin/env node
/**
 * Narrows a frozen high-budget cohort id file to an explicit gap-fill subset, or passes the
 * frozen file through unchanged when no override is supplied. Gap-fill exists for the case a
 * prior round left some ids missing to an infrastructure timeout (never a genuine solver outcome)
 * without forcing a full frozen-cohort re-run. An override id outside the frozen cohort is
 * rejected outright: gap-fill may only ever narrow the population, never grow it beyond the
 * audited frozen definition (see docs/solver-workflow-evidence-remediation-plan.md's "support
 * first-class gap fill" requirement).
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

export function selectGapFillIds(frozenIds, overrideText) {
  const override = (overrideText ?? '').split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  if (!override.length) return frozenIds;
  const frozenSet = new Set(frozenIds);
  const outside = override.filter(id => !frozenSet.has(id));
  if (outside.length) throw new Error(`gap-fill id(s) outside the frozen cohort: ${outside.join(', ')}`);
  return [...new Set(override)];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const frozenFile = args.get('frozen-ids-file');
  const out = args.get('out');
  if (!frozenFile || !out) {
    console.error('Usage: select-highbudget-gap-fill-ids.mjs --frozen-ids-file=<file> [--override=<text>] --out=<file>');
    process.exit(2);
  }
  const frozenIds = fs.readFileSync(frozenFile, 'utf8').split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  const selected = selectGapFillIds(frozenIds, args.get('override'));
  fs.writeFileSync(out, `${selected.join('\n')}\n`);
  console.log(`Selected ${selected.length}/${frozenIds.length} id(s) from ${frozenFile}${selected.length === frozenIds.length ? '' : ' (gap-fill subset)'}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`select-highbudget-gap-fill-ids: ${error.message}`); process.exit(2); }
}
