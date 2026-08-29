#!/usr/bin/env node
/**
 * Guard: the solver must never be tuned to specific level *identities*.
 *
 * The solver's routing regime classification and attempt-config selection (modules/solver/) branch
 * on level *features* — reqInt, requiredPathCoverageRatio, must-pass/must-cross counts,
 * portal/flipper counts, gates, reqLen — never on which numbered level is being solved. Historically
 * the comments cited specific levels ("L130 wins via perimeterCW", "saves ~11s on L130") as the
 * motivation for thresholds, which made the policy read as overfit to the 156-level corpus and
 * invited identity-keyed special-casing.
 *
 * This check fails if solver source reintroduces a level-identity reference — either in a comment
 * (e.g. `L130`, `level 130`) or, worse, in control flow (`level.id === …`, `level.level === …`).
 * Rationale belongs in feature terms; if you need to cite evidence, describe the feature regime
 * ("≥3 must-pass", "requiredPathCoverageRatio ≥ 0.82"), not the level number.
 *
 * See docs/archive/codebase-quality-followup-plan.md §1.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOLVER_DIR = 'modules/solver';

// Comment/prose references to a specific level: `L12`, `L146`, or `level 53` / `levels 62-75`.
const LEVEL_TOKEN = /\bL\d{2,}\b/;
const LEVEL_PHRASE = /\blevels?\s+\d+/i;
// Control flow keyed on level identity rather than features.
const IDENTITY_BRANCH = /\blevel\s*\.\s*(?:id|level|index|num)\b\s*(?:===|==|!==|!=|<|>|<=|>=)/;

function listTs(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) listTs(full, acc);
        else if (e.isFile() && e.name.endsWith('.ts')) acc.push(full);
    }
    return acc;
}

// Docs that describe the solver's strategy must also stay feature-keyed. Only the `L###` token is
// checked here (the LEVEL_PHRASE `level N` rule would false-positive on legit prose like
// "test levels 148–150" / "156 levels total").
const DOC_FILES = ['CLAUDE.md', 'docs/solver-architecture.md'];

const violations = [];
for (const file of listTs(SOLVER_DIR)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
        let reason = null;
        if (LEVEL_TOKEN.test(line)) reason = `level-identity token "${line.match(LEVEL_TOKEN)[0]}"`;
        else if (LEVEL_PHRASE.test(line)) reason = `level-identity phrase "${line.match(LEVEL_PHRASE)[0].trim()}"`;
        else if (IDENTITY_BRANCH.test(line)) reason = 'control flow branches on level identity (use features)';
        if (reason) violations.push({ file: path.normalize(file), line: i + 1, reason, text: line.trim() });
    });
}
for (const file of DOC_FILES) {
    if (!fs.existsSync(file)) continue;
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (LEVEL_TOKEN.test(line)) violations.push({ file, line: i + 1, reason: `level-identity token "${line.match(LEVEL_TOKEN)[0]}"`, text: line.trim() });
    });
}

if (violations.length > 0) {
    console.error('Solver must select strategy by level features, not level identity:');
    for (const v of violations) console.error(`  - ${v.file}:${v.line}: ${v.reason}\n      ${v.text}`);
    console.error('\nDescribe the feature regime (e.g. "≥3 must-pass", "requiredPathCoverageRatio ≥ 0.82"), not the level number.');
    process.exit(1);
}

console.log(`Solver level-identity check passed: ${SOLVER_DIR} selects strategy by features only.`);
