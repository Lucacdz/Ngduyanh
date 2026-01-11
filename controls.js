const input={left:false,right:false,jump:false,attack:false,place:false};
document.getElementById("left").addEventListener("touchstart",()=>input.left=true);
document.getElementById("left").addEventListener("touchend",()=>input.left=false);
document.getElementById("right").addEventListener("touchstart",()=>input.right=true);
document.getElementById("right").addEventListener("touchend",()=>input.right=false);
document.getElementById("jump").addEventListener("touchstart",()=>input.jump=true);
document.getElementById("jump").addEventListener("touchend",()=>input.jump=false);
document.getElementById("attack").addEventListener("touchstart",()=>input.attack=true);
document.getElementById("attack").addEventListener("touchend",()=>input.attack=false);
document.getElementById("place").addEventListener("touchstart",()=>input.place=true);
document.getElementById("place").addEventListener("touchend",()=>input.place=false);

// inventory toggle
document.getElementById("toggleInventory").addEventListener("click",()=>{
  const inv=document.getElementById("inventoryUI");
  inv.style.display=inv.style.display==="none"?"block":"none";
});

// joystick
const joy=document.getElementById("joystick");
let startX,startY;
joy.addEventListener("touchstart",e=>{startX=e.touches[0].clientX; startY=e.touches[0].clientY;});
joy.addEventListener("touchmove",e=>{
  const dx=e.touches[0].clientX-startX;
  input.left=dx<-20;
  input.right=dx>20;
});
joy.addEventListener("touchend",e=>{input.left=false;input.right=false;});
window.input=input;