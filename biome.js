import {world, worldHP, W, H} from "./world.js";
import {blocks} from "./block.js";

export const BIOMES = ["mountain","ocean","desert","plains"];
export const biomeMap = [];

// Sinh biome theo x
export function generateBiomes() {
  for(let x=0;x<W;x++){
    const r = Math.random();
    // Plains chiếm ~60%
    if(r < 0.05) biomeMap[x]="mountain";   // 5% map là núi
    else if(r < 0.10) biomeMap[x]="ocean";  // 5% map là biển
    else if(r < 0.15) biomeMap[x]="desert"; // 5% map là sa mạc
    else biomeMap[x]="plains";               // 85% map là đồng bằng
  }
}

export function getBiome(x){
  if(x<0||x>=W) return "plains";
  return biomeMap[x];
}

// Tạo block cơ bản theo biome
export function generateBlocks() {
  for(let y=0;y<H;y++){
    world[y]=[];
    worldHP[y]=[];
    for(let x=0;x<W;x++){
      const biome = getBiome(x);
      if(biome==="mountain"){
        if(y>40){ world[y][x]=1; worldHP[y][x]=blocks[1].hp; }
        else if(y===40){ world[y][x]=2; worldHP[y][x]=blocks[2].hp; }
        else { world[y][x]=0; worldHP[y][x]=0; }
      } else if(biome==="ocean"){
        if(y>45){ world[y][x]=5; worldHP[y][x]=blocks[5].hp; }
        else if(y>=40){ world[y][x]=7; worldHP[y][x]=2; } // nước
        else { world[y][x]=0; worldHP[y][x]=0; }
      } else if(biome==="desert"){
        if(y>40){ world[y][x]=5; worldHP[y][x]=blocks[5].hp; }
        else if(y===40){ world[y][x]=6; worldHP[y][x]=2; } // sand
        else { world[y][x]=0; worldHP[y][x]=0; }
      } else if(biome==="plains"){
        if(y>40){ world[y][x]=1; worldHP[y][x]=blocks[1].hp; }
        else if(y===40){ world[y][x]=2; worldHP[y][x]=blocks[2].hp; }
        else { world[y][x]=0; worldHP[y][x]=0; }
      }
    }
  }
}