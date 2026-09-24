#!/usr/bin/env node
/**
 * Referee-validate every path in every tracked canonical Hint store.
 *
 * Ownership is reconstructed from the physical contract itself: each hints/hints-* directory is
 * discovered mechanically, and sibling JSON corpus files provide persistent level ids. Duplicate
 * owners, orphan Hint files, unreadable artifacts and referee failures are fatal.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { decodeHintArtifact } from '../modules/domain/hint-runtime.mjs';
import { isHintArtifactFileName, hintArtifactFileName, hintKeyForLevel } from '../modules/hint-artifact-layout.mjs';
import { discoverHintStoreDirs } from './hint-store-roots.mjs';

const { parseRawLevel, parseRawLevelDetailed } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

function levelsFromDocument(parsed) {
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) return [];
    return levels.filter(level => level && typeof level === 'object'
        && level.grid && (Array.isArray(level.gates) || Array.isArray(level.gateKeys))
        && (level.goal || Number.isInteger(level.goalKey)));
}

function parseOwnedLevel(raw, index, relativeDir) {
    const parsed = parseRawLevelDetailed(raw, index);
    if (parsed.ok && parsed.level) return parsed;

    // Family-generation corpora intentionally include research levels larger than the 15x15
    // player/editor schema limit. They remain valid solver/referee subjects and their Hint stores
    // use the same canonical physical contract. Relax only that known domain-specific constraint;
    // every other structural error remains fatal.
    const familyStore = relativeDir === 'data/families/hints'
        || relativeDir === 'data/families/phaseB/hints';
    const onlyPlayerGridLimit = parsed.errors.length > 0
        && parsed.errors.every(error => error === 'grid.w must not exceed 15' || error === 'grid.h must not exceed 15');
    if (familyStore && onlyPlayerGridLimit) {
        const level = parseRawLevel(raw, index);
        if (level) return { ok: true, level, errors: [] };
    }
    return parsed;
}

function ownerMapForHintDir(root, relativeDir) {
    const parent = path.join(root, path.dirname(relativeDir));
    const owners = new Map();
    const ambiguities = [];
    for (const name of readdirSync(parent).filter(name => name.endsWith('.json')).sort()) {
        let parsed;
        try { parsed = JSON.parse(readFileSync(path.join(parent, name), 'utf8')); }
        catch { continue; }
        const levels = levelsFromDocument(parsed);
        levels.forEach((level, index) => {
            const fileName = hintArtifactFileName(hintKeyForLevel(level, index + 1));
            const prior = owners.get(fileName);
            if (prior && prior.source !== name) {
                ambiguities.push(`${fileName}: owned by both ${prior.source} and ${name}`);
            } else {
                owners.set(fileName, { raw: level, source: name, index: index + 1 });
            }
        });
    }
    return { owners, ambiguities };
}

export function validateAllTrackedHintStores(root = process.cwd()) {
    const failures = [];
    const stores = [];
    let artifacts = 0;
    let hints = 0;
    for (const relativeDir of discoverHintStoreDirs(root)) {
        const { owners, ambiguities } = ownerMapForHintDir(root, relativeDir);
        failures.push(...ambiguities.map(message => `${relativeDir}: ambiguous owner: ${message}`));
        let storeArtifacts = 0;
        let storeHints = 0;
        const absDir = path.join(root, relativeDir);
        for (const fileName of readdirSync(absDir).filter(isHintArtifactFileName).sort()) {
            storeArtifacts += 1;
            artifacts += 1;
            const owner = owners.get(fileName);
            if (!owner) {
                failures.push(`${relativeDir}/${fileName}: no sibling level document owns this Hint artifact`);
                continue;
            }
            let records;
            try {
                records = decodeHintArtifact(JSON.parse(readFileSync(path.join(absDir, fileName), 'utf8')));
            } catch (error) {
                failures.push(`${relativeDir}/${fileName}: Hint decode failed: ${error.message}`);
                continue;
            }
            const parsedLevel = parseOwnedLevel(owner.raw, owner.index, relativeDir);
            if (!parsedLevel.ok || !parsedLevel.level) {
                failures.push(`${relativeDir}/${fileName}: owning level from ${owner.source} failed structural parse: ${parsedLevel.errors.join('; ')}`);
                continue;
            }
            for (let i = 0; i < records.length; i++) {
                hints += 1;
                storeHints += 1;
                const verdict = validateCandidatePath(parsedLevel.level, records[i].path);
                if (!verdict.ok) failures.push(`${relativeDir}/${fileName} hint #${i + 1}: ${verdict.reason}`);
            }
        }
        stores.push({ dir: relativeDir, artifacts: storeArtifacts, hints: storeHints, ownerLevels: owners.size });
    }
    return { ok: failures.length === 0, artifacts, hints, stores, failures };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const result = validateAllTrackedHintStores(process.cwd());
    console.log(JSON.stringify({ artifacts: result.artifacts, hints: result.hints, stores: result.stores }, null, 2));
    if (!result.ok) {
        console.error(`Tracked Hint-store referee validation failed (${result.failures.length} issue(s)):`);
        for (const failure of result.failures.slice(0, 200)) console.error('  - ' + failure);
        if (result.failures.length > 200) console.error(`  ... ${result.failures.length - 200} more`);
        process.exit(1);
    }
    console.log('All tracked canonical Hint paths are PLAY-valid against their owning levels.');
}
