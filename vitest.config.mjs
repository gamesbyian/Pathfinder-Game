import { defineConfig } from 'vitest/config';

// Historical `*-unit-tests.mjs` naming does not imply Vitest ownership. These files are standalone
// Node/CLI-driving harnesses and run through package.json's `test:node` aliases. Keep this list as a
// runner-boundary inventory until their filenames or harnesses are normalized.
const NODE_HARNESS_TESTS = [
    'scripts/loader-unit-tests.mjs',
    'scripts/hint-workbench-unit-tests.mjs',
    'scripts/hint-diversification-unit-tests.mjs',
    'scripts/hint-corpus-expand-unit-tests.mjs',
    'scripts/hint-complete-enumeration-sharded-unit-tests.mjs',
    'scripts/family-generate-unit-tests.mjs',
    'scripts/family-analyze-unit-tests.mjs',
    'scripts/portfolio-solve-sweep-lib-unit-tests.mjs',
    'scripts/portfolio-sweep-reports-to-benchmark-unit-tests.mjs',
    'scripts/stress/hint-cost-drift-lib-unit-tests.mjs',
    'scripts/req-length-sweep-lib-unit-tests.mjs',
    'scripts/family-boundary-lib-unit-tests.mjs',
    'scripts/family-boundary-cli-unit-tests.mjs',
    'scripts/family-parent-hint-replay-unit-tests.mjs',
    'scripts/stress/divergence-lib-unit-tests.mjs',
    'scripts/winning-attempt-family-lib-unit-tests.mjs',
    'scripts/analyze-technique-campaign-unit-tests.mjs',
    'scripts/select-family-result-source-unit-tests.mjs',
];

export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'modules/**/*.test.ts',
            'scripts/**/*-unit-tests.mjs',
            'scripts/path-state-invariant-tests.mjs',
        ],
        exclude: [
            ...NODE_HARNESS_TESTS,
            'node_modules/**',
            'dist/**',
        ],
        // Solver suites can solve/exhaustively enumerate real or synthetic states; hosted-runner
        // variance has exceeded 60s for the deadlock-soundness property.
        testTimeout: 90000,
        hookTimeout: 60000,

        // Coverage is opt-in through `test:coverage`. The config is the authority for current
        // scope and thresholds; docs/testing.md intentionally does not duplicate the percentages.
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
                'modules/**/*.test.ts',
                'modules/**/types.ts',
                'modules/solver/testing-api.ts',
            ],
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
