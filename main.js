const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
canvas.width=innerWidth;
canvas.height=innerHeight;

let mining=false,mx=0,my=0,timer=0;
let time=0,spawnTimer=0;

canvas.addEventListener("mousedown",e=>startMine(e));
canvas.addEventListener("mouseup",()=>mining=false);
canvas.addEventListener("touchstart",e=>startMine(e.touches[0]));
canvas.addEventListener("touchend",()=>mining=false);

function startMine(e){
 const r=canvas.getBoundingClientRect();
 mx=Math.floor((e.clientX-r.left)/TILE);
 my=Math.floor((e.clientY-r.top)/TILE);
 mining=true;timer=0;
}

function updateMining(){
 if(!mining) return;
 timer++;
 if(timer>30 && world[my]?.[mx]>0){
  addItem(world[my][mx]);
  world[my][mx]=0;
  mining=false;
 }
}

function drawWorld(){
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const b=world[y][x];
  if(!b) continue;
  ctx.fillStyle=b==1?"#654321":b==2?"#2ecc71":b==3?"#8b4513":"#27ae60";
  ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
 }
}

function drawPlayer(){
 ctx.fillStyle="red";
 ctx.fillRect(player.x,player.y,player.w,player.h);
}

function updateDayNight(){
 time+=0.001;
 const d=Math.max(0,Math.sin(time));
 document.getElementById("night").style.background=`rgba(0,0,0,${d*0.5})`;

 spawnTimer++;
 if(d>0.5 && spawnTimer>200){
  spawnTimer=0;
  const t=Object.keys(MOB_TYPES)[Math.floor(Math.random()*4)];
  spawnMob(t,player.x+300,200);
 }
}

function loop(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 updatePlayer();
 updateMining();
 updateMobs();
 drawWorld();
 drawMobs();
 drawPlayer();
 updateDayNight();
 requestAnimationFrame(loop);
}
loop();