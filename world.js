const TILE = 32, W = 200, H = 80;
const world = [];

/*
0 = air
1 = dirt
2 = grass
3 = wood
4 = leaf
*/

for (let y = 0; y < H; y++) {
  world[y] = [];
  for (let x = 0; x < W; x++) {
    if (y > 40) world[y][x] = 1;
    else if (y === 40) world[y][x] = 2;
    else world[y][x] = 0;
  }
}

/* Spawn cây */
for (let x = 5; x < W; x += 15) {
  let ground = 40;
  for (let i = 1; i <= 4; i++) world[ground - i][x] = 3;
  for (let ly = -6; ly <= -4; ly++)
    for (let lx = -2; lx <= 2; lx++)
      world[ground + ly][x + lx] = 4;
}

function isSolid(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  return world[y][x] !== 0;
}

function breakBlock(px, py) {
  const x = Math.floor(px / TILE);
  const y = Math.floor(py / TILE);
  if (world[y] && world[y][x] !== 0) world[y][x] = 0;
}

window.world = world;
window.isSolid = isSolid;
window.breakBlock = breakBlock;
window.TILE = TILE;
window.W = W;
window.H = H;