import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations, RESEARCH_RELATION_CONTRACTS } from './research-relations-lib.mjs';
import { currentDocumentationReferences } from './documentation-index-lib.mjs';
import { auditResearchIntegration } from './research-integration-audit-lib.mjs';

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

function documentationRoles(root, currentReferences) {
    const currentPaths = new Set(currentReferences.map(row => row.path));
    const markdown = [
        ...walk(root, 'docs', relative => relative.endsWith('.md')),
        ...walk(root, 'reports', relative => relative.endsWith('.md')),
    ];
    return [...new Set(markdown)].sort().map(relative => {
        const source = readFileSync(path.join(root, relative), 'utf8');
        let role;
        if (relative.startsWith('docs/archive/') || relative.startsWith('docs/history/')) {
            role = 'historical/archive';
        } else if (currentPaths.has(relative) && lifecycleCandidate(relative)) {
            role = 'active-execution-reference';
        } else if (currentPaths.has(relative)) {
            role = 'canonical-current';
        } else if (/^reports\/\d{4}-\d{2}-\d{2}-.+\.md$/u.test(relative)) {
            role = 'dated-evidence';
        } else {
            role = source.includes('<!-- generated-current-state -->')
                ? 'generated-current-state'
                : 'retained-reference-or-evidence';
        }
        const status = /^> \*\*Status:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const statusText = String(status ?? '').toLowerCase();
        const claimsCurrentAuthority = /(?:canonical|current authority|live authority)/u.test(statusText);
        const claimsActive = /(?:^|\b)active(?:\b|$)/u.test(statusText);
        return {
            path: relative,
            role,
            bytes: statSync(path.join(root, relative)).size,
            status,
            claimsCurrentAuthority,
            claimsActive,
            currentAuthorityClaimOutsideIndex: claimsCurrentAuthority && !currentPaths.has(relative),
        };
    });
}

function lifecycleCandidate(relative) {
    const name = path.basename(relative);
    return /(?:-plan|-preflight|-handoff)\.md$/u.test(name);
}

function lifecycleDisposition(status) {
    const text = String(status ?? '').trim().toLowerCase();
    if (!text) return 'unknown';
    if (/(?:complete|completed|concluded|superseded|historical|retired|cancelled)/u.test(text)) return 'concluded-or-historical';
    if (/(?:blocked|conditional|await|waiting|deferred)/u.test(text)) return 'blocked-or-conditional';
    if (/(?:active|implementation|in progress|proposed implementation plan|live)/u.test(text)) return 'active-execution';
    return 'unknown';
}

function planLifecycle(root, currentReferences = currentDocumentationReferences(root)) {
    const currentReferencePaths = new Set(currentReferences.map(row => row.path));
    const files = [
        ...walk(root, 'docs', relative => lifecycleCandidate(normalize(relative))),
        ...walk(root, 'docs/archive', relative => lifecycleCandidate(normalize(relative))),
    ];
    const unique = [...new Set(files)].sort();
    return unique.map(relative => {
        const source = readFileSync(path.join(root, relative), 'utf8');
        const status = /^> \*\*Status:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const implementationProgress = /^> \*\*Implementation progress[^:]*:\*\* (.+)$/mu.exec(source)?.[1]?.trim() ?? null;
        const disposition = lifecycleDisposition(status);
        const appearsConcluded = disposition === 'concluded-or-historical';
        return {
            path: relative,
            kind: path.basename(relative).includes('-preflight') ? 'preflight'
                : path.basename(relative).includes('-handoff') ? 'handoff'
                    : 'plan',
            archived: relative.startsWith('docs/archive/'),
            currentReference: currentReferencePaths.has(relative),
            status,
            lifecycleDisposition: disposition,
            implementationProgress,
            lifecycleBasis: status ? 'structured-status-line' : 'filename/path-only',
            fragileProse: !status,
            appearsConcluded,
            currentReferenceMismatch: currentReferencePaths.has(relative) && appearsConcluded,
        };
    });
}

function exportedContractFunctions(root, relative) {
    if (!relative || !existsSync(path.join(root, relative))) return [];
    const source = readFileSync(path.join(root, relative), 'utf8');
    const names = [];
    for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gu)) {
        if (/^(?:build|validate|assert|write|format|parse|canonicalize)/u.test(match[1])) names.push(match[1]);
    }
    return [...new Set(names)].sort();
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
            contractFunctions: exportedContractFunctions(root, dependency),
        }))
        .sort((a, b) => b.consumerCount - a.consumerCount || a.dependency.localeCompare(b.dependency));
}

function workflowInventory(root) {
    const lifecyclePath = path.join(root, 'docs/solver-workflow-lifecycle.json');
    if (!existsSync(lifecyclePath)) return [];
    const lifecycle = JSON.parse(readFileSync(lifecyclePath, 'utf8'));
    const packageScriptNames = new Set(Object.keys(packageScripts(root)));
    return (lifecycle.workflows ?? []).map(row => {
        const workflowPath = normalize(path.join('.github/workflows', row.workflow));
        const absolute = path.join(root, workflowPath);
        const source = existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
        const scriptEntrypoints = [...new Set([...source.matchAll(/(?:^|\s)(scripts\/[A-Za-z0-9_./-]+\.mjs)(?=\s|$|['"])/gmu)]
            .map(match => match[1]))].sort();
        const npmAliases = [...new Set([...source.matchAll(/npm\s+run\s+([A-Za-z0-9:_-]+)/gu)]
            .map(match => match[1]).filter(name => packageScriptNames.has(name)))].sort();
        return {
            workflow: row.workflow,
            path: workflowPath,
            role: row.role,
            status: row.status,
            currentConsumer: row.currentConsumer,
            retirementTrigger: row.retirementTrigger,
            scriptEntrypoints,
            npmAliases,
        };
    }).sort((a, b) => a.workflow.localeCompare(b.workflow));
}

function retiredWorkflowInventory(root) {
    const lifecyclePath = path.join(root, 'docs/solver-workflow-lifecycle.json');
    if (!existsSync(lifecyclePath)) return [];
    const lifecycle = JSON.parse(readFileSync(lifecyclePath, 'utf8'));
    return (lifecycle.retiredWorkflows ?? []).map(row => ({
        workflow: row.workflow,
        reason: row.reason ?? null,
        status: 'retired',
        presentOnDisk: existsSync(path.join(root, '.github/workflows', row.workflow)),
    })).sort((a, b) => a.workflow.localeCompare(b.workflow));
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

function frontDoorInputs(model, plans) {
    const questions = model.relations.questions ?? [];
    const questionById = new Map(questions.map(question => [String(question.id), question]));
    const liveQueue = (model.relations.queue ?? [])
        .filter(row => !/(?:closed|subsumed|method complete)/iu.test(String(row.state ?? row.status ?? '')))
        .map(row => ({
            workstreamId: row.workstreamId ?? null,
            question: row.question ?? null,
            state: row.state ?? row.status ?? null,
            remainingGate: row.remainingGate ?? null,
            questionRef: row.questionRef ?? null,
            questionState: row.questionRef ? questionById.get(String(row.questionRef))?.state ?? null : null,
        }));
    const deferredReopenQuestions = questions
        .filter(question => String(question.state ?? '').toLowerCase() === 'deferred-reopen')
        .map(question => ({
            id: question.id,
            owner: question.owner ?? null,
            question: question.question ?? null,
            reopensOn: question.reopensOn ?? null,
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const unfinishedLifecycle = plans
        .filter(row => row.currentReference && !row.appearsConcluded)
        .map(row => ({
            path: row.path,
            kind: row.kind,
            status: row.status,
            fragileProse: row.fragileProse,
        }));
    return { liveQueue, deferredReopenQuestions, unfinishedLifecycle };
}

function inventoryFindings({
    currentAuthorityClaimOutsideIndex,
    currentReferenceLifecycleMismatches,
    fragilePlans,
    unknownLifecycle,
    dependencies,
    retiredWorkflows,
}) {
    return {
        authority: currentAuthorityClaimOutsideIndex.map(row => ({
            kind: 'current-authority-claim-outside-index',
            path: row.path,
            status: row.status,
        })),
        lifecycle: [
            ...currentReferenceLifecycleMismatches.map(row => ({
                kind: 'concluded-current-reference',
                path: row.path,
                status: row.status,
            })),
            ...retiredWorkflows.filter(row => row.presentOnDisk).map(row => ({
                kind: 'retired-workflow-reappeared',
                path: `.github/workflows/${row.workflow}`,
                status: 'retired',
            })),
        ],
        fragileProse: [
            ...fragilePlans.map(row => ({
                kind: 'missing-structured-status',
                path: row.path,
                detail: 'lifecycle falls back to filename/path inference',
            })),
            ...unknownLifecycle.filter(row => !row.fragileProse).map(row => ({
                kind: 'unclassified-structured-status',
                path: row.path,
                detail: row.status,
            })),
        ],
        sharedFailureModes: dependencies.slice(0, 25).map(row => ({
            dependency: row.dependency,
            consumerCount: row.consumerCount,
            consumers: row.consumers,
            contractFunctions: row.contractFunctions,
        })),
    };
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
    const currentReferences = currentDocumentationReferences(root);
    const plans = planLifecycle(root, currentReferences);
    const fragilePlans = plans.filter(row => row.fragileProse);
    const unknownLifecycle = plans.filter(row => row.lifecycleDisposition === 'unknown');
    const currentReferenceLifecycleMismatches = plans.filter(row => row.currentReferenceMismatch);
    const currentMarkdownReferences = currentReferences.filter(row => row.path.endsWith('.md') && existsSync(path.join(root, row.path)));
    const currentMarkdownBytes = currentMarkdownReferences.reduce((sum, row) =>
        sum + statSync(path.join(root, row.path)).size, 0);
    const documentRoles = documentationRoles(root, currentReferences);
    const roleCounts = Object.fromEntries([...new Set(documentRoles.map(row => row.role))].sort()
        .map(role => [role, documentRoles.filter(row => row.role === role).length]));
    const currentAuthorityClaimOutsideIndex = documentRoles.filter(row => row.currentAuthorityClaimOutsideIndex);
    const relations = relationInventory(model);
    const workflows = workflowInventory(root);
    const retiredWorkflows = retiredWorkflowInventory(root);
    const dependencies = sharedDependencies(root, commands);
    const contractOwners = dependencies.filter(row => row.contractFunctions.length > 0);
    const integrationAudit = auditResearchIntegration(root, { model });
    const findings = inventoryFindings({
        currentAuthorityClaimOutsideIndex,
        currentReferenceLifecycleMismatches,
        fragilePlans,
        unknownLifecycle,
        dependencies,
        retiredWorkflows,
    });
    return {
        schemaVersion: 1,
        authority: {
            kind: 'derived-read-only',
            priorityAuthority: 'docs/solver-optimization-workstreams.md',
            methodAuthority: 'docs/solver-research-operating-model.md',
        },
        currentState: currentState(model),
        frontDoorInputs: frontDoorInputs(model, plans),
        findings,
        integrationHealth: {
            errorCount: integrationAudit.errorCount,
            warningCount: integrationAudit.warningCount,
            errors: integrationAudit.errors,
            warnings: integrationAudit.warnings,
            semanticJoinCoverage: integrationAudit.semanticJoinCoverage ?? null,
            premiseCount: integrationAudit.premiseCount ?? null,
            premiseRelationCount: integrationAudit.premiseRelationCount ?? null,
            questionCount: integrationAudit.questionCount ?? null,
        },
        relations,
        commands,
        workflows,
        retiredWorkflows,
        sharedImplementationDependencies: dependencies,
        contractOwnership: contractOwners,
        documentation: {
            currentReferences,
            currentReferenceCount: currentReferences.length,
            currentMarkdownReferenceCount: currentMarkdownReferences.length,
            currentMarkdownBytes,
            roleCounts,
            roles: documentRoles,
            statusClaimCounts: {
                currentAuthority: documentRoles.filter(row => row.claimsCurrentAuthority).length,
                active: documentRoles.filter(row => row.claimsActive).length,
            },
            currentAuthorityClaimOutsideIndexCount: currentAuthorityClaimOutsideIndex.length,
            currentAuthorityClaimOutsideIndexPaths: currentAuthorityClaimOutsideIndex.map(row => row.path),
            lifecycleCandidateCount: plans.length,
            currentLifecycleCandidateCount: plans.filter(row => row.currentReference).length,
        },
        planLifecycle: plans,
        diagnostics: {
            fragilePlanLifecycleCount: fragilePlans.length,
            fragilePlanLifecyclePaths: fragilePlans.map(row => row.path),
            unknownLifecycleDispositionCount: unknownLifecycle.length,
            unknownLifecycleDispositionPaths: unknownLifecycle.map(row => row.path),
            currentReferenceLifecycleMismatchCount: currentReferenceLifecycleMismatches.length,
            currentReferenceLifecycleMismatchPaths: currentReferenceLifecycleMismatches.map(row => row.path),
            currentAuthorityClaimOutsideIndexCount: currentAuthorityClaimOutsideIndex.length,
            currentAuthorityClaimOutsideIndexPaths: currentAuthorityClaimOutsideIndex.map(row => row.path),
            integrationErrorCount: integrationAudit.errorCount,
            integrationWarningCount: integrationAudit.warningCount,
            sharedContractOwnerCount: contractOwners.length,
            authorityFindingCount: findings.authority.length,
            lifecycleFindingCount: findings.lifecycle.length,
            fragileProseFindingCount: findings.fragileProse.length,
            derivedRelationCount: relations.filter(row => row.authorityKind === 'derived/composed').length,
            structuredRelationCount: relations.filter(row => row.authorityKind === 'structured-source').length,
            maintainedWorkflowCount: workflows.filter(row => row.status === 'maintained').length,
            evidenceProducingWorkflowCount: workflows.filter(row => row.role === 'evidence-producing').length,
            retiredWorkflowCount: retiredWorkflows.length,
            retiredWorkflowReappearanceCount: retiredWorkflows.filter(row => row.presentOnDisk).length,
        },
    };
}


export function researchSystemInventoryView(inventory, view = 'all') {
    if (view === 'all') return inventory;
    if (view === 'architecture') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            currentState: inventory.currentState,
            frontDoorInputs: inventory.frontDoorInputs,
            integrationHealth: inventory.integrationHealth,
            authoritySurfaces: inventory.documentation.currentReferences,
            relations: inventory.relations,
            commands: inventory.commands,
            workflows: inventory.workflows,
            retiredWorkflows: inventory.retiredWorkflows,
            sharedImplementationDependencies: inventory.sharedImplementationDependencies,
            contractOwnership: inventory.contractOwnership,
        };
    }
    if (view === 'lifecycle') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            documentation: inventory.documentation,
            planLifecycle: inventory.planLifecycle,
            diagnostics: {
                fragilePlanLifecycleCount: inventory.diagnostics.fragilePlanLifecycleCount,
                fragilePlanLifecyclePaths: inventory.diagnostics.fragilePlanLifecyclePaths,
                currentReferenceLifecycleMismatchCount: inventory.diagnostics.currentReferenceLifecycleMismatchCount,
                currentReferenceLifecycleMismatchPaths: inventory.diagnostics.currentReferenceLifecycleMismatchPaths,
            },
        };
    }
    if (view === 'findings') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            findings: inventory.findings,
            integrationHealth: inventory.integrationHealth,
        };
    }
    if (view === 'brief-inputs') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            currentState: inventory.currentState,
            frontDoorInputs: inventory.frontDoorInputs,
            integrationHealth: inventory.integrationHealth,
            findings: inventory.findings,
            diagnostics: {
                currentReferenceLifecycleMismatchCount: inventory.diagnostics.currentReferenceLifecycleMismatchCount,
                integrationErrorCount: inventory.diagnostics.integrationErrorCount,
                integrationWarningCount: inventory.diagnostics.integrationWarningCount,
            },
        };
    }
    if (view === 'diagnostics') {
        return {
            schemaVersion: inventory.schemaVersion,
            authority: inventory.authority,
            integrationHealth: inventory.integrationHealth,
            diagnostics: inventory.diagnostics,
        };
    }
    throw new Error(`unknown research-system inventory view: ${view}`);
}
