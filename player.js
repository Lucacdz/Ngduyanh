const player={
x:100,y:0,w:26,h:30,
vx:0,vy:0,speed:3,jump:-10,
onGround:false,hp:100
};

function spawnPlayer(){
for(let y=0;y<H;y++){
 if(isSolid(player.x,y*TILE)){
  player.y=(y-1)*TILE;break;
 }
}
}
spawnPlayer();

function updatePlayer(){
player.vx=0;
if(input.left) player.vx=-player.speed;
if(input.right) player.vx=player.speed;

player.vy+=0.5;
if(player.vy>12) player.vy=12;

if(input.jump&&player.onGround){
 player.vy=player.jump;
 player.onGround=false;
}

let nx=player.x+player.vx;
if(!isSolid(nx,player.y)&&!isSolid(nx,player.y+player.h))
 player.x=nx;

let ny=player.y+player.vy;
if(player.vy>0){
 if(!isSolid(player.x,ny+player.h)){
  player.y=ny;player.onGround=false;
 }else{
  player.vy=0;player.onGround=true;
 }
}else{
 if(!isSolid(player.x,ny)) player.y=ny;
 else player.vy=0;
}
}

window.player=player;
window.updatePlayer=updatePlayer;