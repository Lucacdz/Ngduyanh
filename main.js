
import { player, updatePlayer, respawnPlayer, camera } from "./player.js";
import { world, W, H, tileSize, worldHP, generateWorld, biomeMap } from "./world.js";
import { blocks } from "./block.js";
import { mobs, spawnMobs, updateMobs } from "./mobs.js";
import { generateTrees } from "./tree.js";
import { initControls, keys } from "./controls.js";
import { initMenu } from "./menu.js";
import { updateHotbar } from "./inventory.js";

// Canvas
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Init
initMenu(startGame);
initControls();
generateWorld();
generateTrees(biomeMap);
spawnMobs();

// Game loop
function gameLoop(){
  requestAnimationFrame(gameLoop);

  // Update
  updatePlayer();
  updateMobs();

  // Render
  render();
}
function startGame(){
  gameLoop();
}

// Render world
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const startX = Math.floor(camera.x/tileSize);
  const startY = Math.floor(camera.y/tileSize);
  const endX = Math.ceil((camera.x + canvas.width)/tileSize);
  const endY = Math.ceil((camera.y + canvas.height)/tileSize);

  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      if(x<0 || y<0 || x>=W || y>=H) continue;
      const id = world[y][x];
      if(id>0){
        ctx.fillStyle = blocks[id].color;
        ctx.fillRect(x*tileSize - camera.x, y*tileSize - camera.y, tileSize, tileSize);

        // Highlight khi player nhìn vào
        const px = Math.floor((player.x + player.width/2)/tileSize);
        const py = Math.floor((player.y + player.height/2)/tileSize);
        if(px===x && py===y){
          ctx.strokeStyle = "yellow";
          ctx.lineWidth = 2;
          ctx.strokeRect(x*tileSize - camera.x, y*tileSize - camera.y, tileSize, tileSize);
        }
      }
    }
  }

  // Render player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x - camera.x, player.y - camera.y, player.width, player.height);

  // Render mobs
  mobs.forEach(mob=>{
    ctx.fillStyle = mob.color;
    ctx.fillRect(mob.x - camera.x, mob.y - camera.y, mob.width, mob.height);
  });

  // HUD: Health
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(20,20,player.maxHealth*2,24);
  ctx.fillStyle = "red";
  ctx.fillRect(20,20,player.health*2,24);

  // Hotbar
  updateHotbar();
}