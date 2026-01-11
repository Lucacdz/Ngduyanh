
const mobs=[];
function spawnMob(x,y,type="zombie"){
  mobs.push({x,y,w:28,h:32,vx:Math.random()<0.5?-1:1,vy:0,hp:30,maxHp:30,type});
}
spawnMob(300,0,"zombie");
spawnMob(400,0,"skeleton");
spawnMob(500,0,"slime");
spawnMob(600,0,"spider");
function updateMobs(){
  mobs.forEach(m=>{
    m.vy+=0.5;
    let nx=m.x+m.vx;
    if(!isSolid(nx,m.y)&&!isSolid(nx,m.y+m.h)) m.x=nx;
    else m.vx*=-1;
    let ny=m.y+m.vy;
    if(!isSolid(m.x,ny+m.h)) m.y=ny;
    else m.vy=0;
  });
  for(let i=mobs.length-1;i>=0;i--){
    if(mobs[i].hp<=0) mobs.splice(i,1);
  }
}
function drawMob(ctx,m,camX,camY){
  switch(m.type){
    case"zombie":ctx.fillStyle="#228B22";break;
    case"skeleton":ctx.fillStyle="#EEE";break;
    case"slime":ctx.fillStyle="rgba(0,255,0,0.6)";break;
    case"spider":ctx.fillStyle="#111";break;
    default:ctx.fillStyle="green";
  }
  ctx.fillRect(m.x-camX,m.y-camY,m.w,m.h);
  ctx.fillStyle="red";
  ctx.fillRect(m.x-camX,m.y-camY-6,m.w*(m.hp/m.maxHp),4);
}
window.mobs=mobs;
window.spawnMob=spawnMob;
window.updateMobs=updateMobs;
window.drawMob=drawMob;