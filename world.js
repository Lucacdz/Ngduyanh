const TILE=32,W=200,H=80;
const world=[];

for(let y=0;y<H;y++){
  world[y]=[];
  for(let x=0;x<W;x++){
    if(y>40) world[y][x]=1;
    else if(y===40) world[y][x]=2;
    else world[y][x]=0;
  }
}

function isSolid(px,py){
  let x=Math.floor(px/TILE);
  let y=Math.floor(py/TILE);
  if(x<0||y<0||x>=W||y>=H) return true;
  return world[y][x]!==0;
}

window.world=world;
window.isSolid=isSolid;
window.TILE=TILE;