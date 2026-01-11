const input={left:false,right:false,jump:false,attack:false};

["left","right","jump","attack"].forEach(k=>{
 let b=document.getElementById(k);
 b.addEventListener("touchstart",e=>{e.preventDefault();input[k]=true});
 b.addEventListener("touchend",()=>input[k]=false);
});

document.addEventListener("keydown",e=>{
 if(e.key=="a")input.left=true;
 if(e.key=="d")input.right=true;
 if(e.key=="w")input.jump=true;
});
document.addEventListener("keyup",e=>{
 if(e.key=="a")input.left=false;
 if(e.key=="d")input.right=false;
 if(e.key=="w")input.jump=false;
});

window.input=input;