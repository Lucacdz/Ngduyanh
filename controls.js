export const input={left:false,right:false,jump:false,attack:false,place:false};

// joystick bên trái
const joy=document.getElementById("joystick");
let startX,startY;
joy.addEventListener("touchstart",e=>{
  startX=e.touches[0].clientX;
  startY=e.touches[0].clientY;
});
joy.addEventListener("touchmove",e=>{
  const dx=e.touches[0].clientX-startX;
  input.left=dx<-20;
  input.right=dx>20;
});
joy.addEventListener("touchend",e=>{
  input.left=false;
  input.right=false;
});

// nút hành động bên phải
["jump","attack","place"].forEach(id=>{
  const btn=document.getElementById(id);
  btn.addEventListener("touchstart",()=>input[id]=true);
  btn.addEventListener("touchend",()=>input[id]=false);
});