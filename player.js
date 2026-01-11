export function attack(input){
  if(player.attackCooldown>0) return;
  player.attackCooldown=5; // frame giữa các hit
  const range=40;

  // đánh mobs
  mobs.forEach(m=>{
    const dx=Math.abs((m.x+m.w/2)-(player.x+player.w/2));
    const dy=Math.abs((m.y+m.h/2)-(player.y+player.h/2));
    if(dx<range && dy<range) m.hp-=10;
  });

  // đào block theo hướng joystick
  let dirX=input.x, dirY=input.y;
  if(dirX===0 && dirY===0) dirX=1; // mặc định ngang
  const targetX=player.x+player.w/2 + dirX*range;
  const targetY=player.y+player.h/2 + dirY*range;
  breakBlock(targetX,targetY);
}