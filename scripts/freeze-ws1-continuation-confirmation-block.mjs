#!/usr/bin/env node
/**
 * Freeze sample-independent WS1 continuation-confirmation blocks from an existing
 * variant-family dataset. Selection is deliberately outcome-blind:
 *
 *   parent -> family manifest -> representative variant
 *
 * are all ranked by stable SHA-256 identity only. Historical solve/evidence files
 * are never read. One variant per parent preserves parent-family independence.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResearchBlock } from './solver-research-block-lineage.mjs';
import { familyArtifactRoots } from './family-paths.mjs';

const QUESTION_ID='WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE';
const DEFAULT_EXCLUDED_PARENT_CORPUS='data/stress/stress-levels.json';

const hash = value => createHash('sha256').update(String(value)).digest('hex');
const posix = value => value.split(path.sep).join('/');

function filesBelow(root, accept) {
  if (!existsSync(root)) return [];
  const out=[];
  const visit=dir=>{
    for(const entry of readdirSync(dir,{withFileTypes:true})){
      const target=path.join(dir,entry.name);
      if(entry.isDirectory()) visit(target);
      else if(accept(target)) out.push(target);
    }
  };
  visit(root);
  return out.sort();
}

function familyDataPathForManifest(manifestPath) {
  return manifestPath.replace(/-manifest\.json$/u,'.json');
}

function variantIdentity(variant) {
  return String(variant?.variantId ?? variant?.id ?? '');
}

function manifestIdentity(candidate) {
  return [
    candidate.parentId,
    candidate.manifest.familyId ?? '',
    candidate.manifest.familyMode ?? candidate.manifest.mode ?? '',
    candidate.relativeManifestPath,
  ].join('\u001f');
}

function sourceRelative(root,file) {
  return posix(path.relative(root,file));
}

export function collectWs1ConfirmationCandidates(datasetRoot, {
  excludedParentCorpora=[DEFAULT_EXCLUDED_PARENT_CORPUS],
}={}) {
  const roots=familyArtifactRoots(datasetRoot);
  const excluded=new Set(excludedParentCorpora.map(String));
  const byParent=new Map();
  const diagnostics={
    manifestsSeen:0,
    skippedArrayManifests:0,
    skippedMissingParent:0,
    skippedExcludedParentCorpus:0,
    skippedMissingParentContentIdentity:0,
    skippedNoVariants:0,
    skippedMissingFamilyData:0,
    skippedFamilyDataParse:0,
    skippedVariantMismatch:0,
    skippedParentIdentityConflict:0,
  };

  for(const manifestPath of filesBelow(roots.families,file=>file.endsWith('-manifest.json'))){
    diagnostics.manifestsSeen++;
    let manifest;
    try { manifest=JSON.parse(readFileSync(manifestPath,'utf8')); }
    catch { continue; }
    if(Array.isArray(manifest)){ diagnostics.skippedArrayManifests++; continue; }

    const parentId=String(manifest.parentLevelId ?? manifest.parentId ?? '');
    const parentCorpus=String(manifest.parentCorpus ?? '');
    const parentContentIdentity=String(manifest.parentContentHash ?? manifest.parentContentIdentity ?? '');
    if(!parentId){ diagnostics.skippedMissingParent++; continue; }
    if(excluded.has(parentCorpus)){ diagnostics.skippedExcludedParentCorpus++; continue; }
    if(!parentContentIdentity){ diagnostics.skippedMissingParentContentIdentity++; continue; }

    const declaredVariants=Array.isArray(manifest.variants) ? manifest.variants : [];
    if(!declaredVariants.length){ diagnostics.skippedNoVariants++; continue; }
    const dataPath=familyDataPathForManifest(manifestPath);
    if(!existsSync(dataPath)){ diagnostics.skippedMissingFamilyData++; continue; }

    let familyLevels;
    try { familyLevels=JSON.parse(readFileSync(dataPath,'utf8')); }
    catch { diagnostics.skippedFamilyDataParse++; continue; }
    if(!Array.isArray(familyLevels)){ diagnostics.skippedFamilyDataParse++; continue; }

    const levelsById=new Map(familyLevels.map(level=>[String(level?.id ?? ''),level]));
    const variants=[];
    for(const declared of declaredVariants){
      const id=variantIdentity(declared);
      const level=levelsById.get(id);
      const contentIdentity=String(declared?.variantContentHash ?? '');
      if(!id || !level || !contentIdentity){ diagnostics.skippedVariantMismatch++; continue; }
      variants.push({id,contentIdentity,declared,level});
    }
    if(!variants.length){ diagnostics.skippedVariantMismatch++; continue; }

    const relativeManifestPath=sourceRelative(roots.root,manifestPath);
    const candidate={
      parentId,parentCorpus,parentContentIdentity,
      manifest,manifestPath,relativeManifestPath,
      relativeFamilyPath:sourceRelative(roots.root,dataPath),
      variants,
    };
    const list=byParent.get(parentId) ?? [];
    list.push(candidate);
    byParent.set(parentId,list);
  }

  const candidates=[];
  for(const [parentId,families] of byParent){
    const parentContentIdentities=new Set(families.map(row=>row.parentContentIdentity));
    if(parentContentIdentities.size!==1){
      diagnostics.skippedParentIdentityConflict++;
      continue;
    }
    const family=[...families].sort((a,b)=>
      hash(`family\u001f${manifestIdentity(a)}`).localeCompare(hash(`family\u001f${manifestIdentity(b)}`))
      || a.relativeManifestPath.localeCompare(b.relativeManifestPath)
    )[0];
    const variant=[...family.variants].sort((a,b)=>
      hash(`variant\u001f${parentId}\u001f${a.id}\u001f${a.contentIdentity}`)
        .localeCompare(hash(`variant\u001f${parentId}\u001f${b.id}\u001f${b.contentIdentity}`))
      || a.id.localeCompare(b.id)
    )[0];
    candidates.push({
      parentId,
      parentCorpus:family.parentCorpus,
      parentContentIdentity:family.parentContentIdentity,
      familyId:String(family.manifest.familyId ?? ''),
      familyMode:String(family.manifest.familyMode ?? family.manifest.mode ?? ''),
      manifestPath:family.relativeManifestPath,
      familyPath:family.relativeFamilyPath,
      variantId:variant.id,
      variantContentIdentity:variant.contentIdentity,
      level:variant.level,
      parentRank:hash(`parent\u001f${parentId}\u001f${family.parentContentIdentity}`),
    });
  }
  candidates.sort((a,b)=>a.parentRank.localeCompare(b.parentRank)||a.parentId.localeCompare(b.parentId));
  return {candidates,diagnostics};
}

function blockPayload(selected,{stage,sourceRevision,datasetRootLabel,manifestRef}) {
  const parentIds=selected.map(row=>row.parentId);
  const parentContentIdentities=selected.map(row=>row.parentContentIdentity);
  const sourceArtifactRefs=[...new Set(selected.map(row=>row.manifestPath))].sort();
  const blockId=`ws1-late-continuation-confirmation-${stage.toLowerCase()}-001`;
  const {populationIdentity,researchBlock}=buildResearchBlock({
    blockId,
    questionId:QUESTION_ID,
    sourceRegime:'variant-family-dataset',
    sourceRevision,
    evidenceRole:'confirmation',
    independentUnit:'parent-family',
    parentIds,
    parentContentIdentities,
    sourceArtifactRefs,
    producer:'freeze-ws1-continuation-confirmation-block.mjs',
    manifestRef,
    runRef:null,
    generationRef:datasetRootLabel,
    consumptionEvents:[],
  });
  return {populationIdentity,researchBlock};
}

export function freezeWs1ConfirmationBlocks(datasetRoot,{
  stageAParents=24,
  totalParents=96,
  sourceRevision,
  datasetRootLabel='variant-family-dataset',
  manifestRefPrefix='data/stress/ws1-late-continuation-confirmation',
  excludedParentCorpora=[DEFAULT_EXCLUDED_PARENT_CORPUS],
}={}) {
  if(!sourceRevision) throw new Error('sourceRevision is required');
  if(!Number.isInteger(stageAParents)||stageAParents<1) throw new Error('stageAParents must be >=1');
  if(!Number.isInteger(totalParents)||totalParents<stageAParents) throw new Error('totalParents must be >= stageAParents');

  const {candidates,diagnostics}=collectWs1ConfirmationCandidates(datasetRoot,{excludedParentCorpora});
  if(candidates.length<totalParents){
    throw new Error(`insufficient eligible independent parents: need ${totalParents}, found ${candidates.length}`);
  }

  const stageA=candidates.slice(0,stageAParents);
  const full=candidates.slice(0,totalParents);
  const make=(selected,stage)=>{
    const manifestRef=`${manifestRefPrefix}-stage-${stage.toLowerCase()}-001.json`;
    const block=blockPayload(selected,{stage,sourceRevision,datasetRootLabel,manifestRef});
    return {
      schemaVersion:1,
      kind:'pathfinder-ws1-late-continuation-confirmation-block',
      stage,
      questionId:QUESTION_ID,
      selection:{
        outcomeBlind:true,
        algorithm:'sha256-parent-then-family-then-variant-v1',
        independentUnit:'parent-family',
        representativeVariantsPerParent:1,
        excludedParentCorpora:[...excludedParentCorpora],
      },
      source:{datasetRootLabel,sourceRevision},
      ...block,
      rows:selected.map(({level,...row})=>row),
      corpus:selected.map(row=>row.level),
    };
  };
  return {stageA:make(stageA,'A'),full:make(full,'B'),availableParents:candidates.length,diagnostics};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  const arg=name=>argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3) ?? null;
  const datasetRoot=arg('variant-family-dataset-root') ?? process.cwd();
  const sourceRevision=arg('source-revision');
  const outPrefix=arg('out-prefix') ?? 'data/stress/ws1-late-continuation-confirmation';
  const stageAParents=Number(arg('stage-a-parents') ?? 24);
  const totalParents=Number(arg('total-parents') ?? 96);
  const excludedParentCorpora=String(arg('exclude-parent-corpus') ?? DEFAULT_EXCLUDED_PARENT_CORPUS)
    .split(',').map(v=>v.trim()).filter(Boolean);
  const result=freezeWs1ConfirmationBlocks(datasetRoot,{
    stageAParents,totalParents,sourceRevision,
    datasetRootLabel:arg('dataset-root-label') ?? 'claude/variant-levels-solver-insights-tpk4qg',
    manifestRefPrefix:outPrefix,
    excludedParentCorpora,
  });
  mkdirSync(path.dirname(path.resolve(outPrefix)),{recursive:true});
  const write=(suffix,value)=>writeFileSync(`${outPrefix}-${suffix}`,`${JSON.stringify(value,null,2)}\n`);
  write('stage-a-001.json',{...result.stageA,corpus:undefined});
  write('stage-a-corpus-001.json',result.stageA.corpus);
  write('stage-b-001.json',{...result.full,corpus:undefined});
  write('stage-b-corpus-001.json',result.full.corpus);
  console.log(JSON.stringify({
    eligibleIndependentParents:result.availableParents,
    stageAParents:result.stageA.rows.length,
    stageBParents:result.full.rows.length,
    stageAPopulationIdentity:result.stageA.populationIdentity,
    stageBPopulationIdentity:result.full.populationIdentity,
    diagnostics:result.diagnostics,
  },null,2));
}
