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
            // Colocated, type-checked unit suites (codebase-quality-followup-plan §4 migration).
            'modules/**/*.test.ts',
            // Suites not yet migrated + node-harness hold-outs still under scripts/.
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

        // Coverage (Initiative B). Off by default — `vitest run` (test:unit) stays fast; only
        // `test:coverage` (--coverage) instruments. Scope is the **pure logic surface** (domain/
        // runtime/solver/state + the extracted input cores), NOT the DOM/adapter shells (render/,
        // ui/, input controllers, engine/editor/persistence wiring), which are verified by the
        // Playwright e2e suites instead. See docs/testing.md "Coverage" for the recorded baseline.
        coverage: {
            provider: 'v8',
            reporter: ['text-summary', 'json-summary'],
            reportsDirectory: './coverage',
            include: [
                'modules/domain/**/*.ts',
                'modules/runtime/**/*.ts',
                'modules/solver/**/*.ts',
                'modules/state/**/*.ts',
                'modules/state-slices.ts',
                'modules/input/*-core.ts',
            ],
            exclude: [
                'modules/**/*.test.ts',         // the tests themselves, not source under test
                'modules/**/types.ts',          // type-only modules (no executable code)
                'modules/solver/testing-api.ts',// test/debug helpers
            ],
            // Soft floor: a regression that drops coverage below these aggregates fails CI.
            // Ratcheted by the hardening plan §1 coverage pass (measured baseline: statements
            // 86.2 / branches 75.3 / functions 94.8 / lines 91.9 — see docs/testing.md). The
            // floors sit a few points below measured so normal solver-suite jitter doesn't trip
            // them; the extracted input cores carry a strict per-file floor (they are 100% /
            // ~97% covered and must stay that way).
            thresholds: {
                statements: 82,
                branches: 72,
                functions: 90,
                lines: 88,
                'modules/input/*-core.ts': {
                    statements: 95,
                    branches: 85,
                    functions: 95,
                    lines: 95,
                },
            },
        },
    },
});
