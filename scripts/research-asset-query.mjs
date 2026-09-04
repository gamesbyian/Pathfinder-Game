#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const query = value('query').trim().toLowerCase();
const id = value('id').trim();
const full = args.includes('--full');
const limit = Number(value('limit') || 12);
const registryPath = path.join(process.cwd(), 'docs', 'solver-research-data-assets.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

function flatten(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === 'object') return Object.entries(value).flatMap(([key, nested]) => [key, ...flatten(nested)]);
    return [String(value)];
}

function searchable(asset) {
    return flatten(asset).join('\n').toLowerCase();
}

function compact(asset) {
    return {
        id: asset.id,
        name: asset.name,
        status: asset.status,
        grain: asset.grain,
        evidenceRoles: asset.evidenceRoles,
        joinKeys: asset.joinKeys,
        queryEntryPoints: asset.queryEntryPoints,
        relatedAssets: asset.relatedAssets,
        affordances: asset.affordances,
        caveats: asset.caveats,
    };
}

let matches = registry.assets;
if (id) matches = matches.filter(asset => asset.id === id);
if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    matches = matches
        .map(asset => ({ asset, score: terms.reduce((score, term) => score + (searchable(asset).includes(term) ? 1 : 0), 0) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.asset.id.localeCompare(b.asset.id))
        .map(item => item.asset);
}

const selected = matches.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 12);
console.log(JSON.stringify({
    registry: 'docs/solver-research-data-assets.json',
    query: query || null,
    id: id || null,
    matched: matches.length,
    returned: selected.length,
    assets: full ? selected : selected.map(compact),
}, null, 2));
