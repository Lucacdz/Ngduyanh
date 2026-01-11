const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

let camX = 0, camY = 0;

function drawWorld() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = world[y][x];
      if (!b) continue;
      ctx.fillStyle =
        b === 1 ? "#7a5230" :
        b === 2 ? "#3cb043" :
        b === 3 ? "#8b5a2b" :
        "#2e8b57";
      ctx.fillRect(x*TILE-camX, y*TILE-camY, TILE, TILE);
    }
  }
}

function drawHP(x, y, w, hp, max) {
  ctx.fillStyle = "red";
  ctx.fillRect(x, y - 6, w * (hp / max), 4);
}

function loop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  updatePlayer();
  updateMobs();

  camX = player.x - canvas.width / 2;
  camY = player.y - canvas.height / 2;

  drawWorld();

  ctx.fillStyle = "red";
  ctx.fillRect(player.x-camX, player.y-camY, player.w, player.h);
  drawHP(player.x-camX, player.y-camY, player.w, player.hp, player.maxHp);

  mobs.forEach(m => {
    ctx.fillStyle = "green";
    ctx.fillRect(m.x-camX, m.y-camY, m.w, m.h);
    drawHP(m.x-camX, m.y-camY, m.w, m.hp, m.maxHp);
  });

  requestAnimationFrame(loop);
}
loop();