import {TILE,H,world,worldHP} from "./world.js";
import {breakBlockDropItem} from "./tree.js";

export const player={
  x:100,y:0,w:28,h:32,vx:0,vy:0,speed:3,jump:-10,onGround:false,
  hp:100,maxHp:100,attackCooldown:0
};

export function spawnPlayer(){
  for(let y=0;y<H;y++){
    if(world[y][Math.floor(player.x/TILE)]!==0){
      player.y=(y-1)*TILE; break;
    }
  }
}

export function attack(input){
  if(player.attackCooldown>0) return;
  player.attackCooldown=5;
  const range=40;
  let dirX=input.x, dirY=input.y;
  if(dirX===0 && dirY===0) dirX=1;
  const targetX = Math.floor((player.x+player.w/2 + dirX*range)/TILE);
  const targetY = Math.floor((player.y+player.h/2 + dirY*range)/TILE);
  breakBlockDropItem(targetX,targetY);
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
  if(!world[Math.floor(player.y/TILE)][Math.floor(nx/TILE)] && !world[Math.floor((player.y+player.h)/TILE)][Math.floor(nx/TILE)]) player.x=nx;

  let ny=player.y+player.vy;
  if(player.vy>0){
    if(!world[Math.floor((ny+player.h)/TILE)][Math.floor(player.x/TILE)]) player.y=ny; else{player.vy=0;player.onGround=true;}
  }else{
    if(!world[Math.floor(ny/TILE)][Math.floor(player.x/TILE)]) player.y=ny; else player.vy=0;
  }
}

export function drawPlayer(ctx,camX,camY){
  ctx.fillStyle="#FF4500";
  ctx.fillRect(player.x-camX,player.y-camY,player.w,player.h);
  ctx.fillStyle="red";
  ctx.fillRect(player.x-camX,player.y-camY-6,player.w*(player.hp/player.maxHp),4);
}