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
 * See docs/solver-architecture.md "Command-line usage & tooling" + docs/archive/codebase-quality-followup-plan.md §1.
 *
 * This wrapper esbuild-bundles the entry (same transform production uses) into `.solver-tools/`
 * (one level under the repo root, so the entry's `new URL('..', import.meta.url)` still resolves to
 * the repo root for data/ lookups) and runs it under plain node. Local `.ts` source is bundled and
 * optimized; npm deps stay external (resolved from the repo's node_modules at runtime).
 *
 * Usage: node scripts/run-bundled.mjs <entry> [args...]
 */
import { buildSync } from 'esbuild';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// Bundles `entry` into .solver-tools/ and returns the output file path — exported so a caller that
// needs to spawn several child processes of the SAME entry (e.g. a batch-parallelism wrapper) can
// bundle once up front and point every child at the resulting file directly, rather than each child
// independently invoking this script's own CLI path and racing to buildSync() the same output file
// concurrently.
export function buildBundle(entry) {
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
    return outFile;
}

// CLI entrypoint only when run directly (`node scripts/run-bundled.mjs <entry> [args...]`) — not
// when buildBundle is imported, so importing this module never spawns a child process.
if (import.meta.url === `file://${process.argv[1]}`) {
    const [entry, ...rest] = process.argv.slice(2);
    if (!entry) { console.error('usage: run-bundled.mjs <entry> [args...]'); process.exit(2); }

    const outFile = buildBundle(entry);
    const child = spawn(process.execPath, [outFile, ...rest], { stdio: 'inherit' });

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
            if (!child.killed) child.kill(signal);
        });
    }

    child.on('exit', (code, signal) => {
        if (signal) {
            const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };
            process.exit(signalExitCodes[signal] ?? 1);
        }
        process.exit(code ?? 1);
    });
}
