import { keys } from "./controls.js";
import { world, W, H, tileSize } from "./world.js";
import { breakBlockDropItem } from "./block.js";
import { spawnHighlight } from "./hud.js";

export const player = {
  x: 100,
  y: 100,
  width: 28,
  height: 28,
  vx: 0,
  vy: 0,
  speed: 2,
  jumpPower: 5,
  onGround: false,
  health: 100,
  maxHealth: 100,
};

// Camera
export const camera = {
  x: 0,
  y: 0
};

const gravity = 0.25;
const friction = 0.8;

// Player update (di chuyển + physics)
export function updatePlayer() {
  // Di chuyển ngang
  if(keys.left) player.vx = -player.speed;
  else if(keys.right) player.vx = player.speed;
  else player.vx *= friction;

  // Nhảy
  if(keys.jump && player.onGround){
    player.vy = -player.jumpPower;
    player.onGround = false;
  }

  // Áp dụng trọng lực
  player.vy += gravity;

  // Collision
  movePlayer(player.vx, player.vy);

  // Cập nhật camera (center player)
  camera.x = player.x - innerWidth/2 + player.width/2;
  camera.y = player.y - innerHeight/2 + player.height/2;

  // Highlight block phía trước
  spawnHighlight(player, camera);
}

// Move & collision
function movePlayer(vx, vy){
  // X ngang
  player.x += vx;
  if(checkCollision()){
    if(vx>0) player.x = Math.floor(player.x/tileSize)*tileSize + tileSize - player.width -0.1;
    if(vx<0) player.x = Math.floor(player.x/tileSize)*tileSize + tileSize +0.1;
    player.vx=0;
  }

  // Y dọc
  player.y += vy;
  player.onGround = false;
  if(checkCollision()){
    if(vy>0){ // rơi xuống
      player.y = Math.floor(player.y/tileSize)*tileSize - player.height;
      player.onGround = true;
    }
    if(vy<0){ // nhảy lên
      player.y = Math.floor(player.y/tileSize)*tileSize + tileSize;
    }
    player.vy=0;
  }
}

// Check collision với block solid
function checkCollision(){
  const px = player.x;
  const py = player.y;
  const w = player.width;
  const h = player.height;

  const left = Math.floor(px/tileSize);
  const right = Math.floor((px+w)/tileSize);
  const top = Math.floor(py/tileSize);
  const bottom = Math.floor((py+h)/tileSize);

  for(let y=top; y<=bottom; y++){
    for(let x=left; x<=right; x++){
      if(x<0 || y<0 || x>=W || y>=H) continue;
      if(world[y][x] !== 0) return true;
    }
  }
  return false;
}

// Đập block trước mặt
export function playerAttack(){
  const px = Math.floor((player.x+player.width/2)/tileSize);
  const py = Math.floor((player.y+player.height/2)/tileSize);
  breakBlockDropItem(px,py);
}

// Reset player khi chết
export function respawnPlayer(){
  player.x = 100;
  player.y = 100;
  player.vx = 0;
  player.vy = 0;
  player.health = player.maxHealth;
}