import { world, W, H, worldHP } from "./world.js";
import { blocks } from "./block.js";

// Sinh cây ngẫu nhiên
export function generateTrees(world) {
  for (let x = 0; x < W; x++) {
    // Xác suất 10% cây trên đồng bằng
    if(Math.random() < 0.1){
      let y = findSurface(x);
      if(y>0){
        spawnTree(x,y);
      }
    }
  }
}

// Tìm bề mặt để đặt cây
function findSurface(x){
  for(let y=0; y<H; y++){
    if(world[y][x]===2) return y-1; // phía trên cỏ
  }
  return -1;
}

// Spawn cây theo dạng nhỏ hoặc lớn
function spawnTree(x,y){
  const type = Math.random()<0.5 ? "small":"big";

  // Gỗ
  const height = type==="small"?2:4;
  for(let i=0;i<height;i++){
    if(y-i>=0){
      world[y-i][x]=4; // Wood
      worldHP[y-i][x]=10;
    }
  }

  // Lá
  const leafY = y-height;
  const leafWidth = type==="small"?1:2;
  for(let dx=-leafWidth; dx<=leafWidth; dx++){
    for(let dy=-leafWidth; dy<=leafWidth; dy++){
      const lx = x+dx;
      const ly = leafY+dy;
      if(lx>=0 && lx<W && ly>=0 && ly<H && world[ly][lx]===0){
        world[ly][lx]=2; // dùng Grass làm lá tạm
        worldHP[ly][lx]=5;
      }
    }
  }
}