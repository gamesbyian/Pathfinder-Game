#!/usr/bin/env node
/**
 * Guard: every hex color literal in the canvas render layer must be sourced from the active
 * theme (theme.colors.*, theme.burst/check/caution, etc.) or explicitly justified.
 *
 * The canvas renderer (modules/render/*.ts) is invisible to check:css-class-coverage (that
 * only looks at CSS class names) and to ESLint (a fillStyle assignment is just a string, not
 * a banned syntax pattern) — so a new drawing function can hardcode a fixed hex value and
 * nothing else in CI will ever notice, even though the game ships 31 themes and a theme
 * author has no way to reach a color that was never wired to theme.colors. That's exactly how
 * landmark body colors and the mustTurn/adjacentTurn corner badges shipped fully unthemed
 * (see docs/history/development-journal.md and the theming fix commit) until this check
 * existed.
 *
 * Any hex literal in a target file must have a `// theme-exempt: <reason>` comment on the
 * SAME line to pass. There is no separate allowlist file — the reason lives next to the code
 * it excuses, so it moves with refactors and is visible in review/diffs. Legitimate exemptions
 * are things a theme should never override: universal hazard/warning iconography (goose,
 * the false-goal's bomb icon, the prohibited sign), an object's *material* cue rather than its themed identity color
 * (a fountain's water highlight, a statue's stone outline), the intentional multi-color
 * "rainbow" path style, and defensive `||` fallbacks paired with a real theme lookup (mirroring
 * theme-normalizer.ts's own fallback-to-fixed-hex pattern, which is exempt everywhere since
 * fixed hex IS the fallback layer for the whole theming system).
 *
 * A fresh visual element should almost never need `theme-exempt` — wire its color to
 * theme.colors.* (adding a new key + deriveTokens() default in theme-engine.ts if needed, the
 * same pattern the landmark colors use) instead of reaching for it as a shortcut.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const TARGET_DIR = 'modules/render';
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;
const EXEMPT_MARKER = /\/\/\s*theme-exempt:\s*\S/;

function listTs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
        .map(e => path.join(dir, e.name));
}

const violations = [];
for (const file of listTs(TARGET_DIR)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
        const matches = line.match(HEX_COLOR);
        if (!matches) return;
        if (EXEMPT_MARKER.test(line)) return;
        violations.push({ file: path.normalize(file), line: i + 1, colors: matches, text: line.trim() });
    });
}

if (violations.length > 0) {
    console.error('Canvas theme coverage check failed: hex color(s) not sourced from the theme:');
    for (const v of violations) console.error(`  - ${v.file}:${v.line}: ${v.colors.join(', ')}\n      ${v.text}`);
    console.error('\nWire the color to theme.colors.* (see theme-engine.ts deriveTokens + theme-normalizer.ts');
    console.error('for the fallback pattern), or if it must stay fixed regardless of theme, justify it inline:');
    console.error("  ctx.fillStyle = '#000000'; // theme-exempt: <why this can never be themed>");
    process.exit(1);
}

console.log(`Canvas theme coverage check passed: every hex color in ${TARGET_DIR}/*.ts is themed or justified.`);
