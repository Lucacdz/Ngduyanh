// Keys state
export const keys = {
  left:false,
  right:false,
  up:false,
  down:false,
  jump:false,
  attack:false,
  inventory:false
};

// Khởi tạo controls
export function initControls(){

  // Nút tay trái
  const leftBtn = document.getElementById("left");
  const rightBtn = document.getElementById("right");
  const upBtn = document.getElementById("up");
  const downBtn = document.getElementById("down");

  leftBtn.addEventListener("touchstart", ()=>keys.left=true);
  leftBtn.addEventListener("touchend", ()=>keys.left=false);
  rightBtn.addEventListener("touchstart", ()=>keys.right=true);
  rightBtn.addEventListener("touchend", ()=>keys.right=false);
  upBtn.addEventListener("touchstart", ()=>keys.up=true);
  upBtn.addEventListener("touchend", ()=>keys.up=false);
  downBtn.addEventListener("touchstart", ()=>keys.down=true);
  downBtn.addEventListener("touchend", ()=>keys.down=false);

  // Nút tay phải
  const jumpBtn = document.getElementById("jump");
  const attackBtn = document.getElementById("attack");
  const inventoryBtn = document.getElementById("inventoryBtn");

  jumpBtn.addEventListener("touchstart", ()=>keys.jump=true);
  jumpBtn.addEventListener("touchend", ()=>keys.jump=false);

  attackBtn.addEventListener("touchstart", ()=>keys.attack=true);
  attackBtn.addEventListener("touchend", ()=>keys.attack=false);

  inventoryBtn.addEventListener("touchstart", ()=>{
    keys.inventory = !keys.inventory;
    const hotbarDiv = document.getElementById("hotbar");
    hotbarDiv.style.display = keys.inventory ? "flex" : "flex"; // hotbar luôn hiển thị
  });

  // Keyboard support
  window.addEventListener("keydown", (e)=>{
    switch(e.key){
      case "ArrowLeft": keys.left=true; break;
      case "ArrowRight": keys.right=true; break;
      case "ArrowUp": keys.jump=true; break;
      case " ": keys.jump=true; break;
      case "z": keys.attack=true; break;
      case "i": 
        keys.inventory = !keys.inventory;
        document.getElementById("hotbar").style.display = keys.inventory?"flex":"flex";
        break;
    }
  });

  window.addEventListener("keyup", (e)=>{
    switch(e.key){
      case "ArrowLeft": keys.left=false; break;
      case "ArrowRight": keys.right=false; break;
      case "ArrowUp": keys.jump=false; break;
      case " ": keys.jump=false; break;
      case "z": keys.attack=false; break;
    }
  });
}