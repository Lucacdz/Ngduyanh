import { initMenu } from './menu.js';

function startGame(){
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Demo world
  const W = Math.floor(canvas.width/32);
  const H = Math.floor(canvas.height/32);
  let world = Array.from({length:H},()=>Array(W).fill(0));

  // Demo: tạo mặt đất
  for(let x=0;x<W;x++){
    world[H-2][x]=1; // block đất
    world[H-1][x]=1;
  }

  // Player
  let player = {x:5, y:H-3, w:32, h:32, color:"red"};

  function drawWorld(){
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        if(world[y][x]===1){
          ctx.fillStyle="brown";
          ctx.fillRect(x*32, y*32, 32, 32);
        }
      }
    }
  }

  function drawPlayer(){
    ctx.fillStyle=player.color;
    ctx.fillRect(player.x*32, player.y*32, player.w, player.h);
  }

  let keys = {};
  window.addEventListener("keydown",e=>keys[e.key]=true);
  window.addEventListener("keyup",e=>keys[e.key]=false);

  function update(){
    if(keys["ArrowLeft"]) player.x-=0.1;
    if(keys["ArrowRight"]) player.x+=0.1;
    if(keys["ArrowUp"]) player.y-=0.1;
    if(keys["ArrowDown"]) player.y+=0.1;

    // gravity
    if(player.y+1<H && world[Math.floor(player.y+1)][Math.floor(player.x)]===0) player.y+=0.1;
  }

  function loop(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawWorld();
    update();
    drawPlayer();
    requestAnimationFrame(loop);
  }

  loop();
}

initMenu(startGame);