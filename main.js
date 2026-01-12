import {spawnPlayer,updatePlayer,drawPlayer,player} from "./player.js";
import {world,TILE,H,W} from "./world.js";
import {spawnTrees} from "./tree.js";
import {updateInput,input} from "./controls.js";
import {toggleInventory,renderInventory} from "./inventory.js";
import {generateBiomes,generateBlocks} from "./biome.js";

// trước khi spawnPlayer()

generateBiomes();
generateBlocks();

const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");

// Resize canvas full screen
function resize(){canvas.width=window.innerWidth; canvas.height=window.innerHeight;}
window.addEventListener("resize",resize);
resize();

// Responsive controls dọc/ngang
function updateControlsPosition(){
  const controls = document.getElementById("controls");
  if(window.innerWidth > window.innerHeight){
    // ngang
    controls.style.flexDirection="row";
  } else {
    // dọc
    controls.style.flexDirection="column";
  }
}
window.addEventListener("resize",updateControlsPosition);
updateControlsPosition();

// Menu start
const menu=document.getElementById("menu");
const startBtn=document.getElementById("startBtn");
startBtn.addEventListener("click",()=>{
  menu.style.display="none";
  canvas.style.display="block";
  document.getElementById("controls").style.display="flex";
  spawnTrees();
  spawnPlayer();
  renderInventory();
});

let camX=0, camY=0;

// Vẽ thế giới
function drawWorld(){
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const b = world[y][x];
      if(!b) continue;
      switch(b){
        case 1: ctx.fillStyle="#7a5230"; break; // dirt
        case 2: ctx.fillStyle="#3cb043"; break; // grass
        case 3: ctx.fillStyle="#8b5a2b"; break; // wood
        case 4: ctx.fillStyle="#2e8b57"; break; // leaves
        case 5: ctx.fillStyle="#808080"; break; // stone
      }
      ctx.fillRect(x*TILE-camX, y*TILE-camY, TILE, TILE);
    }
  }
}

// Loop game
function loop(){
  if(menu.style.display==="none"){
    updateInput();
    updatePlayer(input);

    // Camera center player
    camX = player.x - canvas.width/2;
    camY = player.y - canvas.height/2;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWorld();

    // Highlight block đang nhắm
    const range=40;
    let dirX=input.x, dirY=input.y;
    if(dirX===0 && dirY===0) dirX=1;
    const targetX=Math.floor((player.x+player.w/2 + dirX*range)/TILE);
    const targetY=Math.floor((player.y+player.h/2 + dirY*range)/TILE);
    if(targetY>=0 && targetY<H && targetX>=0 && targetX<W){
      ctx.strokeStyle="yellow";
      ctx.lineWidth=2;
      ctx.strokeRect(targetX*TILE-camX, targetY*TILE-camY, TILE, TILE);
    }

    drawPlayer(ctx,camX,camY);
  }

  requestAnimationFrame(loop);
}
loop();

// Inventory toggle
document.getElementById("inventoryBtn").addEventListener("click",toggleInventory);