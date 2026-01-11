const player={
  x:100,y:100,
  vx:0,vy:0,
  w:28,h:28,
  hp:100,
  spawnX:100,
  spawnY:100
};

function updatePlayer(){
  player.vy+=0.5;

  let nx=player.x+player.vx;
  let ny=player.y+player.vy;

  if(!isSolid(Math.floor(nx/TILE),Math.floor(player.y/TILE)))
    player.x=nx;

  if(!isSolid(Math.floor(player.x/TILE),Math.floor(ny/TILE)))
    player.y=ny;
  else player.vy=0;

  if(player.hp<=0){
    player.x=player.spawnX;
    player.y=player.spawnY;
    player.hp=100;
  }
}