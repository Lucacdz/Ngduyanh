const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");

function resize(){canvas.width=innerWidth; canvas.height=innerHeight;}
resize();addEventListener("resize",resize);

let camX=0, camY=0;

function drawWorld(){
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      const b=world[y][x]; if(!b) continue;
      switch(b){
        case 1: ctx.fillStyle="#7a5230"; break; // dirt
        case 2: ctx.fillStyle="#3cb043"; break; // grass
        case 3: ctx.fillStyle="#8b5a2b"; break; // wood
        case 4: ctx.fillStyle="#2e8b57"; break; // leaf
      }
      ctx.fillRect(x*TILE-camX, y*TILE-camY, TILE, TILE);
    }
  }
}

function loop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  updatePlayer();
  updateMobs();

  camX=player.x-canvas.width/2;
  camY=player.y-canvas.height/2;

  drawWorld();
  drawPlayer(ctx,camX,camY);
  mobs.forEach(m=>drawMob(ctx,m,camX,camY));

  requestAnimationFrame(loop);
}
loop();