left.onclick=()=>player.vx=-3;
right.onclick=()=>player.vx=3;
jump.onclick=()=>player.vy=-10;
attack.onclick=()=>{
 mobs.forEach(m=>{
  if(Math.abs(m.x-player.x)<40 && Math.abs(m.y-player.y)<40)
    m.hp-=10;
 });
};