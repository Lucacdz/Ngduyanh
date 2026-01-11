const mobs=[];
function spawnMob(x,y){
mobs.push({x,y,w:26,h:26,vx:1,vy:0,hp:20});
}
spawnMob(300,0);

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
}
window.mobs=mobs;
window.updateMobs=updateMobs;