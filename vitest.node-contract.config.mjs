import { defineConfig } from 'vitest/config';

// Dedicated executable/tooling integration suites owned by the sharded Node contract lane.
// They are deliberately excluded from the covered PR invocation to avoid duplicate execution.
export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'scripts/solver-parallel-unit-tests.mjs',
            'scripts/eslint-rules-unit-tests.mjs',
            'scripts/data-assets-unit-tests.mjs',
        ],
        testTimeout: 90000,
        hookTimeout: 60000,
    },
});
