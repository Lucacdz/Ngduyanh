
import { world, W, H, tileSize } from "./world.js";
import { breakBlockDropItem } from "./block.js";
import { addItem } from "./inventory.js";

// Danh sách sinh vật
export const mobs = [];

// Player spawn để reference camera, có thể update player.js để có player.x, player.y
export let playerRef = {x:0, y:0};

// Sinh vật cơ bản
export class Mob {
  constructor(x,y,type){
    this.x = x;
    this.y = y;
    this.type = type; // zombie,skeleton,slime,spider, pig,cow,chicken
    this.width = tileSize;
    this.height = tileSize;
    this.health = 10;
    this.speed = 1;
    this.isHostile = ["zombie","skeleton","slime","spider"].includes(type);
  }

  update(){
    if(this.isHostile){
      // Chạy theo player
      if(playerRef.x < this.x) this.x -= this.speed;
      else this.x += this.speed;
    }else{
      // Động vật đi loanh quanh
      if(Math.random()<0.02) this.x += Math.random()<0.5?-1:1;
    }

    // Rơi xuống đất
    if(!isSolidBelow(this)){
      this.y += 2; // trọng lực
    }

    // Giới hạn thế giới
    if(this.x<0) this.x=0;
    if(this.x>W*tileSize) this.x=W*tileSize;
    if(this.y>H*tileSize) this.y=H*tileSize;
  }

  takeDamage(dmg){
    this.health -= dmg;
    if(this.health<=0){
      this.die();
    }
  }

  die(){
    // Rớt item
    switch(this.type){
      case "pig": addItem("Pork",1); break;
      case "cow": addItem("Beef",1); break;
      case "chicken": addItem("Chicken",1); break;
      case "zombie": addItem("RottenFlesh",1); break;
      case "skeleton": addItem("Bone",1); break;
      case "slime": addItem("SlimeBall",1); break;
      case "spider": addItem("String",1); break;
    }

    // Spawn lại động vật ban ngày
    if(!this.isHostile){
      const spawnX = Math.floor(Math.random()*W*tileSize);
      const spawnY = 0;
      mobs.push(new Mob(spawnX, spawnY, this.type));
    }

    // Xóa mob này
    const index = mobs.indexOf(this);
    if(index!==-1) mobs.splice(index,1);
  }
}

// Kiểm tra block dưới chân
function isSolidBelow(mob){
  const x = Math.floor(mob.x/tileSize);
  const y = Math.floor((mob.y+mob.height)/tileSize);
  if(y>=H) return true;
  const id = world[y][x];
  return id!==0;
}

// Spawn mobs ban đầu
export function spawnMobs(){
  // Động vật ban ngày
  for(let i=0;i<10;i++){
    const x = Math.floor(Math.random()*W*tileSize);
    const y = 0;
    mobs.push(new Mob(x,y,"pig"));
    mobs.push(new Mob(x,y,"cow"));
    mobs.push(new Mob(x,y,"chicken"));
  }

  // Quái vật ban đêm
  for(let i=0;i<5;i++){
    const x = Math.floor(Math.random()*W*tileSize);
    const y = 0;
    mobs.push(new Mob(x,y,"zombie"));
    mobs.push(new Mob(x,y,"skeleton"));
    mobs.push(new Mob(x,y,"slime"));
    mobs.push(new Mob(x,y,"spider"));
  }
}

// Vẽ mobs
export function renderMobs(ctx, camera){
  mobs.forEach(mob=>{
    ctx.fillStyle = mob.isHostile?"purple":"orange";
    ctx.fillRect(mob.x - camera.x, mob.y - camera.y, mob.width, mob.height);
  });
}

// Cập nhật mobs mỗi frame
export function updateMobs(){
  mobs.forEach(mob=>mob.update());
}