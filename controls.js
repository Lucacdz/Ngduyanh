export const input = {x:0,y:0,jump:false,attack:false};
const keys = {left:false,right:false,up:false,down:false,jump:false,attack:false};

["left","right","up","down","jump","attack"].forEach(id=>{
  const btn = document.getElementById(id);
  btn.addEventListener("touchstart",e=>{ e.preventDefault(); keys[id]=true; });
  btn.addEventListener("touchend",e=>{ e.preventDefault(); keys[id]=false; });
});

export function updateInput(){
  input.x = 0; input.y = 0;
  if(keys.left) input.x=-1;
  if(keys.right) input.x=1;
  if(keys.up) input.y=-1;
  if(keys.down) input.y=1;
  input.jump = keys.jump;
  input.attack = keys.attack;
}