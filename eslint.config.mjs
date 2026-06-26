import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Deprecated raw event-type strings that must use ActionType/EffectType constants. Using one as a
// `type:` property value would silently miss the step-dispatcher switch case. Shared by the JS and
// TS module configs.
const noRawEventStrings = ['error',
    {
        selector: "Property[key.name='type'] > Literal[value='sound']",
        message: "Use EffectType.PLAY_SOUND instead of raw 'sound' string.",
    },
    {
        selector: "Property[key.name='type'] > Literal[value='logic_state']",
        message: "Use ActionType.LOGIC_STATE_CHANGE instead of raw 'logic_state' string.",
    },
    {
        selector: "Property[key.name='type'] > Literal[value='goose_jumpscare']",
        message: "Use EffectType.SHOW_GOOSE_JUMP_SCARE instead of raw 'goose_jumpscare' string.",
    },
    {
        selector: "Property[key.name='type'] > Literal[value='bomb_detonation']",
        message: "Use EffectType.SHOW_BOMB_DETONATION instead of raw 'bomb_detonation' string.",
    },
];

const unusedVars = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }];

export default [
    {
        // Ignore generated/vendored content and test fixtures
        ignores: [
            'node_modules/**',
            'audits/**',
            'data/**',
            'dist/**',
        ],
    },
    {
        ...js.configs.recommended,
        files: ['modules/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals used in modules
                requestAnimationFrame: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Date: 'readonly',
                Math: 'readonly',
                parseInt: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                Promise: 'readonly',
                Float64Array: 'readonly',
                Uint16Array: 'readonly',
                Uint8Array: 'readonly',
                Int32Array: 'readonly',
                AbortController: 'readonly',
                Object: 'readonly',
                Array: 'readonly',
                JSON: 'readonly',
                Error: 'readonly',
                isNaN: 'readonly',
                isFinite: 'readonly',
                URLSearchParams: 'readonly',
                structuredClone: 'readonly',
                TextEncoder: 'readonly',
                navigator: 'readonly',
                cancelAnimationFrame: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                localStorage: 'readonly',
                fetch: 'readonly',
                queueMicrotask: 'readonly',
                process: 'readonly',
                firebase: 'readonly',
                __initial_auth_token: 'readonly',
                window: 'readonly',
                document: 'readonly',
                DOMParser: 'readonly',
                HTMLElement: 'readonly',
                SVGElement: 'readonly',
                Worker: 'readonly',
                WorkerGlobalScope: 'readonly',
                self: 'readonly',
                URL: 'readonly',
            },
        },
        rules: {
            // Errors: real bugs
            'no-unused-vars': unusedVars,
            'no-undef': 'error',
            'no-constant-condition': 'error',
            'no-duplicate-case': 'error',
            'no-self-assign': 'error',
            'no-unreachable': 'error',

            // Ban deprecated raw event-type strings that must use ActionType/EffectType constants.
            'no-restricted-syntax': noRawEventStrings,

            // Disabled: these have valid uses in this codebase
            'no-fallthrough': 'off',      // intentional in switch statements
            'no-prototype-builtins': 'off',
        },
    },
    // TypeScript modules (the .js→.ts migration, ADR 0011). Scoped via tseslint.config so the TS
    // parser + recommended rules apply ONLY to modules/**/*.ts, leaving .js/.mjs on their configs.
    ...tseslint.config({
        files: ['modules/**/*.ts'],
        extends: [...tseslint.configs.recommended],
        rules: {
            // The migration intentionally uses `any` at the browser/adapter boundary.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': unusedVars,
            'no-unused-vars': 'off', // superseded by the TS-aware rule above
            'no-restricted-syntax': noRawEventStrings,
            'no-fallthrough': 'off',
        },
    }),
    {
        // Scripts use Node globals and CommonJS-adjacent patterns
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Date: 'readonly',
                Math: 'readonly',
                parseInt: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                Promise: 'readonly',
                Float64Array: 'readonly',
                Uint16Array: 'readonly',
                Uint8Array: 'readonly',
                Int32Array: 'readonly',
                Object: 'readonly',
                Array: 'readonly',
                JSON: 'readonly',
                Error: 'readonly',
                isNaN: 'readonly',
                isFinite: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                Buffer: 'readonly',
                fetch: 'readonly',
                queueMicrotask: 'readonly',
                globalThis: 'readonly',
                window: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': unusedVars,
            'no-undef': 'error',
            'no-constant-condition': 'error',
            'no-duplicate-case': 'error',
            'no-self-assign': 'error',
            'no-unreachable': 'error',
            'no-fallthrough': 'off',
            'no-prototype-builtins': 'off',
        },
    },
];
