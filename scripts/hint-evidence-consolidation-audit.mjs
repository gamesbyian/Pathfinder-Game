#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || process.cwd());
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6)
  || 'reports/2026-09-22-hint-evidence-consolidation-census.json';

const hintRoots = [
  ['published', 'data/hints'],
  ['stress1', 'data/stress/hints'],
  ['stress2', 'data/stress/hints-random'],
];

const fields = [
  'solver.id','solver.version','solver.technique','solver.scoringProfileId','solver.orderingBiasId',
  'solver.beamWidth','solver.mechanicBucketRetention','solver.gateKey','solver.forcing','solver.attemptIndex',
  'search.nodesExpanded','search.elapsedMs','search.budgetMs','search.workSpent','search.workBudget',
  'search.cumulativeNodesExpanded','search.cumulativeElapsedMs','search.cumulativeBudgetMs',
  'search.termination','search.randomSeed','search.seedSalt',
  'context.usedExistingHints','context.hintGuided','context.levelRevision','context.isolatedTechnique',
  'context.techniqueCensusCell','foundAt',
];

const stateTemplate = () => ({ absent:0, null:0, false:0, true:0, concrete:0 });
const states = Object.fromEntries(fields.map(f => [f, stateTemplate()]));
const byCorpus = Object.fromEntries(hintRoots.map(([name]) => [name, {
  files:0, bytes:0, hints:0, events:0, canonicalGzipBytes:0,
  fieldStates:Object.fromEntries(fields.map(f => [f, stateTemplate()])),
  pathOnlyMinifiedBytes:0, pathOnlyPrettyBytes:0, pathOnlyGzipBytes:0,
  foundAtMigrationCandidates:0, migrationCandidateFiles:new Set(),
  schemaVersions:{}, firestoreEncodedHintArrayBytes:[],
}]));
const foundAtWindow = {
  min: Date.parse('2026-07-11T01:44:17.863Z'),
  max: Date.parse('2026-07-11T01:44:18.004Z'),
};
const foundAtMigration = { count:0, files:new Set(), corpora:{}, timestamps:new Map(), bySchemaVersion:{}, fieldStates:Object.fromEntries(fields.map(f => [f, stateTemplate()])) };
const hintBytes = [];
const eventDocBytes = [];
let totalEvents = 0;
let totalHints = 0;

function get(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (cur == null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) return { present:false };
    cur = cur[part];
  }
  return { present:true, value:cur };
}
function classify(value) {
  if (value === null) return 'null';
  if (value === false) return 'false';
  if (value === true) return 'true';
  return 'concrete';
}
function pct(sorted, q) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))];
}
function summarize(values) {
  const s=[...values].sort((a,b)=>a-b);
  return { count:s.length, min:s[0]??null, p50:pct(s,.5), p95:pct(s,.95), p99:pct(s,.99), max:s.at(-1)??null };
}
function walkFiles(dir, accept=()=>true) {
  const out=[];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p,accept));
    else if (accept(p)) out.push(p);
  }
  return out;
}

for (const [corpus, rel] of hintRoots) {
  const dir=path.join(ROOT,rel);
  for (const file of walkFiles(dir,p=>p.endsWith('.json')).sort()) {
    const raw=fs.readFileSync(file);
    const text=raw.toString('utf8');
    const parsed=JSON.parse(text);
    const hints=Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.hints) ? parsed.hints : []);
    const schemaVersion=Array.isArray(parsed) ? 'unversioned-array' : String(parsed?.schemaVersion ?? 'absent');
    const c=byCorpus[corpus];
    c.files++; c.bytes+=raw.byteLength; c.hints+=hints.length;
    c.schemaVersions[schemaVersion]=(c.schemaVersions[schemaVersion]||0)+1;
    c.canonicalGzipBytes += gzipSync(raw).byteLength;
    const paths=hints.map(h=>Array.isArray(h)?h:h?.path).filter(Array.isArray);
    const minified=Buffer.from(JSON.stringify({schemaVersion:1,hints:paths}));
    const pretty=Buffer.from(JSON.stringify({schemaVersion:1,hints:paths},null,2)+'\n');
    c.pathOnlyMinifiedBytes += minified.byteLength;
    c.pathOnlyPrettyBytes += pretty.byteLength;
    c.pathOnlyGzipBytes += gzipSync(minified).byteLength;
    const semanticHints=hints.filter(h=>h && !Array.isArray(h) && Array.isArray(h.path));
    const encodedHintArray=Buffer.from(JSON.stringify(semanticHints.map(h=>JSON.stringify(h))));
    c.firestoreEncodedHintArrayBytes.push(encodedHintArray.byteLength);

    for (const hint of semanticHints) {
      totalHints++;
      hintBytes.push(Buffer.byteLength(JSON.stringify(hint)));
      const provenance=Array.isArray(hint.provenance)?hint.provenance:[];
      for (const event of provenance) {
        totalEvents++; c.events++;
        for (const field of fields) {
          const r=get(event,field);
          const bucket = !r.present ? 'absent' : classify(r.value);
          states[field][bucket]++;
          c.fieldStates[field][bucket]++;
        }
        if (event && typeof event === 'object') {
          const prov=event;
          const doc={path:hint.path,pathSignature:hint.path.join(','),provenance:prov,createdAt:'2026-09-22T00:00:00.000Z'};
          eventDocBytes.push(Buffer.byteLength(JSON.stringify(doc)));
        }
        const fa=get(event,'foundAt');
        if (fa.present && typeof fa.value === 'string') {
          const ms=Date.parse(fa.value);
          if (Number.isFinite(ms) && ms>=foundAtWindow.min && ms<=foundAtWindow.max) {
            const relFile=path.relative(ROOT,file).replaceAll('\\','/');
            foundAtMigration.count++;
            for (const field of fields) {
              const mr=get(event,field);
              const mb=!mr.present ? 'absent' : classify(mr.value);
              foundAtMigration.fieldStates[field][mb]++;
            }
            foundAtMigration.files.add(relFile);
            foundAtMigration.corpora[corpus]=(foundAtMigration.corpora[corpus]||0)+1;
            foundAtMigration.timestamps.set(fa.value,(foundAtMigration.timestamps.get(fa.value)||0)+1);
            foundAtMigration.bySchemaVersion[schemaVersion]=(foundAtMigration.bySchemaVersion[schemaVersion]||0)+1;
            c.foundAtMigrationCandidates++;
            c.migrationCandidateFiles.add(relFile);
          }
        }
      }
    }
  }
}

for (const [name,c] of Object.entries(byCorpus)) {
  c.migrationCandidateFiles=[...c.migrationCandidateFiles].sort();
  const firestoreSizes=[...c.firestoreEncodedHintArrayBytes];
  c.firestoreEncodedHintArrayThresholds={
    over900k:firestoreSizes.filter(n=>n>900000).length,
    over1MiB:firestoreSizes.filter(n=>n>1048576).length,
    over950k:firestoreSizes.filter(n=>n>950000).length,
  };
  c.firestoreEncodedHintArrayBytes=summarize(firestoreSizes);
}

const sourceRoots=['scripts','modules','.github/workflows'];
const patterns={
  removedReadFacade:/\breadLevelsWithHints\b/g,
  removedWriteFacade:/\bwriteLevelsWithHints\b/g,
  setLevelHintRecords:/\bsetLevelHintRecords\b/g,
  corpusReader:/\breadLevelCorpusDocumentWithHints\b/g,
  corpusWriter:/\bwriteLevelCorpusDocumentWithHints\b/g,
  hintRecordsMutation:/\.hintRecords\s*=/g,
  hintsMutation:/\.hints\s*=/g,
  localLevelHints:/\blocal_level_hints\b/g,
  publishedLevels:/\bpublished_levels\b/g,
  saveHints:/--save-hints\b/g,
  uploadArtifact:/actions\/upload-artifact@/g,
};
const sourceCensus=[];
const sourceTexts=new Map();
for (const root of sourceRoots) {
  for (const file of walkFiles(path.join(ROOT,root),p=>/\.(?:mjs|js|ts|tsx|ya?ml)$/.test(p))) {
    if (/(?:node_modules|dist)\//.test(file)) continue;
    const rel=path.relative(ROOT,file).replaceAll('\\','/');
    const text=fs.readFileSync(file,'utf8');
    sourceTexts.set(rel,text);
    const hits={};
    for (const [name,re] of Object.entries(patterns)) {
      const n=[...text.matchAll(re)].length;
      if (n) hits[name]=n;
    }
    if (Object.keys(hits).length) sourceCensus.push({path:rel,hits});
  }
}
// Reachability, not filename folklore: seed current package/workflow entrypoints, then follow
// relative imports. This lets the census separate maintained stale seams from dormant historical
// scripts without pretending every file under scripts/ is equally live.
const packageText=fs.existsSync(path.join(ROOT,'package.json')) ? fs.readFileSync(path.join(ROOT,'package.json'),'utf8') : '';
const workflowText=[...sourceTexts.entries()].filter(([p])=>p.startsWith('.github/workflows/')).map(([,t])=>t).join('\n');
const known=new Set(sourceTexts.keys());
function resolveImport(from,spec) {
  if (!spec.startsWith('.')) return null;
  const base=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));
  const candidates=[base,base+'.mjs',base+'.js',base+'.ts',base+'.tsx',
    base.replace(/\.js$/u,'.ts'),base.replace(/\.js$/u,'.tsx'),base.replace(/\.mjs$/u,'.mjs')];
  return candidates.find(x=>known.has(x))||null;
}
const graph=new Map();
for (const [rel,text] of sourceTexts) {
  const deps=new Set();
  for (const m of text.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)) {
    const dep=resolveImport(rel,m[1]); if (dep) deps.add(dep);
  }
  graph.set(rel,[...deps]);
}
const seeds=new Set();
for (const rel of known) {
  if (packageText.includes(rel) || workflowText.includes(rel)) seeds.add(rel);
}
const reachable=new Set(seeds);
const queue=[...seeds];
while (queue.length) {
  const cur=queue.shift();
  for (const dep of graph.get(cur)||[]) if (!reachable.has(dep)) { reachable.add(dep); queue.push(dep); }
}
for (const row of sourceCensus) {
  row.reachability={
    directPackageReference:packageText.includes(row.path),
    directWorkflowReference:workflowText.includes(row.path),
    maintainedEntrypointReachable:reachable.has(row.path),
  };
}

const runtimeTotals=Object.values(byCorpus).reduce((a,c)=>{
  for (const k of ['files','bytes','canonicalGzipBytes','pathOnlyMinifiedBytes','pathOnlyPrettyBytes','pathOnlyGzipBytes']) a[k]+=c[k];
  return a;
},{files:0,bytes:0,canonicalGzipBytes:0,pathOnlyMinifiedBytes:0,pathOnlyPrettyBytes:0,pathOnlyGzipBytes:0});

const publishedFirestore=byCorpus.published.firestoreEncodedHintArrayBytes;
const result={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  gitSha:process.env.AUDITED_GIT_SHA || process.env.GITHUB_SHA || null,
  auditedRoot:ROOT,
  hintCorpus:{totalHints,totalEvents,byCorpus},
  provenanceFieldStates:states,
  migrationSyntheticFoundAt:{
    window:{start:new Date(foundAtWindow.min).toISOString(),end:new Date(foundAtWindow.max).toISOString()},
    candidateEvents:foundAtMigration.count,
    candidateFiles:foundAtMigration.files.size,
    corpora:foundAtMigration.corpora,
    bySchemaVersion:foundAtMigration.bySchemaVersion,
    timestamps:[...foundAtMigration.timestamps.entries()].sort(),
    files:[...foundAtMigration.files].sort(),
    interpretation:'candidate set only; historical commit/source-shape evidence is required before semantic correction',
  },
  runtimeDelivery:{
    totals:runtimeTotals,
    rawSavingsVsCanonical:{
      minifiedPathOnlyBytes:runtimeTotals.bytes-runtimeTotals.pathOnlyMinifiedBytes,
      minifiedPathOnlyPercent:(1-runtimeTotals.pathOnlyMinifiedBytes/runtimeTotals.bytes)*100,
      prettyPathOnlyBytes:runtimeTotals.bytes-runtimeTotals.pathOnlyPrettyBytes,
      prettyPathOnlyPercent:(1-runtimeTotals.pathOnlyPrettyBytes/runtimeTotals.bytes)*100,
    },
    gzipSavingsVsCanonical:{
      bytes:runtimeTotals.canonicalGzipBytes-runtimeTotals.pathOnlyGzipBytes,
      percent:(1-runtimeTotals.pathOnlyGzipBytes/runtimeTotals.canonicalGzipBytes)*100,
    },
  },
  firestoreSizing:{
    singleSemanticHintJsonBytes:summarize(hintBytes),
    localPathEventDocumentJsonBytes:summarize(eventDocBytes),
    publishedEncodedHintArrayJsonBytes:publishedFirestore,
    note:'JSON UTF-8 sizes are an empirical lower-bound/proxy for Firestore document cost; published level documents also contain levelData and Firestore field/index overhead.',
  },
  sourceCensus,
};
const outPath = path.isAbsolute(OUT) ? OUT : path.join(ROOT, OUT);
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({
  out:OUT,
  totalHints,totalEvents,
  migrationCandidates:{events:result.migrationSyntheticFoundAt.candidateEvents,files:result.migrationSyntheticFoundAt.candidateFiles,corpora:result.migrationSyntheticFoundAt.corpora},
  runtime:result.runtimeDelivery,
  firestore:result.firestoreSizing,
  sourceCensusFiles:sourceCensus.length,
},null,2));
