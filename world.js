export const TILE=32,W=200,H=80;
export const world=[];
export const worldHP=[]; // HP từng block

for(let y=0;y<H;y++){
  world[y]=[];
  worldHP[y]=[];
  for(let x=0;x<W;x++){
    if(y>40){ world[y][x]=1; worldHP[y][x]=3; } // đất, HP 3 hit
    else if(y===40){ world[y][x]=2; worldHP[y][x]=2; } // cỏ, HP 2 hit
    else world[y][x]=0, worldHP[y][x]=0; // không gian trống
  }
}

// cây
for(let x=5;x<W;x+=15){
  let g=40;
  for(let i=1;i<=4;i++){ world[g-i][x]=3; worldHP[g-i][x]=4; } // thân gỗ
  for(let ly=-6;ly<=-4;ly++)
    for(let lx=-2;lx<=2;lx++)
      world[g+ly][x+lx]=4, worldHP[g+ly][x+lx]=2; // lá
}

export function breakBlock(px,py){
  const x=Math.floor(px/TILE);
  const y=Math.floor(py/TILE);
  if(world[y] && world[y][x]!==0){
    worldHP[y][x]--;  // mỗi hit giảm 1 HP
    if(worldHP[y][x]<=0){
      world[y][x]=0;
      worldHP[y][x]=0;
    }
  }
}