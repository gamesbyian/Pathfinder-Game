/**
 * Tripwire tests for the AST-based architecture rules that replaced the former regex check scripts
 * (codebase-quality-followup-plan §3). Each migrated rule must (a) flag a real violation — including
 * evasions the old regex missed — and (b) pass clean code. We lint fixture snippets through the
 * project's flat ESLint config at a file path that selects the relevant scoped rule.
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint();

/** Lint `code` as if it lived at `filePath`; return the flat list of {ruleId, message}. */
async function lint(code, filePath) {
    const [res] = await eslint.lintText(code, { filePath });
    return (res?.messages ?? []).map(m => ({ ruleId: m.ruleId, message: m.message }));
}
const hasRule = (msgs, ruleId) => msgs.some(m => m.ruleId === ruleId);

// ── engine-state-boundary (was check-engine-state-boundary.mjs) ──────────────
test('engine-state-boundary flags a direct state.engineState assignment', async () => {
    const msgs = await lint('function f(state) { state.engineState.mode = 3; }', 'modules/engine/_fixture.ts');
    assert.ok(hasRule(msgs, 'local/engine-state-boundary'), JSON.stringify(msgs));
});

test('engine-state-boundary catches computed-access evasion the regex missed', async () => {
    // state.engineState['nav'].path.push(x) — the old regex keyed on the literal "state.engineState." text.
    const msgs = await lint("function f(state, x) { state.engineState['nav'].path.push(x); }", 'modules/input/_fixture.ts');
    assert.ok(hasRule(msgs, 'local/engine-state-boundary'), JSON.stringify(msgs));
});

test('engine-state-boundary flags a nav.path mutating call', async () => {
    const msgs = await lint('function f(nav) { nav.path.splice(0, 1); }', 'modules/ui/_fixture.ts');
    assert.ok(hasRule(msgs, 'local/engine-state-boundary'), JSON.stringify(msgs));
});

test('engine-state-boundary passes clean state-action usage', async () => {
    const msgs = await lint('function f(state) { setMode(state, 3); }', 'modules/engine/_fixture.ts');
    assert.ok(!hasRule(msgs, 'local/engine-state-boundary'), JSON.stringify(msgs));
});

// ── domain purity: browser globals (was check-domain-purity.mjs) ─────────────
test('domain-purity flags a browser global in the pure core', async () => {
    const msgs = await lint('export function f() { return document.getElementById("x"); }', 'modules/domain/_fixture.ts');
    assert.ok(hasRule(msgs, 'no-restricted-globals'), JSON.stringify(msgs));
});

test('domain-purity passes browser-free logic', async () => {
    const msgs = await lint('export function f(a, b) { return Math.max(a, b); }', 'modules/solver/_fixture.ts');
    assert.ok(!hasRule(msgs, 'no-restricted-globals'), JSON.stringify(msgs));
});

// ── domain purity: adapter-layer imports (was check-domain-purity.mjs) ───────
test('domain-purity flags an adapter-layer import from the pure core', async () => {
    const msgs = await lint("import { x } from '../ui.js';\nexport const y = x;", 'modules/runtime/_fixture.ts');
    assert.ok(hasRule(msgs, 'no-restricted-imports'), JSON.stringify(msgs));
});

test('module ownership rejects executable imports from scripts and data', async () => {
    for (const source of ['../../scripts/tool.mjs', '../../data/config/policy.js']) {
        const msgs = await lint(`import { x } from '${source}';\nexport const y = x;`, 'modules/solver/_fixture.ts');
        assert.ok(hasRule(msgs, 'no-restricted-imports'), `${source}: ${JSON.stringify(msgs)}`);
    }
});

test('module ownership allows serializable runtime data imports', async () => {
    const msgs = await lint("import levels from '../../data/levels.json' with { type: 'json' };\nexport const y = levels;", 'modules/domain/_fixture.ts');
    assert.ok(!hasRule(msgs, 'no-restricted-imports'), JSON.stringify(msgs));
});

test('domain-purity allows a type import from state-slices', async () => {
    const msgs = await lint("import type { EngineState } from '../state-slices.js';\nexport type T = EngineState;", 'modules/runtime/_fixture.ts');
    assert.ok(!hasRule(msgs, 'no-restricted-imports'), JSON.stringify(msgs));
});

// ── raw HTML injection (was check-raw-inner-html.mjs) ────────────────────────
test('raw-inner-html flags an innerHTML assignment', async () => {
    const msgs = await lint('function f(el, s) { el.innerHTML = s; }', 'modules/ui/_fixture.ts');
    assert.ok(hasRule(msgs, 'no-restricted-syntax'), JSON.stringify(msgs));
});

test('raw-inner-html passes textContent usage', async () => {
    const msgs = await lint('function f(el, s) { el.textContent = s; }', 'modules/ui/_fixture.ts');
    assert.ok(!hasRule(msgs, 'no-restricted-syntax'), JSON.stringify(msgs));
});
