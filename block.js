import { world, worldHP, W, H } from "./world.js";
import { addItem } from "./inventory.js";
import { tileSize } from "./world.js";

// Danh sách block
export const blocks = {
  1: { name:"Dirt", durability:3, color:"#654321", drop:"Dirt" },
  2: { name:"Grass", durability:3, color:"#00aa00", drop:"Grass" },
  3: { name:"Stone", durability:5, color:"#888888", drop:"Stone" },
  4: { name:"Wood", durability:4, color:"#deb887", drop:"Wood" },
  5: { name:"Sand", durability:2, color:"#f4e58c", drop:"Sand" },
  6: { name:"Cactus", durability:2, color:"#228b22", drop:"Cactus" },
  7: { name:"Seaweed", durability:1, color:"#1e90ff", drop:"Seaweed" }
};

// Break block và rớt item
export function breakBlockDropItem(x,y){
  if(x<0 || y<0 || x>=W || y>=H) return;
  const id = world[y][x];
  if(id===0) return;

  const drop = getBlockDrop(id);
  if(drop) addItem(drop,1); // Rớt item khi break

  world[y][x]=0;
  worldHP[y][x]=0;
}

// Lấy item rớt từ block
export function getBlockDrop(id){
  if(blocks[id]) return blocks[id].drop;
  return null;
}