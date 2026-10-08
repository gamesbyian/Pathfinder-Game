#!/usr/bin/env node
/**
 * Build one equal-work technique-response campaign plan across several historical family blocks.
 *
 * The spec names parent ids + family filename tokens (for example localmutant/swap/symmetry).
 * Variant corpora/manifests are read from a mounted historical dataset root; parent corpora are
 * resolved from each manifest's own parentCorpus against the current checkout by default.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.js';

const argv=process.argv.slice(2);
const args=new Map(argv.filter(a=>a.startsWith('--')&&a.includes('=')).map(a=>{
  const i=a.indexOf('='); return [a.slice(0,i),a.slice(i+1)];
}));
const required=name=>{ const v=args.get(name); if(!v) throw new Error(`${name}=... is required`); return v; };
const specFile=required('--spec');
const datasetRoot=path.resolve(required('--variant-family-dataset-root'));
const parentRoot=path.resolve(args.get('--parent-corpus-root')??'.');
const outFile=args.get('--out')??'tmp/family-technique-response/campaign-plan.json';
const spec=JSON.parse(readFileSync(path.resolve(specFile),'utf8'));
const techniques=spec.techniques??[];
if(!Array.isArray(techniques)||!techniques.length) throw new Error('spec.techniques must be a non-empty array');
const workBudget=Number(spec.workBudget);
const budgetMs=Number(spec.budgetMs??600000);
if(!Number.isSafeInteger(workBudget)||workBudget<=0) throw new Error('spec.workBudget must be a positive safe integer');
if(!Number.isSafeInteger(budgetMs)||budgetMs<=0) throw new Error('spec.budgetMs must be a positive safe integer');
if(!Array.isArray(spec.families)||!spec.families.length) throw new Error('spec.families must be a non-empty array');

const readJson=file=>JSON.parse(readFileSync(file,'utf8'));
const levelsOf=doc=>Array.isArray(doc)?doc:doc?.levels;
const idOf=(level,pos)=>String(level?.id??pos);
const cache=new Map();
const loadLevels=file=>{
  const abs=path.resolve(file);
  if(!cache.has(abs)){
    const levels=levelsOf(readJson(abs));
    if(!Array.isArray(levels)) throw new Error(`${file} is not a level corpus`);
    cache.set(abs,levels);
  }
  return cache.get(abs);
};

const cells=[];
const blocks=[];
const parentIds=new Set();
for(const familySpec of spec.families){
  const parentId=String(familySpec.parentId??'');
  if(!parentId) throw new Error('family spec lacks parentId');
  parentIds.add(parentId);
  const modes=familySpec.modes??[];
  if(!Array.isArray(modes)||!modes.length) throw new Error(`${parentId} has no modes`);
  for(const tokenRaw of modes){
    const token=typeof tokenRaw==='string'?tokenRaw:String(tokenRaw.token??'');
    if(!token) throw new Error(`${parentId} has an empty mode token`);
    const base=`family-${parentId}-${token}`;
    const manifestFile=path.join(datasetRoot,'data','families',base+'-manifest.json');
    const variantCorpusFile=path.join(datasetRoot,'data','families',base+'.json');
    const manifest=readJson(manifestFile);
    const manifestParentId=String(manifest.parentLevelId??manifest.parentId??'');
    if(manifestParentId!==parentId) throw new Error(`${manifestFile} parent ${manifestParentId} != spec ${parentId}`);
    const parentCorpusRel=manifest.parentCorpus;
    if(!parentCorpusRel) throw new Error(`${manifestFile} lacks parentCorpus`);
    const parentCorpusFile=path.resolve(parentRoot,parentCorpusRel);
    const parentLevels=loadLevels(parentCorpusFile);
    const variantLevels=loadLevels(variantCorpusFile);
    const parentPos=parentLevels.findIndex((lv,i)=>idOf(lv,i+1)===parentId)+1;
    if(!parentPos) throw new Error(`${parentId} not found in ${parentCorpusFile}`);
    const currentParentHash=await getLevelFingerprint(parentLevels[parentPos-1]);
    if(manifest.parentContentHash && manifest.parentContentHash!==currentParentHash) {
      throw new Error(`${familyId} parent content drift: manifest=${manifest.parentContentHash}, current=${currentParentHash}`);
    }
    const variantPosById=new Map(variantLevels.map((lv,i)=>[idOf(lv,i+1),i+1]));
    const familyId=String(manifest.familyId??base);
    const relation=manifest.familyMode??manifest.relation??null;
    const variants=(manifest.variants??[]).map(v=>{
      const variantId=String(v.variantId??v.id??'');
      const levelPos=variantPosById.get(variantId);
      if(!variantId||!levelPos) throw new Error(`${familyId} variant missing from corpus: ${variantId||'(empty)'}`);
      return {variantId,levelPos,edge:v};
    });
    blocks.push({familyId,parentId,token,relation,manifestFile,variantCorpusFile,parentCorpusFile,
      manifestParentContentHash:manifest.parentContentHash??null,currentParentContentHash:currentParentHash,
      parentContentIdentityVerified:manifest.parentContentHash?manifest.parentContentHash===currentParentHash:false,
      variantCount:variants.length});
    for(let ti=0;ti<techniques.length;ti++){
      const technique=techniques[ti];
      const suffix=`t${String(ti+1).padStart(2,'0')}`;
      cells.push({
        cellId:`FTR1::${familyId}::parent::${suffix}`,tier:'FTR1',corpus:'family-parent',
        corpusFile:parentCorpusFile,levelId:parentId,levelPos:parentPos,techniqueKeys:[technique],
        workBudget,budgetMs,familyContext:{familyId,parentId,variantId:null,role:'parent',relation,witnessRelation:null,mutation:null},
      });
      for(const v of variants) cells.push({
        cellId:`FTR1::${familyId}::${v.variantId}::${suffix}`,tier:'FTR1',corpus:'family-variant',
        corpusFile:variantCorpusFile,levelId:v.variantId,levelPos:v.levelPos,techniqueKeys:[technique],
        workBudget,budgetMs,familyContext:{familyId,parentId,variantId:v.variantId,role:'variant',
          relation:v.edge.relation??relation,witnessRelation:v.edge.witnessRelation??null,mutation:v.edge.mutationManifest??null},
      });
    }
  }
}
const plan={
  schemaVersion:1,kind:'pathfinder-family-technique-response-campaign-plan',generatedAt:new Date().toISOString(),
  budgetProtocol:'family-technique-equal-work',equalCostAcrossTechniques:true,
  scientificUnit:'parent-controlled-transformation-technique-response',independenceUnit:'parentId',
  sourceSpec:path.resolve(specFile),variantFamilyDatasetRoot:datasetRoot,parentCorpusRoot:parentRoot,
  workBudget,budgetMs,techniques,parentIds:[...parentIds].sort(),independentParentCount:parentIds.size,
  familyModeBlockCount:blocks.length,blocks,expectedCells:cells.length,cells,
};
mkdirSync(path.dirname(path.resolve(outFile)),{recursive:true});
writeFileSync(path.resolve(outFile),JSON.stringify(plan,null,2)+'\n');
console.log(`family-technique-response campaign: parents=${plan.independentParentCount}, blocks=${blocks.length}, cells=${cells.length}`);
console.log(`Plan -> ${outFile}`);
