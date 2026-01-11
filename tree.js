import {world, worldHP, TILE} from "./world.js";
import {blocks,getBlockDrop} from "./block.js";
import {inventory} from "./inventory.js";

export function breakTreeBlock(x,y){
  const id = world[y][x];
  const drop = getBlockDrop(id);
  if(drop){
    // thêm vào inventory (auto stack)
    let slot = inventory.find(i => i.id===drop && i.count<64);
    if(slot) slot.count++;
    else{
      let empty = inventory.find(i=>!i.id);
      if(empty) { empty.id=drop; empty.count=1; }
    }
  }
  world[y][x]=0;
  worldHP[y][x]=0;
}