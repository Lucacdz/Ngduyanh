import { world, W, H, tileSize, worldHP } from "./world.js";
import { breakBlockDropItem } from "./block.js";
import { mobs, Mob, playerRef } from "./mobs.js";
import { addItem, hotbar, updateHotbar } from "./inventory.js";
import { keys } from "./controls.js";

// Camera
export const camera = { x:0, y:0 };

// Player
export const player = {
  x: 100,
  y: 100,
  width: 32,
  height: 32,
  speed: 3,
  jumpPower: 8,
  velY:0,
  onGround:false,
  health:100,
  maxHealth:100
};

// Tham chiếu cho mobs
playerRef.x = player.x;
playerRef.y = player.y;

// Update player mỗi frame
export function updatePlayer(){
  // Di chuyển
  if(keys.left) player.x -= player.speed;
  if(keys.right) player.x += player.speed;

  // Nhảy
  if(keys.jump && player.onGround){
    player.velY = -player.jumpPower;
    player.onGround = false;
  }

  // Trọng lực
  player.velY += 0.5; // gravity
  player.y += player.velY;

  // Va chạm với đất
  if(player.y + player.height > H*tileSize){
    player.y = H*tileSize - player.height;
    player.velY = 0;
    player.onGround = true;
  }

  // Cập nhật camera
  camera.x = player.x - window.innerWidth/2 + player.width/2;
  camera.y = player.y - window.innerHeight/2 + player.height/2;

  // Va chạm với mobs
  mobs.forEach(mob=>{
    if(checkCollision(player,mob)){
      player.health -= 0.5; // mất máu khi chạm mob
    }
  });

  // Cập nhật playerRef cho mobs
  playerRef.x = player.x;
  playerRef.y = player.y;
}

// Kiểm tra va chạm AABB
function checkCollision(a,b){
  return a.x < b.x+b.width &&
         a.x+a.width > b.x &&
         a.y < b.y+b.height &&
         a.y+a.height > b.y;
}

// Khi chết
export function respawnPlayer(){
  player.x = 100;
  player.y = 100;
  player.health = player.maxHealth;
  player.velY = 0;
  player.onGround = false;
}