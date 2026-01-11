const mobs=[];
const MOB_TYPES={
 zombie:{hp:40,speed:1},
 skeleton:{hp:30,speed:1.2},
 slime:{hp:20,speed:0.8},
 spider:{hp:25,speed:1.5}
};

function spawnMob(type,x,y){
 mobs.push({type,x,y,vx:0,vy:0,w:28,h:28,hp:MOB_TYPES[type].hp});
}

function updateMobs(){
 mobs.forEach(m=>{
  let dx=player.x-m.x;
  m.vx=Math.sign(dx)*MOB_TYPES[m.type].speed;
  m.vy+=0.4;

  let nx=m.x+m.vx;
  let ny=m.y+m.vy;

  if(!isSolid(Math.floor(nx/TILE),Math.floor(m.y/TILE))) m.x=nx;
  if(!isSolid(Math.floor(m.x/TILE),Math.floor(ny/TILE))) m.y=ny;
  else m.vy=0;

  if(Math.abs(dx)<30 && Math.abs(player.y-m.y)<30)
    player.hp-=0.2;
 });

 for(let i=mobs.length-1;i>=0;i--)
  if(mobs[i].hp<=0) mobs.splice(i,1);
}

function drawMobs(){
 mobs.forEach(m=>{
  ctx.fillStyle=
   m.type==="zombie"?"green":
   m.type==="skeleton"?"white":
   m.type==="slime"?"lime":"black";
  ctx.fillRect(m.x,m.y,m.w,m.h);
 });
}