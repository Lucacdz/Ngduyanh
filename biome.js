import { world, W, H, worldHP } from "./world.js";
import { blocks } from "./block.js";

// Tỷ lệ spawn biome
const biomeRatios = {
  plains: 0.5,  // đồng bằng
  mountain: 0.2,
  desert: 0.2,
  ocean: 0.1
};

// Generate biome đặc biệt
export function generateBiome(world){
  for(let x=0;x<W;x++){
    const r = Math.random();
    let biome = "plains";

    if(r < biomeRatios.ocean) biome = "ocean";
    else if(r < biomeRatios.ocean + biomeRatios.mountain) biome = "mountain";
    else if(r < biomeRatios.ocean + biomeRatios.mountain + biomeRatios.desert) biome = "desert";

    applyBiomeColumn(x,biome);
  }
}

// Apply biome cho 1 cột
function applyBiomeColumn(x, biome){
  for(let y=0;y<H;y++){
    switch(biome){
      case "mountain":
        if(y>H/2-5) world[y][x] = 3; // đá
        break;
      case "desert":
        if(y===Math.floor(H/2)) world[y][x] = 5; // sand
        if(y>H/2) world[y][x] = 5;
        break;
      case "ocean":
        if(y>H/2) world[y][x] = 7; // seaweed
        break;
      case "plains":
      default:
        // để nguyên đồng bằng
        break;
    }
    if(world[y][x] !== 0) worldHP[y][x] = 10;
  }
}