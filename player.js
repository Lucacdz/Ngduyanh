import {TILE,H} from "./world.js";
import {isSolid,breakBlock} from "./world.js";
import {mobs} from "./mobs.js";

export const player={
  x:100,y:0,w:28,h:32,vx:0,vy:0,speed:3,jump:-10,onGround:false,
  hp:100,maxHp:100,attackCooldown:0
};

export function spawnPlayer(){
  for(let y=0;y<H;y++){
    if(isSolid(player.x,y*TILE)){
      player.y=(y-1)*TILE; break;
    }
  }
}

export function attack(input){
  if(player.attackCooldown>0) return;
  player.attackCooldown=5; // cooldown giữa các hit
  const range=40;

  // đánh mobs
  mobs.forEach(m=>{
    const dx=Math.abs((m.x+m.w/2)-(player.x+player.w/2));
    const dy=Math.abs((m.y+m.h/2)-(player.y+player.h/2));
    if(dx<range&&dy<range) m.hp-=10;
  });

  // đào block theo hướng joystick
  let dirX=input.x, dirY=input.y;
  if(dirX===0 && dirY===0) dirX=1; // mặc định ngang
  const targetX = player.x+player.w/2 + dirX*range;
  const targetY = player.y+player.h/2 + dirY*range;
  breakBlock(targetX,targetY);
}

export function updatePlayer(input){
  player.vx=0;
  if(input.x<0) player.vx=-player.speed;
  if(input.x>0) player.vx=player.speed;

  if(input.jump && player.onGround){ player.vy=player.jump; player.onGround=false; }
  if(input.attack) attack(input);

  if(player.attackCooldown>0) player.attackCooldown--;

  player.vy+=0.5; if(player.vy>12) player.vy=12;

  let nx=player.x+player.vx;
  if(!isSolid(nx,player.y)&&!isSolid(nx,player.y+player.h)) player.x=nx;

  let ny=player.y+player.vy;
  if(player.vy>0){
    if(!isSolid(player.x,ny+player.h)){ player.y=ny; player.onGround=false; }
    else { player.vy=0; player.onGround=true; }
  }else{
    if(!isSolid(player.x,ny)) player.y=ny;
    else player.vy=0;
  }
}

export function drawPlayer(ctx,camX,camY){
  ctx.fillStyle="#FF4500";
  ctx.fillRect(player.x-camX,player.y-camY,player.w,player.h);
  ctx.fillStyle="red";
  ctx.fillRect(player.x-camX,player.y-camY-6,player.w*(player.hp/player.maxHp),4);
}