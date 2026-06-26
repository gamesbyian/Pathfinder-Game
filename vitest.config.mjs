import { defineConfig } from 'vitest/config';

// Vitest runs the migrated unit/integration suites (modernization-plan §6 / codebase-quality-review
// #6). These were ~33 hand-rolled `node scripts/*-unit-tests.mjs` files on a homegrown register/run
// harness; they now use Vitest's `test()` + `node:assert` and are discovered here.
//
// They all run DOM-free (they did under plain `node`), so a single `node` environment covers every
// suite — no jsdom/happy-dom split needed. Node-run validators that aren't unit tests
// (hint-path-oracle, validate-bundled-levels, firestore-rules, startup-smoke, loader,
// data-asset-runtime-smoke) stay as `node` scripts — see package.json `test:node`.
export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'scripts/**/*-unit-tests.mjs',
            'scripts/path-state-invariant-tests.mjs',
        ],
        exclude: [
            // Legacy inline-harness hold-out (browser-adapter IIFE structure) — still a node script.
            'scripts/loader-unit-tests.mjs',
            'node_modules/**',
            'dist/**',
        ],
        // Solver suites can solve real levels; give them headroom over the 5s default.
        testTimeout: 60000,
        hookTimeout: 60000,
    },
});
