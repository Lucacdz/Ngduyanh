export const input = { x:0, y:0, jump:false, attack:false, place:false };

// joystick
const joy=document.getElementById("joystick");
let startX,startY;
joy.addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
});

joy.addEventListener("touchmove", e => {
  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;
  
  // tốc độ
  input.x = Math.max(-1, Math.min(1, dx/50)); // -1 -> 1
  input.y = Math.max(-1, Math.min(1, dy/50)); // -1 -> 1
});

joy.addEventListener("touchend", e => { input.x=0; input.y=0; });

// nút hành động bên phải
["jump","attack","place"].forEach(id=>{
  const btn=document.getElementById(id);
  btn.addEventListener("touchstart",()=>input[id]=true);
  btn.addEventListener("touchend",()=>input[id]=false);
});