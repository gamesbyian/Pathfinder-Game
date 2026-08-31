import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ── no-restricted-syntax selectors (AST-based; esquery) ──────────────────────
// Deprecated raw event-type strings that must use ActionType/EffectType constants. Using one as a
// `type:` property value would silently miss the step-dispatcher switch case.
const eventSelectors = [
    { selector: "Property[key.name='type'] > Literal[value='sound']", message: "Use EffectType.PLAY_SOUND instead of raw 'sound' string." },
    { selector: "Property[key.name='type'] > Literal[value='logic_state']", message: "Use ActionType.LOGIC_STATE_CHANGE instead of raw 'logic_state' string." },
    { selector: "Property[key.name='type'] > Literal[value='goose_jumpscare']", message: "Use EffectType.SHOW_GOOSE_JUMP_SCARE instead of raw 'goose_jumpscare' string." },
    { selector: "Property[key.name='type'] > Literal[value='bomb_detonation']", message: "Use EffectType.SHOW_BOMB_DETONATION instead of raw 'bomb_detonation' string." },
];

// Ban raw HTML injection / innerText writes (AST replacement for the former check-raw-inner-html.mjs
// regex script — which only scanned .js/.mjs; the .ts tree is now covered too). Dynamic strings must
// use textContent / renderTextList / explicit DOM construction.
const htmlSelectors = [
    { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'Direct innerHTML assignment is banned (CSP/XSS). Use textContent / renderTextList / DOM construction.' },
    { selector: "AssignmentExpression[left.property.name='outerHTML']", message: 'Direct outerHTML assignment is banned. Use DOM construction.' },
    { selector: "AssignmentExpression[left.property.name='innerText']", message: 'Use textContent instead of innerText.' },
    { selector: "CallExpression[callee.property.name=/^set(Trusted)?HTML$/]", message: 'Trusted-HTML helpers are banned; construct DOM nodes instead.' },
    { selector: "CallExpression[callee.name=/^set(Trusted)?HTML$/]", message: 'Trusted-HTML helpers are banned; construct DOM nodes instead.' },
];

const noRestrictedSyntax = ['error', ...eventSelectors, ...htmlSelectors];

// ── Local AST rule: engine-state mutation boundary ───────────────────────────
// Replaces the former check-engine-state-boundary.mjs regex. The consumer layers (engine/, input/,
// ui/) must route all engine-state mutations through modules/state-actions.js — they may not assign
// to, or call a mutator on, `state.engineState.*`, `engineState.editor.*`, or the destructured `nav.*`
// fields directly. Being AST-based, this also catches evasions the regex missed (computed member
// access like state.engineState['nav'], and `++`/`--` updates).
const MUTATORS = new Set(['push', 'pop', 'splice', 'clear', 'add', 'delete', 'reverse']);
const NAV_FIELDS = new Set(['path', 'isPortalJump', 'activeGateKey', 'lastFlipTime']);

/** Dotted segments of a member chain rooted at a plain identifier, or null (e.g. root is a call). */
function memberSegments(node) {
    const segs = [];
    let cur = node;
    while (cur && cur.type === 'MemberExpression') {
        if (cur.computed) {
            if (cur.property.type === 'Literal' && typeof cur.property.value === 'string') segs.unshift(cur.property.value);
            else segs.unshift('\0'); // dynamic key — unmatchable sentinel
        } else {
            segs.unshift(cur.property.name);
        }
        cur = cur.object;
    }
    if (cur && cur.type === 'Identifier') { segs.unshift(cur.name); return segs; }
    return null;
}
const atStateEngine = s => s && s[0] === 'state' && s[1] === 'engineState';
const atEngineEditor = s => s && s[0] === 'engineState' && s[1] === 'editor';

const localPlugin = {
    rules: {
        'engine-state-boundary': {
            meta: { type: 'problem', docs: { description: 'engine-state mutations must go through state-actions helpers' }, schema: [] },
            create(context) {
                const flagWrite = (node, target) => {
                    if (!target || target.type !== 'MemberExpression') return;
                    const s = memberSegments(target);
                    if (!s) return;
                    if (atStateEngine(s)) context.report({ node, message: 'Write engine state through a state-action helper (modules/state-actions.js), not state.engineState.* directly.' });
                    else if (atEngineEditor(s)) context.report({ node, message: 'Use editor state actions for engineState.editor.* writes.' });
                    else if (s[0] === 'nav' && NAV_FIELDS.has(s[1])) context.report({ node, message: 'Use navigation state actions for nav.* field writes.' });
                };
                return {
                    AssignmentExpression(node) { flagWrite(node, node.left); },
                    UpdateExpression(node) { flagWrite(node, node.argument); },
                    CallExpression(node) {
                        const callee = node.callee;
                        if (!callee || callee.type !== 'MemberExpression' || callee.computed) return;
                        if (!MUTATORS.has(callee.property.name)) return;
                        const s = memberSegments(callee.object);
                        if (!s) return;
                        if (atStateEngine(s)) context.report({ node, message: `Mutate engine state collections through state actions, not state.engineState.*.${callee.property.name}().` });
                        else if (s[0] === 'nav' && s[1] === 'path' && (callee.property.name === 'splice' || callee.property.name === 'reverse'))
                            context.report({ node, message: 'Use navigation state actions for nav.path mutations.' });
                    },
                };
            },
        },
    },
};

// ── Layer-purity bans for the pure logic core (domain/runtime/solver) ────────
// Replaces the former check-domain-purity.mjs regex. The pure layers must not reach for browser-host
// globals or import the adapter/controller layers. Scoped to *.ts (the two Worker *.js host files —
// solver/worker.js, solver/solver-worker-client.js — are the explicit worker boundary and exempt).
const bannedBrowserGlobals = [
    'document', 'window', 'localStorage', 'sessionStorage', 'navigator', 'indexedDB', 'DOMParser',
    'requestAnimationFrame', 'cancelAnimationFrame', 'Worker', 'HTMLElement', 'SVGElement', 'Tone',
    'firebase', 'fetch', 'alert', 'confirm', 'prompt',
];
const bannedAdapterImports = [
    'ui', 'render', 'renderer', 'persistence', 'input', 'engine', 'app', 'boot', 'loader', 'core',
    'editor', 'state-actions', 'state',
].flatMap(seg => [`**/${seg}`, `**/${seg}.js`])
    .concat(['**/ui/**', '**/render/**', '**/persistence/**', '**/input/**', '**/engine/**', '**/editor/**']);
const executableOwnershipImportPattern = {
    group: ['**/scripts/**/*.js', '**/scripts/**/*.mjs', '**/scripts/**/*.ts',
        '**/data/**/*.js', '**/data/**/*.mjs', '**/data/**/*.ts'],
    message: 'modules/ must own reusable executable policy; scripts/ owns entry points and data/ owns serializable inputs (see docs/architecture.md).',
};

const unusedVars = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }];

export default [
    {
        // Ignore generated/vendored content and test fixtures
        ignores: [
            'node_modules/**',
            'logs/**',
            'reports/**',
            'data/**',
            'dist/**',
            '.solver-tools/**',
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

            // Ban deprecated raw event-type strings + raw HTML injection.
            'no-restricted-syntax': noRestrictedSyntax,

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
            'no-restricted-syntax': noRestrictedSyntax,
            'no-fallthrough': 'off',
        },
    }),
    // Type-aware promise-safety — scoped to non-test source only. `projectService` resolves each
    // file to tsconfig.json (which excludes *.test.ts, so tests are ignored here and keep their
    // non-type-aware parse above). We deliberately do NOT extend recommendedTypeChecked: only these
    // two rules are adopted (ADR 0011 "Type-aware lint scope" — the no-unsafe-* family would drown
    // in the intentional adapter `any`). `checksVoidReturn: false` keeps idiomatic async event
    // handlers (onclick/addEventListener) noise-free while still catching floating promises and
    // promises misused in conditionals/spreads — a real bug class in the async solver/persistence/
    // controller code.
    ...tseslint.config({
        files: ['modules/**/*.ts'],
        // Exclude tests (type-checked via tsconfig.test.json) and the in-memory `_fixture.ts`
        // snippets the eslint-rules tripwire test lints — neither is backed by tsconfig.json, so
        // projectService can't resolve them. They only need the syntactic rules from the blocks below.
        ignores: ['modules/**/*.test.ts', 'modules/**/_fixture.ts'],
        languageOptions: {
            parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
        },
    }),
    {
        // Application/reusable modules never import entry-point code from scripts/ or executable
        // policy hidden under data/. JSON imports remain allowed as serializable runtime inputs.
        files: ['modules/**/*.ts'],
        rules: { 'no-restricted-imports': ['error', { patterns: [executableOwnershipImportPattern] }] },
    },
    {
        // Pure logic core: browser-free + no adapter-layer imports (was check-domain-purity.mjs).
        files: ['modules/domain/**/*.ts', 'modules/runtime/**/*.ts', 'modules/solver/**/*.ts'],
        rules: {
            'no-restricted-globals': ['error', ...bannedBrowserGlobals.map(name => ({
                name, message: 'domain/runtime/solver must stay browser-free (see docs/architecture.md). Move the side effect behind an injected adapter.',
            }))],
            'no-restricted-imports': ['error', { patterns: [{
                group: bannedAdapterImports,
                message: 'Pure domain/runtime/solver layer must not import adapter/controller layers (see docs/architecture.md).',
            }, executableOwnershipImportPattern] }],
        },
    },
    {
        // The solver Worker seam is the documented exemption from the browser-free rule
        // (docs/architecture.md): worker.js runs *as* the Worker (plain .js, outside the
        // tsconfig graph) and solver-worker-client.ts is the adapter that constructs and
        // talks to it — `Worker` is the one browser global it legitimately touches.
        files: ['modules/solver/solver-worker-client.ts'],
        rules: {
            'no-restricted-globals': ['error', ...bannedBrowserGlobals.filter(name => name !== 'Worker').map(name => ({
                name, message: 'solver-worker-client is exempt only for `Worker` — everything else stays browser-free (see docs/architecture.md).',
            }))],
        },
    },
    {
        // Consumer layers must route engineState mutations through state-actions (was check-engine-state-boundary.mjs).
        files: ['modules/engine.ts', 'modules/engine/**/*.ts', 'modules/input/**/*.ts', 'modules/ui/**/*.ts'],
        plugins: { local: localPlugin },
        rules: { 'local/engine-state-boundary': 'error' },
    },
    {
        // Colocated unit tests legitimately set up engine state directly and stub browser/adapter
        // deps — they are tests, not production layer code. Exempt them from the architecture rules
        // (correctness/type-checking of tests is enforced by tsconfig.test.json / check:types:tests).
        files: ['modules/**/*.test.ts'],
        plugins: { local: localPlugin },
        rules: {
            'local/engine-state-boundary': 'off',
            'no-restricted-globals': 'off',
            'no-restricted-imports': ['error', { patterns: [executableOwnershipImportPattern] }],
        },
    },
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
            'no-restricted-syntax': ['error', ...htmlSelectors],
        },
    },
];
