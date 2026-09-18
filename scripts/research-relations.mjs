#!/usr/bin/env node
import {
    buildResearchRelations,
    queryRelation,
    relationNames,
} from './research-relations-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const model = buildResearchRelations(process.cwd());

if (args.includes('--list') || !value('relation')) {
    console.log(JSON.stringify({
        schemaVersion: 1,
        relations: relationNames(model).map(name => ({
            name,
            count: model.relations[name].length,
            contract: model.contracts[name] ?? null,
        })),
    }, null, 2));
    process.exit(0);
}

const relation = value('relation');
const limitRaw = value('limit');
const limit = limitRaw ? Number(limitRaw) : 20;
if (!Number.isFinite(limit) || limit < 0) throw new Error('--limit must be a non-negative number');

const result = queryRelation(model, relation, {
    query: value('query'),
    status: value('status'),
    limit,
});
console.log(JSON.stringify(result, null, 2));
