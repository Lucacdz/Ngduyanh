import { generateWorld } from "./world.js";
import { updatePlayer, player, camera, respawnPlayer } from "./player.js";
import { initControls, keys } from "./controls.js";
import { initMenu } from "./menu.js";
import { hotbar, updateHotbar } from "./inventory.js";

// Canvas
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Resize canvas
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Khởi tạo controls
initControls();

// Khởi tạo menu
initMenu(startGame);

// Game loop
let lastTime = 0;
function gameLoop(timestamp){
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  render();

  requestAnimationFrame(gameLoop);
}

// Start game
function startGame(){
  generateWorld();
  updateHotbar();
  requestAnimationFrame(gameLoop);
}

// Update
function update(delta){
  updatePlayer();

  // Nhấn attack
  if(keys.attack){
    // Đập block trước mặt
    playerAttack();
  }

  // Nếu chết
  if(player.health <=0){
    respawnPlayer();
  }
}

// Render
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Draw world
  const { x:cX, y:cY } = camera;
  for(let y=0;y<50;y++){
    for(let x=0;x<100;x++){
      const id = world[y][x];
      if(id===0) continue;
      ctx.fillStyle = getBlockColor(id);
      ctx.fillRect(x*32 - cX, y*32 - cY, 32,32);
    }
  }

  // Draw player
  ctx.fillStyle = "red";
  ctx.fillRect(player.x - cX, player.y - cY, player.width, player.height);
}

// Get color theo block ID
function getBlockColor(id){
  switch(id){
    case 1: return "#654321"; // Dirt
    case 2: return "#00aa00"; // Grass
    case 3: return "#888888"; // Stone
    case 4: return "#deb887"; // Wood
    case 5: return "#f4e58c"; // Sand
    case 6: return "#228b22"; // Cactus
    case 7: return "#1e90ff"; // Seaweed
    default: return "#000000";
  }
}