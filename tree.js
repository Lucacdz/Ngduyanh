import {world, worldHP, W, H} from "./world.js";
import {blocks,getBlockDrop} from "./block.js";
import {addItem} from "./inventory.js";

export function breakBlockDropItem(x,y){
  const id = world[y][x];
  if(id===0) return;
  const drop = getBlockDrop(id);
  if(drop) addItem(drop,1);
  world[y][x]=0;
  worldHP[y][x]=0;
}

export function spawnTrees(){
  for(let x=5;x<W;x+=5){
    if(Math.random()<0.1){
      let treeHeight = Math.floor(Math.random()*3)+3;
      let groundY = 0;
      for(let y=0;y<H;y++){
        if(world[y][x]!==0){ groundY=y-1; break; }
      }
      // thân cây
      for(let i=0;i<treeHeight;i++){
        if(groundY-i>0){ world[groundY-i][x]=3; worldHP[groundY-i][x]=4; }
      }
      // lá: cao hơn gỗ 1 block
      let leafTop = groundY - treeHeight -1;
      let leafLayers = treeHeight<=3?2:3;
      for(let ly=leafTop;ly<groundY-treeHeight+1;ly++){
        for(let lx=-2;lx<=2;lx++){
          let px=x+lx, py=ly;
          if(px>=0 && px<W && py>=0 && py<H && world[py][px]===0){
            world[py][px]=4; worldHP[py][px]=2;
          }
        }
      }
    }
  }
}