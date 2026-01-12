import {world, worldHP, W, H} from "./world.js";
import {blocks,getBlockDrop} from "./block.js";
import {addItem} from "./inventory.js";

// Hàm chung để break bất kỳ block nào và rớt item
export function breakBlockDropItem(x,y){
  if(x<0 || y<0 || x>=W || y>=H) return;
  const id = world[y][x];
  if(id===0) return;

  const drop = getBlockDrop(id);
  if(drop) addItem(drop,1); // rớt item vào inventory

  world[y][x]=0;
  worldHP[y][x]=0;
}