import {world, worldHP, W, H} from "./world.js";
import {blocks} from "./block.js";

export const BIOMES = ["mountain","ocean","desert"];
export const biomeMap = []; // lưu biome từng cột x

// Generate biome map theo X
export function generateBiomes() {
  for(let x=0;x<W;x++){
    if(x < W/3) biomeMap[x]="mountain";
    else if(x < W*2/3) biomeMap[x]="ocean";
    else biomeMap[x]="desert";
  }
}

// Lấy biome theo x
export function getBiome(x){
  if(x<0||x>=W) return "mountain";
  return biomeMap[x];
}

// Tạo block theo biome
export function generateBlocks() {
  for(let y=0;y<H;y++){
    world[y]=[];
    worldHP[y]=[];
    for(let x=0;x<W;x++){
      const biome = getBiome(x);
      if(biome==="mountain"){
        if(y>40) { world[y][x]=1; worldHP[y][x]=blocks[1].hp; } // dirt
        else if(y===40){ world[y][x]=2; worldHP[y][x]=blocks[2].hp; } // grass
        else { world[y][x]=0; worldHP[y][x]=0; }
      }
      else if(biome==="ocean"){
        if(y>45) { world[y][x]=5; worldHP[y][x]=blocks[5].hp; } // stone
        else if(y>=40){ world[y][x]=7; worldHP[y][x]=2; } // nước, cần thêm block id=7 "water"
        else { world[y][x]=0; worldHP[y][x]=0; }
      }
      else if(biome==="desert"){
        if(y>40) { world[y][x]=5; worldHP[y][x]=blocks[5].hp; } // stone dưới
        else if(y===40){ world[y][x]=6; worldHP[y][x]=2; } // sand, cần thêm block id=6
        else { world[y][x]=0; worldHP[y][x]=0; }
      }
    }
  }
}