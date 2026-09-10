#!/usr/bin/env node
/**
 * Decides whether a solver sweep's incomplete population is safely auto-recoverable, and if so
 * writes exactly the missing ids to --out for a second-pass matrix.
 *
 * "Safely recoverable" means the ONLY integrity problem is missing ids -- no duplicate results, no
 * unexpected results, no malformed rows. Those other failure modes indicate a genuine crash,
 * configuration error, or malformed output, which re-running the same missing ids under the same
 * configuration would not fix and which must never be silently retried without a human looking at
 * it. This script deliberately does not look at WHY ids are missing (e.g. exit codes): the calling
 * workflow is responsible for only invoking recovery when it has independently established that
 * every matrix shard job itself succeeded (no shard-level crash), which is the only way ids can be
 * missing from `--result` without ALSO producing a non-missing-only integrity failure or a failed
 * shard job.
 *
 * Usage:
 *   node scripts/derive-timeout-recovery-population.mjs --expected-ids=<file> --result=<file> --out=<file>
 *
 * Exit codes: 0 = recoverable, missing ids written to --out (count printed; 0 missing ids is still
 * exit 0, with an empty --out, meaning nothing to recover). 3 = NOT recoverable (duplicates,
 * unexpected ids, or malformed rows present) -- no --out written; the caller must not proceed to
 * auto-recovery. 4 = --result missing or unparseable -- also not recoverable; likely every shard
 * failed to produce any output at all, which is a correctness question, not a timeout one.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { readExpectedIds, diffPopulation } from './validate-solver-sweep-integrity.mjs';

export { diffPopulation };

function main() {
  const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
  const expectedFile = args.get('expected-ids');
  const resultFile = args.get('result');
  const outFile = args.get('out');
  if (!expectedFile || !resultFile || !outFile) {
    console.error('Usage: node scripts/derive-timeout-recovery-population.mjs --expected-ids=<file> --result=<file> --out=<file>');
    process.exit(2);
  }
  const root = process.cwd();
  const expectedIds = readExpectedIds(path.resolve(root, expectedFile));

  if (!existsSync(path.resolve(root, resultFile))) {
    console.error(`NOT RECOVERABLE: ${resultFile} does not exist -- every shard likely failed to produce any output, which is a correctness question, not a timeout one.`);
    process.exit(4);
  }
  let result;
  try {
    result = JSON.parse(readFileSync(path.resolve(root, resultFile), 'utf8'));
  } catch (error) {
    console.error(`NOT RECOVERABLE: ${resultFile} is not valid JSON (${error.message}).`);
    process.exit(4);
  }
  if (!Array.isArray(result.levels)) {
    console.error(`NOT RECOVERABLE: ${resultFile} has no levels array.`);
    process.exit(4);
  }

  const diff = diffPopulation(expectedIds, result.levels);
  if (diff.malformed) {
    console.error('NOT RECOVERABLE: one or more result rows lack a level id (malformed output).');
    process.exit(3);
  }
  if (diff.duplicates.length > 0) {
    console.error(`NOT RECOVERABLE: duplicate results present (${diff.duplicates.join(', ')}) -- a genuine correctness problem, not a timeout gap.`);
    process.exit(3);
  }
  if (diff.unexpected.length > 0) {
    console.error(`NOT RECOVERABLE: unexpected results present (${diff.unexpected.join(', ')}) -- a genuine correctness problem, not a timeout gap.`);
    process.exit(3);
  }

  writeFileSync(path.resolve(root, outFile), diff.missing.length ? diff.missing.join('\n') + '\n' : '');
  if (diff.missing.length === 0) {
    console.log(`RECOVERABLE (nothing to recover): population already complete (${diff.actualCount}/${expectedIds.length}).`);
  } else {
    console.log(`RECOVERABLE: ${diff.missing.length}/${expectedIds.length} id(s) missing, no other integrity problems. Wrote ${outFile}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
