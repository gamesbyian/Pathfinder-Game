// RESEARCH-ONLY tiny-grid path abstraction; does NOT import Pathfinder's canonical referee.
// Based on the portal-free, filter-free movement structure described by modules/domain/move-rules.ts.
// Edge-usage flags are axis-granular, revisits are permitted on the orthogonal axis,
// and a crossing's two passages must each continue straight.
// Excludes portal jumps, flippers, filters, must-cross lock, hazards, landmarks and exact goal metrics.
// Exhaustively compares every edge-subset switch-route decision with every legal toy walk.
// Run: node scripts/research-trail-switch-toy.mjs

function buildGrid(width,height){
 const n=width*height, adj=Array.from({length:n},()=>[]);let nextId=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const v=y*width+x;
  for(const [xx,yy,axis] of [[x+1,y,1],[x,y+1,2]]){
   if(xx>=width||yy>=height)continue;
   const u=yy*width+xx,id=nextId++,bit=1<<id;
   adj[v].push({to:u,axis,bit});
   adj[u].push({to:v,axis,bit});
  }
 }
 return {n,adj,edgeCount:nextId};
}

function enumerateWalks(grid,start,goal){
 let count=0; const edgeSets=new Set();const usage=new Uint8Array(grid.n);
 function visit(at,entryAxis,edges){
  if(at===goal && edges!==0){count++;edgeSets.add(edges);return;}
  for(const e of grid.adj[at]){
   if(e.to===start||(edges&e.bit)||(usage[e.to]&e.axis))continue;
   if(entryAxis!==e.axis&&(usage[at]&e.axis))continue;
   const a=usage[at],b=usage[e.to];usage[at]|=e.axis;usage[e.to]|=e.axis;
   visit(e.to,e.axis,edges|e.bit);
   usage[at]=a;usage[e.to]=b;
  }
 }
 visit(start,0,0);
 return {count,edgeSets};
}

function switchRouteExists(grid,start,goal,mask){
 const selected=grid.adj.map(es=>es.filter(e=>(mask&e.bit)!==0));
 for(let v=0;v<grid.n;v++){
  const es=selected[v],d=es.length;
  if(v===start||v===goal){if(d!==1)return false;}
  else if(d!==0&&d!==2&&d!==4)return false;
  if(d===4 && es.filter(e=>e.axis===1).length!==2)return false;
 }
 let at=start,incoming=0,used=0;
 for(let step=0;step<=grid.edgeCount;step++){
  if(at===goal&&incoming!==0)return used===mask;
  let options=selected[at].filter(e=>e.bit!==incoming);
  if(incoming&&selected[at].length===4){
   const axis=selected[at].find(e=>e.bit===incoming).axis;
   options=options.filter(e=>e.axis===axis);
  }
  if(options.length!==1)return false;
  const e=options[0];
  if(used&e.bit)return false;
  used|=e.bit;at=e.to;incoming=e.bit;
 }
 return false;
}

function connectedWithCorrectDegrees(grid,start,goal,mask){
 const selected=grid.adj.map(es=>es.filter(e=>(mask&e.bit)!==0));
 for(let v=0;v<grid.n;v++){
  const d=selected[v].length;
  if(v===start||v===goal){if(d!==1)return false;}
  else if(d!==0&&d!==2&&d!==4)return false;
  if(d===4&&selected[v].filter(e=>e.axis===1).length!==2)return false;
 }
 const reached=new Set([start]),stack=[start];
 while(stack.length){for(const e of selected[stack.pop()])if(!reached.has(e.to)){reached.add(e.to);stack.push(e.to);}}
 return selected.every((es,v)=>es.length===0||reached.has(v));
}

function maskFromEdgePairs(grid,pairs){
 let mask=0;
 for(const [a,b] of pairs){
  const edge=grid.adj[a]?.find(e=>e.to===b);
  if(!edge)throw new Error(`No orthogonal edge: ${a}-${b}`);
  mask|=edge.bit;
 }
 return mask;
}

function testShape(width,height){
 const grid=buildGrid(width,height);
 if(grid.edgeCount>20)throw new Error("Tiny projection only; avoid exponential broad enumeration");
 const pairs=width===3&&height===3
   ?Array.from({length:grid.n},(_,i)=>i).flatMap(s=>Array.from({length:grid.n},(_,i)=>i).filter(g=>g!==s).map(g=>[s,g]))
   :[[0,grid.n-1],[0,1],[1,grid.n-2],[width,2*width-1],[width+1,grid.n-1],[2,grid.n-3]];
 let paths=0,edgeSets=0,staticSets=0,collisions=0,disagreements=0;
 for(const [start,goal] of pairs){
  const actual=enumerateWalks(grid,start,goal);paths+=actual.count;edgeSets+=actual.edgeSets.size;
  collisions+=actual.count-actual.edgeSets.size;
  const chosen=new Set();
  for(let mask=0;mask<(1<<grid.edgeCount);mask++)if(switchRouteExists(grid,start,goal,mask))chosen.add(mask);
  staticSets+=chosen.size;
  for(const mask of actual.edgeSets)if(!chosen.has(mask))disagreements++;
  for(const mask of chosen)if(!actual.edgeSets.has(mask))disagreements++;
 }
 return {grid:`${width}x${height}`,testedEndpointPairs:pairs.length,paths,distinctEdgeSets:edgeSets,staticAccepts:staticSets,edgeSetCollisions:collisions,disagreements};
}

function main(){
 const results=[testShape(3,3),testShape(4,3)];
 for(const item of results)console.log(JSON.stringify(item));
 // Connectedness alone misses a pair of locally straight-through crossing strands.
 // The selected 11-edge graph is connected and degree-correct, yet the switch
 // traversal from 0 to 11 leaves the separate 6-edge cycle unconsumed.
 const grid=buildGrid(4,3);
 const witness=maskFromEdgePairs(grid,[[0,4],[1,2],[1,5],[2,6],[4,5],[5,6],[5,9],[6,7],[6,10],[7,11],[9,10]]);
 if(!connectedWithCorrectDegrees(grid,0,11,witness)||switchRouteExists(grid,0,11,witness))
  throw new Error("connected-but-switch-disconnected witness no longer discriminates");
 console.log(JSON.stringify({kind:"connected-but-switch-disconnected",width:4,height:3,start:0,goal:11,edges:11}));
 if(results.some(x=>x.disagreements!==0||x.edgeSetCollisions!==0))throw new Error("switch route projection disagrees with toy walk enumeration");
}

main();
