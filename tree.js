import {world, worldHP, W, H} from "./world.js";
import {getBiome} from "./biome.js";

// block IDs
// 3: wood, 4: leaves, 8: cactus, 9: seaweed, 10: small_tree

export function spawnTrees(){
  for(let x=5;x<W;x+=5){
    const biome = getBiome(x);

    if(biome==="mountain" && Math.random()<0.1){
      spawnMountainTree(x);
    }
    if(biome==="desert" && Math.random()<0.05){
      spawnCactus(x);
    }
    if(biome==="ocean" && Math.random()<0.08){
      spawnSeaweed(x);
    }
    if(biome==="plains" && Math.random()<0.12){
      spawnSmallTree(x);
    }
  }
}

// --- Mountain Tree ---
function spawnMountainTree(x){
  let treeHeight = Math.floor(Math.random()*3)+3;
  let groundY = findGroundY(x);
  for(let i=0;i<treeHeight;i++){
    if(groundY-i>0){ world[groundY-i][x]=3; worldHP[groundY-i][x]=4; }
  }
  let leafTop = groundY - treeHeight -1;
  let leafLayers = 2;
  for(let ly=leafTop;ly<groundY-treeHeight+1;ly++){
    for(let lx=-2;lx<=2;lx++){
      let px=x+lx, py=ly;
      if(px>=0 && px<W && py>=0 && py<H && world[py][px]===0){
        world[py][px]=4; worldHP[py][px]=2;
      }
    }
  }
}

// --- Desert Cactus ---
function spawnCactus(x){
  let height = Math.floor(Math.random()*2)+2;
  let groundY = findGroundY(x);
  for(let i=0;i<height;i++){
    if(groundY-i>0){ world[groundY-i][x]=8; worldHP[groundY-i][x]=3; }
  }
}

// --- Ocean Seaweed ---
function spawnSeaweed(x){
  let height = Math.floor(Math.random()*3)+2;
  let waterY = findWaterY(x);
  for(let i=0;i<height;i++){
    if(waterY-i>0){ world[waterY-i][x]=9; worldHP[waterY-i][x]=1; }
  }
}

// --- Plains Small Tree ---
function spawnSmallTree(x){
  let treeHeight = 2; // cây thấp
  let groundY = findGroundY(x);
  for(let i=0;i<treeHeight;i++){
    if(groundY-i>0){ world[groundY-i][x]=10; worldHP[groundY-i][x]=2; }
  }
  // lá 1 block
  let leafY = groundY-treeHeight-1;
  if(leafY>=0 && world[leafY][x]===0){
    world[leafY][x]=4; worldHP[leafY][x]=2;
  }
}

// --- Helpers ---
function findGroundY(x){
  for(let y=0;y<H;y++){
    if(world[y][x]!==0 && world[y][x]!==7) return y-1;
  }
  return H-1;
}

function findWaterY(x){
  for(let y=0;y<H;y++){
    if(world[y][x]===7) return y-1;
  }
  return H-1;
}