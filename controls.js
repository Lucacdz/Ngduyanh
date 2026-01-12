import { player } from "./player.js";
import { toggleInventory } from "./inventory.js";

// Key states
export const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false
};

// Thêm sự kiện cho nút tay trái
export function initControls() {
  const btnLeft = document.getElementById("left");
  const btnRight = document.getElementById("right");
  const btnUp = document.getElementById("up");
  const btnDown = document.getElementById("down");
  const btnJump = document.getElementById("jump");
  const btnAttack = document.getElementById("attack");
  const btnInventory = document.getElementById("inventoryBtn");

  // Helper: touch & mouse down
  function addPress(btn, key){
    btn.addEventListener("mousedown", ()=> keys[key]=true );
    btn.addEventListener("mouseup", ()=> keys[key]=false );
    btn.addEventListener("touchstart", e=>{ e.preventDefault(); keys[key]=true; });
    btn.addEventListener("touchend", e=>{ e.preventDefault(); keys[key]=false; });
  }

  addPress(btnLeft,"left");
  addPress(btnRight,"right");
  addPress(btnUp,"up");
  addPress(btnDown,"down");
  addPress(btnJump,"jump");
  addPress(btnAttack,"attack");

  // Inventory toggle
  btnInventory.addEventListener("click", toggleInventory);
  btnInventory.addEventListener("touchstart", e=>{ e.preventDefault(); toggleInventory(); });
}

// Keyboard support (optional)
window.addEventListener("keydown", (e)=>{
  switch(e.code){
    case "ArrowLeft": keys.left=true; break;
    case "ArrowRight": keys.right=true; break;
    case "ArrowUp": keys.up=true; break;
    case "ArrowDown": keys.down=true; break;
    case "Space": keys.jump=true; break;
    case "KeyF": keys.attack=true; break;
    case "KeyI": toggleInventory(); break;
  }
});

window.addEventListener("keyup", (e)=>{
  switch(e.code){
    case "ArrowLeft": keys.left=false; break;
    case "ArrowRight": keys.right=false; break;
    case "ArrowUp": keys.up=false; break;
    case "ArrowDown": keys.down=false; break;
    case "Space": keys.jump=false; break;
    case "KeyF": keys.attack=false; break;
  }
});