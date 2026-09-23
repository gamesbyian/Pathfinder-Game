import { readFileSync } from 'node:fs';

import { buildResearchQueryGraph, queryResearchGraph } from './research-query-lib.mjs';
import { buildResearchQueryView } from './research-query-views-lib.mjs';
import {
    buildResearchQuerySnapshot,
    buildResearchQuerySnapshotFromGitRef,
    diffResearchQuerySnapshots,
} from './research-query-snapshot-lib.mjs';
import {
    buildResearchSystemFindingIndex,
    buildResearchSystemFindingSnapshot,
    buildResearchSystemFindingSnapshotFromGitRef,
    buildResearchSystemLineageSummary,
    diffResearchSystemFindingSnapshots,
    queryResearchSystemFindings,
} from './research-system-query-lib.mjs';

export function runResearchQueryCommand(
    args,
    {
        root = process.cwd(),
        graph: suppliedGraph = null,
        systemIndex: suppliedSystemIndex = null,
        buildGraph = buildResearchQueryGraph,
        buildSystemIndex = buildResearchSystemFindingIndex,
        buildQuerySnapshotFromRef = buildResearchQuerySnapshotFromGitRef,
        buildSystemSnapshotFromRef = buildResearchSystemFindingSnapshotFromGitRef,
        readJson = filename => JSON.parse(readFileSync(filename, 'utf8')),
    } = {},
) {
    const value = name => args.find(arg => arg.startsWith('--' + name + '='))?.slice(name.length + 3) ?? '';
    const depthRaw = value('depth');
    const limitRaw = value('limit');
    let graph = suppliedGraph;
    let systemIndex = suppliedSystemIndex;
    const getGraph = () => {
        graph ??= buildGraph(root, { discoverArtifacts: !args.includes('--no-discover') });
        return graph;
    };
    const getSystemIndex = () => {
        systemIndex ??= buildSystemIndex(root);
        return systemIndex;
    };

    if (args.includes('--stats')) {
        const currentGraph = getGraph();
        return {
            payload: {
                schemaVersion: currentGraph.schemaVersion,
                authority: currentGraph.authority,
                nodeTypes: Object.fromEntries([...new Set(currentGraph.nodes.map(n => n.type))].sort()
                    .map(type => [type, currentGraph.nodes.filter(n => n.type === type).length])),
                relations: Object.fromEntries([...new Set(currentGraph.edges.map(e => e.relation))].sort()
                    .map(relation => [relation, currentGraph.edges.filter(e => e.relation === relation).length])),
                diagnostics: currentGraph.diagnostics,
            },
            compact: false,
        };
    }

    const view = value('view');
    if (view === 'system-findings') {
        const index = getSystemIndex();
        return {
            payload: {
                view,
                count: index.count,
                findings: queryResearchSystemFindings(index, {
                    query: value('query'),
                    category: value('category'),
                    family: value('family'),
                    kind: value('kind'),
                }),
            },
            compact: false,
        };
    }
    if (view === 'system-lineage') {
        const currentGraph = getGraph();
        const index = getSystemIndex();
        const reportLineage = buildResearchQueryView(currentGraph, { view: 'non-question-lineage' });
        return {
            payload: buildResearchSystemLineageSummary(index, reportLineage.rows),
            compact: false,
        };
    }
    if (view) {
        return {
            payload: buildResearchQueryView(getGraph(), {
                view,
                entity: value('entity'),
                minimum: value('minimum') ? Number(value('minimum')) : 2,
            }),
            compact: false,
        };
    }

    if (args.includes('--snapshot')) {
        return { payload: buildResearchQuerySnapshot(getGraph()), compact: true };
    }

    const compareSnapshot = value('compare-snapshot');
    if (compareSnapshot) {
        const before = readJson(compareSnapshot);
        const after = buildResearchQuerySnapshot(getGraph());
        return { payload: diffResearchQuerySnapshots(before, after), compact: false };
    }

    const compareRef = value('compare-ref');
    if (compareRef) {
        const before = buildQuerySnapshotFromRef(root, compareRef, { discoverArtifacts: false });
        const after = buildResearchQuerySnapshot(getGraph());
        return { payload: diffResearchQuerySnapshots(before, after), compact: false };
    }

    if (args.includes('--system-snapshot')) {
        return {
            payload: buildResearchSystemFindingSnapshot(getSystemIndex()),
            compact: false,
        };
    }

    const compareSystemSnapshot = value('compare-system-snapshot');
    if (compareSystemSnapshot) {
        const before = readJson(compareSystemSnapshot);
        const after = buildResearchSystemFindingSnapshot(getSystemIndex());
        return { payload: diffResearchSystemFindingSnapshots(before, after), compact: false };
    }

    const compareSystemRef = value('compare-system-ref');
    if (compareSystemRef) {
        const before = buildSystemSnapshotFromRef(root, compareSystemRef);
        const after = buildResearchSystemFindingSnapshot(getSystemIndex());
        return { payload: diffResearchSystemFindingSnapshots(before, after), compact: false };
    }

    return {
        payload: queryResearchGraph(getGraph(), {
            entity: value('entity') || null,
            query: value('query'),
            relation: value('relation'),
            direction: value('direction') || 'both',
            depth: depthRaw ? Number(depthRaw) : 1,
            limit: limitRaw ? Number(limitRaw) : 100,
            type: value('type'),
            status: value('status'),
            edgeRelation: value('edge-relation'),
            minDegree: value('min-degree') ? Number(value('min-degree')) : 0,
        }),
        compact: false,
    };
}
