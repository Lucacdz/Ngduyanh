import {initMenu} from "./menu.js";
import {spawnPlayer, updatePlayer, drawPlayer, player} from "./player.js";
import {generateBiomes, generateBlocks} from "./biome.js";
import {spawnTrees} from "./tree.js";
import {updateInput} from "./controls.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let camX=0, camY=0;

initMenu(()=>{
  // Khi nhấn Start
  generateBiomes();
  generateBlocks();
  spawnTrees();
  spawnPlayer();
  requestAnimationFrame(gameLoop);
});

function gameLoop(){
  updateInput();
  updatePlayer();

  // camera theo player
  camX = player.x - canvas.width/2 + player.w/2;
  camY = player.y - canvas.height/2 + player.h/2;

  // render
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // world
  drawWorld(ctx, camX, camY);

  // player
  drawPlayer(ctx, camX, camY);

  requestAnimationFrame(gameLoop);
}

// ví dụ hàm drawWorld
function drawWorld(ctx, camX, camY){
  // tùy bạn implement: world[y][x] -> fillRect/block image
}