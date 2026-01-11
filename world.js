const TILE = 32;
const WORLD_W = 200;
const WORLD_H = 80;

const world = [];

for (let y = 0; y < WORLD_H; y++) {
  world[y] = [];
  for (let x = 0; x < WORLD_W; x++) {
    if (y > 40) world[y][x] = 1;       // đất
    else if (y === 40) world[y][x] = 2; // cỏ
    else world[y][x] = 0;              // không khí
  }
}

function isSolid(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return true;
  return world[y][x] !== 0;
}

window.world = world;
window.isSolid = isSolid;
window.TILE = TILE;