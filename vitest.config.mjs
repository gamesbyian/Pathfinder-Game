import { defineConfig } from 'vitest/config';

// `*-unit-tests.mjs` is the positive Vitest convention for script-level unit suites.
// Standalone Node/CLI harnesses use `*-node-test.mjs` and are owned by `test:node`.

export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'modules/**/*.test.ts',
            'scripts/**/*-unit-tests.mjs',
            'scripts/path-state-invariant-tests.mjs',
        ],
        exclude: ['node_modules/**', 'dist/**'],
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
                'modules/**/*.test-support.ts',
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
