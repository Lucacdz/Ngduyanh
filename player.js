import {TILE,H,W,world,worldHP} from "./world.js";
import {breakBlockDropItem} from "./blockActions.js";
import {input} from "./controls.js";

export const player = {
  x: 100, y: 100, w:28, h:28,
  vx:0, vy:0, speed:2, jumpPower:6,
  onGround:false,
  hp:20
};

export function spawnPlayer(){
  player.x = 50*TILE;
  player.y = 30*TILE;
}

export function updatePlayer(){
  // Di chuyển
  player.vx = input.x*player.speed;
  player.vy += 0.3; // gravity

  if(input.jump && player.onGround){
    player.vy = -player.jumpPower;
    player.onGround=false;
  }

  // Tính toán va chạm với block
  let nextX = player.x + player.vx;
  let nextY = player.y + player.vy;

  // đơn giản check collision với solid block
  player.onGround=false;
  for(let y=Math.floor(nextY/TILE);y<Math.ceil((nextY+player.h)/TILE);y++){
    for(let x=Math.floor(nextX/TILE);x<Math.ceil((nextX+player.w)/TILE);x++){
      if(world[y] && world[y][x] && world[y][x]!==0){
        const blockSolid = true;
        if(nextY+player.h > y*TILE && player.y+player.h <= y*TILE){
          nextY = y*TILE - player.h;
          player.vy=0;
          player.onGround=true;
        }
        if(nextY < (y+1)*TILE && player.y >= (y+1)*TILE){
          nextY = (y+1)*TILE;
          player.vy=0;
        }
        if(nextX+player.w > x*TILE && player.x+player.w <= x*TILE){
          nextX = x*TILE - player.w;
          player.vx=0;
        }
        if(nextX < x*TILE+TILE && player.x >= x*TILE+TILE){
          nextX = x*TILE+TILE;
          player.vx=0;
        }
      }
    }
  }

  player.x=nextX;
  player.y=nextY;

  // Đào block
  if(input.attack){
    const range=32;
    let dirX = input.x!==0? input.x:1;
    let targetX = Math.floor((player.x + player.w/2 + dirX*range)/TILE);
    let targetY = Math.floor((player.y + player.h/2)/TILE);
    breakBlockDropItem(targetX,targetY);
  }
}

export function drawPlayer(ctx,camX,camY){
  ctx.fillStyle="red";
  ctx.fillRect(player.x-camX,player.y-camY,player.w,player.h);
}