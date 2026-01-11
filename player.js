const player = {
  x: 100, y: 0, w: 28, h: 32,
  vx: 0, vy: 0,
  speed: 3, jump: -10,
  onGround: false,
  hp: 100, maxHp: 100,
  attackCooldown: 0
};

function spawnPlayer() {
  for (let y = 0; y < H; y++) {
    if (isSolid(player.x, y*TILE)) {
      player.y = (y-1)*TILE;
      break;
    }
  }
}
spawnPlayer();

function attack() {
  if (player.attackCooldown>0) return;
  player.attackCooldown=20;

  const range=40;
  mobs.forEach(m=>{
    const dx=Math.abs((m.x+m.w/2)-(player.x+player.w/2));
    const dy=Math.abs((m.y+m.h/2)-(player.y+player.h/2));
    if(dx<range && dy<range) m.hp-=10;
  });

  const dir = input.left?-1:1;
  breakBlock(player.x + dir*40, player.y+10);
}

function updatePlayer(){
  player.vx=0;
  if(input.left) player.vx=-player.speed;
  if(input.right) player.vx=player.speed;
  if(input.attack) attack();
  if(player.attackCooldown>0) player.attackCooldown--;

  player.vy+=0.5;
  if(player.vy>12) player.vy=12;

  if(input.jump && player.onGround){player.vy=player.jump; player.onGround=false;}

  let nx=player.x+player.vx;
  if(!isSolid(nx,player.y) && !isSolid(nx,player.y+player.h)) player.x=nx;

  let ny=player.y+player.vy;
  if(player.vy>0){
    if(!isSolid(player.x,ny+player.h)){player.y=ny; player.onGround=false;}
    else {player.vy=0; player.onGround=true;}
  }else{
    if(!isSolid(player.x,ny)) player.y=ny;
    else player.vy=0;
  }
}

function drawPlayer(ctx, camX, camY){
  ctx.fillStyle="#FF4500"; // player màu cam đỏ
  ctx.fillRect(player.x-camX, player.y-camY, player.w, player.h);
  ctx.fillStyle="red";
  ctx.fillRect(player.x-camX, player.y-camY-6, player.w*(player.hp/player.maxHp), 4);
}

window.player=player;
window.updatePlayer=updatePlayer;
window.drawPlayer=drawPlayer;