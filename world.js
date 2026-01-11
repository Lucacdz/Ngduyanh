const TILE = 32;
const W = 120;
const H = 25;

// 0 air | 1 dirt | 2 grass | 3 wood | 4 leaves
const world = [];

for (let y=0;y<H;y++){
  world[y]=[];
  for(let x=0;x<W;x++){
    if(y>15) world[y][x]=1;
    else if(y===15) world[y][x]=2;
    else world[y][x]=0;
  }
}

// trees
for(let x=6;x<W;x+=12){
  let y=14;
  for(let i=0;i<4;i++) world[y-i][x]=3;
  world[y-4][x]=4;
  world[y-4][x-1]=4;
  world[y-4][x+1]=4;
}

function isSolid(tx,ty){
  if(tx<0||ty<0||tx>=W||ty>=H) return false;
  return world[ty][tx]!==0;
}