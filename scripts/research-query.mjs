#!/usr/bin/env node
import { buildResearchQueryGraph, queryResearchGraph } from './research-query-lib.mjs';
import { buildResearchQueryView } from './research-query-views-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith('--' + name + '='))?.slice(name.length + 3) ?? '';
const depthRaw = value('depth');
const limitRaw = value('limit');
const graph = buildResearchQueryGraph(process.cwd(), { discoverArtifacts: !args.includes('--no-discover') });

if (args.includes('--stats')) {
  console.log(JSON.stringify({
    schemaVersion: graph.schemaVersion,
    authority: graph.authority,
    nodeTypes: Object.fromEntries([...new Set(graph.nodes.map(n => n.type))].sort()
      .map(type => [type, graph.nodes.filter(n => n.type === type).length])),
    relations: Object.fromEntries([...new Set(graph.edges.map(e => e.relation))].sort()
      .map(relation => [relation, graph.edges.filter(e => e.relation === relation).length])),
    diagnostics: graph.diagnostics,
  }, null, 2));
  process.exit(0);
}

const view = value('view');
if (view) {
  console.log(JSON.stringify(buildResearchQueryView(graph, {
    view,
    entity: value('entity'),
    minimum: value('minimum') ? Number(value('minimum')) : 2,
  }), null, 2));
  process.exit(0);
}

const result = queryResearchGraph(graph, {
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
});
console.log(JSON.stringify(result, null, 2));
