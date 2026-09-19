import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations, RESEARCH_RELATION_CONTRACTS } from './research-relations-lib.mjs';

const normalize = value => value.split(path.sep).join('/');
const isLocalImport = value => value.startsWith('./') || value.startsWith('../');

function walk(root, relative, predicate, out = []) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) return out;
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
        for (const name of readdirSync(absolute).sort()) walk(root, path.join(relative, name), predicate, out);
    } else if (predicate(relative, stat)) {
        out.push(normalize(relative));
    }
    return out;
}

function packageScripts(root) {
    const document = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    return document.scripts ?? {};
}

function commandScriptPath(command) {
    const tokens = String(command).trim().split(/\s+/u);
    const scriptTokens = tokens.filter(token => token.endsWith('.mjs'));
    if (scriptTokens.length === 0) return null;
    if (scriptTokens[0] === 'scripts/run-bundled.mjs' && scriptTokens[1]) return scriptTokens[1];
    return scriptTokens[0];
}

function localImports(root, relative) {
    if (!relative || !existsSync(path.join(root, relative))) return [];
    const source = readFileSync(path.join(root, relative), 'utf8');
    const imports = [];
    for (const match of source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/gu)) {
        const target = match[2];
        if (!isLocalImport(target)) continue;
        const resolved = normalize(path.relative(root, path.resolve(root, path.dirname(relative), target)));
        imports.push(resolved);
    }
    for (const match of source.matchAll(/^\s*import\s+(['"])([^'"]+)\1/gu)) {
        const target = match[2];
        if (!isLocalImport(target)) continue;
        const resolved = normalize(path.relative(root, path.resolve(root, path.dirname(relative), target)));
        imports.push(resolved);
    }
    return [...new Set(imports)].sort();
}

function researchCommandRoots(root) {
    const scripts = packageScripts(root);
    const rows = Object.entries(scripts)
        .filter(([name, command]) => /(?:research|experiment|evidence|premise|question|family|hint|failure|exact|reference)/iu.test(`${name} ${command}`))
        .map(([name, command]) => ({ name, command, entrypoint: commandScriptPath(command) }))
        .filter(row => row.entrypoint && existsSync(path.join(root, row.entrypoint)));
    return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function dependencyClosure(root, entrypoint) {
    const seen = new Set();
    const stack = [entrypoint];
    while (stack.length) {
        const current = stack.pop();
        if (!current || seen.has(current) || !existsSync(path.join(root, current))) continue;
        seen.add(current);
        for (const imported of localImports(root, current)) {
            if (imported.endsWith('.mjs') && existsSync(path.join(root, imported))) stack.push(imported);
        }
    }
    return [...seen].sort();
}

function planLifecycle(root) {
    const files = [
        ...walk(root, 'docs', relative => /(?:^|\/)solver-.+-plan\.md$/u.test(normalize(relative))),
        ...walk(root, 'docs/archive', relative => relative.endsWith('.md')),
    ];
    const unique = [...new Set(files)].sort();
    return unique.map(relative => {
        const source = readFileSync(path.join(root, relative), 'utf8');
        const status = /^> \*\*Status:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const implementationProgress = /^> \*\*Implementation progress[^:]*:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        return {
            path: relative,
            archived: relative.startsWith('docs/archive/'),
            status,
            implementationProgress,
            lifecycleBasis: status ? 'structured-status-line' : 'filename/path-only',
            fragileProse: !status,
        };
    });
}

function sharedDependencies(root, commands) {
    const owners = new Map();
    for (const command of commands) {
        for (const dependency of dependencyClosure(root, command.entrypoint)) {
            if (dependency === command.entrypoint) continue;
            const list = owners.get(dependency) ?? [];
            list.push(command.name);
            owners.set(dependency, list);
        }
    }
    return [...owners.entries()]
        .filter(([, names]) => names.length >= 2)
        .map(([dependency, names]) => ({
            dependency,
            consumerCount: names.length,
            consumers: [...new Set(names)].sort(),
        }))
        .sort((a, b) => b.consumerCount - a.consumerCount || a.dependency.localeCompare(b.dependency));
}

function relationInventory(model) {
    return Object.entries(RESEARCH_RELATION_CONTRACTS).map(([relation, contract]) => ({
        relation,
        identity: contract.identity,
        source: contract.source,
        rows: model.relations[relation]?.length ?? 0,
        authorityKind: / via |\*|\*\*/u.test(contract.source) ? 'derived/composed' : 'structured-source',
    })).sort((a, b) => a.relation.localeCompare(b.relation));
}

function currentState(model) {
    const questions = model.relations.questions ?? [];
    const queue = model.relations.queue ?? [];
    return {
        queueEntries: queue.length,
        activeQueueEntries: queue.filter(row => String(row.status ?? row.state ?? '').toLowerCase().includes('active')).length,
        questions: questions.length,
        activeQuestions: questions.filter(row => String(row.state ?? '').toLowerCase().startsWith('active')).length,
        evidenceReports: model.relations.evidence?.length ?? 0,
        durableEvidenceBundles: model.relations.durableEvidence?.length ?? 0,
        researchBlocks: model.relations.researchBlocks?.length ?? 0,
        measurementOpportunities: model.relations.measurementOpportunities?.length ?? 0,
        assets: model.relations.assets?.length ?? 0,
    };
}

export function buildResearchSystemInventory(root = process.cwd()) {
    const model = buildResearchRelations(root, { discoverArtifacts: true });
    const commands = researchCommandRoots(root);
    const plans = planLifecycle(root);
    const fragilePlans = plans.filter(row => row.fragileProse);
    const relations = relationInventory(model);
    return {
        schemaVersion: 1,
        authority: {
            kind: 'derived-read-only',
            priorityAuthority: 'docs/solver-optimization-workstreams.md',
            methodAuthority: 'docs/solver-research-operating-model.md',
        },
        currentState: currentState(model),
        relations,
        commands,
        sharedImplementationDependencies: sharedDependencies(root, commands),
        planLifecycle: plans,
        diagnostics: {
            fragilePlanLifecycleCount: fragilePlans.length,
            fragilePlanLifecyclePaths: fragilePlans.map(row => row.path),
            derivedRelationCount: relations.filter(row => row.authorityKind === 'derived/composed').length,
            structuredRelationCount: relations.filter(row => row.authorityKind === 'structured-source').length,
        },
    };
}
