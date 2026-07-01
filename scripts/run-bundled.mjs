#!/usr/bin/env node
/**
 * Run a Node CLI entry as an esbuild bundle instead of via tsx.
 *
 * WHY THIS EXISTS: the solver's hot search loops (scoreMove, the lower-bound / topology prunes)
 * run ~5x slower under `tsx` than under an esbuild/Vite bundle. `tsx` transforms each `.ts` module
 * separately and loads it through its own hook; the per-node cross-module calls in the hot path
 * then fail to inline. Plain `.js` is loaded natively by tsx (fast), which is why the regression
 * only appeared once the hot solver files became `.ts` in the TypeScript migration. The production
 * app never hit this — it ships a Vite (esbuild) bundle — but the `tsx`-based CLI/CI tooling did.
 * See docs/history + codebase-quality-followup-plan.md §1.
 *
 * This wrapper esbuild-bundles the entry (same transform production uses) into `.solver-tools/`
 * (one level under the repo root, so the entry's `new URL('..', import.meta.url)` still resolves to
 * the repo root for data/ lookups) and runs it under plain node. Local `.ts` source is bundled and
 * optimized; npm deps stay external (resolved from the repo's node_modules at runtime).
 *
 * Usage: node scripts/run-bundled.mjs <entry> [args...]
 */
import { buildSync } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const [entry, ...rest] = process.argv.slice(2);
if (!entry) { console.error('usage: run-bundled.mjs <entry> [args...]'); process.exit(2); }

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = path.join(root, '.solver-tools');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, path.basename(entry).replace(/\.(mjs|cjs|ts|js)$/, '') + '.bundle.mjs');

buildSync({
    entryPoints: [path.resolve(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: outFile,
    logLevel: 'warning',
    // Bundle the local .ts source (the point — that's the hot path); leave npm deps external
    // (they are .js already and resolve from the repo node_modules, since .solver-tools/ is under root).
    packages: 'external',
});

const res = spawnSync(process.execPath, [outFile, ...rest], { stdio: 'inherit' });
process.exit(res.status ?? 1);
