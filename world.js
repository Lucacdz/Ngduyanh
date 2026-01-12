import { generateTrees } from "./tree.js";
import { generateBiome } from "./biome.js";

// Tile size
export const tileSize = 32;

// World dimensions (số block)
export const W = 100;
export const H = 50;

// 2D array world
export const world = [];
export const worldHP = [];

// World generation
export function generateWorld() {
  for (let y = 0; y < H; y++) {
    world[y] = [];
    worldHP[y] = [];
    for (let x = 0; x < W; x++) {
      let id = 0; // empty

      // Đồng bằng mặc định
      if(y > H/2) id = 1; // đất
      if(y === Math.floor(H/2)) id = 2; // cỏ
      // Đá
      if(y > H/2+5) id = 3;

      world[y][x] = id;
      worldHP[y][x] = id>0? 10 : 0;
    }
  }

  // Sinh cây
  generateTrees(world);

  // Sinh biome đặc biệt
  generateBiome(world);
}