const mobs = [];

function spawnMob(x, y, type = "zombie") {
  mobs.push({
    x, y, w: 26, h: 30,
    vx: Math.random() < .5 ? -1 : 1,
    vy: 0,
    hp: 30,
    maxHp: 30,
    type
  });
}

spawnMob(300, 0);

function updateMobs() {
  mobs.forEach(m => {
    m.vy += 0.5;

    let nx = m.x + m.vx;
    if (!isSolid(nx, m.y) && !isSolid(nx, m.y + m.h)) m.x = nx;
    else m.vx *= -1;

    let ny = m.y + m.vy;
    if (!isSolid(m.x, ny + m.h)) m.y = ny;
    else m.vy = 0;
  });

  for (let i = mobs.length - 1; i >= 0; i--) {
    if (mobs[i].hp <= 0) mobs.splice(i, 1);
  }
}

window.mobs = mobs;
window.spawnMob = spawnMob;
window.updateMobs = updateMobs;