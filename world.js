export const TILE=32,W=200,H=80;
export const world=[]; export const worldHP=[];
for(let y=0;y<H;y++){
  world[y]=[]; worldHP[y]=[];
  for(let x=0;x<W;x++){
    if(y>40){ world[y][x]=1; worldHP[y][x]=3; }
    else if(y===40){ world[y][x]=2; worldHP[y][x]=2; }
    else{ world[y][x]=0; worldHP[y][x]=0; }
  }
}

export function isSolid(px,py){
  const x=Math.floor(px/TILE);
  const y=Math.floor(py/TILE);
  if(x<0||y<0||x>=W||y>=H) return true;
  return world[y][x]!==0;
}