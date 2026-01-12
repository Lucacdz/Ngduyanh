import { world, worldHP, W, H, tileSize } from "./world.js";
import { addItem } from "./inventory.js";

// Block types
export const blocks = {
  0: { name: "Air", solid: false },
  1: { name: "Dirt", solid: true, drop: "Dirt" },
  2: { name: "Grass", solid: true, drop: "Dirt" },
  3: { name: "Stone", solid: true, drop: "Stone" },
  4: { name: "Wood", solid: true, drop: "Wood" },
  5: { name: "Sand", solid: true, drop: "Sand" },
  6: { name: "Cactus", solid: true, drop: "Cactus" },
  7: { name: "Seaweed", solid: true, drop: "Seaweed" }
};

// Lấy item drop từ block
export function getBlockDrop(id){
  if(blocks[id] && blocks[id].drop) return blocks[id].drop;
  return null;
}

// Break block và rớt item
export function breakBlockDropItem(x,y){
  if(x<0 || y<0 || x>=W || y>=H) return;
  const id = world[y][x];
  if(id===0) return;

  const drop = getBlockDrop(id);
  if(drop) addItem(drop,1);

  world[y][x] = 0;
  worldHP[y][x] = 0;
}

// Place block
export function placeBlock(x,y,id){
  if(x<0 || y<0 || x>=W || y>=H) return;
  if(world[y][x]===0){
    world[y][x] = id;
    worldHP[y][x] = 10;
  }
}